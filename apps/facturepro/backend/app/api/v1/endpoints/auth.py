"""Auth endpoints: login, refresh, register."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import AuditLog, User
from app.schemas.schemas import LoginRequest, RefreshRequest, TokenResponse, UserCreate, UserOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

ALGORITHM = "HS256"


def _make_tokens(user: User) -> dict:
    from datetime import datetime, timedelta, timezone
    payload = {"sub": str(user.id), "email": user.email, "role": user.role}

    access_payload = {**payload, "type": "access",
                      "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)}
    refresh_payload = {**payload, "type": "refresh",
                       "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)}

    access = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    refresh = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": access, "refresh_token": refresh}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    result = await db.execute(select(User).where(User.email == data.email, User.is_active == True))
    user = result.scalar_one_or_none()

    if not user or not pwd_ctx.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    tokens = _make_tokens(user)
    db.add(AuditLog(user_id=user.id, action="LOGIN", resource="auth",
                    ip_address=request.client.host if request.client else None))
    return TokenResponse(**tokens, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    try:
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise exc
        user_id = payload.get("sub")
    except JWTError:
        raise exc

    result = await db.execute(select(User).where(User.id == int(user_id), User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise exc

    tokens = _make_tokens(user)
    return TokenResponse(**tokens, user=UserOut.model_validate(user))


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

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


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
