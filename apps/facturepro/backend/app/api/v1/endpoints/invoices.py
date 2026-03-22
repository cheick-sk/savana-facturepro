"""Invoice endpoints: CRUD + PDF + email + Mobile Money simulation."""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import AuditLog, Invoice, User
from app.schemas.schemas import (
    InvoiceCreate,
    InvoiceOut,
    InvoiceUpdate,
    Paginated
)
from app.services.email_service import send_invoice_email
from app.services.invoice_service import create_invoice, generate_and_store_pdf, update_invoice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=Paginated)
async def list_invoices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    customer_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Invoice)
    if status:
        q = q.where(Invoice.status == status)
    if customer_id:
        q = q.where(Invoice.customer_id == customer_id)

    total_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_res.scalar() or 0

    q = q.order_by(Invoice.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    invoices = result.scalars().all()

    return Paginated(
        items=[InvoiceOut.model_validate(inv) for inv in invoices],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@router.post("", response_model=InvoiceOut, status_code=201)
async def create_new_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = await create_invoice(db, data, current_user.id)
    db.add(AuditLog(user_id=current_user.id, action="CREATE_INVOICE",
                    resource="invoice", resource_id=str(invoice.id)))
    return InvoiceOut.model_validate(invoice)


@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    return InvoiceOut.model_validate(invoice)


@router.put("/{invoice_id}", response_model=InvoiceOut)
async def update_invoice_endpoint(
    invoice_id: int,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if invoice.status == "PAID":
        raise HTTPException(400, "Cannot modify a paid invoice")

    invoice = await update_invoice(db, invoice, data)
    db.add(AuditLog(user_id=current_user.id, action="UPDATE_INVOICE",
                    resource="invoice", resource_id=str(invoice.id)))
    return InvoiceOut.model_validate(invoice)


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Insufficient permissions")
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if invoice.status == "PAID":
        raise HTTPException(400, "Cannot delete a paid invoice")
    await db.delete(invoice)


@router.post("/{invoice_id}/send", response_model=InvoiceOut)
async def send_invoice(
    invoice_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate PDF and send by email, mark as SENT."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if not invoice.customer.email:
        raise HTTPException(400, "Customer has no email address")

    # Generate PDF
    await generate_and_store_pdf(db, invoice)
    invoice.status = "SENT"

    # Read PDF bytes
    with open(invoice.pdf_path, "rb") as f:
        pdf_bytes = f.read()

    # Send email in background
    background_tasks.add_task(
        send_invoice_email,
        to_email=invoice.customer.email,
        customer_name=invoice.customer.name,
        invoice_number=invoice.invoice_number,
        total_amount=float(invoice.total_amount),
        currency=invoice.currency,
        pdf_bytes=pdf_bytes,
    )

    db.add(AuditLog(user_id=current_user.id, action="SEND_INVOICE",
                    resource="invoice", resource_id=str(invoice.id)))
    await db.flush()
    await db.refresh(invoice)
    return InvoiceOut.model_validate(invoice)


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Download or generate invoice PDF."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        await generate_and_store_pdf(db, invoice)
        await db.flush()

    return FileResponse(
        invoice.pdf_path,
        media_type="application/pdf",
        filename=f"facture_{invoice.invoice_number}.pdf",
    )


