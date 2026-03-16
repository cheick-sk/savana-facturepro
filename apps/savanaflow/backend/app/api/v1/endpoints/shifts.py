"""Shifts / Cash Register endpoints — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Sale, Shift, User
from app.schemas.schemas import Paginated, ShiftClose, ShiftOpen, ShiftOut

router = APIRouter(prefix="/shifts", tags=["Shifts — Caisses"])


@router.get("", response_model=Paginated)
async def list_shifts(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None, status: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Shift)
    if store_id:
        q = q.where(Shift.store_id == store_id)
    if status:
        q = q.where(Shift.status == status.upper())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Shift.opened_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[ShiftOut.model_validate(s) for s in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/active", response_model=ShiftOut | None)
async def get_active_shift(
    store_id: int | None = None,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Get the currently open shift for this user/store."""
    q = select(Shift).where(Shift.status == "OPEN", Shift.user_id == current_user.id)
    if store_id:
        q = q.where(Shift.store_id == store_id)
    s = (await db.execute(q)).scalar_one_or_none()
    return ShiftOut.model_validate(s) if s else None


@router.get("/{shift_id}", response_model=ShiftOut)
async def get_shift(shift_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Shift).where(Shift.id == shift_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Shift not found")
    return ShiftOut.model_validate(s)


@router.post("/open", response_model=ShiftOut, status_code=201)
async def open_shift(
    data: ShiftOpen,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check no open shift for this user in this store
    existing = (await db.execute(
        select(Shift).where(Shift.store_id == data.store_id, Shift.user_id == current_user.id, Shift.status == "OPEN")
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(409, f"You already have an open shift (ID: {existing.id}). Close it first.")

    s = Shift(
        store_id=data.store_id,
        user_id=current_user.id,
        opening_cash=data.opening_cash,
        notes=data.notes,
        status="OPEN",
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return ShiftOut.model_validate(s)


@router.post("/{shift_id}/close", response_model=ShiftOut)
async def close_shift(
    shift_id: int, data: ShiftClose,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    s = (await db.execute(select(Shift).where(Shift.id == shift_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Shift not found")
    if s.status == "CLOSED":
        raise HTTPException(409, "Shift is already closed")
    if s.user_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "You can only close your own shift")

    # Calculate expected cash: opening + cash sales - cash refunds
    cash_sales_res = await db.execute(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(
            Sale.shift_id == shift_id, Sale.payment_method == "CASH", Sale.status == "COMPLETED"
        )
    )
    cash_refunds_res = await db.execute(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(
            Sale.shift_id == shift_id, Sale.status == "REFUNDED"
        )
    )
    expected = round(
        float(s.opening_cash) +
        float(cash_sales_res.scalar() or 0) -
        float(cash_refunds_res.scalar() or 0),
        2,
    )
    difference = round(data.closing_cash - expected, 2)

    s.closing_cash = data.closing_cash
    s.expected_cash = expected
    s.cash_difference = difference
    s.closed_at = datetime.now(timezone.utc)
    s.status = "CLOSED"
    if data.notes:
        s.notes = (s.notes or "") + f"\nClose: {data.notes}"

    await db.commit()
    await db.refresh(s)
    return ShiftOut.model_validate(s)


@router.get("/{shift_id}/summary", response_model=dict)
async def shift_summary(shift_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Shift).where(Shift.id == shift_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Shift not found")

    sales_res = await db.execute(
        select(
            Sale.payment_method,
            func.count(Sale.id).label("count"),
            func.sum(Sale.total_amount).label("total"),
        )
        .where(Sale.shift_id == shift_id, Sale.status == "COMPLETED")
        .group_by(Sale.payment_method)
    )
    by_method = [
        {"method": r.payment_method, "count": r.count, "total": round(float(r.total), 2)}
        for r in sales_res.all()
    ]
    return {
        "shift_id": shift_id,
        "status": s.status,
        "opened_at": s.opened_at.isoformat(),
        "closed_at": s.closed_at.isoformat() if s.closed_at else None,
        "opening_cash": float(s.opening_cash),
        "total_sales": float(s.total_sales),
        "sales_count": s.sales_count,
        "by_payment_method": by_method,
        "closing_cash": float(s.closing_cash) if s.closing_cash is not None else None,
        "expected_cash": float(s.expected_cash) if s.expected_cash is not None else None,
        "cash_difference": float(s.cash_difference) if s.cash_difference is not None else None,
    }
