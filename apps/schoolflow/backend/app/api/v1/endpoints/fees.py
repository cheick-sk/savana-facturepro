"""Fee invoices + payments."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import FeeInvoice, FeePayment, User
from app.schemas.schemas import (
    FeeInvoiceCreate, FeeInvoiceOut, FeePaymentCreate, FeePaymentOut, Paginated,
)

router = APIRouter(prefix="/fees", tags=["Fees"])


def _gen_fee_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"FEE-{year}-{count + 1:05d}"


@router.get("", response_model=Paginated)
async def list_fees(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    student_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(FeeInvoice)
    if student_id:
        q = q.where(FeeInvoice.student_id == student_id)
    if status:
        q = q.where(FeeInvoice.status == status)

    total = int((await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0)
    result = await db.execute(q.offset((page-1)*size).limit(size).order_by(FeeInvoice.created_at.desc()))
    fees = result.scalars().all()

    return Paginated(
        items=[FeeInvoiceOut.model_validate(f) for f in fees],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@router.post("", response_model=FeeInvoiceOut, status_code=201)
async def create_fee_invoice(
    data: FeeInvoiceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    count_res = await db.execute(select(func.count()).select_from(FeeInvoice))
    count = count_res.scalar() or 0
    fee = FeeInvoice(invoice_number=_gen_fee_number(count), **data.model_dump())
    db.add(fee)
    await db.flush()
    await db.refresh(fee)
    return FeeInvoiceOut.model_validate(fee)


@router.get("/{fee_id}", response_model=FeeInvoiceOut)
async def get_fee(fee_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(FeeInvoice).where(FeeInvoice.id == fee_id))
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(404, "Fee invoice not found")
    return FeeInvoiceOut.model_validate(fee)


@router.post("/{fee_id}/pay", response_model=FeePaymentOut)
async def record_payment(
    fee_id: int, data: FeePaymentCreate,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    result = await db.execute(select(FeeInvoice).where(FeeInvoice.id == fee_id))
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(404, "Fee invoice not found")
    if fee.status == "PAID":
        raise HTTPException(400, "Already paid")

    payment = FeePayment(
        fee_invoice_id=fee.id,
        amount=data.amount,
        method=data.method,
        reference=data.reference or f"REF-{uuid.uuid4().hex[:8].upper()}",
    )
    db.add(payment)
    fee.status = "PAID"
    await db.flush()
    await db.refresh(payment)
    return FeePaymentOut.model_validate(payment)
