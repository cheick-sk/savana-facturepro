"""Pydantic v2 schemas for Purchase/Supplier Management — FacturePro Africa."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ── Purchase Order Schemas ────────────────────────────────────────

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
    supplier_reference: str | None = Field(None, max_length=100)
    currency: str = Field(default="XOF", max_length=5)
    notes: str | None = None
    terms: str | None = None
    items: list[POItemCreate] = Field(min_length=1)


class POUpdate(BaseModel):
    expected_date: datetime | None = None
    supplier_reference: str | None = None
    notes: str | None = None
    terms: str | None = None
    status: str | None = Field(None, pattern="^(DRAFT|SENT|CONFIRMED|PARTIAL|RECEIVED|CANCELLED)$")
    items: list[POItemCreate] | None = None


class POOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    po_number: str
    supplier_id: int
    supplier: dict[str, Any]  # SupplierOut as dict
    status: str
    order_date: datetime
    expected_date: datetime | None
    received_date: datetime | None
    supplier_reference: str | None
    subtotal: float
    tax_amount: float
    total_amount: float
    currency: str
    notes: str | None
    terms: str | None
    total_items: int
    received_items: int
    items: list[POItemOut]
    created_at: datetime
    updated_at: datetime


# ── Purchase Reception Schemas ─────────────────────────────────────

class ReceptionItemCreate(BaseModel):
    order_item_id: int
    quantity_received: float = Field(gt=0)
    notes: str | None = Field(None, max_length=500)


class ReceptionItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    order_item_id: int
    quantity_received: float
    notes: str | None


class ReceptionCreate(BaseModel):
    purchase_order_id: int
    reception_date: datetime | None = None
    notes: str | None = None
    items: list[ReceptionItemCreate] = Field(min_length=1)


class ReceptionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    purchase_order_id: int
    reception_number: str
    reception_date: datetime
    status: str
    notes: str | None
    items: list[ReceptionItemOut]
    created_at: datetime


# ── Supplier Invoice Schemas ───────────────────────────────────────

class SupplierInvoiceCreate(BaseModel):
    supplier_id: int
    purchase_order_id: int | None = None
    invoice_number: str = Field(min_length=1, max_length=50)
    supplier_reference: str | None = Field(None, max_length=100)
    invoice_date: datetime
    due_date: datetime | None = None
    subtotal: float = Field(ge=0)
    tax_amount: float = Field(default=0.0, ge=0)
    total_amount: float = Field(ge=0)
    currency: str = Field(default="XOF", max_length=5)
    notes: str | None = None


class SupplierInvoiceUpdate(BaseModel):
    supplier_reference: str | None = None
    due_date: datetime | None = None
    status: str | None = Field(None, pattern="^(pending|partially_paid|paid|overdue|cancelled)$")
    notes: str | None = None


class SupplierInvoiceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    supplier_id: int
    supplier: dict[str, Any]  # SupplierOut as dict
    purchase_order_id: int | None
    invoice_number: str
    supplier_reference: str | None
    invoice_date: datetime
    due_date: datetime | None
    status: str
    subtotal: float
    tax_amount: float
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    notes: str | None
    payments: list["SupplierPaymentOut"]
    created_at: datetime


# ── Supplier Payment Schemas ───────────────────────────────────────

class SupplierPaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    payment_method: str = Field(
        default="BANK_TRANSFER",
        pattern="^(CASH|BANK_TRANSFER|CHECK|MOBILE_MONEY)$"
    )
    payment_date: datetime | None = None
    reference: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=500)


class SupplierPaymentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    supplier_invoice_id: int
    amount: float
    payment_method: str
    payment_date: datetime
    reference: str | None
    notes: str | None
    created_at: datetime


# ── Supplier Statement Schemas ─────────────────────────────────────

class SupplierStatementLine(BaseModel):
    date: datetime
    type: str  # invoice, payment
    reference: str
    description: str
    debit: float  # Amount owed (invoices)
    credit: float  # Amount paid (payments)
    balance: float  # Running balance


class SupplierStatement(BaseModel):
    supplier_id: int
    supplier_name: str
    period_start: datetime
    period_end: datetime
    opening_balance: float
    closing_balance: float
    total_invoiced: float
    total_paid: float
    lines: list[SupplierStatementLine]


# ── Dashboard Stats for Purchases ──────────────────────────────────

class PurchaseDashboardStats(BaseModel):
    total_orders: int
    pending_orders: int
    partially_received: int
    received_orders: int
    total_order_value: float
    pending_invoices: int
    overdue_invoices: int
    total_payable: float
    total_paid: float


# Update forward references
SupplierInvoiceOut.model_rebuild()
