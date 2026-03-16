"""Product categories endpoints — FacturePro Africa."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import ProductCategory, User
from app.schemas.schemas import ProductCategoryCreate, ProductCategoryOut, ProductCategoryUpdate

router = APIRouter(prefix="/product-categories", tags=["Product Categories"])


@router.get("", response_model=list[ProductCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(ProductCategory).where(ProductCategory.is_active == True).order_by(ProductCategory.name))
    return [ProductCategoryOut.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=ProductCategoryOut, status_code=201)
async def create_category(data: ProductCategoryCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    cat = ProductCategory(**data.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return ProductCategoryOut.model_validate(cat)


@router.put("/{cat_id}", response_model=ProductCategoryOut)
async def update_category(cat_id: int, data: ProductCategoryUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    cat = (await db.execute(select(ProductCategory).where(ProductCategory.id == cat_id))).scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Category not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    await db.commit()
    await db.refresh(cat)
    return ProductCategoryOut.model_validate(cat)


@router.delete("/{cat_id}", status_code=204)
async def delete_category(cat_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    cat = (await db.execute(select(ProductCategory).where(ProductCategory.id == cat_id))).scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Category not found")
    cat.is_active = False
    await db.commit()
