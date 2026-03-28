"""Client Portal models for FacturePro Africa.

Models for client accounts, view tracking, and payment methods.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, Index, Numeric,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class ClientAccount(Base):
    """Client account for the portal - links a customer to portal access."""
    __tablename__ = "client_accounts"
    __table_args__ = (
        Index("ix_client_accounts_organisation_id", "organisation_id"),
        Index("ix_client_accounts_email", "email", unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Magic link authentication
    magic_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    magic_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Preferences
    preferred_language: Mapped[str] = mapped_column(String(5), default="fr", nullable=False)
    preferred_payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin", foreign_keys=[organisation_id])
    customer: Mapped["Customer"] = relationship(lazy="selectin", foreign_keys=[customer_id])
    views: Mapped[list["ClientView"]] = relationship(back_populates="client_account", lazy="noload", cascade="all, delete-orphan")
    payment_methods: Mapped[list["ClientPaymentMethod"]] = relationship(back_populates="client_account", lazy="noload", cascade="all, delete-orphan")


class ClientView(Base):
    """Tracking of client views for invoices, quotes, etc."""
    __tablename__ = "client_views"
    __table_args__ = (
        Index("ix_client_views_client_account_id", "client_account_id"),
        Index("ix_client_views_organisation_id", "organisation_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    client_account_id: Mapped[int] = mapped_column(ForeignKey("client_accounts.id"), nullable=False)

    viewed_entity_type: Mapped[str] = mapped_column(String(30), nullable=False)  # "invoice", "quote", "credit_note"
    viewed_entity_id: Mapped[int] = mapped_column(Integer, nullable=False)

    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    client_account: Mapped["ClientAccount"] = relationship(back_populates="views", lazy="selectin")


class ClientPaymentMethod(Base):
    """Saved payment methods for clients."""
    __tablename__ = "client_payment_methods"
    __table_args__ = (
        Index("ix_client_payment_methods_client_account_id", "client_account_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_account_id: Mapped[int] = mapped_column(ForeignKey("client_accounts.id"), nullable=False)

    provider: Mapped[str] = mapped_column(String(30), nullable=False)  # "cinetpay", "paystack", "mpesa", "stripe"
    provider_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Customer ID at provider
    provider_method_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Method ID at provider

    # For cards/mobile money display
    method_type: Mapped[str] = mapped_column(String(30), nullable=False)  # "card", "mobile_money"
    last_four: Mapped[str | None] = mapped_column(String(4), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)  # For mobile money
    card_brand: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "visa", "mastercard"

    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    client_account: Mapped["ClientAccount"] = relationship(back_populates="payment_methods", lazy="selectin")
