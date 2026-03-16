"""Shared JWT + RBAC utilities — used by all 3 backends."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


# ──────────────── Password ────────────────
def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ──────────────── Tokens ────────────────
def create_access_token(
    data: dict[str, Any],
    secret_key: str,
    expires_minutes: int = 30,
) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload["type"] = "access"
    return jwt.encode(payload, secret_key, algorithm=ALGORITHM)


def create_refresh_token(
    data: dict[str, Any],
    secret_key: str,
    expires_days: int = 7,
) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(days=expires_days)
    payload["type"] = "refresh"
    return jwt.encode(payload, secret_key, algorithm=ALGORITHM)


def decode_token(token: str, secret_key: str) -> dict[str, Any]:
    """Raises JWTError on failure."""
    return jwt.decode(token, secret_key, algorithms=[ALGORITHM])


# ──────────────── RBAC ────────────────
ROLE_HIERARCHY: dict[str, int] = {
    "user": 1,
    "manager": 2,
    "admin": 3,
}


def has_role(user_role: str, required_role: str) -> bool:
    return ROLE_HIERARCHY.get(user_role, 0) >= ROLE_HIERARCHY.get(required_role, 0)
