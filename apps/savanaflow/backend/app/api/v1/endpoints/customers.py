"""POS Customers (Loyalty) endpoints — SavanaFlow."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import LoyaltyTransaction, POSCustomer, User
from app.schemas.schemas import LoyaltyAdjust, Paginated, POSCustomerCreate, POSCustomerOut, POSCustomerUpdate

router = APIRouter(prefix="/customers", tags=["Customers — Fidélité"])


@router.get("", response_model=Paginated)
async def list_customers(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None, search: str | None = None,
    tier: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(POSCustomer).where(POSCustomer.is_active == True)
    if store_id:
        q = q.where(POSCustomer.store_id == store_id)
    if search:
        q = q.where(POSCustomer.name.ilike(f"%{search}%") | POSCustomer.phone.ilike(f"%{search}%"))
    if tier:
        q = q.where(POSCustomer.loyalty_tier == tier.upper())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(POSCustomer.total_spent.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[POSCustomerOut.model_validate(c) for c in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/lookup", response_model=POSCustomerOut)
async def lookup_customer(phone: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Quick lookup by phone number — for POS checkout."""
    c = (await db.execute(select(POSCustomer).where(POSCustomer.phone == phone))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    return POSCustomerOut.model_validate(c)


@router.get("/{customer_id}", response_model=POSCustomerOut)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    c = (await db.execute(select(POSCustomer).where(POSCustomer.id == customer_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    return POSCustomerOut.model_validate(c)


@router.post("", response_model=POSCustomerOut, status_code=201)
async def create_customer(data: POSCustomerCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    if data.phone:
        existing = (await db.execute(select(POSCustomer).where(POSCustomer.phone == data.phone))).scalar_one_or_none()
        if existing:
            raise HTTPException(409, f"Customer with phone {data.phone} already exists")
    c = POSCustomer(**data.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return POSCustomerOut.model_validate(c)


@router.put("/{customer_id}", response_model=POSCustomerOut)
async def update_customer(customer_id: int, data: POSCustomerUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    c = (await db.execute(select(POSCustomer).where(POSCustomer.id == customer_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return POSCustomerOut.model_validate(c)


@router.post("/{customer_id}/loyalty/adjust", response_model=POSCustomerOut)
async def adjust_loyalty(
    customer_id: int, data: LoyaltyAdjust,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    """Manually adjust loyalty points (admin correction)."""
    c = (await db.execute(select(POSCustomer).where(POSCustomer.id == customer_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    new_balance = c.loyalty_points + data.points
    if new_balance < 0:
        raise HTTPException(400, f"Cannot reduce below 0 (current: {c.loyalty_points}, adjustment: {data.points})")
    c.loyalty_points = new_balance
    db.add(LoyaltyTransaction(
        customer_id=customer_id,
        points=data.points,
        balance_after=new_balance,
        type="ADJUST",
        description=data.description,
    ))
    await db.commit()
    await db.refresh(c)
    return POSCustomerOut.model_validate(c)


@router.get("/{customer_id}/loyalty/history", response_model=Paginated)
async def loyalty_history(
    customer_id: int, page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    c = (await db.execute(select(POSCustomer).where(POSCustomer.id == customer_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    q = select(LoyaltyTransaction).where(LoyaltyTransaction.customer_id == customer_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(LoyaltyTransaction.created_at.desc()).offset((page - 1) * size).limit(size))
    items = [
        {
            "id": t.id, "points": t.points, "balance_after": t.balance_after,
            "type": t.type, "description": t.description,
            "sale_id": t.sale_id, "created_at": t.created_at.isoformat(),
        }
        for t in result.scalars().all()
    ]
    return Paginated(items=items, total=total, page=page, size=size, pages=max(1, (total + size - 1) // size))
