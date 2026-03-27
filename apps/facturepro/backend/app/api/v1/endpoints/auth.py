"""Auth endpoints: login, refresh, register, logout."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

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
    """Generate access and refresh tokens with unique JTI."""
    import uuid as uuid_module
    
    access_jti = str(uuid_module.uuid4())
    refresh_jti = str(uuid_module.uuid4())
    
    now = datetime.now(timezone.utc)
    
    access_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "type": "access",
        "jti": access_jti,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())
    }
    
    refresh_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "type": "refresh",
        "jti": refresh_jti,
        "access_jti": access_jti,  # Link to access token for rotation
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).timestamp())
    }

    access = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    refresh = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "access_jti": access_jti,
        "refresh_jti": refresh_jti
    }


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Login endpoint with password verification and token generation."""
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    result = await db.execute(
        select(User).where(User.email == data.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user or not pwd_ctx.verify(data.password, user.hashed_password):
        # Log failed attempt
        logger.warning(f"Failed login attempt for email: {data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )

    tokens = _make_tokens(user)
    
    # Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="LOGIN",
        resource="auth",
        ip_address=request.client.host if request.client else None,
        details=f"Login successful, access_jti: {tokens['access_jti']}"
    ))
    
    await db.commit()
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=UserOut.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    from app.services.token_blacklist import get_token_blacklist
    
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de rafraîchissement invalide"
    )
    
    try:
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "refresh":
            raise exc
        
        refresh_jti = payload.get("jti")
        user_id = payload.get("sub")
        
        # Check if token is blacklisted
        try:
            blacklist = await get_token_blacklist()
            if await blacklist.is_blacklisted(refresh_jti):
                logger.warning(f"Blacklisted refresh token used: {refresh_jti}")
                raise exc
        except RuntimeError:
            # Blacklist not initialized, skip check (development mode)
            pass
        
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise exc

    result = await db.execute(
        select(User).where(User.id == int(user_id), User.is_active == True)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise exc

    # Generate new tokens
    tokens = _make_tokens(user)
    
    # Blacklist old refresh token (rotation)
    try:
        blacklist = await get_token_blacklist()
        # Calculate remaining time for old token
        old_exp = payload.get("exp", 0)
        now = int(datetime.now(timezone.utc).timestamp())
        remaining_ttl = max(0, old_exp - now)
        
        if remaining_ttl > 0:
            await blacklist.blacklist_token(
                token_jti=refresh_jti,
                user_id=user.id,
                expires_in_seconds=remaining_ttl,
                reason="token_rotation"
            )
    except RuntimeError:
        pass  # Blacklist not initialized
    
    # Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="TOKEN_REFRESH",
        resource="auth",
        ip_address=request.client.host if request.client else None
    ))
    
    await db.commit()
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=UserOut.model_validate(user)
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout endpoint - blacklists the current access token."""
    from app.services.token_blacklist import get_token_blacklist
    
    # Get token from Authorization header
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant"
        )
    
    token = auth_header.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp", 0)
        
        # Calculate remaining TTL
        now = int(datetime.now(timezone.utc).timestamp())
        remaining_ttl = max(0, exp - now)
        
        # Blacklist the token
        try:
            blacklist = await get_token_blacklist()
            if remaining_ttl > 0:
                await blacklist.blacklist_token(
                    token_jti=jti,
                    user_id=current_user.id,
                    expires_in_seconds=remaining_ttl,
                    reason="logout"
                )
        except RuntimeError:
            pass  # Blacklist not initialized
        
        # Audit log
        db.add(AuditLog(
            user_id=current_user.id,
            action="LOGOUT",
            resource="auth",
            ip_address=request.client.host if request.client else None
        ))
        
        await db.commit()
        
        return {"message": "Déconnexion réussie"}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )


@router.post("/logout-all")
async def logout_all_devices(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout from all devices - blacklists all user tokens."""
    from app.services.token_blacklist import get_token_blacklist
    
    try:
        blacklist = await get_token_blacklist()
        count = await blacklist.blacklist_all_user_tokens(
            user_id=current_user.id,
            reason="logout_all"
        )
    except RuntimeError:
        count = 0  # Blacklist not initialized
    
    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="LOGOUT_ALL",
        resource="auth",
        ip_address=request.client.host if request.client else None,
        details=f"Invalidated {count} tokens"
    ))
    
    await db.commit()
    
    return {"message": f"Déconnexion de tous les appareils réussie ({count} sessions fermées)"}


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet email est déjà enregistré"
        )

    user = User(
        email=data.email,
        hashed_password=pwd_ctx.hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="REGISTER",
        resource="auth"
    ))
    await db.commit()
    
    return UserOut.model_validate(user)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return UserOut.model_validate(current_user)
