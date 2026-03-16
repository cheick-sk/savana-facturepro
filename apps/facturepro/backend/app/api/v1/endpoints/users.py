"""User management (admin only)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.all_models import User
from app.schemas.schemas import Paginated, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("", response_model=Paginated)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    total_res = await db.execute(select(func.count()).select_from(User))
    total = int(total_res.scalar() or 0)
    result = await db.execute(select(User).offset((page - 1) * size).limit(size))
    users = result.scalars().all()
    return Paginated(
        items=[UserOut.model_validate(u) for u in users],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")
    user = User(
        email=data.email,
        hashed_password=pwd_ctx.hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.flush()
    await db.refresh(user)
    return UserOut.model_validate(user)
