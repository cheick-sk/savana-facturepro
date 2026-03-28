"""
AI API Endpoints for FacturePro

Provides endpoints for:
- Invoice OCR extraction
- Receipt OCR extraction
- Bulk document processing
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging
import io

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.all_models import User, Invoice, InvoiceItem, Supplier, Customer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Services"])


# ── Schemas ──────────────────────────────────────────────────────

class OCRResultItem(BaseModel):
    """Single line item from OCR extraction."""
    description: str = ""
    quantity: float = 0
    unit_price: float = 0
    tax_rate: float = 0
    total: float = 0


class OCRResult(BaseModel):
    """Result from OCR extraction."""
    supplier_name: str = ""
    supplier_address: str = ""
    supplier_phone: str = ""
    invoice_number: str = ""
    date: Optional[str] = None
    due_date: Optional[str] = None
    items: list[OCRResultItem] = []
    subtotal: float = 0
    tax: float = 0
    total: float = 0
    currency: str = "XOF"
    payment_terms: str = ""
    notes: str = ""
    confidence: float = 0


class OCROptions(BaseModel):
    """Options for OCR processing."""
    language: str = Field(default="fr", description="Language hint for OCR")
    save_to_database: bool = Field(default=False, description="Save extracted invoice to DB")
    supplier_id: Optional[int] = Field(default=None, description="Link to existing supplier")


class BulkOCRResult(BaseModel):
    """Result from bulk OCR processing."""
    total_processed: int
    successful: int
    failed: int
    results: list[dict]


# ── Helper Functions ─────────────────────────────────────────────

def get_ocr_service():
    """Get configured OCR service instance."""
    if not settings.AI_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI services are not enabled. Please configure AI_API_KEY."
        )

    from shared.libs.ai.invoice_ocr import InvoiceOCRService

    return InvoiceOCRService(
        api_key=settings.AI_API_KEY,
        provider=settings.AI_PROVIDER,
    )


async def process_invoice_image(
    image_bytes: bytes,
    mime_type: str,
    language: str = "fr"
) -> dict:
    """Process a single invoice image and return extracted data."""
    service = get_ocr_service()
    try:
        result = await service.extract_invoice_data(
            image_bytes=image_bytes,
            mime_type=mime_type,
            language_hint=language
        )
        return {
            "success": True,
            "data": {
                "supplier_name": result.supplier_name,
                "supplier_address": result.supplier_address,
                "supplier_phone": result.supplier_phone,
                "invoice_number": result.invoice_number,
                "date": result.date,
                "due_date": result.due_date,
                "items": result.items,
                "subtotal": result.subtotal,
                "tax": result.tax,
                "total": result.total,
                "currency": result.currency,
                "payment_terms": result.payment_terms,
                "notes": result.notes,
                "confidence": result.confidence,
            }
        }
    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        await service.close()


# ── Endpoints ────────────────────────────────────────────────────

@router.post("/ocr/invoice", response_model=dict)
async def extract_invoice_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Invoice image or PDF"),
    language: str = Form(default="fr", description="Language hint (fr, en, etc.)"),
    save_to_database: bool = Form(default=False, description="Save to database"),
    supplier_id: Optional[int] = Form(default=None, description="Link to supplier"),
    current_user: User = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Extract structured data from an invoice image/PDF.

    Supports: JPEG, PNG, WebP, PDF

    Returns extracted invoice data including:
    - Supplier information
    - Invoice details (number, dates)
    - Line items with quantities and prices
    - Totals and tax
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported: JPEG, PNG, WebP, PDF"
        )

    # Read file content
    content = await file.read()

    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB."
        )

    # Process with OCR
    result = await process_invoice_image(
        image_bytes=content,
        mime_type=file.content_type,
        language=language
    )

    if not result["success"]:
        raise HTTPException(
            status_code=422,
            detail=f"OCR processing failed: {result['error']}"
        )

    # Optionally save to database
    if save_to_database and result["data"]["confidence"] >= 0.5:
        # This would create an expense or supplier invoice record
        # Implementation depends on business requirements
        pass

    return {
        "success": True,
        "data": result["data"],
        "validation": {
            "confidence": result["data"]["confidence"],
            "min_required": 0.5,
            "is_reliable": result["data"]["confidence"] >= 0.5
        }
    }


@router.post("/ocr/receipt", response_model=dict)
async def extract_receipt_data(
    file: UploadFile = File(..., description="Receipt image"),
    language: str = Form(default="fr"),
    current_user: User = Depends(get_current_user),
):
    """
    Extract data from a receipt (for expense tracking).

    Simplified extraction for receipts with:
    - Merchant name and address
    - Date and time
    - Items purchased
    - Total amount
    """
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}"
        )

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    service = get_ocr_service()
    try:
        result = await service.extract_receipt_data(
            image_bytes=content,
            mime_type=file.content_type
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Receipt OCR failed: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        await service.close()


@router.post("/ocr/bulk", response_model=BulkOCRResult)
async def bulk_extract_invoices(
    files: list[UploadFile] = File(..., description="Multiple invoice images"),
    language: str = Form(default="fr"),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk process multiple invoice images.

    Processes up to 10 files at once.
    Returns aggregated results with success/failure counts.
    """
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 files allowed per bulk request"
        )

    results = []
    successful = 0
    failed = 0

    for file in files:
        try:
            content = await file.read()
            result = await process_invoice_image(
                image_bytes=content,
                mime_type=file.content_type or "image/jpeg",
                language=language
            )

            if result["success"]:
                successful += 1
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "data": result["data"]
                })
            else:
                failed += 1
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": result["error"]
                })
        except Exception as e:
            failed += 1
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e)
            })

    return BulkOCRResult(
        total_processed=len(files),
        successful=successful,
        failed=failed,
        results=results
    )


@router.get("/ocr/status")
async def get_ocr_status():
    """
    Get OCR service status and configuration.

    Returns information about the AI provider and capabilities.
    """
    return {
        "enabled": settings.AI_ENABLED,
        "provider": settings.AI_PROVIDER if settings.AI_ENABLED else None,
        "model": settings.AI_VISION_MODEL if settings.AI_ENABLED else None,
        "capabilities": {
            "invoice_extraction": settings.AI_ENABLED,
            "receipt_extraction": settings.AI_ENABLED,
            "bulk_processing": settings.AI_ENABLED,
            "supported_formats": ["JPEG", "PNG", "WebP", "PDF"] if settings.AI_ENABLED else []
        }
    }


@router.post("/ocr/validate")
async def validate_ocr_result(
    data: OCRResult,
    current_user: User = Depends(get_current_user),
):
    """
    Validate and clean OCR extraction results.

    Checks for:
    - Required fields presence
    - Total calculations
    - Currency validity
    """
    from shared.libs.ai.invoice_ocr import InvoiceOCRService

    service = get_ocr_service()
    try:
        # Convert to internal format for validation
        from shared.libs.ai.invoice_ocr import ExtractedInvoiceData
        extracted = ExtractedInvoiceData(
            supplier_name=data.supplier_name,
            supplier_address=data.supplier_address,
            supplier_phone=data.supplier_phone,
            invoice_number=data.invoice_number,
            date=data.date,
            due_date=data.due_date,
            items=[item.dict() for item in data.items],
            subtotal=data.subtotal,
            tax=data.tax,
            total=data.total,
            currency=data.currency,
            payment_terms=data.payment_terms,
            notes=data.notes,
            confidence=data.confidence,
        )

        validation = service.validate_extraction(extracted)

        return {
            "is_valid": validation["is_valid"],
            "issues": validation["issues"],
            "corrections": validation["corrections"],
            "confidence": validation["confidence"],
        }
    finally:
        await service.close()
