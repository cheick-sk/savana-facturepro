"""Purchase Orders, Receptions, Supplier Invoices & Payments endpoints — FacturePro Africa."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import AuditLog, Product, PurchaseOrder, PurchaseOrderItem, Supplier, User
from app.models.purchase import (
    PurchaseReception, PurchaseReceptionItem,
    SupplierInvoice, SupplierPayment,
)
from app.schemas.schemas import Paginated
from app.schemas.purchase import (
    POCreate, POOut, POUpdate, POItemOut,
    ReceptionCreate, ReceptionOut,
    SupplierInvoiceCreate, SupplierInvoiceOut, SupplierInvoiceUpdate,
    SupplierPaymentCreate, SupplierPaymentOut,
    SupplierStatement,
)
from app.services.purchase_service import (
    create_purchase_order, update_purchase_order, send_purchase_order,
    create_reception, create_supplier_invoice, record_supplier_payment,
    get_supplier_statement, generate_po_pdf,
)

logger = logging.getLogger(__name__)

# ── Main Router for Purchase Orders ───────────────────────────────
router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders — Bons de commande"])

# ── Router for Receptions ─────────────────────────────────────────
receptions_router = APIRouter(prefix="/receptions", tags=["Purchase Receptions — Réceptions"])

# ── Router for Supplier Invoices ──────────────────────────────────
invoices_router = APIRouter(prefix="/supplier-invoices", tags=["Supplier Invoices — Factures Fournisseurs"])


# ═══════════════════════════════════════════════════════════════════
# PURCHASE ORDERS
# ═══════════════════════════════════════════════════════════════════

def _po_to_out(po: PurchaseOrder) -> dict:
    """Convert PO model to output dict."""
    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_id": po.supplier_id,
        "supplier": {
            "id": po.supplier.id,
            "name": po.supplier.name,
            "email": po.supplier.email,
            "phone": po.supplier.phone,
            "address": po.supplier.address,
            "city": po.supplier.city,
            "country": po.supplier.country,
        } if po.supplier else {},
        "status": po.status,
        "order_date": po.order_date,
        "expected_date": po.expected_date,
        "received_date": po.received_date,
        "supplier_reference": po.supplier_reference,
        "subtotal": float(po.subtotal),
        "tax_amount": float(po.tax_amount),
        "total_amount": float(po.total_amount),
        "currency": po.currency,
        "notes": po.notes,
        "terms": po.terms,
        "total_items": po.total_items,
        "received_items": po.received_items,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "description": item.description,
                "quantity": float(item.quantity),
                "quantity_received": float(item.quantity_received),
                "unit_price": float(item.unit_price),
                "tax_rate": float(item.tax_rate),
                "line_total": float(item.line_total),
            }
            for item in po.items
        ],
        "created_at": po.created_at,
        "updated_at": po.updated_at,
    }


@router.get("", response_model=Paginated)
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    supplier_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List purchase orders with filters."""
    q = select(PurchaseOrder).where(
        PurchaseOrder.organisation_id == current_user.organisation_id
    )

    if supplier_id:
        q = q.where(PurchaseOrder.supplier_id == supplier_id)
    if status:
        q = q.where(PurchaseOrder.status == status)
    if search:
        q = q.where(
            or_(
                PurchaseOrder.po_number.ilike(f"%{search}%"),
                PurchaseOrder.supplier_reference.ilike(f"%{search}%"),
            )
        )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    orders = result.scalars().all()

    return Paginated(
        items=[_po_to_out(po) for po in orders],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@router.post("", response_model=dict, status_code=201)
async def create_po(
    data: POCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new purchase order."""
    try:
        po = await create_purchase_order(
            db, data, current_user.id, current_user.organisation_id
        )
        db.add(AuditLog(
            organisation_id=current_user.organisation_id,
            user_id=current_user.id,
            action="CREATE_PURCHASE_ORDER",
            resource="purchase_order",
            resource_id=str(po.id),
        ))
        await db.commit()
        return _po_to_out(po)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{po_id}", response_model=dict)
async def get_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a purchase order by ID."""
    po = (await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    return _po_to_out(po)


@router.put("/{po_id}", response_model=dict)
async def update_po(
    po_id: int,
    data: POUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a purchase order."""
    po = (await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")

    try:
        po = await update_purchase_order(db, po, data)
        db.add(AuditLog(
            organisation_id=current_user.organisation_id,
            user_id=current_user.id,
            action="UPDATE_PURCHASE_ORDER",
            resource="purchase_order",
            resource_id=str(po.id),
        ))
        await db.commit()
        return _po_to_out(po)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{po_id}", status_code=204)
async def cancel_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a purchase order (draft only)."""
    po = (await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status != "DRAFT":
        raise HTTPException(400, "Only DRAFT orders can be cancelled")

    po.status = "CANCELLED"
    db.add(AuditLog(
        organisation_id=current_user.organisation_id,
        user_id=current_user.id,
        action="CANCEL_PURCHASE_ORDER",
        resource="purchase_order",
        resource_id=str(po.id),
    ))
    await db.commit()


@router.post("/{po_id}/send", response_model=dict)
async def send_po_to_supplier(
    po_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send purchase order to supplier via email."""
    po = (await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")

    try:
        po = await send_purchase_order(db, po, current_user)
        await db.commit()
        return _po_to_out(po)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{po_id}/confirm", response_model=dict)
async def confirm_po(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark purchase order as confirmed by supplier."""
    po = (await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status not in ("DRAFT", "SENT"):
        raise HTTPException(400, "Only DRAFT or SENT orders can be confirmed")

    po.status = "CONFIRMED"
    db.add(AuditLog(
        organisation_id=current_user.organisation_id,
        user_id=current_user.id,
        action="CONFIRM_PURCHASE_ORDER",
        resource="purchase_order",
        resource_id=str(po.id),
    ))
    await db.commit()
    return _po_to_out(po)


@router.get("/{po_id}/pdf")
async def download_po_pdf(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Download purchase order PDF."""
    po = (await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")

    if not po.pdf_path or not os.path.exists(po.pdf_path):
        await generate_po_pdf(db, po)
        await db.flush()

    return FileResponse(
        po.pdf_path,
        media_type="application/pdf",
        filename=f"bon_commande_{po.po_number}.pdf",
    )


# ═══════════════════════════════════════════════════════════════════
# RECEPTIONS
# ═══════════════════════════════════════════════════════════════════

def _reception_to_out(reception: PurchaseReception) -> dict:
    """Convert reception model to output dict."""
    return {
        "id": reception.id,
        "purchase_order_id": reception.purchase_order_id,
        "reception_number": reception.reception_number,
        "reception_date": reception.reception_date,
        "status": reception.status,
        "notes": reception.notes,
        "items": [
            {
                "id": item.id,
                "order_item_id": item.order_item_id,
                "quantity_received": float(item.quantity_received),
                "notes": item.notes,
            }
            for item in reception.items
        ],
        "created_at": reception.created_at,
    }


@router.post("/{po_id}/receptions", response_model=dict, status_code=201)
async def create_po_reception(
    po_id: int,
    data: ReceptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a reception for a purchase order."""
    # Override po_id from path
    data.purchase_order_id = po_id

    try:
        reception = await create_reception(
            db, data, current_user.id, current_user.organisation_id
        )
        await db.commit()
        return _reception_to_out(reception)
    except ValueError as e:
        raise HTTPException(400, str(e))


@receptions_router.get("", response_model=Paginated)
async def list_receptions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    purchase_order_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all receptions."""
    q = select(PurchaseReception).where(
        PurchaseReception.organisation_id == current_user.organisation_id
    )

    if purchase_order_id:
        q = q.where(PurchaseReception.purchase_order_id == purchase_order_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(PurchaseReception.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    receptions = result.scalars().all()

    return Paginated(
        items=[_reception_to_out(r) for r in receptions],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@receptions_router.get("/{reception_id}", response_model=dict)
async def get_reception(
    reception_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a reception by ID."""
    reception = (await db.execute(
        select(PurchaseReception).where(PurchaseReception.id == reception_id)
    )).scalar_one_or_none()
    if not reception:
        raise HTTPException(404, "Reception not found")
    return _reception_to_out(reception)


# ═══════════════════════════════════════════════════════════════════
# SUPPLIER INVOICES
# ═══════════════════════════════════════════════════════════════════

def _invoice_to_out(invoice: SupplierInvoice) -> dict:
    """Convert supplier invoice model to output dict."""
    return {
        "id": invoice.id,
        "supplier_id": invoice.supplier_id,
        "supplier": {
            "id": invoice.supplier.id,
            "name": invoice.supplier.name,
            "email": invoice.supplier.email,
            "phone": invoice.supplier.phone,
        } if invoice.supplier else {},
        "purchase_order_id": invoice.purchase_order_id,
        "invoice_number": invoice.invoice_number,
        "supplier_reference": invoice.supplier_reference,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "status": invoice.status,
        "subtotal": float(invoice.subtotal),
        "tax_amount": float(invoice.tax_amount),
        "total_amount": float(invoice.total_amount),
        "amount_paid": float(invoice.amount_paid),
        "balance_due": float(invoice.total_amount) - float(invoice.amount_paid),
        "currency": invoice.currency,
        "notes": invoice.notes,
        "payments": [
            {
                "id": p.id,
                "supplier_invoice_id": p.supplier_invoice_id,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_date": p.payment_date,
                "reference": p.reference,
                "notes": p.notes,
                "created_at": p.created_at,
            }
            for p in invoice.payments
        ],
        "created_at": invoice.created_at,
    }


@invoices_router.get("", response_model=Paginated)
async def list_supplier_invoices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    supplier_id: int | None = None,
    status: str | None = None,
    overdue: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List supplier invoices with filters."""
    q = select(SupplierInvoice).where(
        SupplierInvoice.organisation_id == current_user.organisation_id
    )

    if supplier_id:
        q = q.where(SupplierInvoice.supplier_id == supplier_id)
    if status:
        q = q.where(SupplierInvoice.status == status)
    if overdue:
        q = q.where(
            SupplierInvoice.status.in_(["pending", "partially_paid"]),
            SupplierInvoice.due_date < datetime.now(timezone.utc)
        )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(SupplierInvoice.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    invoices = result.scalars().all()

    return Paginated(
        items=[_invoice_to_out(inv) for inv in invoices],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@invoices_router.post("", response_model=dict, status_code=201)
async def create_supplier_invoice_endpoint(
    data: SupplierInvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a supplier invoice."""
    try:
        invoice = await create_supplier_invoice(
            db, data, current_user.id, current_user.organisation_id
        )
        await db.commit()
        return _invoice_to_out(invoice)
    except ValueError as e:
        raise HTTPException(400, str(e))


@invoices_router.get("/{invoice_id}", response_model=dict)
async def get_supplier_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a supplier invoice by ID."""
    invoice = (await db.execute(
        select(SupplierInvoice).where(SupplierInvoice.id == invoice_id)
    )).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Supplier invoice not found")
    return _invoice_to_out(invoice)


@invoices_router.put("/{invoice_id}", response_model=dict)
async def update_supplier_invoice(
    invoice_id: int,
    data: SupplierInvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a supplier invoice."""
    invoice = (await db.execute(
        select(SupplierInvoice).where(SupplierInvoice.id == invoice_id)
    )).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Supplier invoice not found")

    if data.supplier_reference is not None:
        invoice.supplier_reference = data.supplier_reference
    if data.due_date is not None:
        invoice.due_date = data.due_date
    if data.status is not None:
        invoice.status = data.status
    if data.notes is not None:
        invoice.notes = data.notes

    db.add(AuditLog(
        organisation_id=current_user.organisation_id,
        user_id=current_user.id,
        action="UPDATE_SUPPLIER_INVOICE",
        resource="supplier_invoice",
        resource_id=str(invoice.id),
    ))
    await db.commit()
    return _invoice_to_out(invoice)


@invoices_router.post("/{invoice_id}/pay", response_model=dict, status_code=201)
async def pay_supplier_invoice(
    invoice_id: int,
    data: SupplierPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a payment for a supplier invoice."""
    invoice = (await db.execute(
        select(SupplierInvoice).where(SupplierInvoice.id == invoice_id)
    )).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Supplier invoice not found")

    try:
        payment = await record_supplier_payment(
            db, invoice, data, current_user.id, current_user.organisation_id
        )
        await db.commit()
        return {
            "id": payment.id,
            "supplier_invoice_id": payment.supplier_invoice_id,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "payment_date": payment.payment_date,
            "reference": payment.reference,
            "notes": payment.notes,
            "created_at": payment.created_at,
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


# ═══════════════════════════════════════════════════════════════════
# SUPPLIER STATEMENTS
# ═══════════════════════════════════════════════════════════════════

# Add to suppliers router (we'll create endpoint in router.py)
supplier_router = APIRouter(prefix="/suppliers", tags=["Suppliers — Fournisseurs"])


@supplier_router.get("/{supplier_id}/statement", response_model=dict)
async def get_supplier_statement_endpoint(
    supplier_id: int,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get supplier statement for a period."""
    if not start_date:
        start_date = datetime.now(timezone.utc) - timedelta(days=90)
    if not end_date:
        end_date = datetime.now(timezone.utc)

    try:
        statement = await get_supplier_statement(
            db, supplier_id, start_date, end_date, current_user.organisation_id
        )
        return statement
    except ValueError as e:
        raise HTTPException(400, str(e))


@supplier_router.get("/{supplier_id}/orders", response_model=Paginated)
async def get_supplier_orders(
    supplier_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get purchase orders for a supplier."""
    q = select(PurchaseOrder).where(
        PurchaseOrder.supplier_id == supplier_id,
        PurchaseOrder.organisation_id == current_user.organisation_id,
    )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    orders = result.scalars().all()

    return Paginated(
        items=[_po_to_out(po) for po in orders],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@supplier_router.get("/{supplier_id}/invoices", response_model=Paginated)
async def get_supplier_invoices(
    supplier_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get supplier invoices for a supplier."""
    q = select(SupplierInvoice).where(
        SupplierInvoice.supplier_id == supplier_id,
        SupplierInvoice.organisation_id == current_user.organisation_id,
    )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(SupplierInvoice.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    invoices = result.scalars().all()

    return Paginated(
        items=[_invoice_to_out(inv) for inv in invoices],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )
