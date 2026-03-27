"""All SQLAlchemy models for FacturePro Africa — Production-Ready Edition.

Multi-tenant SaaS architecture with organisation-based isolation.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, JSON, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ──────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    PARTIAL = "PARTIAL"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class QuoteStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CONVERTED = "CONVERTED"


class PaymentMethod(str, enum.Enum):
    MOBILE_MONEY = "MOBILE_MONEY"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CARD = "CARD"
    CHEQUE = "CHEQUE"


class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    PARTIAL = "PARTIAL"
    CANCELLED = "CANCELLED"


class RecurringFrequency(str, enum.Enum):
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"


# ── TENANT MODELS (Multi-tenant) ───────────────────────────────

class Organisation(Base):
    """Tenant organisation - each customer is an organisation."""
    __tablename__ = "organisations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    plan: Mapped[str] = mapped_column(String(20), default="starter", nullable=False)
    currency: Mapped[str] = mapped_column(String(5), default="XOF", nullable=False)
    country: Mapped[str] = mapped_column(String(50), default="Côte d'Ivoire", nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    users: Mapped[list["User"]] = relationship(back_populates="organisation", lazy="noload")
    customers: Mapped[list["Customer"]] = relationship(back_populates="organisation", lazy="noload")
    products: Mapped[list["Product"]] = relationship(back_populates="organisation", lazy="noload")
    suppliers: Mapped[list["Supplier"]] = relationship(back_populates="organisation", lazy="noload")
    categories: Mapped[list["ProductCategory"]] = relationship(back_populates="organisation", lazy="noload")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="organisation", lazy="noload")
    subscription: Mapped["Subscription | None"] = relationship(back_populates="organisation", lazy="selectin", uselist=False)
    usage_quotas: Mapped[list["UsageQuota"]] = relationship(back_populates="organisation", lazy="noload")


class Plan(Base):
    """Subscription plans."""
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    price_monthly: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    price_yearly: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    max_users: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_invoices_month: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    max_products: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    max_stores: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    features: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="plan", lazy="noload")


class Subscription(Base):
    """Organisation subscription to a plan."""
    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subscriptions_organisation_id", "organisation_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    organisation: Mapped["Organisation"] = relationship(back_populates="subscription", lazy="selectin")
    plan: Mapped["Plan"] = relationship(back_populates="subscriptions", lazy="selectin")


class UsageQuota(Base):
    """Monthly usage tracking for quota enforcement."""
    __tablename__ = "usage_quotas"
    __table_args__ = (
        Index("ix_usage_quotas_org_month_year", "organisation_id", "month", "year", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    invoices_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    users_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    products_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stores_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    organisation: Mapped["Organisation"] = relationship(back_populates="usage_quotas", lazy="selectin")


# ── User ───────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(ForeignKey("organisations.id"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    organisation: Mapped["Organisation | None"] = relationship(back_populates="users", lazy="selectin")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="created_by_user", lazy="noload")
    quotes: Mapped[list["Quote"]] = relationship(back_populates="created_by_user", lazy="noload")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="user", lazy="noload")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user", lazy="noload")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ── ProductCategory ────────────────────────────────────────────
class ProductCategory(Base):
    __tablename__ = "product_categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("product_categories.id"), nullable=True)
    color: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    organisation: Mapped["Organisation"] = relationship(back_populates="categories", lazy="selectin")
    parent: Mapped["ProductCategory | None"] = relationship(
        back_populates="children", remote_side="ProductCategory.id", lazy="selectin"
    )
    children: Mapped[list["ProductCategory"]] = relationship(back_populates="parent", lazy="noload")
    products: Mapped[list["Product"]] = relationship(back_populates="category", lazy="noload")


# ── Supplier ───────────────────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="Côte d'Ivoire")
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    payment_terms: Mapped[int] = mapped_column(Integer, default=30)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    organisation: Mapped["Organisation"] = relationship(back_populates="suppliers", lazy="selectin")
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="supplier", lazy="noload")
    products: Mapped[list["Product"]] = relationship(back_populates="supplier", lazy="noload")


# ── Customer ───────────────────────────────────────────────────
class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="Côte d'Ivoire")
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tax_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    credit_limit: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    organisation: Mapped["Organisation"] = relationship(back_populates="customers", lazy="selectin")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="customer", lazy="noload")
    quotes: Mapped[list["Quote"]] = relationship(back_populates="customer", lazy="noload")
    credit_notes: Mapped[list["CreditNote"]] = relationship(back_populates="customer", lazy="noload")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="customer", lazy="noload")


# ── Product ────────────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("product_categories.id"), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sku: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    barcode: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    purchase_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    unit: Mapped[str] = mapped_column(String(50), default="unit")
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    organisation: Mapped["Organisation"] = relationship(back_populates="products", lazy="selectin")
    category: Mapped["ProductCategory | None"] = relationship(back_populates="products", lazy="selectin")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="products", lazy="selectin")


# ── Invoice ────────────────────────────────────────────────────
class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    quote_id: Mapped[int | None] = mapped_column(ForeignKey("quotes.id"), nullable=True)
    recurring_id: Mapped[int | None] = mapped_column(ForeignKey("recurring_invoices.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", nullable=False)
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    discount_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    amount_paid: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes_internal: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_link_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    organisation: Mapped["Organisation"] = relationship(back_populates="invoices", lazy="selectin")
    customer: Mapped["Customer"] = relationship(back_populates="invoices", lazy="selectin")
    created_by_user: Mapped["User"] = relationship(back_populates="invoices", lazy="selectin")
    quote: Mapped["Quote | None"] = relationship(back_populates="invoice", lazy="selectin")
    items: Mapped[list["InvoiceItem"]] = relationship(back_populates="invoice", lazy="selectin", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice", lazy="selectin", cascade="all, delete-orphan")
    credit_notes: Mapped[list["CreditNote"]] = relationship(back_populates="invoice", lazy="noload")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="invoice", lazy="noload")

    @property
    def balance_due(self) -> float:
        return round(float(self.total_amount) - float(self.amount_paid), 2)


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=1.0)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    line_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    invoice: Mapped["Invoice"] = relationship(back_populates="items")
    product: Mapped["Product | None"] = relationship(lazy="selectin")


# ── Payment ────────────────────────────────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(30), default="MOBILE_MONEY")
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    operator: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(300), nullable=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    invoice: Mapped["Invoice"] = relationship(back_populates="payments")


# ── Quote (Devis) ──────────────────────────────────────────────
class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    quote_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", nullable=False)
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    discount_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    customer: Mapped["Customer"] = relationship(back_populates="quotes", lazy="selectin")
    created_by_user: Mapped["User"] = relationship(back_populates="quotes", lazy="selectin")
    items: Mapped[list["QuoteItem"]] = relationship(back_populates="quote", lazy="selectin", cascade="all, delete-orphan")
    invoice: Mapped["Invoice | None"] = relationship(back_populates="quote", lazy="noload")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=1.0)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    line_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    quote: Mapped["Quote"] = relationship(back_populates="items")
    product: Mapped["Product | None"] = relationship(lazy="selectin")


# ── Credit Note (Avoir) ────────────────────────────────────────
class CreditNote(Base):
    __tablename__ = "credit_notes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    credit_note_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    invoice: Mapped["Invoice | None"] = relationship(back_populates="credit_notes", lazy="selectin")
    customer: Mapped["Customer"] = relationship(back_populates="credit_notes", lazy="selectin")
    items: Mapped[list["CreditNoteItem"]] = relationship(back_populates="credit_note", lazy="selectin", cascade="all, delete-orphan")


class CreditNoteItem(Base):
    __tablename__ = "credit_note_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    credit_note_id: Mapped[int] = mapped_column(ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=1.0)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    line_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    credit_note: Mapped["CreditNote"] = relationship(back_populates="items")


# ── Expense Category ───────────────────────────────────────────
class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    expenses: Mapped[list["Expense"]] = relationship(back_populates="category", lazy="noload")


# ── Expense (Dépense) ──────────────────────────────────────────
class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("expense_categories.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    payment_method: Mapped[str] = mapped_column(String(30), default="CASH")
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    is_billable: Mapped[bool] = mapped_column(Boolean, default=False)
    expense_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    category: Mapped["ExpenseCategory | None"] = relationship(back_populates="expenses", lazy="selectin")
    user: Mapped["User"] = relationship(back_populates="expenses", lazy="selectin")
    customer: Mapped["Customer | None"] = relationship(back_populates="expenses", lazy="selectin")


# ── Purchase Order (Bon de commande) ───────────────────────────
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    po_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    order_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    expected_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    supplier: Mapped["Supplier"] = relationship(back_populates="purchase_orders", lazy="selectin")
    items: Mapped[list["PurchaseOrderItem"]] = relationship(back_populates="po", lazy="selectin", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=1.0)
    quantity_received: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    line_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    po: Mapped["PurchaseOrder"] = relationship(back_populates="items")
    product: Mapped["Product | None"] = relationship(lazy="selectin")


# ── Recurring Invoice (Facturation récurrente) ─────────────────
class RecurringInvoice(Base):
    __tablename__ = "recurring_invoices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), default="MONTHLY")
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_run: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_send: Mapped[bool] = mapped_column(Boolean, default=False)
    template_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    invoices_generated: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    customer: Mapped["Customer"] = relationship(lazy="selectin")
    invoices: Mapped[list["Invoice"]] = relationship(lazy="noload", foreign_keys="Invoice.recurring_id")


# ── Payment Link ───────────────────────────────────────────────
class PaymentLink(Base):
    __tablename__ = "payment_links"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    views: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    invoice: Mapped["Invoice"] = relationship(lazy="selectin")


# ── Audit Log ──────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(ForeignKey("organisations.id"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped["User | None"] = relationship(back_populates="audit_logs")
    invoice: Mapped["Invoice | None"] = relationship(back_populates="audit_logs")
