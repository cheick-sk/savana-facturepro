"""Promotions endpoints — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.all_models import Product, Promotion, PromotionProduct, User
from app.schemas.schemas import Paginated, PromotionCreate, PromotionOut

router = APIRouter(prefix="/promotions", tags=["Promotions"])


@router.get("", response_model=Paginated)
async def list_promotions(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    active_only: bool = False,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Promotion)
    if active_only:
        now = datetime.now(timezone.utc)
        q = q.where(Promotion.is_active == True, Promotion.start_date <= now, Promotion.end_date >= now)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Promotion.end_date).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[PromotionOut.model_validate(p) for p in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/validate/{code}", response_model=dict)
async def validate_promo(code: str, subtotal: float = Query(gt=0), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Validate and preview a promotion code discount."""
    now = datetime.now(timezone.utc)
    promo = (await db.execute(select(Promotion).where(
        Promotion.code == code, Promotion.is_active == True,
        Promotion.start_date <= now, Promotion.end_date >= now,
    ))).scalar_one_or_none()
    if not promo:
        raise HTTPException(404, "Promo code not found or expired")
    if promo.usage_limit and promo.usage_count >= promo.usage_limit:
        raise HTTPException(409, "Promotion code usage limit reached")
    if subtotal < float(promo.min_purchase):
        raise HTTPException(400, f"Minimum purchase: {promo.min_purchase} (provided: {subtotal})")

    discount = 0.0
    if promo.promo_type == "PERCENT":
        discount = round(subtotal * float(promo.value) / 100, 2)
    elif promo.promo_type == "FIXED":
        discount = min(float(promo.value), subtotal)
    if promo.max_discount:
        discount = min(discount, float(promo.max_discount))

    return {
        "valid": True,
        "code": code,
        "promo_type": promo.promo_type,
        "name": promo.name,
        "discount_amount": round(discount, 2),
        "final_total": round(subtotal - discount, 2),
    }


@router.post("", response_model=PromotionOut, status_code=201)
async def create_promotion(data: PromotionCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    if data.start_date >= data.end_date:
        raise HTTPException(400, "end_date must be after start_date")
    if data.code:
        existing = (await db.execute(select(Promotion).where(Promotion.code == data.code))).scalar_one_or_none()
        if existing:
            raise HTTPException(409, f"Promotion code '{data.code}' already exists")

    product_ids = data.product_ids
    promo_data = data.model_dump(exclude={"product_ids"})
    promo = Promotion(**promo_data)
    db.add(promo)
    await db.flush()

    for pid in product_ids:
        prod = (await db.execute(select(Product).where(Product.id == pid))).scalar_one_or_none()
        if prod:
            db.add(PromotionProduct(promotion_id=promo.id, product_id=pid))

    await db.commit()
    await db.refresh(promo)
    return PromotionOut.model_validate(promo)


@router.put("/{promo_id}/toggle", response_model=PromotionOut)
async def toggle_promotion(promo_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    promo = (await db.execute(select(Promotion).where(Promotion.id == promo_id))).scalar_one_or_none()
    if not promo:
        raise HTTPException(404, "Promotion not found")
    promo.is_active = not promo.is_active
    await db.commit()
    await db.refresh(promo)
    return PromotionOut.model_validate(promo)


@router.delete("/{promo_id}", status_code=204)
async def delete_promotion(promo_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    promo = (await db.execute(select(Promotion).where(Promotion.id == promo_id))).scalar_one_or_none()
    if not promo:
        raise HTTPException(404, "Promotion not found")
    promo.is_active = False
    await db.commit()
