"""Pydantic v2 schemas — FacturePro Africa Production Edition."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ── Auth ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User ───────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: str = Field(default="user", pattern="^(admin|manager|user)$")


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    role: str | None = Field(None, pattern="^(admin|manager|user)$")
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    created_at: datetime


# ── Product Category ───────────────────────────────────────────
class ProductCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    parent_id: int | None = None
    color: str | None = Field(None, max_length=10)


class ProductCategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = None
    color: str | None = None
    is_active: bool | None = None


class ProductCategoryOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    description: str | None
    parent_id: int | None
    color: str | None
    is_active: bool


# ── Supplier ───────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = None
    city: str | None = Field(None, max_length=100)
    country: str = Field(default="Côte d'Ivoire", max_length=50)
    tax_id: str | None = Field(None, max_length=50)
    contact_name: str | None = Field(None, max_length=200)
    payment_terms: int = Field(default=30, ge=0, le=365)
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = None
    city: str | None = Field(None, max_length=100)
    country: str | None = None
    tax_id: str | None = None
    contact_name: str | None = None
    payment_terms: int | None = None
    notes: str | None = None
    is_active: bool | None = None


class SupplierOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    country: str
    tax_id: str | None
    contact_name: str | None
    payment_terms: int
    notes: str | None
    is_active: bool
    created_at: datetime


# ── Customer ───────────────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = None
    city: str | None = Field(None, max_length=100)
    country: str = Field(default="Côte d'Ivoire", max_length=50)
    tax_id: str | None = Field(None, max_length=50)
    tax_number: str | None = Field(None, max_length=50)
    credit_limit: float = Field(default=0.0, ge=0)
    notes: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = None
    city: str | None = None
    country: str | None = None
    tax_id: str | None = None
    tax_number: str | None = None
    credit_limit: float | None = Field(None, ge=0)
    notes: str | None = None
    is_active: bool | None = None


class CustomerOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    country: str
    tax_id: str | None
    tax_number: str | None
    credit_limit: float
    notes: str | None
    is_active: bool
    created_at: datetime


# ── Product ────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category_id: int | None = None
    supplier_id: int | None = None
    sku: str | None = Field(None, max_length=100)
    barcode: str | None = Field(None, max_length=100)
    unit_price: float = Field(gt=0)
    purchase_price: float = Field(default=0.0, ge=0)
    unit: str = Field(default="unit", max_length=50)
    tax_rate: float = Field(default=0.0, ge=0, le=100)


class ProductUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    category_id: int | None = None
    supplier_id: int | None = None
    sku: str | None = Field(None, max_length=100)
    barcode: str | None = Field(None, max_length=100)
    unit_price: float | None = Field(None, gt=0)
    purchase_price: float | None = Field(None, ge=0)
    unit: str | None = Field(None, max_length=50)
    tax_rate: float | None = Field(None, ge=0, le=100)
    is_active: bool | None = None


class ProductOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    description: str | None
    category_id: int | None
    supplier_id: int | None
    sku: str | None
    barcode: str | None
    unit_price: float
    purchase_price: float
    unit: str
    tax_rate: float
    is_active: bool


# ── Invoice ────────────────────────────────────────────────────
class InvoiceItemCreate(BaseModel):
    product_id: int | None = None
    description: str = Field(min_length=1, max_length=500)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(gt=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    discount_percent: float = Field(default=0.0, ge=0, le=100)


class InvoiceItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int | None
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    discount_percent: float
    line_total: float


class InvoiceCreate(BaseModel):
    customer_id: int
    due_date: datetime | None = None
    currency: str = Field(default="XOF", max_length=5)
    notes: str | None = None
    notes_internal: str | None = None
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    items: list[InvoiceItemCreate] = Field(min_length=1)


class InvoiceUpdate(BaseModel):
    due_date: datetime | None = None
    notes: str | None = None
    notes_internal: str | None = None
    status: str | None = Field(None, pattern="^(DRAFT|SENT|PAID|PARTIAL|OVERDUE|CANCELLED)$")
    discount_percent: float | None = Field(None, ge=0, le=100)
    items: list[InvoiceItemCreate] | None = None


class InvoiceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    invoice_number: str
    customer_id: int
    customer: CustomerOut
    quote_id: int | None
    status: str
    issue_date: datetime
    due_date: datetime | None
    subtotal: float
    tax_amount: float
    discount_amount: float
    discount_percent: float
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    notes: str | None
    notes_internal: str | None
    pdf_path: str | None
    payment_link_token: str | None
    items: list[InvoiceItemOut]
    payments: list["PaymentOut"]
    created_at: datetime
    updated_at: datetime


# ── Payment ────────────────────────────────────────────────────
class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: str = Field(default="MOBILE_MONEY", pattern="^(MOBILE_MONEY|CASH|BANK_TRANSFER|CARD|CHEQUE)$")
    reference: str | None = Field(None, max_length=100)
    phone_number: str | None = Field(None, max_length=30)
    operator: str | None = Field(None, max_length=50)
    notes: str | None = Field(None, max_length=300)


class SimulatePaymentRequest(BaseModel):
    phone_number: str = Field(min_length=8, max_length=20)
    operator: str = Field(default="Orange Money", max_length=50)
    amount: float | None = None


class PaymentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    invoice_id: int
    amount: float
    method: str
    reference: str | None
    phone_number: str | None
    operator: str | None
    notes: str | None
    paid_at: datetime


# ── Quote (Devis) ──────────────────────────────────────────────
class QuoteItemCreate(BaseModel):
    product_id: int | None = None
    description: str = Field(min_length=1, max_length=500)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(gt=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    discount_percent: float = Field(default=0.0, ge=0, le=100)


class QuoteItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int | None
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    discount_percent: float
    line_total: float


class QuoteCreate(BaseModel):
    customer_id: int
    expiry_date: datetime | None = None
    currency: str = Field(default="XOF", max_length=5)
    notes: str | None = None
    terms: str | None = None
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    items: list[QuoteItemCreate] = Field(min_length=1)


class QuoteUpdate(BaseModel):
    expiry_date: datetime | None = None
    notes: str | None = None
    terms: str | None = None
    status: str | None = Field(None, pattern="^(DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED)$")
    discount_percent: float | None = Field(None, ge=0, le=100)
    items: list[QuoteItemCreate] | None = None


class QuoteOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    quote_number: str
    customer_id: int
    customer: CustomerOut
    status: str
    issue_date: datetime
    expiry_date: datetime | None
    subtotal: float
    tax_amount: float
    discount_amount: float
    discount_percent: float
    total_amount: float
    currency: str
    notes: str | None
    terms: str | None
    items: list[QuoteItemOut]
    created_at: datetime


# ── Credit Note (Avoir) ────────────────────────────────────────
class CreditNoteItemCreate(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(gt=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)


class CreditNoteItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    line_total: float


class CreditNoteCreate(BaseModel):
    invoice_id: int | None = None
    customer_id: int
    reason: str = Field(min_length=1, max_length=500)
    currency: str = Field(default="XOF", max_length=5)
    items: list[CreditNoteItemCreate] = Field(min_length=1)


class CreditNoteOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    credit_note_number: str
    invoice_id: int | None
    customer_id: int
    customer: CustomerOut
    status: str
    reason: str
    subtotal: float
    tax_amount: float
    total_amount: float
    currency: str
    issue_date: datetime
    items: list[CreditNoteItemOut]
    created_at: datetime


# ── Expense ────────────────────────────────────────────────────
class ExpenseCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    color: str | None = Field(None, max_length=10)


class ExpenseCategoryOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    description: str | None
    color: str | None
    is_active: bool


class ExpenseCreate(BaseModel):
    category_id: int | None = None
    customer_id: int | None = None
    supplier_id: int | None = None
    description: str = Field(min_length=1, max_length=500)
    amount: float = Field(gt=0)
    tax_amount: float = Field(default=0.0, ge=0)
    currency: str = Field(default="XOF", max_length=5)
    payment_method: str = Field(default="CASH", pattern="^(CASH|MOBILE_MONEY|BANK_TRANSFER|CARD|CHEQUE)$")
    reference: str | None = Field(None, max_length=100)
    is_billable: bool = False
    expense_date: datetime | None = None
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    category_id: int | None = None
    description: str | None = Field(None, max_length=500)
    amount: float | None = Field(None, gt=0)
    tax_amount: float | None = Field(None, ge=0)
    payment_method: str | None = None
    reference: str | None = None
    status: str | None = Field(None, pattern="^(PENDING|APPROVED|REJECTED|REIMBURSED)$")
    is_billable: bool | None = None
    notes: str | None = None


class ExpenseOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    category_id: int | None
    user_id: int
    customer_id: int | None
    supplier_id: int | None
    description: str
    amount: float
    tax_amount: float
    currency: str
    payment_method: str
    reference: str | None
    status: str
    is_billable: bool
    expense_date: datetime
    notes: str | None
    created_at: datetime


# ── Purchase Order (BC) ────────────────────────────────────────
class POItemCreate(BaseModel):
    product_id: int | None = None
    description: str = Field(min_length=1, max_length=500)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(gt=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)


class POItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int | None
    description: str
    quantity: float
    quantity_received: float
    unit_price: float
    tax_rate: float
    line_total: float


class POCreate(BaseModel):
    supplier_id: int
    expected_date: datetime | None = None
    currency: str = Field(default="XOF", max_length=5)
    notes: str | None = None
    items: list[POItemCreate] = Field(min_length=1)


class POUpdate(BaseModel):
    expected_date: datetime | None = None
    notes: str | None = None
    status: str | None = Field(None, pattern="^(DRAFT|SENT|RECEIVED|PARTIAL|CANCELLED)$")


class POReceiveItem(BaseModel):
    item_id: int
    quantity_received: float = Field(gt=0)


class POReceive(BaseModel):
    items: list[POReceiveItem]
    received_date: datetime | None = None


class POOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    po_number: str
    supplier_id: int
    supplier: SupplierOut
    status: str
    order_date: datetime
    expected_date: datetime | None
    received_date: datetime | None
    subtotal: float
    tax_amount: float
    total_amount: float
    currency: str
    notes: str | None
    items: list[POItemOut]
    created_at: datetime


# ── Recurring Invoice ──────────────────────────────────────────
class RecurringItemTemplate(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(gt=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    product_id: int | None = None


class RecurringCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    customer_id: int
    frequency: str = Field(default="MONTHLY", pattern="^(WEEKLY|MONTHLY|QUARTERLY|YEARLY)$")
    start_date: datetime
    end_date: datetime | None = None
    auto_send: bool = False
    currency: str = Field(default="XOF", max_length=5)
    due_days: int = Field(default=30, ge=0)
    notes: str | None = None
    items: list[RecurringItemTemplate] = Field(min_length=1)


class RecurringUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    end_date: datetime | None = None
    is_active: bool | None = None
    auto_send: bool | None = None


class RecurringOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    customer_id: int
    frequency: str
    start_date: datetime
    end_date: datetime | None
    next_run: datetime
    last_run: datetime | None
    is_active: bool
    auto_send: bool
    invoices_generated: int
    template_data: dict
    created_at: datetime


# ── Payment Link ───────────────────────────────────────────────
class PaymentLinkOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    token: str
    invoice_id: int
    is_active: bool
    expires_at: datetime | None
    views: int
    created_at: datetime
    url: str = ""


# ── Dashboard ──────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_revenue: float
    revenue_this_month: float
    revenue_last_month: float
    growth_rate: float
    invoices_overdue: int
    invoices_paid: int
    invoices_sent: int
    invoices_draft: int
    invoices_partial: int
    outstanding_balance: float
    total_customers: int
    top_customers: list[dict[str, Any]]
    revenue_by_month: list[dict[str, Any]]
    expense_total_month: float


# ── Reports ────────────────────────────────────────────────────
class VATReportLine(BaseModel):
    tax_rate: float
    taxable_amount: float
    tax_amount: float
    invoice_count: int


class VATReport(BaseModel):
    period_start: datetime
    period_end: datetime
    lines: list[VATReportLine]
    total_taxable: float
    total_tax: float


class RevenueReport(BaseModel):
    period: str
    total_revenue: float
    total_expenses: float
    gross_profit: float
    gross_margin_pct: float
    invoice_count: int
    paid_count: int
    overdue_count: int
    by_customer: list[dict[str, Any]]
    by_product: list[dict[str, Any]]


class AccountingExportRow(BaseModel):
    date: str
    type: str
    reference: str
    customer: str
    description: str
    ht_amount: float
    tax_amount: float
    ttc_amount: float
    status: str
    currency: str


# ── Pagination ─────────────────────────────────────────────────
class Paginated(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
