"""Suppliers endpoints — FacturePro Africa."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.all_models import Supplier, User
from app.schemas.schemas import Paginated, SupplierCreate, SupplierOut, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["Suppliers — Fournisseurs"])


@router.get("", response_model=Paginated)
async def list_suppliers(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    search: str | None = None, active_only: bool = True,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Supplier)
    if active_only:
        q = q.where(Supplier.is_active == True)
    if search:
        q = q.where(Supplier.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Supplier.name).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[SupplierOut.model_validate(s) for s in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Supplier not found")
    return SupplierOut.model_validate(s)


@router.post("", response_model=SupplierOut, status_code=201)
async def create_supplier(data: SupplierCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = Supplier(**data.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return SupplierOut.model_validate(s)


@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(supplier_id: int, data: SupplierUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Supplier not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return SupplierOut.model_validate(s)


@router.delete("/{supplier_id}", status_code=204)
async def delete_supplier(supplier_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    s = (await db.execute(select(Supplier).where(Supplier.id == supplier_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Supplier not found")
    s.is_active = False
    await db.commit()
