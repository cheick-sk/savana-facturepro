"""Stores endpoints — SavanaFlow."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.all_models import Store, User
from app.schemas.schemas import StoreCreate, StoreOut, StoreUpdate

router = APIRouter(prefix="/stores", tags=["Stores"])


@router.get("", response_model=list[StoreOut])
async def list_stores(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Store).where(Store.is_active == True).order_by(Store.name))
    return [StoreOut.model_validate(s) for s in result.scalars().all()]


@router.get("/{store_id}", response_model=StoreOut)
async def get_store(store_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Store).where(Store.id == store_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Store not found")
    return StoreOut.model_validate(s)


@router.post("", response_model=StoreOut, status_code=201)
async def create_store(data: StoreCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    s = Store(**data.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return StoreOut.model_validate(s)


@router.put("/{store_id}", response_model=StoreOut)
async def update_store(store_id: int, data: StoreUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    s = (await db.execute(select(Store).where(Store.id == store_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Store not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return StoreOut.model_validate(s)
