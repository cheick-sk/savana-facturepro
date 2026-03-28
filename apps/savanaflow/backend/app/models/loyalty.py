"""Advanced Loyalty Program models for SavanaFlow POS."""
from __future__ import annotations

from datetime import datetime, timezone, date
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, Date
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.all_models import Store, Product, Sale, POSCustomer


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class LoyaltyProgram(Base):
    """Configuration du programme de fidélité."""
    __tablename__ = "loyalty_programs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True)  # Null = all stores
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Points configuration
    points_per_currency: Mapped[float] = mapped_column(Numeric(8, 4), default=0.01)  # Points per currency unit
    currency_per_point: Mapped[float] = mapped_column(Numeric(8, 4), default=1)  # Value of 1 point in currency

    # Welcome bonus for new members
    welcome_bonus: Mapped[int] = mapped_column(Integer, default=0)

    # Birthday bonus
    birthday_bonus: Mapped[int] = mapped_column(Integer, default=0)

    # Referral bonus
    referral_bonus: Mapped[int] = mapped_column(Integer, default=0)

    # Points expiration (in days, 0 = never)
    points_expiry_days: Mapped[int] = mapped_column(Integer, default=0)

    # Max redemption percentage per sale
    max_redemption_percent: Mapped[int] = mapped_column(Integer, default=50)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    store: Mapped["Store | None"] = relationship(lazy="selectin")
    tiers: Mapped[list["LoyaltyTier"]] = relationship(
        back_populates="program", lazy="selectin", cascade="all, delete-orphan"
    )
    rewards: Mapped[list["LoyaltyReward"]] = relationship(
        back_populates="program", lazy="noload", cascade="all, delete-orphan"
    )
    cards: Mapped[list["LoyaltyCard"]] = relationship(
        back_populates="program", lazy="noload", cascade="all, delete-orphan"
    )


class LoyaltyTier(Base):
    """Niveau de fidélité."""
    __tablename__ = "loyalty_tiers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("loyalty_programs.id", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(50), nullable=False)  # "Standard", "Silver", "Gold", "Platinum"
    min_points: Mapped[int] = mapped_column(Integer, default=0)  # Points minimum to reach this tier

    # Benefits
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    points_multiplier: Mapped[float] = mapped_column(Numeric(4, 2), default=1)  # 1x, 1.5x, 2x etc.

    # Special bonuses
    welcome_bonus: Mapped[int] = mapped_column(Integer, default=0)
    birthday_bonus: Mapped[int] = mapped_column(Integer, default=0)

    # Color for UI
    color: Mapped[str] = mapped_column(String(10), default="#6B7280")  # Gray
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Icon name

    order: Mapped[int] = mapped_column(Integer, default=0)  # Display order

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    program: Mapped["LoyaltyProgram"] = relationship(back_populates="tiers")


class LoyaltyReward(Base):
    """Récompense disponible."""
    __tablename__ = "loyalty_rewards"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("loyalty_programs.id", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    reward_type: Mapped[str] = mapped_column(String(30), nullable=False)  # "discount", "free_product", "voucher", "experience"
    points_cost: Mapped[int] = mapped_column(Integer, nullable=False)

    # Reward value
    discount_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)

    # Availability
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    valid_for_days: Mapped[int] = mapped_column(Integer, default=30)
    max_redemptions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_redemptions: Mapped[int] = mapped_column(Integer, default=0)

    # Tier restriction (null = all tiers)
    min_tier_id: Mapped[int | None] = mapped_column(ForeignKey("loyalty_tiers.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    program: Mapped["LoyaltyProgram"] = relationship(back_populates="rewards")
    product: Mapped["Product | None"] = relationship(lazy="selectin")
    min_tier: Mapped["LoyaltyTier | None"] = relationship(lazy="selectin")
    redemptions: Mapped[list["LoyaltyRedemption"]] = relationship(
        back_populates="reward", lazy="noload", cascade="all, delete-orphan"
    )


class LoyaltyCard(Base):
    """Carte de fidélité client."""
    __tablename__ = "loyalty_cards"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("loyalty_programs.id", ondelete="CASCADE"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("pos_customers.id", ondelete="CASCADE"), nullable=False)

    card_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    current_tier_id: Mapped[int | None] = mapped_column(ForeignKey("loyalty_tiers.id"), nullable=True)

    points_balance: Mapped[int] = mapped_column(Integer, default=0)
    total_points_earned: Mapped[int] = mapped_column(Integer, default=0)
    total_points_redeemed: Mapped[int] = mapped_column(Integer, default=0)

    # Stats
    total_visits: Mapped[int] = mapped_column(Integer, default=0)
    total_spent: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    # Dates
    member_since: Mapped[date] = mapped_column(Date, nullable=False)
    last_visit: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tier_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Referral tracking
    referred_by_card_id: Mapped[int | None] = mapped_column(ForeignKey("loyalty_cards.id"), nullable=True)
    referral_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    program: Mapped["LoyaltyProgram"] = relationship(back_populates="cards")
    customer: Mapped["POSCustomer"] = relationship(lazy="selectin")
    current_tier: Mapped["LoyaltyTier | None"] = relationship(lazy="selectin")
    transactions: Mapped[list["LoyaltyCardTransaction"]] = relationship(
        back_populates="card", lazy="noload", cascade="all, delete-orphan"
    )
    redemptions: Mapped[list["LoyaltyRedemption"]] = relationship(
        back_populates="card", lazy="noload", cascade="all, delete-orphan"
    )
    referred_by: Mapped["LoyaltyCard | None"] = relationship(
        remote_side=[id], lazy="selectin", foreign_keys=[referred_by_card_id]
    )


class LoyaltyCardTransaction(Base):
    """Transaction de points (advanced version)."""
    __tablename__ = "loyalty_card_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("loyalty_cards.id", ondelete="CASCADE"), nullable=False)

    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "earn", "redeem", "bonus", "expire", "adjust"
    points: Mapped[int] = mapped_column(Integer, nullable=False)  # Positive for earn, negative for redeem

    # Source
    source_type: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "sale", "reward", "referral", "birthday", "welcome"
    source_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)

    # Expiry tracking
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    card: Mapped["LoyaltyCard"] = relationship(back_populates="transactions")


class LoyaltyRedemption(Base):
    """Utilisation d'une récompense."""
    __tablename__ = "loyalty_redemptions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("loyalty_cards.id", ondelete="CASCADE"), nullable=False)
    reward_id: Mapped[int] = mapped_column(ForeignKey("loyalty_rewards.id", ondelete="CASCADE"), nullable=False)
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id"), nullable=True)

    points_used: Mapped[int] = mapped_column(Integer, nullable=False)
    voucher_code: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)  # Generated voucher

    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, used, expired
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    card: Mapped["LoyaltyCard"] = relationship(back_populates="redemptions")
    reward: Mapped["LoyaltyReward"] = relationship(back_populates="redemptions")
    sale: Mapped["Sale | None"] = relationship(lazy="selectin")


class LoyaltyReferral(Base):
    """Referral tracking."""
    __tablename__ = "loyalty_referrals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    referrer_card_id: Mapped[int] = mapped_column(ForeignKey("loyalty_cards.id", ondelete="CASCADE"), nullable=False)
    referred_customer_id: Mapped[int] = mapped_column(ForeignKey("pos_customers.id"), nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending, completed, cancelled
    bonus_awarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bonus_points: Mapped[int] = mapped_column(Integer, default=0)

    # First purchase tracking
    first_purchase_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    first_purchase_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    referrer_card: Mapped["LoyaltyCard"] = relationship(lazy="selectin", foreign_keys=[referrer_card_id])
    referred_customer: Mapped["POSCustomer"] = relationship(lazy="selectin")
