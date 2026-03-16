"""Products endpoints — FacturePro Africa (updated with categories, suppliers, SKU search)."""
from __future__ import annotations
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Product, User
from app.schemas.schemas import Paginated, ProductCreate, ProductOut, ProductUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=Paginated)
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category_id: int | None = None,
    supplier_id: int | None = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Product)
    if active_only:
        q = q.where(Product.is_active == True)
    if category_id:
        q = q.where(Product.category_id == category_id)
    if supplier_id:
        q = q.where(Product.supplier_id == supplier_id)
    if search:
        q = q.where(
            Product.name.ilike(f"%{search}%") |
            Product.sku.ilike(f"%{search}%") |
            Product.barcode.ilike(f"%{search}%")
        )
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Product.name).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[ProductOut.model_validate(p) for p in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/barcode/{barcode}", response_model=ProductOut)
async def lookup_barcode(barcode: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Product).where(Product.barcode == barcode))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, f"Product with barcode '{barcode}' not found")
    return ProductOut.model_validate(p)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    return ProductOut.model_validate(p)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Check SKU uniqueness
    if data.sku:
        existing = (await db.execute(select(Product).where(Product.sku == data.sku))).scalar_one_or_none()
        if existing:
            raise HTTPException(409, f"SKU '{data.sku}' already exists")
    if data.barcode:
        existing = (await db.execute(select(Product).where(Product.barcode == data.barcode))).scalar_one_or_none()
        if existing:
            raise HTTPException(409, f"Barcode '{data.barcode}' already exists")

    p = Product(**data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return ProductOut.model_validate(p)


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return ProductOut.model_validate(p)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    p.is_active = False
    await db.commit()
