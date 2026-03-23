"""Categories (hiérarchiques) endpoints — SavanaFlow."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Category, User
from app.schemas.schemas import CategoryCreate, CategoryOut

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Category).where(Category.is_active == True).order_by(Category.sort_order, Category.name))
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    c = Category(**data.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return CategoryOut.model_validate(c)


@router.put("/{cat_id}", response_model=CategoryOut)
async def update_category(cat_id: int, data: CategoryCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    c = (await db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Category not found")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return CategoryOut.model_validate(c)


@router.delete("/{cat_id}", status_code=204)
async def delete_category(cat_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    c = (await db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Category not found")
    c.is_active = False
    await db.commit()
