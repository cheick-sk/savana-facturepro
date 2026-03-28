"""API Key models for Public API access.

Provides API key management for third-party integrations with:
- Scoped permissions
- Rate limiting per key
- Usage tracking
- HMAC signature support

Note: Webhook models are in webhooks.py
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, JSON, Index, Numeric
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class APIKey(Base):
    """API key for public API access.
    
    Each organisation can have multiple API keys with different permissions
    and rate limits. Keys can be scoped to specific resources.
    """
    __tablename__ = "api_keys"
    __table_args__ = (
        Index("ix_api_keys_organisation_id", "organisation_id"),
        Index("ix_api_keys_key", "key", unique=True),
    )
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(
        ForeignKey("organisations.id"), nullable=False
    )
    
    # Key identification
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    key_prefix: Mapped[str] = mapped_column(String(8), nullable=False)  # First 8 chars for display
    secret: Mapped[str | None] = mapped_column(String(128), nullable=True)  # For HMAC signatures
    
    # Permissions - scopes define what the key can access
    # Examples: "read:invoices", "write:invoices", "read:customers", "write:customers", "*"
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    
    # Rate limiting (requests per hour)
    rate_limit: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )
    
    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    creator: Mapped["User"] = relationship(lazy="selectin")
    usage_logs: Mapped[list["APIKeyUsage"]] = relationship(
        back_populates="api_key", lazy="noload", cascade="all, delete-orphan"
    )
    
    @property
    def masked_key(self) -> str:
        """Return masked key for display (show only prefix and suffix)."""
        return f"{self.key_prefix}...{self.key[-4:]}"


class APIKeyUsage(Base):
    """Usage tracking for API keys.
    
    Records each API request made with an API key for:
    - Analytics and reporting
    - Rate limit enforcement
    - Audit trails
    """
    __tablename__ = "api_key_usage"
    __table_args__ = (
        Index("ix_api_key_usage_key_id", "api_key_id"),
        Index("ix_api_key_usage_created_at", "created_at"),
        Index("ix_api_key_usage_key_created", "api_key_id", "created_at"),
    )
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key_id: Mapped[int] = mapped_column(
        ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False
    )
    
    # Request details
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Client info
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max length
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Request/Response size for bandwidth tracking
    request_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Error tracking
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    
    # Relationships
    api_key: Mapped["APIKey"] = relationship(back_populates="usage_logs", lazy="selectin")


# Import Organisation and User for type hints
from app.models.all_models import Organisation, User
