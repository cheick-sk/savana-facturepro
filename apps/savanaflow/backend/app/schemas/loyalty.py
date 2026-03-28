"""Pydantic v2 schemas for Advanced Loyalty Program — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, EmailStr, Field


# ── Loyalty Program ───────────────────────────────────────────────
class LoyaltyProgramCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    store_id: int | None = None  # Null = all stores
    is_active: bool = True
    start_date: date | None = None
    end_date: date | None = None
    points_per_currency: float = Field(default=0.01, ge=0)
    currency_per_point: float = Field(default=1, ge=0)
    welcome_bonus: int = Field(default=0, ge=0)
    birthday_bonus: int = Field(default=0, ge=0)
    referral_bonus: int = Field(default=0, ge=0)
    points_expiry_days: int = Field(default=0, ge=0)
    max_redemption_percent: int = Field(default=50, ge=0, le=100)


class LoyaltyProgramUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    is_active: bool | None = None
    start_date: date | None = None
    end_date: date | None = None
    points_per_currency: float | None = Field(None, ge=0)
    currency_per_point: float | None = Field(None, ge=0)
    welcome_bonus: int | None = Field(None, ge=0)
    birthday_bonus: int | None = Field(None, ge=0)
    referral_bonus: int | None = Field(None, ge=0)
    points_expiry_days: int | None = Field(None, ge=0)
    max_redemption_percent: int | None = Field(None, ge=0, le=100)


class LoyaltyProgramOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    store_id: int | None
    name: str
    description: str | None
    is_active: bool
    start_date: date | None
    end_date: date | None
    points_per_currency: float
    currency_per_point: float
    welcome_bonus: int
    birthday_bonus: int
    referral_bonus: int
    points_expiry_days: int
    max_redemption_percent: int
    created_at: datetime
    tiers: list["LoyaltyTierOut"] = []


# ── Loyalty Tier ───────────────────────────────────────────────────
class LoyaltyTierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    min_points: int = Field(default=0, ge=0)
    discount_percent: float = Field(default=0, ge=0, le=100)
    points_multiplier: float = Field(default=1, ge=1)
    welcome_bonus: int = Field(default=0, ge=0)
    birthday_bonus: int = Field(default=0, ge=0)
    color: str = Field(default="#6B7280", max_length=10)
    icon: str | None = Field(None, max_length=50)
    order: int = Field(default=0, ge=0)


class LoyaltyTierUpdate(BaseModel):
    name: str | None = Field(None, max_length=50)
    min_points: int | None = Field(None, ge=0)
    discount_percent: float | None = Field(None, ge=0, le=100)
    points_multiplier: float | None = Field(None, ge=1)
    welcome_bonus: int | None = Field(None, ge=0)
    birthday_bonus: int | None = Field(None, ge=0)
    color: str | None = Field(None, max_length=10)
    icon: str | None = None
    order: int | None = Field(None, ge=0)


class LoyaltyTierOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    program_id: int
    name: str
    min_points: int
    discount_percent: float
    points_multiplier: float
    welcome_bonus: int
    birthday_bonus: int
    color: str
    icon: str | None
    order: int


# ── Loyalty Reward ─────────────────────────────────────────────────
class LoyaltyRewardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    image_url: str | None = Field(None, max_length=500)
    reward_type: str = Field(pattern="^(discount|free_product|voucher|experience)$")
    points_cost: int = Field(gt=0)
    discount_value: float | None = Field(None, ge=0)
    discount_percent: float | None = Field(None, ge=0, le=100)
    product_id: int | None = None
    is_active: bool = True
    valid_for_days: int = Field(default=30, ge=1)
    max_redemptions: int | None = Field(None, gt=0)
    min_tier_id: int | None = None


class LoyaltyRewardUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    image_url: str | None = None
    points_cost: int | None = Field(None, gt=0)
    discount_value: float | None = Field(None, ge=0)
    discount_percent: float | None = Field(None, ge=0, le=100)
    product_id: int | None = None
    is_active: bool | None = None
    valid_for_days: int | None = Field(None, ge=1)
    max_redemptions: int | None = Field(None, gt=0)
    min_tier_id: int | None = None


class LoyaltyRewardOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    program_id: int
    name: str
    description: str | None
    image_url: str | None
    reward_type: str
    points_cost: int
    discount_value: float | None
    discount_percent: float | None
    product_id: int | None
    is_active: bool
    valid_for_days: int
    max_redemptions: int | None
    current_redemptions: int
    min_tier_id: int | None
    created_at: datetime


# ── Loyalty Card ───────────────────────────────────────────────────
class LoyaltyCardCreate(BaseModel):
    program_id: int
    customer_id: int
    referred_by_card_number: str | None = None  # For referral tracking


class LoyaltyCardOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    program_id: int
    customer_id: int
    card_number: str
    current_tier_id: int | None
    points_balance: int
    total_points_earned: int
    total_points_redeemed: int
    total_visits: int
    total_spent: float
    member_since: date
    last_visit: datetime | None
    is_active: bool
    referral_count: int
    created_at: datetime
    # Computed fields
    customer: "POSCustomerBrief | None" = None
    current_tier: "LoyaltyTierOut | None" = None


class POSCustomerBrief(BaseModel):
    """Brief customer info for nested responses."""
    model_config = {"from_attributes": True}
    id: int
    name: str
    phone: str | None
    email: str | None
    loyalty_tier: str


# ── Loyalty Card Transaction ───────────────────────────────────────
class LoyaltyCardTransactionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    card_id: int
    transaction_type: str
    points: int
    source_type: str | None
    source_id: int | None
    description: str | None
    balance_after: int
    expires_at: datetime | None
    created_at: datetime


# ── Loyalty Redemption ─────────────────────────────────────────────
class LoyaltyRedemptionCreate(BaseModel):
    card_id: int
    reward_id: int


class LoyaltyRedemptionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    card_id: int
    reward_id: int
    sale_id: int | None
    points_used: int
    voucher_code: str | None
    status: str
    expires_at: datetime | None
    used_at: datetime | None
    created_at: datetime
    reward: "LoyaltyRewardOut | None" = None


# ── POS Integration ────────────────────────────────────────────────
class SaleEarnPoints(BaseModel):
    """Request to earn points from a sale."""
    card_number: str
    sale_id: int
    sale_amount: float = Field(gt=0)


class SaleRedeemPoints(BaseModel):
    """Request to redeem points in a sale."""
    card_number: str
    points_to_use: int = Field(gt=0)
    sale_amount: float = Field(gt=0)


class LoyaltySaleResult(BaseModel):
    """Result of loyalty operation in a sale."""
    points_earned: int
    points_used: int
    loyalty_discount: float
    new_balance: int
    tier_name: str | None
    tier_multiplier: float


class CardLookupResult(BaseModel):
    """Result of card lookup for POS."""
    card_number: str
    customer_name: str
    customer_phone: str | None
    points_balance: int
    tier_name: str
    tier_color: str
    tier_discount_percent: float
    points_value: float  # Currency value of available points
    can_redeem: bool


# ── Stats ──────────────────────────────────────────────────────────
class LoyaltyStats(BaseModel):
    """Loyalty program statistics."""
    total_members: int
    active_members: int
    total_points_earned: int
    total_points_redeemed: int
    total_points_balance: int
    total_redemptions: int
    tier_distribution: list[dict[str, Any]]
    top_members: list[dict[str, Any]]
    recent_transactions: list[dict[str, Any]]
    rewards_stats: dict[str, Any]


# ── Referral ───────────────────────────────────────────────────────
class ReferralCreate(BaseModel):
    referrer_card_number: str
    referred_customer_id: int


class ReferralOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    referrer_card_id: int
    referred_customer_id: int
    status: str
    bonus_awarded: bool
    bonus_points: int
    first_purchase_amount: float | None
    first_purchase_at: datetime | None
    created_at: datetime


# ── Update forward references ──────────────────────────────────────
LoyaltyProgramOut.model_rebuild()
LoyaltyCardOut.model_rebuild()
LoyaltyRedemptionOut.model_rebuild()
