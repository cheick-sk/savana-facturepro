"""Shared tenant models for SaaS multi-tenancy.

These models are shared across all 3 applications (FacturePro, SavanaFlow, SchoolFlow).
Each application should import these models and create their own tables via migrations.

Models:
- Organisation: The tenant entity (company/organization)
- Plan: Subscription plans (Starter, Pro, Business, Enterprise)
- Subscription: Links an organisation to a plan
- UsageQuota: Tracks monthly usage for quota enforcement
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, JSON, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class PlanType(str, enum.Enum):
    """Available subscription plans."""
    STARTER = "starter"
    PRO = "pro"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status."""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"


class TenantBase:
    """Mixin class providing common tenant model utilities."""
    
    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns  # type: ignore
        }


# Note: These models don't inherit from a declarative base here.
# Each application should create their own tables by including these
# column definitions in their migrations or by using a shared Base.


class OrganisationModel:
    """Organisation model definition (for reference and migrations).
    
    Table columns:
    - id: Primary key
    - name: Organisation name
    - slug: URL-friendly identifier (unique)
    - logo_url: Optional logo URL
    - plan: Current plan type
    - currency: Default currency (XOF for CFA)
    - country: Country code
    - phone: Contact phone
    - email: Contact email
    - address: Physical address
    - tax_id: Tax identification number
    - is_active: Whether organisation is active
    - created_at: Creation timestamp
    """
    
    # This is a schema definition - each app creates its own table
    __columns__ = {
        "id": BigInteger().primary_key().autoincrement(),
        "name": String(200).nullable(False),
        "slug": String(100).unique().nullable(False),
        "logo_url": String(500).nullable(True),
        "plan": String(20).default("starter").nullable(False),
        "currency": String(5).default("XOF").nullable(False),
        "country": String(50).default("Côte d'Ivoire").nullable(False),
        "phone": String(30).nullable(True),
        "email": String(255).nullable(True),
        "address": Text().nullable(True),
        "tax_id": String(50).nullable(True),
        "is_active": Boolean().default(True).nullable(False),
        "created_at": DateTime(timezone=True).default(now_utc),
    }


class PlanModel:
    """Plan model definition (for reference and migrations).
    
    Table columns:
    - id: Primary key
    - name: Display name
    - code: Plan code (starter, pro, business, enterprise)
    - price_monthly: Monthly price in XOF
    - price_yearly: Yearly price in XOF (usually 10 months)
    - max_users: Maximum number of users
    - max_invoices_month: Maximum invoices per month (-1 = unlimited)
    - max_products: Maximum products (-1 = unlimited)
    - max_stores: Maximum stores for SavanaFlow (-1 = unlimited)
    - features: JSON object with feature flags
    - is_active: Whether plan is available
    """
    
    __columns__ = {
        "id": BigInteger().primary_key().autoincrement(),
        "name": String(100).nullable(False),
        "code": String(20).unique().nullable(False),
        "price_monthly": Numeric(12, 2).default(0).nullable(False),
        "price_yearly": Numeric(12, 2).default(0).nullable(False),
        "max_users": Integer().default(1).nullable(False),
        "max_invoices_month": Integer().default(50).nullable(False),
        "max_products": Integer().default(100).nullable(False),
        "max_stores": Integer().default(1).nullable(False),
        "features": JSON().default({}).nullable(False),
        "is_active": Boolean().default(True).nullable(False),
    }


class SubscriptionModel:
    """Subscription model definition (for reference and migrations).
    
    Table columns:
    - id: Primary key
    - organisation_id: Foreign key to organisation
    - plan_id: Foreign key to plan
    - status: Subscription status
    - current_period_start: Start of current billing period
    - current_period_end: End of current billing period
    - stripe_subscription_id: Stripe subscription ID (nullable)
    - created_at: Creation timestamp
    """
    
    __columns__ = {
        "id": BigInteger().primary_key().autoincrement(),
        "organisation_id": BigInteger().nullable(False),
        "plan_id": BigInteger().nullable(False),
        "status": String(20).default("active").nullable(False),
        "current_period_start": DateTime(timezone=True).nullable(False),
        "current_period_end": DateTime(timezone=True).nullable(False),
        "stripe_subscription_id": String(100).unique().nullable(True),
        "created_at": DateTime(timezone=True).default(now_utc),
    }


class UsageQuotaModel:
    """Usage quota model definition (for reference and migrations).
    
    Table columns:
    - id: Primary key
    - organisation_id: Foreign key to organisation
    - month: Month (1-12)
    - year: Year
    - invoices_count: Number of invoices created this month
    - users_count: Number of active users
    - products_count: Number of products
    - stores_count: Number of stores (SavanaFlow)
    - created_at: Creation timestamp
    """
    
    __columns__ = {
        "id": BigInteger().primary_key().autoincrement(),
        "organisation_id": BigInteger().nullable(False),
        "month": Integer().nullable(False),
        "year": Integer().nullable(False),
        "invoices_count": Integer().default(0).nullable(False),
        "users_count": Integer().default(0).nullable(False),
        "products_count": Integer().default(0).nullable(False),
        "stores_count": Integer().default(0).nullable(False),
        "created_at": DateTime(timezone=True).default(now_utc),
    }


# Default plans data for seeding
DEFAULT_PLANS = [
    {
        "name": "Starter",
        "code": "starter",
        "price_monthly": 5000.00,
        "price_yearly": 50000.00,  # ~10 months
        "max_users": 1,
        "max_invoices_month": 50,
        "max_products": 100,
        "max_stores": 1,
        "features": {
            "api_access": False,
            "custom_reports": False,
            "multi_currency": False,
            "recurring_invoices": False,
            "inventory_management": False,
        },
        "is_active": True,
    },
    {
        "name": "Pro",
        "code": "pro",
        "price_monthly": 15000.00,
        "price_yearly": 150000.00,
        "max_users": 5,
        "max_invoices_month": 500,
        "max_products": 1000,
        "max_stores": 2,
        "features": {
            "api_access": False,
            "custom_reports": True,
            "multi_currency": True,
            "recurring_invoices": True,
            "inventory_management": True,
        },
        "is_active": True,
    },
    {
        "name": "Business",
        "code": "business",
        "price_monthly": 50000.00,
        "price_yearly": 500000.00,
        "max_users": 20,
        "max_invoices_month": 5000,
        "max_products": -1,  # Unlimited
        "max_stores": 10,
        "features": {
            "api_access": True,
            "custom_reports": True,
            "multi_currency": True,
            "recurring_invoices": True,
            "inventory_management": True,
            "priority_support": True,
        },
        "is_active": True,
    },
    {
        "name": "Enterprise",
        "code": "enterprise",
        "price_monthly": 0.00,  # Custom pricing
        "price_yearly": 0.00,
        "max_users": -1,  # Unlimited
        "max_invoices_month": -1,
        "max_products": -1,
        "max_stores": -1,
        "features": {
            "api_access": True,
            "custom_reports": True,
            "multi_currency": True,
            "recurring_invoices": True,
            "inventory_management": True,
            "priority_support": True,
            "dedicated_support": True,
            "dedicated_hosting": True,
            "sla": True,
            "custom_integrations": True,
        },
        "is_active": True,
    },
]
