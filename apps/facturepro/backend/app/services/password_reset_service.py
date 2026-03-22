"""Password Reset and Email Verification Service.

Provides:
- Password reset token generation and validation
- Email verification tokens
- Secure token storage with expiration
"""
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy import and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import get_settings
from app.core.security import get_password_hash, verify_password
from app.models.all_models import User

logger = logging.getLogger(__name__)


class TokenType:
    """Token type constants."""
    PASSWORD_RESET = "password_reset"
    EMAIL_VERIFICATION = "email_verification"
    MAGIC_LINK = "magic_link"


class TokenService:
    """Service for managing verification and reset tokens."""

    # Token expiration times (in hours)
    TOKEN_EXPIRY = {
        TokenType.PASSWORD_RESET: 24,
        TokenType.EMAIL_VERIFICATION: 72,  # 3 days
        TokenType.MAGIC_LINK: 1,
    }

    def __init__(self, db: AsyncSession):
        """Initialize token service.

        Args:
            db: Database session
        """
        self.db = db
        self.settings = get_settings()

    def _generate_token(self) -> str:
        """Generate a secure random token.

        Returns:
            URL-safe token string
        """
        return secrets.token_urlsafe(32)

    def _hash_token(self, token: str) -> str:
        """Hash a token for secure storage.

        Args:
            token: Plain text token

        Returns:
            Hashed token
        """
        return hashlib.sha256(token.encode()).hexdigest()

    def _get_token_expiry(self, token_type: str) -> datetime:
        """Get expiration datetime for a token type.

        Args:
            token_type: Type of token

        Returns:
            Expiration datetime
        """
        hours = self.TOKEN_EXPIRY.get(token_type, 24)
        return datetime.utcnow() + timedelta(hours=hours)

    async def create_token(
        self,
        user_id: int,
        token_type: str,
    ) -> Tuple[str, datetime]:
        """Create a new token for a user.

        Args:
            user_id: User ID
            token_type: Type of token (password_reset, email_verification)

        Returns:
            Tuple of (plain_token, expires_at)
        """
        # Generate token
        plain_token = self._generate_token()
        hashed_token = self._hash_token(plain_token)
        expires_at = self._get_token_expiry(token_type)

        # Invalidate any existing tokens of this type for the user
        await self._invalidate_user_tokens(user_id, token_type)

        # Store token (using a simple in-memory or Redis store)
        # For production, use Redis or a dedicated tokens table
        await self._store_token(user_id, token_type, hashed_token, expires_at)

        return plain_token, expires_at

    async def verify_token(
        self,
        token: str,
        token_type: str,
        user_id: Optional[int] = None,
    ) -> Optional[int]:
        """Verify a token and return the associated user ID.

        Args:
            token: Plain text token to verify
            token_type: Expected token type
            user_id: Optional user ID to match

        Returns:
            User ID if valid, None otherwise
        """
        hashed_token = self._hash_token(token)

        # Look up token
        stored = await self._get_stored_token(hashed_token, token_type)

        if not stored:
            logger.warning(f"Token not found: {token_type}")
            return None

        stored_user_id, stored_type, expires_at = stored

        # Verify token type
        if stored_type != token_type:
            logger.warning(f"Token type mismatch: expected {token_type}, got {stored_type}")
            return None

        # Verify not expired
        if datetime.utcnow() > expires_at:
            logger.warning(f"Token expired: {token_type}")
            await self._delete_token(hashed_token)
            return None

        # Verify user ID if provided
        if user_id and stored_user_id != user_id:
            logger.warning(f"User ID mismatch for token")
            return None

        return stored_user_id

    async def invalidate_token(self, token: str, token_type: str) -> bool:
        """Invalidate a token after use.

        Args:
            token: Token to invalidate
            token_type: Token type

        Returns:
            True if invalidated successfully
        """
        hashed_token = self._hash_token(token)
        return await self._delete_token(hashed_token)

    async def _store_token(
        self,
        user_id: int,
        token_type: str,
        hashed_token: str,
        expires_at: datetime,
    ) -> None:
        """Store token in database.

        For production, use Redis for better performance.
        """
        # Using a simple dict-based cache for demo
        # In production, use Redis or a tokens table
        import asyncio

        if not hasattr(self.__class__, '_token_store'):
            self.__class__._token_store = {}

        key = f"{token_type}:{hashed_token}"
        self.__class__._token_store[key] = {
            "user_id": user_id,
            "token_type": token_type,
            "expires_at": expires_at,
        }

    async def _get_stored_token(
        self,
        hashed_token: str,
        token_type: str,
    ) -> Optional[Tuple[int, str, datetime]]:
        """Get stored token data."""
        import asyncio

        if not hasattr(self.__class__, '_token_store'):
            self.__class__._token_store = {}

        key = f"{token_type}:{hashed_token}"
        data = self.__class__._token_store.get(key)

        if data:
            return (data["user_id"], data["token_type"], data["expires_at"])
        return None

    async def _delete_token(self, hashed_token: str) -> bool:
        """Delete a token from storage."""
        if not hasattr(self.__class__, '_token_store'):
            self.__class__._token_store = {}

        # Find and delete token by hashed value
        keys_to_delete = [
            k for k in self.__class__._token_store
            if hashed_token in k
        ]

        for key in keys_to_delete:
            del self.__class__._token_store[key]

        return len(keys_to_delete) > 0

    async def _invalidate_user_tokens(self, user_id: int, token_type: str) -> None:
        """Invalidate all tokens of a type for a user."""
        if not hasattr(self.__class__, '_token_store'):
            self.__class__._token_store = {}

        keys_to_delete = [
            k for k, v in self.__class__._token_store.items()
            if v.get("user_id") == user_id and v.get("token_type") == token_type
        ]

        for key in keys_to_delete:
            del self.__class__._token_store[key]


class PasswordResetService:
    """Service for password reset operations."""

    def __init__(self, db: AsyncSession):
        """Initialize password reset service.

        Args:
            db: Database session
        """
        self.db = db
        self.token_service = TokenService(db)

    async def request_password_reset(
        self,
        email: str,
    ) -> Optional[Tuple[str, datetime]]:
        """Request a password reset for an email.

        Args:
            email: User's email address

        Returns:
            Tuple of (reset_token, expires_at) if user found, None otherwise
        """
        # Find user by email
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()

        if not user:
            # Don't reveal whether user exists
            logger.info(f"Password reset requested for unknown email: {email}")
            return None

        # Generate reset token
        token, expires_at = await self.token_service.create_token(
            user.id,
            TokenType.PASSWORD_RESET,
        )

        # Get user name for email
        user_name = f"{user.first_name} {user.last_name}".strip() or user.email

        logger.info(f"Password reset token created for user {user.id}")

        return token, expires_at, user_name, user.email

    async def verify_reset_token(
        self,
        token: str,
    ) -> Optional[int]:
        """Verify a password reset token.

        Args:
            token: Reset token to verify

        Returns:
            User ID if valid, None otherwise
        """
        return await self.token_service.verify_token(
            token,
            TokenType.PASSWORD_RESET,
        )

    async def reset_password(
        self,
        token: str,
        new_password: str,
    ) -> bool:
        """Reset a user's password using a reset token.

        Args:
            token: Valid reset token
            new_password: New password to set

        Returns:
            True if password reset successfully
        """
        # Verify token
        user_id = await self.token_service.verify_token(
            token,
            TokenType.PASSWORD_RESET,
        )

        if not user_id:
            logger.warning("Invalid or expired password reset token")
            return False

        # Get user
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.error(f"User not found for password reset: {user_id}")
            return False

        # Update password
        user.hashed_password = get_password_hash(new_password)

        # Invalidate token
        await self.token_service.invalidate_token(token, TokenType.PASSWORD_RESET)

        # Commit changes
        await self.db.commit()

        logger.info(f"Password reset successful for user {user_id}")

        return True


class EmailVerificationService:
    """Service for email verification operations."""

    def __init__(self, db: AsyncSession):
        """Initialize email verification service.

        Args:
            db: Database session
        """
        self.db = db
        self.token_service = TokenService(db)

    async def create_verification_token(
        self,
        user_id: int,
    ) -> Tuple[str, datetime]:
        """Create an email verification token.

        Args:
            user_id: User ID

        Returns:
            Tuple of (verification_token, expires_at)
        """
        return await self.token_service.create_token(
            user_id,
            TokenType.EMAIL_VERIFICATION,
        )

    async def verify_email(
        self,
        token: str,
    ) -> bool:
        """Verify a user's email address.

        Args:
            token: Verification token

        Returns:
            True if verification successful
        """
        # Verify token
        user_id = await self.token_service.verify_token(
            token,
            TokenType.EMAIL_VERIFICATION,
        )

        if not user_id:
            logger.warning("Invalid or expired email verification token")
            return False

        # Get user
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.error(f"User not found for email verification: {user_id}")
            return False

        # Mark email as verified
        user.email_verified = True
        user.email_verified_at = datetime.utcnow()

        # Invalidate token
        await self.token_service.invalidate_token(token, TokenType.EMAIL_VERIFICATION)

        # Commit changes
        await self.db.commit()

        logger.info(f"Email verified for user {user_id}")

        return True

    async def resend_verification(
        self,
        email: str,
    ) -> Optional[Tuple[str, str, str]]:
        """Resend verification email.

        Args:
            email: User's email address

        Returns:
            Tuple of (token, user_name, email) if user found, None otherwise
        """
        # Find user by email
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        # Check if already verified
        if user.email_verified:
            logger.info(f"Email already verified for user {user.id}")
            return None

        # Create new token
        token, _ = await self.create_verification_token(user.id)

        user_name = f"{user.first_name} {user.last_name}".strip() or user.email

        return token, user_name, user.email
