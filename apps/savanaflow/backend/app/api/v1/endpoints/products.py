"""Products + Variants + Stock endpoints — SavanaFlow."""
from __future__ import annotations
import logging
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Product, ProductVariant, StockMovement, User
from app.schemas.schemas import (
    Paginated, ProductCreate, ProductOut, ProductUpdate,
    StockAdjust, StockMovementOut, VariantCreate, VariantOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])


# ── Barcode Generation Utilities ─────────────────────────────────
def calculate_ean13_checksum(code: str) -> str:
    """Calculate EAN-13 checksum digit."""
    if len(code) != 12:
        code = code.zfill(12)[:12]
    total = sum(int(digit) * (1 if i % 2 == 0 else 3) for i, digit in enumerate(code))
    return str((10 - (total % 10)) % 10)


def generate_ean13_barcode(prefix: str = "612") -> str:
    """
    Generate a valid EAN-13 barcode.
    Prefix 612-614 is assigned to Guinea (OBI country code).
    """
    # Generate 9 random digits after the prefix (3 digits)
    random_digits = ''.join([str(random.randint(0, 9)) for _ in range(9)])
    base = prefix + random_digits
    checksum = calculate_ean13_checksum(base)
    return base + checksum


def generate_sku(category_code: str = "GEN") -> str:
    """Generate a unique SKU."""
    date = datetime.now()
    year_code = str(date.year)[2:]
    month_code = str(date.month).zfill(2)
    random_suffix = str(random.randint(0, 9999)).zfill(4)
    return f"{category_code}-{year_code}{month_code}-{random_suffix}"


@router.get("/barcode/generate")
async def generate_barcode(
    prefix: str = Query(default="612", description="EAN-13 prefix (612-614 for Guinea)"),
    category_code: str = Query(default="GEN", description="Category code for SKU"),
    _: User = Depends(get_current_user),
):
    """Generate a new barcode and SKU for a product."""
    return {
        "barcode": generate_ean13_barcode(prefix),
        "sku": generate_sku(category_code),
        "type": "EAN-13",
        "country": "Guinea" if prefix.startswith("61") else "Custom"
    }


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
        q = q.where(
            Product.name.ilike(f"%{search}%") |
            Product.barcode.ilike(f"%{search}%") |
            Product.sku.ilike(f"%{search}%")
        )
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
    p = (await db.execute(select(Product).where(Product.barcode == barcode, Product.is_active == True))).scalar_one_or_none()
    if not p:
        # Check variants
        v = (await db.execute(select(ProductVariant).where(ProductVariant.barcode == barcode))).scalar_one_or_none()
        if v:
            p = (await db.execute(select(Product).where(Product.id == v.product_id))).scalar_one_or_none()
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
    variants_data = data.variants
    p = Product(**data.model_dump(exclude={"variants"}))
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
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
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
    v = ProductVariant(product_id=product_id, **data.model_dump())
    db.add(v)
    p.has_variants = True
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


# ── Stock Movements ────────────────────────────────────────────
@router.post("/stock/adjust", response_model=StockMovementOut, status_code=201)
async def adjust_stock(
    data: StockAdjust,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = (await db.execute(select(Product).where(Product.id == data.product_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")

    qty_before = float(p.stock_quantity)
    if data.movement_type == "IN":
        qty_after = round(qty_before + data.quantity, 4)
    elif data.movement_type == "OUT":
        if qty_before < data.quantity:
            raise HTTPException(400, f"Insufficient stock: {qty_before} available, {data.quantity} requested")
        qty_after = round(qty_before - data.quantity, 4)
    else:  # ADJUST
        qty_after = data.quantity

    p.stock_quantity = qty_after

    if data.variant_id:
        v = (await db.execute(select(ProductVariant).where(ProductVariant.id == data.variant_id))).scalar_one_or_none()
        if v:
            v_before = float(v.stock_quantity)
            v.stock_quantity = round(v_before + (qty_after - qty_before), 4)

    movement = StockMovement(
        product_id=data.product_id,
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


@router.get("/stock/movements", response_model=Paginated)
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
