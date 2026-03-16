"""Auth endpoints — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.schemas.schemas import LoginRequest, RefreshRequest, TokenResponse, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()
ALGORITHM = "HS256"


def _make_tokens(user: User) -> dict:
    payload = {"sub": str(user.id), "email": user.email, "role": user.role}
    at = {**payload, "type": "access",
          "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)}
    rt = {**payload, "type": "refresh",
          "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)}
    return {
        "access_token": jwt.encode(at, settings.SECRET_KEY, algorithm=ALGORITHM),
        "refresh_token": jwt.encode(rt, settings.SECRET_KEY, algorithm=ALGORITHM),
    }


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    result = await db.execute(select(User).where(User.email == data.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not pwd_ctx.verify(data.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    tokens = _make_tokens(user)
    return TokenResponse(**tokens, token_type="bearer", user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Invalid refresh token")
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found or inactive")
    tokens = _make_tokens(user)
    return TokenResponse(**tokens, token_type="bearer", user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
