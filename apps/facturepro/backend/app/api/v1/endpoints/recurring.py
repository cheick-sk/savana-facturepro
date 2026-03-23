"""Recurring Invoices endpoints — FacturePro Africa."""
from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Customer, RecurringInvoice, User
from app.schemas.schemas import InvoiceOut, Paginated, RecurringCreate, RecurringOut, RecurringUpdate
from app.services.invoice_service import generate_invoice_from_recurring

router = APIRouter(prefix="/recurring", tags=["Recurring Invoices — Facturation récurrente"])


@router.get("", response_model=Paginated)
async def list_recurring(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    active_only: bool = False,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(RecurringInvoice)
    if active_only:
        q = q.where(RecurringInvoice.is_active == True)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(RecurringInvoice.next_run).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[RecurringOut.model_validate(r) for r in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{rec_id}", response_model=RecurringOut)
async def get_recurring(rec_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    r = (await db.execute(select(RecurringInvoice).where(RecurringInvoice.id == rec_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Recurring invoice not found")
    return RecurringOut.model_validate(r)


@router.post("", response_model=RecurringOut, status_code=201)
async def create_recurring(
    data: RecurringCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cust = (await db.execute(select(Customer).where(Customer.id == data.customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(404, "Customer not found")

    template = {
        "currency": data.currency,
        "notes": data.notes,
        "due_days": data.due_days,
        "discount_percent": 0.0,
        "items": [it.model_dump() for it in data.items],
    }
    rec = RecurringInvoice(
        name=data.name,
        customer_id=data.customer_id,
        created_by=current_user.id,
        frequency=data.frequency,
        start_date=data.start_date,
        end_date=data.end_date,
        next_run=data.start_date,
        is_active=True,
        auto_send=data.auto_send,
        template_data=template,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return RecurringOut.model_validate(rec)


@router.put("/{rec_id}", response_model=RecurringOut)
async def update_recurring(rec_id: int, data: RecurringUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    r = (await db.execute(select(RecurringInvoice).where(RecurringInvoice.id == rec_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Recurring invoice not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(r, k, v)
    await db.commit()
    await db.refresh(r)
    return RecurringOut.model_validate(r)


@router.post("/{rec_id}/run", response_model=dict)
async def manually_run_recurring(
    rec_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Manually trigger invoice generation for a recurring subscription."""
    r = (await db.execute(select(RecurringInvoice).where(RecurringInvoice.id == rec_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Recurring invoice not found")
    if not r.is_active:
        raise HTTPException(400, "Recurring invoice is inactive")
    invoice = await generate_invoice_from_recurring(db, r)
    await db.commit()
    return {"message": "Invoice generated", "invoice_id": invoice.id, "invoice_number": invoice.invoice_number}


@router.post("/process-due", response_model=dict)
async def process_due_recurring(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Process all recurring invoices that are due now (for scheduler/cron)."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(RecurringInvoice).where(
            RecurringInvoice.is_active == True,
            RecurringInvoice.next_run <= now,
        )
    )
    due_items = result.scalars().all()
    generated = []
    for r in due_items:
        if r.end_date and now > r.end_date:
            r.is_active = False
            continue
        invoice = await generate_invoice_from_recurring(db, r)
        generated.append({"recurring_id": r.id, "invoice_id": invoice.id, "invoice_number": invoice.invoice_number})
    await db.commit()
    return {"processed": len(generated), "invoices": generated}


@router.delete("/{rec_id}", status_code=204)
async def deactivate_recurring(rec_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    r = (await db.execute(select(RecurringInvoice).where(RecurringInvoice.id == rec_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Recurring invoice not found")
    r.is_active = False
    await db.commit()
