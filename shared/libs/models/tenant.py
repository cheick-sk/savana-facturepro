"""Multi-tenant SaaS models for Africa SaaS platform.
Organisation, Plan, Subscription, UsageQuota models.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, JSON, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class PlanType(str, enum.Enum):
    STARTER = "starter"
    PRO = "pro"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"
    PENDING = "pending"


class Organisation:
    """Organisation/Tenant model - root of all data in multi-tenant architecture.
    Each user belongs to an organisation, all business data is scoped to organisation.
    """
    __tablename__ = "organisations"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Plan
    plan: Mapped[str] = mapped_column(String(20), default="starter", nullable=False)
    plan_type: Mapped[str] = mapped_column(String(20), default="monthly")  # monthly/yearly
    
    # Localisation
    country: Mapped[str] = mapped_column(String(50), default="Côte d'Ivoire")
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    timezone: Mapped[str] = mapped_column(String(50), default="Africa/Abidjan")
    language: Mapped[str] = mapped_column(String(5), default="fr")
    
    # Contact
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Fiscal
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # NIF/NINEA/RC
    tax_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vat_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=18.0)  # TVA par défaut
    
    # Settings
    invoice_prefix: Mapped[str] = mapped_column(String(10), default="FAC")
    quote_prefix: Mapped[str] = mapped_column(String(10), default="DEV")
    invoice_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="organisation", lazy="noload")
    subscription: Mapped["Subscription | None"] = relationship(back_populates="organisation", lazy="selectin")
    usage_quotas: Mapped[list["UsageQuota"]] = relationship(back_populates="organisation", lazy="noload")


class Plan:
    """Subscription plans with quotas and features.
    Pricing in XOF for African market.
    """
    __tablename__ = "plans"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Pricing (XOF)
    price_monthly: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    price_yearly: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    # Quotas
    max_users: Mapped[int] = mapped_column(Integer, default=1)
    max_invoices_month: Mapped[int] = mapped_column(Integer, default=50)
    max_products: Mapped[int] = mapped_column(Integer, default=100)
    max_stores: Mapped[int] = mapped_column(Integer, default=1)  # SavanaFlow
    max_customers: Mapped[int] = mapped_column(Integer, default=100)
    storage_mb: Mapped[int] = mapped_column(Integer, default=100)  # PDF storage
    
    # Features (JSON for flexibility)
    features: Mapped[dict] = mapped_column(JSON, default=dict)
    # Example: {
    #   "api_access": False,
    #   "custom_invoice_template": False,
    #   "multi_currency": False,
    #   "recurring_invoices": False,
    #   "pos_offline": False,
    #   "whatsapp_notifications": False,
    #   "reports_advanced": False,
    #   "support_priority": "standard"
    # }
    
    # Display
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Subscription:
    """Organisation subscription history and billing.
    """
    __tablename__ = "subscriptions"
    __table_args__ = (
        Index('ix_subscriptions_organisation_status', 'organisation_id', 'status'),
    )
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), nullable=False)
    
    # Status
    status: Mapped[str] = mapped_column(String(20), default="active")
    
    # Period
    billing_cycle: Mapped[str] = mapped_column(String(20), default="monthly")  # monthly/yearly
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Payment
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    
    # External references (for payment providers)
    provider_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Cancellation
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    organisation: Mapped["Organisation"] = relationship(back_populates="subscription")
    plan: Mapped["Plan"] = relationship(lazy="selectin")


class UsageQuota:
    """Track monthly usage for quota enforcement.
    """
    __tablename__ = "usage_quotas"
    __table_args__ = (
        Index('ix_usage_quotas_org_month', 'organisation_id', 'year', 'month', unique=True),
    )
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    
    # Period
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Usage counters
    invoices_count: Mapped[int] = mapped_column(Integer, default=0)
    quotes_count: Mapped[int] = mapped_column(Integer, default=0)
    users_count: Mapped[int] = mapped_column(Integer, default=0)
    products_count: Mapped[int] = mapped_column(Integer, default=0)
    stores_count: Mapped[int] = mapped_column(Integer, default=0)
    customers_count: Mapped[int] = mapped_column(Integer, default=0)
    storage_used_mb: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    organisation: Mapped["Organisation"] = relationship(back_populates="usage_quotas")


# Default plans for African market (to be seeded)
DEFAULT_PLANS = [
    {
        "name": "Starter",
        "code": "starter",
        "description": "Idéal pour les auto-entrepreneurs et TPE",
        "price_monthly": 5000,  # ~7.5 EUR
        "price_yearly": 50000,  # 2 mois gratuits
        "max_users": 1,
        "max_invoices_month": 50,
        "max_products": 100,
        "max_stores": 1,
        "max_customers": 100,
        "storage_mb": 100,
        "features": {
            "api_access": False,
            "custom_invoice_template": False,
            "multi_currency": False,
            "recurring_invoices": False,
            "pos_offline": True,
            "whatsapp_notifications": False,
            "reports_advanced": False,
            "support_priority": "email"
        },
        "sort_order": 1
    },
    {
        "name": "Pro",
        "code": "pro",
        "description": "Pour les PME en croissance",
        "price_monthly": 15000,  # ~23 EUR
        "price_yearly": 150000,
        "max_users": 5,
        "max_invoices_month": 500,
        "max_products": 1000,
        "max_stores": 2,
        "max_customers": 500,
        "storage_mb": 500,
        "features": {
            "api_access": False,
            "custom_invoice_template": True,
            "multi_currency": True,
            "recurring_invoices": True,
            "pos_offline": True,
            "whatsapp_notifications": True,
            "reports_advanced": False,
            "support_priority": "email_phone"
        },
        "sort_order": 2,
        "is_popular": True
    },
    {
        "name": "Business",
        "code": "business",
        "description": "Pour les entreprises établies",
        "price_monthly": 50000,  # ~75 EUR
        "price_yearly": 500000,
        "max_users": 20,
        "max_invoices_month": 5000,
        "max_products": 10000,
        "max_stores": 10,
        "max_customers": 5000,
        "storage_mb": 2000,
        "features": {
            "api_access": True,
            "custom_invoice_template": True,
            "multi_currency": True,
            "recurring_invoices": True,
            "pos_offline": True,
            "whatsapp_notifications": True,
            "reports_advanced": True,
            "support_priority": "dedicated"
        },
        "sort_order": 3
    },
    {
        "name": "Enterprise",
        "code": "enterprise",
        "description": "Solution sur mesure pour grandes entreprises",
        "price_monthly": 0,  # Sur devis
        "price_yearly": 0,
        "max_users": -1,  # Illimité
        "max_invoices_month": -1,
        "max_products": -1,
        "max_stores": -1,
        "max_customers": -1,
        "storage_mb": -1,
        "features": {
            "api_access": True,
            "custom_invoice_template": True,
            "multi_currency": True,
            "recurring_invoices": True,
            "pos_offline": True,
            "whatsapp_notifications": True,
            "reports_advanced": True,
            "support_priority": "dedicated_24_7",
            "white_label": True,
            "dedicated_hosting": True,
            "custom_integrations": True
        },
        "sort_order": 4
    }
]


# Currency support for African markets
AFRICAN_CURRENCIES = {
    # UEMOA Zone (West Africa - FCFA)
    "XOF": {"name": "FCFA (UEMOA)", "symbol": "FCFA", "countries": ["CI", "SN", "BF", "ML", "BJ", "TG", "NE", "GW"]},
    # CEMAC Zone (Central Africa - FCFA)
    "XAF": {"name": "FCFA (CEMAC)", "symbol": "FCFA", "countries": ["CM", "GA", "CG", "CF", "TD", "GQ"]},
    # Nigeria
    "NGN": {"name": "Naira", "symbol": "₦", "countries": ["NG"]},
    # Ghana
    "GHS": {"name": "Cedi", "symbol": "GH₵", "countries": ["GH"]},
    # Kenya
    "KES": {"name": "Kenyan Shilling", "symbol": "KSh", "countries": ["KE"]},
    # Tanzania
    "TZS": {"name": "Tanzanian Shilling", "symbol": "TSh", "countries": ["TZ"]},
    # Uganda
    "UGX": {"name": "Ugandan Shilling", "symbol": "USh", "countries": ["UG"]},
    # Rwanda
    "RWF": {"name": "Rwandan Franc", "symbol": "FRw", "countries": ["RW"]},
    # South Africa
    "ZAR": {"name": "Rand", "symbol": "R", "countries": ["ZA", "NA", "LS", "SZ"]},
    # Morocco
    "MAD": {"name": "Dirham", "symbol": "DH", "countries": ["MA"]},
    # Tunisia
    "TND": {"name": "Dinar", "symbol": "DT", "countries": ["TN"]},
    # Ethiopia
    "ETB": {"name": "Birr", "symbol": "Br", "countries": ["ET"]},
    # Egypt
    "EGP": {"name": "Pound", "symbol": "E£", "countries": ["EG"]},
}


# VAT rates by African country (approximate)
VAT_RATES = {
    "CI": 18.0,  # Côte d'Ivoire
    "SN": 18.0,  # Sénégal
    "BF": 18.0,  # Burkina Faso
    "ML": 18.0,  # Mali
    "BJ": 18.0,  # Bénin
    "TG": 18.0,  # Togo
    "NG": 7.5,   # Nigeria (VAT)
    "GH": 15.0,  # Ghana (VAT + NHIL + GETFund)
    "KE": 16.0,  # Kenya
    "TZ": 18.0,  # Tanzania
    "UG": 18.0,  # Uganda
    "RW": 18.0,  # Rwanda
    "ZA": 15.0,  # South Africa
    "MA": 20.0,  # Morocco (TVA)
    "TN": 19.0,  # Tunisia (TVA + FODEC)
    "EG": 14.0,  # Egypt
}
