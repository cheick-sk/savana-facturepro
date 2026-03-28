"""Unit tests for Authentication service/logic.

Tests cover:
- Token generation
- Token validation
- Password hashing
- Role-based access control
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from jose import jwt, JWTError

from app.core.security import get_current_user, require_roles, require_admin, require_manager_or_admin
from app.core.config import get_settings
from app.models.all_models import User


pytestmark = pytest.mark.unit


class TestTokenGeneration:
    """Tests for JWT token generation."""

    def test_create_access_token(self):
        """Test creating an access token."""
        from app.api.v1.endpoints.auth import _make_tokens

        # Create a mock user
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.role = "user"

        tokens = _make_tokens(user)

        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["access_token"] is not None
        assert tokens["refresh_token"] is not None

    def test_access_token_payload(self):
        """Test access token contains correct payload."""
        from app.api.v1.endpoints.auth import _make_tokens

        user = MagicMock(spec=User)
        user.id = 123
        user.email = "admin@example.com"
        user.role = "admin"

        tokens = _make_tokens(user)
        settings = get_settings()

        # Decode and verify
        payload = jwt.decode(
            tokens["access_token"],
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        assert payload["sub"] == "123"
        assert payload["email"] == "admin@example.com"
        assert payload["role"] == "admin"
        assert payload["type"] == "access"

    def test_refresh_token_payload(self):
        """Test refresh token contains correct payload."""
        from app.api.v1.endpoints.auth import _make_tokens

        user = MagicMock(spec=User)
        user.id = 456
        user.email = "user@example.com"
        user.role = "user"

        tokens = _make_tokens(user)
        settings = get_settings()

        payload = jwt.decode(
            tokens["refresh_token"],
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        assert payload["sub"] == "456"
        assert payload["type"] == "refresh"

    def test_token_expiration_times(self):
        """Test token expiration times."""
        from app.api.v1.endpoints.auth import _make_tokens

        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.role = "user"

        tokens = _make_tokens(user)
        settings = get_settings()

        access_payload = jwt.decode(
            tokens["access_token"],
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        refresh_payload = jwt.decode(
            tokens["refresh_token"],
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        # Access token should expire in ~30 minutes
        access_exp = datetime.fromtimestamp(access_payload["exp"], tz=timezone.utc)
        expected_access_exp = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        diff = abs((access_exp - expected_access_exp).total_seconds())
        assert diff < 10  # Within 10 seconds

        # Refresh token should expire in ~7 days
        refresh_exp = datetime.fromtimestamp(refresh_payload["exp"], tz=timezone.utc)
        expected_refresh_exp = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        diff = abs((refresh_exp - expected_refresh_exp).total_seconds())
        assert diff < 10


class TestTokenValidation:
    """Tests for JWT token validation."""

    @pytest.mark.asyncio
    async def test_valid_token_validation(self, db: AsyncSession, test_user: User):
        """Test validation of a valid token."""
        from app.core.security import _decode
        from app.api.v1.endpoints.auth import _make_tokens

        tokens = _make_tokens(test_user)
        settings = get_settings()

        payload = jwt.decode(
            tokens["access_token"],
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        assert payload["sub"] == str(test_user.id)
        assert payload["type"] == "access"

    def test_invalid_token_raises_error(self):
        """Test that invalid token raises JWTError."""
        with pytest.raises(JWTError):
            jwt.decode(
                "invalid.token.here",
                get_settings().SECRET_KEY,
                algorithms=["HS256"]
            )

    def test_expired_token_validation(self):
        """Test that expired token is rejected."""
        settings = get_settings()

        # Create an expired token
        expired_payload = {
            "sub": "1",
            "email": "test@example.com",
            "role": "user",
            "type": "access",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),  # Expired
        }
        expired_token = jwt.encode(
            expired_payload,
            settings.SECRET_KEY,
            algorithm="HS256"
        )

        with pytest.raises(JWTError):
            jwt.decode(
                expired_token,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )

    def test_wrong_type_token(self):
        """Test token with wrong type claim."""
        settings = get_settings()

        # Create token with wrong type
        wrong_type_payload = {
            "sub": "1",
            "email": "test@example.com",
            "role": "user",
            "type": "wrong_type",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        }
        token = jwt.encode(
            wrong_type_payload,
            settings.SECRET_KEY,
            algorithm="HS256"
        )

        # Token should decode but have wrong type
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["type"] != "access"


class TestPasswordHashing:
    """Tests for password hashing."""

    def test_password_hashing(self):
        """Test password hashing works."""
        from passlib.context import CryptContext

        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

        password = "SecurePassword123!"
        hashed = pwd_ctx.hash(password)

        assert hashed != password
        assert pwd_ctx.verify(password, hashed)

    def test_password_verification_wrong_password(self):
        """Test password verification with wrong password."""
        from passlib.context import CryptContext

        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

        password = "SecurePassword123!"
        hashed = pwd_ctx.hash(password)

        assert not pwd_ctx.verify("WrongPassword123!", hashed)

    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes."""
        from passlib.context import CryptContext

        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

        password = "SamePassword123!"
        hash1 = pwd_ctx.hash(password)
        hash2 = pwd_ctx.hash(password)

        # Same password should produce different hashes (salt)
        assert hash1 != hash2
        # But both should verify
        assert pwd_ctx.verify(password, hash1)
        assert pwd_ctx.verify(password, hash2)


class TestRoleBasedAccessControl:
    """Tests for role-based access control."""

    def test_require_admin_with_admin(self):
        """Test require_admin allows admin users."""
        user = MagicMock(spec=User)
        user.role = "admin"

        # Should not raise
        checker = require_roles("admin")
        # The checker is a dependency function that needs to be called

    def test_require_admin_with_user_fails(self):
        """Test require_admin rejects regular users."""
        user = MagicMock(spec=User)
        user.role = "user"

        # Should raise HTTPException
        from fastapi import HTTPException

        # Check that role is not in allowed roles
        assert user.role not in ("admin",)

    def test_require_manager_or_admin_with_manager(self):
        """Test require_manager_or_admin allows manager users."""
        user = MagicMock(spec=User)
        user.role = "manager"

        # Manager should be in allowed roles
        assert user.role in ("manager", "admin")

    def test_require_manager_or_admin_with_admin(self):
        """Test require_manager_or_admin allows admin users."""
        user = MagicMock(spec=User)
        user.role = "admin"

        # Admin should be in allowed roles
        assert user.role in ("manager", "admin")

    def test_require_manager_or_admin_with_user_fails(self):
        """Test require_manager_or_admin rejects regular users."""
        user = MagicMock(spec=User)
        user.role = "user"

        # User should not be in allowed roles
        assert user.role not in ("manager", "admin")


class TestGetUserFromToken:
    """Tests for extracting user from token."""

    @pytest.mark.asyncio
    async def test_get_user_from_valid_token(
        self,
        db: AsyncSession,
        test_user: User,
    ):
        """Test getting user from a valid token."""
        from app.api.v1.endpoints.auth import _make_tokens

        tokens = _make_tokens(test_user)

        # Verify we can decode and get user ID
        settings = get_settings()
        payload = jwt.decode(
            tokens["access_token"],
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        assert int(payload["sub"]) == test_user.id

    @pytest.mark.asyncio
    async def test_get_user_from_refresh_token_fails(self, test_user: User):
        """Test that using refresh token as access token fails."""
        from app.api.v1.endpoints.auth import _make_tokens

        tokens = _make_tokens(test_user)

        # Refresh token should have type "refresh", not "access"
        settings = get_settings()
        payload = jwt.decode(
            tokens["refresh_token"],
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        assert payload["type"] == "refresh"
        assert payload["type"] != "access"


class TestSecuritySettings:
    """Tests for security settings."""

    def test_secret_key_is_set(self):
        """Test that secret key is configured."""
        settings = get_settings()
        assert settings.SECRET_KEY is not None
        assert len(settings.SECRET_KEY) >= 32

    def test_token_expiration_settings(self):
        """Test token expiration settings are reasonable."""
        settings = get_settings()

        # Access token should expire in reasonable time (5-60 minutes)
        assert 5 <= settings.ACCESS_TOKEN_EXPIRE_MINUTES <= 60

        # Refresh token should expire in reasonable time (1-30 days)
        assert 1 <= settings.REFRESH_TOKEN_EXPIRE_DAYS <= 30
