"""Products + Variants endpoints — SavanaFlow."""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Product, ProductVariant, User
from app.schemas.schemas import (
    Paginated, ProductCreate, ProductOut, ProductUpdate, VariantCreate, VariantOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=Paginated)
async def list_products(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None, category_id: int | None = None,
    search: str | None = None, low_stock: bool = False,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Product)
    if active_only:
        q = q.where(Product.is_active == True)
    if store_id:
        q = q.where(Product.store_id == store_id)
    if category_id:
        q = q.where(Product.category_id == category_id)
    if search:
        q = q.where(or_(
            Product.name.ilike(f"%{search}%"),
            Product.barcode.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%"),
        ))
    if low_stock:
        q = q.where(Product.stock_quantity <= Product.low_stock_threshold)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Product.name).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[ProductOut.model_validate(p) for p in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/barcode/{barcode}", response_model=ProductOut)
async def lookup_barcode(barcode: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    # First check product barcodes
    p = (await db.execute(select(Product).where(Product.barcode == barcode, Product.is_active == True))).scalar_one_or_none()
    if p:
        return ProductOut.model_validate(p)
    # Check variant barcodes
    v = (await db.execute(select(ProductVariant).where(ProductVariant.barcode == barcode, ProductVariant.is_active == True))).scalar_one_or_none()
    if v:
        p2 = (await db.execute(select(Product).where(Product.id == v.product_id))).scalar_one_or_none()
        if p2:
            return ProductOut.model_validate(p2)
    raise HTTPException(404, f"No product found for barcode '{barcode}'")


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    return ProductOut.model_validate(p)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    variants_data = data.variants
    product_data = data.model_dump(exclude={"variants"})
    p = Product(**product_data)
    db.add(p)
    await db.flush()

    for v in variants_data:
        db.add(ProductVariant(product_id=p.id, **v.model_dump()))

    await db.commit()
    await db.refresh(p)
    return ProductOut.model_validate(p)


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, data: ProductUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return ProductOut.model_validate(p)


@router.delete("/{product_id}", status_code=204)
async def deactivate_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    p.is_active = False
    await db.commit()


# ── Variants ───────────────────────────────────────────────────
@router.get("/{product_id}/variants", response_model=list[VariantOut])
async def list_variants(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(ProductVariant).where(ProductVariant.product_id == product_id, ProductVariant.is_active == True))
    return [VariantOut.model_validate(v) for v in result.scalars().all()]


@router.post("/{product_id}/variants", response_model=VariantOut, status_code=201)
async def add_variant(product_id: int, data: VariantCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    p.has_variants = True
    v = ProductVariant(product_id=product_id, **data.model_dump())
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return VariantOut.model_validate(v)


@router.put("/{product_id}/variants/{variant_id}", response_model=VariantOut)
async def update_variant(product_id: int, variant_id: int, data: VariantCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    v = (await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id, ProductVariant.product_id == product_id))).scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Variant not found")
    for k, val in data.model_dump().items():
        setattr(v, k, val)
    await db.commit()
    await db.refresh(v)
    return VariantOut.model_validate(v)


@router.delete("/{product_id}/variants/{variant_id}", status_code=204)
async def delete_variant(product_id: int, variant_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    v = (await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id, ProductVariant.product_id == product_id))).scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Variant not found")
    v.is_active = False
    await db.commit()
