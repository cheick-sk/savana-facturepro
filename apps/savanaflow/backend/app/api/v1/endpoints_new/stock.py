"""Stock management endpoints — SavanaFlow."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Product, ProductVariant, StockMovement, User
from app.schemas.schemas import Paginated, StockAdjust, StockMovementOut

router = APIRouter(prefix="/stock", tags=["Stock"])


@router.post("/adjust", response_model=StockMovementOut, status_code=201)
async def adjust_stock(data: StockAdjust, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = (await db.execute(select(Product).where(Product.id == data.product_id, Product.is_active == True))).scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")

    variant = None
    if data.variant_id:
        variant = (await db.execute(select(ProductVariant).where(ProductVariant.id == data.variant_id))).scalar_one_or_none()
        if not variant:
            raise HTTPException(404, "Variant not found")

    target = variant if variant else product
    qty_before = float(target.stock_quantity)

    if data.movement_type == "IN":
        qty_after = round(qty_before + data.quantity, 4)
    elif data.movement_type == "OUT":
        if qty_before < data.quantity:
            raise HTTPException(400, f"Insufficient stock: {qty_before} available, {data.quantity} requested")
        qty_after = round(qty_before - data.quantity, 4)
    else:  # ADJUST
        qty_after = data.quantity

    target.stock_quantity = qty_after
    if not variant:
        product.stock_quantity = qty_after
    else:
        variant.stock_quantity = qty_after
        # Also update parent product
        all_variants = (await db.execute(select(ProductVariant).where(ProductVariant.product_id == product.id, ProductVariant.is_active == True))).scalars().all()
        total_variant_stock = sum(float(v.stock_quantity) for v in all_variants)
        product.stock_quantity = round(total_variant_stock, 4)

    movement = StockMovement(
        product_id=product.id,
        variant_id=data.variant_id,
        user_id=current_user.id,
        movement_type=data.movement_type,
        quantity=data.quantity,
        reference=data.reference,
        reason=data.reason,
        quantity_before=qty_before,
        quantity_after=qty_after,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return StockMovementOut.model_validate(movement)


@router.get("/movements", response_model=Paginated)
async def list_movements(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    product_id: int | None = None, movement_type: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(StockMovement)
    if product_id:
        q = q.where(StockMovement.product_id == product_id)
    if movement_type:
        q = q.where(StockMovement.movement_type == movement_type)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(StockMovement.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[StockMovementOut.model_validate(m) for m in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/low-stock", response_model=Paginated)
async def low_stock_alert(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    """Get all products below their low stock threshold."""
    q = select(Product).where(
        Product.is_active == True,
        Product.stock_quantity <= Product.low_stock_threshold,
    )
    if store_id:
        q = q.where(Product.store_id == store_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Product.stock_quantity).offset((page - 1) * size).limit(size))
    from app.schemas.schemas import ProductOut
    return Paginated(
        items=[ProductOut.model_validate(p) for p in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )
