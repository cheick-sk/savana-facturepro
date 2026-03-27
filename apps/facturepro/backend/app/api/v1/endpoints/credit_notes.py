"""Credit Notes (Avoirs) endpoints — FacturePro Africa."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import CreditNote, CreditNoteItem, Customer, Invoice, User
from app.schemas.schemas import CreditNoteCreate, CreditNoteOut, Paginated

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/credit-notes", tags=["Credit Notes — Avoirs"])


def _next_cn_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"AV-{year}-{count + 1:05d}"


def _calc_cn_totals(items_data):
    subtotal, tax_total = 0.0, 0.0
    for it in items_data:
        base = round(it.quantity * it.unit_price, 2)
        tax = round(base * it.tax_rate / 100, 2)
        subtotal += base
        tax_total += tax
    return round(subtotal, 2), round(tax_total, 2), round(subtotal + tax_total, 2)


@router.get("", response_model=Paginated)
async def list_credit_notes(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    customer_id: int | None = None, invoice_id: int | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(CreditNote)
    if customer_id:
        q = q.where(CreditNote.customer_id == customer_id)
    if invoice_id:
        q = q.where(CreditNote.invoice_id == invoice_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(CreditNote.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[CreditNoteOut.model_validate(cn) for cn in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{cn_id}", response_model=CreditNoteOut)
async def get_credit_note(cn_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    cn = (await db.execute(select(CreditNote).where(CreditNote.id == cn_id))).scalar_one_or_none()
    if not cn:
        raise HTTPException(404, "Credit note not found")
    return CreditNoteOut.model_validate(cn)


@router.post("", response_model=CreditNoteOut, status_code=201)
async def create_credit_note(
    data: CreditNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cust = (await db.execute(select(Customer).where(Customer.id == data.customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(404, "Customer not found")
    if data.invoice_id:
        inv = (await db.execute(select(Invoice).where(Invoice.id == data.invoice_id))).scalar_one_or_none()
        if not inv:
            raise HTTPException(404, "Invoice not found")

    count = (await db.execute(select(func.count()).select_from(CreditNote))).scalar() or 0
    subtotal, tax_total, total = _calc_cn_totals(data.items)

    cn = CreditNote(
        credit_note_number=_next_cn_number(count),
        invoice_id=data.invoice_id,
        customer_id=data.customer_id,
        created_by=current_user.id,
        reason=data.reason,
        currency=data.currency,
        subtotal=subtotal,
        tax_amount=tax_total,
        total_amount=total,
        status="ISSUED",
    )
    db.add(cn)
    await db.flush()

    for it in data.items:
        base = round(it.quantity * it.unit_price, 2)
        tax = round(base * it.tax_rate / 100, 2)
        db.add(CreditNoteItem(
            credit_note_id=cn.id,
            description=it.description,
            quantity=it.quantity,
            unit_price=it.unit_price,
            tax_rate=it.tax_rate,
            line_total=round(base + tax, 2),
        ))

    await db.commit()
    await db.refresh(cn)
    return CreditNoteOut.model_validate(cn)


@router.post("/{cn_id}/apply", response_model=dict)
async def apply_credit_note(
    cn_id: int, invoice_id: int,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    """Apply a credit note to reduce an invoice balance."""
    cn = (await db.execute(select(CreditNote).where(CreditNote.id == cn_id))).scalar_one_or_none()
    if not cn:
        raise HTTPException(404, "Credit note not found")
    if cn.status == "APPLIED":
        raise HTTPException(409, "Credit note already applied")

    inv = (await db.execute(select(Invoice).where(Invoice.id == invoice_id))).scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.customer_id != cn.customer_id:
        raise HTTPException(400, "Credit note and invoice must belong to the same customer")

    credit = float(cn.total_amount)
    inv.amount_paid = round(float(inv.amount_paid) + credit, 2)
    if inv.amount_paid >= float(inv.total_amount):
        inv.status = "PAID"
    elif inv.amount_paid > 0:
        inv.status = "PARTIAL"
    cn.status = "APPLIED"
    await db.commit()
    return {"message": "Credit note applied", "credit_applied": credit, "invoice_status": inv.status}
