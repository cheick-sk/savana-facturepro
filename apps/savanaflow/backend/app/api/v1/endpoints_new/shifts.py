"""Shifts / Cash Register endpoints — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Sale, Shift, Store, User
from app.schemas.schemas import Paginated, ShiftClose, ShiftOpen, ShiftOut

router = APIRouter(prefix="/shifts", tags=["Shifts — Gestion de caisse"])


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
async def get_active_shift(store_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the currently open shift for a store (for the current user)."""
    result = await db.execute(
        select(Shift).where(
            Shift.store_id == store_id,
            Shift.user_id == current_user.id,
            Shift.status == "OPEN",
        )
    )
    s = result.scalar_one_or_none()
    return ShiftOut.model_validate(s) if s else None


@router.get("/{shift_id}", response_model=ShiftOut)
async def get_shift(shift_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Shift).where(Shift.id == shift_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Shift not found")
    return ShiftOut.model_validate(s)


@router.post("/open", response_model=ShiftOut, status_code=201)
async def open_shift(data: ShiftOpen, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Open a new cashier shift."""
    store = (await db.execute(select(Store).where(Store.id == data.store_id))).scalar_one_or_none()
    if not store:
        raise HTTPException(404, "Store not found")

    # Check no open shift for this user/store
    existing = (await db.execute(
        select(Shift).where(Shift.store_id == data.store_id, Shift.user_id == current_user.id, Shift.status == "OPEN")
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(409, f"Shift #{existing.id} is already open for this user/store")

    shift = Shift(
        store_id=data.store_id,
        user_id=current_user.id,
        opening_cash=data.opening_cash,
        notes=data.notes,
        status="OPEN",
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return ShiftOut.model_validate(shift)


@router.post("/{shift_id}/close", response_model=ShiftOut)
async def close_shift(shift_id: int, data: ShiftClose, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Close a shift and compute cash reconciliation."""
    shift = (await db.execute(select(Shift).where(Shift.id == shift_id))).scalar_one_or_none()
    if not shift:
        raise HTTPException(404, "Shift not found")
    if shift.status == "CLOSED":
        raise HTTPException(409, "Shift is already closed")

    # Expected cash = opening + cash sales - refunds
    cash_sales = float((await db.execute(
        select(func.coalesce(func.sum(Sale.total_amount), 0))
        .where(Sale.shift_id == shift_id, Sale.payment_method == "CASH", Sale.status == "COMPLETED")
    )).scalar() or 0)

    expected = round(float(shift.opening_cash) + cash_sales - float(shift.total_refunds), 2)
    difference = round(data.closing_cash - expected, 2)

    shift.closed_at = datetime.now(timezone.utc)
    shift.closing_cash = data.closing_cash
    shift.expected_cash = expected
    shift.cash_difference = difference
    shift.status = "CLOSED"
    if data.notes:
        shift.notes = (shift.notes or "") + f"\nClose: {data.notes}"

    await db.commit()
    await db.refresh(shift)
    return ShiftOut.model_validate(shift)


@router.get("/{shift_id}/summary", response_model=dict)
async def shift_summary(shift_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Detailed Z-report for a shift."""
    shift = (await db.execute(select(Shift).where(Shift.id == shift_id))).scalar_one_or_none()
    if not shift:
        raise HTTPException(404, "Shift not found")

    sales = (await db.execute(select(Sale).where(Sale.shift_id == shift_id))).scalars().all()

    by_method: dict[str, dict] = {}
    for s in sales:
        m = s.payment_method
        if m not in by_method:
            by_method[m] = {"count": 0, "total": 0.0}
        by_method[m]["count"] += 1
        by_method[m]["total"] += float(s.total_amount)

    return {
        "shift_id": shift_id,
        "store_id": shift.store_id,
        "user_id": shift.user_id,
        "status": shift.status,
        "opened_at": shift.opened_at.isoformat(),
        "closed_at": shift.closed_at.isoformat() if shift.closed_at else None,
        "opening_cash": float(shift.opening_cash),
        "closing_cash": float(shift.closing_cash) if shift.closing_cash is not None else None,
        "expected_cash": float(shift.expected_cash) if shift.expected_cash is not None else None,
        "cash_difference": float(shift.cash_difference) if shift.cash_difference is not None else None,
        "total_sales": float(shift.total_sales),
        "total_refunds": float(shift.total_refunds),
        "net_revenue": round(float(shift.total_sales) - float(shift.total_refunds), 2),
        "sales_count": shift.sales_count,
        "by_payment_method": [{"method": m, **v} for m, v in by_method.items()],
    }
