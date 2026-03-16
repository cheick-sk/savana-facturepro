"""Promotions endpoints — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Promotion, PromotionProduct, User
from app.schemas.schemas import Paginated, PromotionCreate, PromotionOut

router = APIRouter(prefix="/promotions", tags=["Promotions"])


@router.get("", response_model=Paginated)
async def list_promotions(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=50),
    active_only: bool = False,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    q = select(Promotion)
    if active_only:
        q = q.where(Promotion.is_active == True, Promotion.start_date <= now, Promotion.end_date >= now)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Promotion.end_date).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[PromotionOut.model_validate(p) for p in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/validate/{code}", response_model=PromotionOut)
async def validate_promo_code(code: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Validate a promotion code at POS checkout."""
    now = datetime.now(timezone.utc)
    p = (await db.execute(
        select(Promotion).where(
            Promotion.code == code,
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now,
        )
    )).scalar_one_or_none()
    if not p:
        raise HTTPException(404, f"Promotion code '{code}' is invalid or expired")
    if p.usage_limit and p.usage_count >= p.usage_limit:
        raise HTTPException(409, "Promotion has reached its usage limit")
    return PromotionOut.model_validate(p)


@router.get("/{promo_id}", response_model=PromotionOut)
async def get_promotion(promo_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Promotion).where(Promotion.id == promo_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Promotion not found")
    return PromotionOut.model_validate(p)


@router.post("", response_model=PromotionOut, status_code=201)
async def create_promotion(
    data: PromotionCreate,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    if data.start_date >= data.end_date:
        raise HTTPException(400, "end_date must be after start_date")
    if data.code:
        existing = (await db.execute(select(Promotion).where(Promotion.code == data.code))).scalar_one_or_none()
        if existing:
            raise HTTPException(409, f"Promotion code '{data.code}' already exists")

    product_ids = data.product_ids
    p = Promotion(**data.model_dump(exclude={"product_ids"}))
    db.add(p)
    await db.flush()

    for pid in product_ids:
        db.add(PromotionProduct(promotion_id=p.id, product_id=pid))

    await db.commit()
    await db.refresh(p)
    return PromotionOut.model_validate(p)


@router.put("/{promo_id}/deactivate", response_model=PromotionOut)
async def deactivate_promotion(promo_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Promotion).where(Promotion.id == promo_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Promotion not found")
    p.is_active = False
    await db.commit()
    await db.refresh(p)
    return PromotionOut.model_validate(p)
