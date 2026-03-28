"""Webhook models for FacturePro Africa.

Supports webhook endpoints configuration, event logging, and delivery tracking.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer,
    String, Text, JSON, BigInteger,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class WebhookEndpoint(Base):
    """Configuration d'un endpoint webhook.

    Stores webhook endpoint configuration including URL, secret for HMAC,
    subscribed events, and delivery statistics.
    """
    __tablename__ = "webhook_endpoints"
    __table_args__ = (
        Index("ix_webhook_endpoints_organisation_id", "organisation_id"),
        Index("ix_webhook_endpoints_is_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)

    # Endpoint details
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    secret: Mapped[str] = mapped_column(String(100), nullable=False)

    # Events subscription
    events: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    # Configuration
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    # Statistics
    total_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    webhook_events: Mapped[list["WebhookEvent"]] = relationship(
        back_populates="endpoint", lazy="noload", cascade="all, delete-orphan"
    )


class WebhookEvent(Base):
    """Log des événements webhook envoyés.

    Tracks each webhook delivery attempt with status, response details,
    and retry information.
    """
    __tablename__ = "webhook_events"
    __table_args__ = (
        Index("ix_webhook_events_organisation_id", "organisation_id"),
        Index("ix_webhook_events_endpoint_id", "endpoint_id"),
        Index("ix_webhook_events_status", "status"),
        Index("ix_webhook_events_created_at", "created_at"),
        Index("ix_webhook_events_next_retry_at", "next_retry_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    endpoint_id: Mapped[int] = mapped_column(ForeignKey("webhook_endpoints.id", ondelete="CASCADE"), nullable=False)

    # Event details
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Delivery status
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    # pending, sent, failed, retrying

    # Response details
    response_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Retry tracking
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    endpoint: Mapped["WebhookEndpoint"] = relationship(back_populates="webhook_events", lazy="selectin")


class WebhookEventType(Base):
    """Types d'événements disponibles.

    Defines available webhook event types with their descriptions
    and payload schemas for documentation.
    """
    __tablename__ = "webhook_event_types"
    __table_args__ = (
        Index("ix_webhook_event_types_app", "app"),
        Index("ix_webhook_event_types_event_type", "event_type", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    app: Mapped[str] = mapped_column(String(50), nullable=False)  # "facturepro", "savanaflow", "schoolflow"
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


# Import Organisation for type hints
from app.models.all_models import Organisation
