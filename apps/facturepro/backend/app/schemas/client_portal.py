"""Pydantic v2 schemas for Client Portal — FacturePro Africa."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ── Client Registration ─────────────────────────────────────────
class ClientRegisterRequest(BaseModel):
    """Registration request for a new client account."""
    email: EmailStr
    password: str | None = Field(None, min_length=8, max_length=128)
    phone: str | None = Field(None, max_length=30)
    customer_id: int | None = None  # Link to existing customer
    preferred_language: str = Field(default="fr", pattern="^(fr|en|sw|wo)$")


class ClientRegisterFromInvoice(BaseModel):
    """Register client from invoice email link."""
    invoice_id: int
    email: EmailStr
    phone: str | None = Field(None, max_length=30)
    password: str | None = Field(None, min_length=8, max_length=128)


# ── Magic Link Authentication ───────────────────────────────────
class MagicLinkRequest(BaseModel):
    """Request a magic link for passwordless login."""
    email: EmailStr


class MagicLinkVerify(BaseModel):
    """Verify a magic link token."""
    token: str


# ── Client Login ────────────────────────────────────────────────
class ClientLoginRequest(BaseModel):
    """Standard login with email and password."""
    email: EmailStr
    password: str = Field(min_length=6)


class ClientTokenResponse(BaseModel):
    """Token response for client authentication."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    client: "ClientAccountOut"


# ── Client Profile ──────────────────────────────────────────────
class ClientAccountOut(BaseModel):
    """Client account output."""
    model_config = {"from_attributes": True}
    id: int
    email: str
    phone: str | None
    preferred_language: str
    preferred_payment_method: str | None
    email_verified: bool
    last_login: datetime | None
    created_at: datetime
    customer: "ClientCustomerOut | None" = None


class ClientCustomerOut(BaseModel):
    """Customer info for client portal."""
    model_config = {"from_attributes": True}
    id: int
    name: str
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    country: str


class ClientProfileUpdate(BaseModel):
    """Update client profile."""
    phone: str | None = Field(None, max_length=30)
    preferred_language: str | None = Field(None, pattern="^(fr|en|sw|wo)$")
    preferred_payment_method: str | None = None


class ClientPasswordChange(BaseModel):
    """Change client password."""
    current_password: str | None = None  # None for magic link users
    new_password: str = Field(min_length=8, max_length=128)


# ── Invoice Viewing ─────────────────────────────────────────────
class ClientInvoiceItemOut(BaseModel):
    """Invoice item for client view."""
    model_config = {"from_attributes": True}
    id: int
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    discount_percent: float
    line_total: float


class ClientInvoiceOut(BaseModel):
    """Invoice output for client portal."""
    model_config = {"from_attributes": True}
    id: int
    invoice_number: str
    status: str
    issue_date: datetime
    due_date: datetime | None
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    notes: str | None
    items: list[ClientInvoiceItemOut]
    organisation: "ClientOrganisationOut"
    payments: list["ClientPaymentOut"]
    portal_viewed_at: datetime | None


class ClientOrganisationOut(BaseModel):
    """Organisation info for client portal."""
    model_config = {"from_attributes": True}
    id: int
    name: str
    logo_url: str | None
    phone: str | None
    email: str | None
    address: str | None
    currency: str
    country: str


class ClientInvoiceListOut(BaseModel):
    """Invoice list item for client portal."""
    model_config = {"from_attributes": True}
    id: int
    invoice_number: str
    status: str
    issue_date: datetime
    due_date: datetime | None
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    portal_viewed_at: datetime | None


# ── Quote Viewing ───────────────────────────────────────────────
class ClientQuoteItemOut(BaseModel):
    """Quote item for client view."""
    model_config = {"from_attributes": True}
    id: int
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    discount_percent: float
    line_total: float


class ClientQuoteOut(BaseModel):
    """Quote output for client portal."""
    model_config = {"from_attributes": True}
    id: int
    quote_number: str
    status: str
    issue_date: datetime
    expiry_date: datetime | None
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    currency: str
    notes: str | None
    terms: str | None
    items: list[ClientQuoteItemOut]
    organisation: ClientOrganisationOut


class ClientQuoteListOut(BaseModel):
    """Quote list item for client portal."""
    model_config = {"from_attributes": True}
    id: int
    quote_number: str
    status: str
    issue_date: datetime
    expiry_date: datetime | None
    total_amount: float
    currency: str


# ── Payment Processing ──────────────────────────────────────────
class ClientPaymentRequest(BaseModel):
    """Payment request from client portal."""
    invoice_id: int
    amount: float = Field(gt=0)
    provider: str = Field(pattern="^(cinetpay|paystack|mpesa|stripe|mobile_money)$")
    phone_number: str | None = Field(None, max_length=30)  # For mobile money
    return_url: str | None = None  # For redirect-based payments


class ClientMobileMoneyPayment(BaseModel):
    """Mobile money payment request."""
    invoice_id: int
    amount: float = Field(gt=0)
    phone_number: str = Field(min_length=8, max_length=20)
    operator: str = Field(pattern="^(orange|mtm|wave|moov|mpesa)$")


class ClientPaymentOut(BaseModel):
    """Payment output for client portal."""
    model_config = {"from_attributes": True}
    id: int
    invoice_id: int
    amount: float
    method: str
    reference: str | None
    phone_number: str | None
    operator: str | None
    paid_at: datetime


class ClientPaymentMethodOut(BaseModel):
    """Saved payment method for client."""
    model_config = {"from_attributes": True}
    id: int
    provider: str
    method_type: str
    last_four: str | None
    phone_number: str | None
    card_brand: str | None
    is_default: bool
    created_at: datetime


class ClientPaymentMethodCreate(BaseModel):
    """Create/save a payment method."""
    provider: str
    method_type: str
    provider_method_id: str | None = None
    provider_customer_id: str | None = None
    last_four: str | None = Field(None, max_length=4)
    phone_number: str | None = Field(None, max_length=30)
    card_brand: str | None = None
    is_default: bool = False


# ── Statement ───────────────────────────────────────────────────
class ClientStatementLine(BaseModel):
    """Statement line item."""
    date: datetime
    type: str  # "invoice", "payment", "credit_note"
    reference: str
    description: str
    debit: float  # Amount owed
    credit: float  # Amount paid
    balance: float  # Running balance


class ClientStatementOut(BaseModel):
    """Account statement for client."""
    client_id: int
    customer_name: str
    period_start: datetime
    period_end: datetime
    currency: str
    opening_balance: float
    closing_balance: float
    total_invoiced: float
    total_paid: float
    lines: list[ClientStatementLine]


# ── Public Invoice View ─────────────────────────────────────────
class PublicInvoiceOut(BaseModel):
    """Public invoice view (from email link)."""
    model_config = {"from_attributes": True}
    invoice_number: str
    status: str
    issue_date: datetime
    due_date: datetime | None
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    notes: str | None
    items: list[ClientInvoiceItemOut]
    customer_name: str
    organisation: ClientOrganisationOut
    portal_token: str | None


# ── Dashboard ───────────────────────────────────────────────────
class ClientDashboardOut(BaseModel):
    """Client dashboard data."""
    total_outstanding: float
    total_paid: float
    overdue_count: int
    pending_count: int
    recent_invoices: list[ClientInvoiceListOut]
    recent_payments: list[ClientPaymentOut]


# ── Pagination ──────────────────────────────────────────────────
class ClientPaginatedInvoices(BaseModel):
    """Paginated invoices for client portal."""
    items: list[ClientInvoiceListOut]
    total: int
    page: int
    size: int
    pages: int


class ClientPaginatedQuotes(BaseModel):
    """Paginated quotes for client portal."""
    items: list[ClientQuoteListOut]
    total: int
    page: int
    size: int
    pages: int


class ClientPaginatedPayments(BaseModel):
    """Paginated payments for client portal."""
    items: list[ClientPaymentOut]
    total: int
    page: int
    size: int
    pages: int
