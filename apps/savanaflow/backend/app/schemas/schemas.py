"""Pydantic v2 schemas for SavanaFlow POS — Production Edition."""
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
    store_id: int | None = None

class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    store_id: int | None
    is_active: bool
    created_at: datetime


# ── Store ───────────────────────────────────────────────────────
class StoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: str | None = None
    phone: str | None = Field(None, max_length=30)
    city: str | None = Field(None, max_length=100)
    currency: str = Field(default="GNF", max_length=5)  # Franc Guinéen par défaut
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    receipt_header: str | None = None
    receipt_footer: str | None = None

class StoreUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    address: str | None = None
    phone: str | None = Field(None, max_length=30)
    city: str | None = None
    currency: str | None = None
    tax_rate: float | None = Field(None, ge=0, le=100)
    receipt_header: str | None = None
    receipt_footer: str | None = None
    is_active: bool | None = None

class StoreOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    address: str | None
    phone: str | None
    city: str | None
    currency: str
    tax_rate: float
    receipt_header: str | None
    receipt_footer: str | None
    is_active: bool


# ── Category ───────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    parent_id: int | None = None
    color: str | None = Field(None, max_length=10)
    icon: str | None = Field(None, max_length=50)
    sort_order: int = 0

class CategoryOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    description: str | None
    parent_id: int | None
    color: str | None
    icon: str | None
    sort_order: int
    is_active: bool


# ── Supplier ────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = None
    contact_name: str | None = Field(None, max_length=200)
    payment_terms: int = Field(default=30, ge=0, le=365)
    notes: str | None = None

class SupplierOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    email: str | None
    phone: str | None
    address: str | None
    contact_name: str | None
    payment_terms: int
    notes: str | None
    is_active: bool
    created_at: datetime


# ── Product Variant ─────────────────────────────────────────────
class VariantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str | None = Field(None, max_length=100)
    barcode: str | None = Field(None, max_length=100)
    attributes: dict = Field(default_factory=dict)
    sell_price: float | None = Field(None, gt=0)
    cost_price: float | None = Field(None, ge=0)
    stock_quantity: float = Field(default=0.0, ge=0)

class VariantOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    name: str
    sku: str | None
    barcode: str | None
    attributes: dict
    sell_price: float | None
    cost_price: float | None
    stock_quantity: float
    is_active: bool


# ── Product ─────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    store_id: int
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category_id: int | None = None
    supplier_id: int | None = None
    barcode: str | None = Field(None, max_length=100)
    sku: str | None = Field(None, max_length=100)
    unit: str = Field(default="unit", max_length=50)
    sell_price: float = Field(gt=0)
    cost_price: float = Field(default=0.0, ge=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    stock_quantity: float = Field(default=0.0, ge=0)
    low_stock_threshold: float = Field(default=10.0, ge=0)
    has_variants: bool = False
    variants: list[VariantCreate] = Field(default_factory=list)

class ProductUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    category_id: int | None = None
    supplier_id: int | None = None
    barcode: str | None = Field(None, max_length=100)
    sell_price: float | None = Field(None, gt=0)
    cost_price: float | None = Field(None, ge=0)
    tax_rate: float | None = Field(None, ge=0, le=100)
    low_stock_threshold: float | None = Field(None, ge=0)
    is_active: bool | None = None

class ProductOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    store_id: int
    name: str
    description: str | None
    category_id: int | None
    supplier_id: int | None
    barcode: str | None
    sku: str | None
    unit: str
    sell_price: float
    cost_price: float
    tax_rate: float
    stock_quantity: float
    low_stock_threshold: float
    has_variants: bool
    is_active: bool
    is_low_stock: bool
    variants: list[VariantOut] = []


# ── POS Customer (Fidélité) ─────────────────────────────────────
class POSCustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(None, max_length=30)
    email: EmailStr | None = None
    store_id: int | None = None
    notes: str | None = None

class POSCustomerUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=30)
    email: EmailStr | None = None
    notes: str | None = None
    is_active: bool | None = None

class LoyaltyAdjust(BaseModel):
    points: int
    description: str = Field(max_length=300)

class POSCustomerOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    store_id: int | None
    name: str
    phone: str | None
    email: str | None
    loyalty_points: int
    loyalty_tier: str
    total_spent: float
    visit_count: int
    notes: str | None
    is_active: bool
    created_at: datetime
    last_visit: datetime | None


# ── Promotion ───────────────────────────────────────────────────
class PromotionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    promo_type: str = Field(pattern="^(PERCENT|FIXED|BOGO|BUNDLE)$")
    value: float = Field(gt=0)
    min_purchase: float = Field(default=0.0, ge=0)
    max_discount: float | None = Field(None, gt=0)
    applies_to: str = Field(default="ALL", pattern="^(ALL|CATEGORY|PRODUCT)$")
    category_id: int | None = None
    product_ids: list[int] = Field(default_factory=list)
    code: str | None = Field(None, max_length=50)
    usage_limit: int | None = Field(None, gt=0)
    start_date: datetime
    end_date: datetime

class PromotionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    description: str | None
    promo_type: str
    value: float
    min_purchase: float
    max_discount: float | None
    applies_to: str
    category_id: int | None
    code: str | None
    usage_limit: int | None
    usage_count: int
    start_date: datetime
    end_date: datetime
    is_active: bool


# ── Shift ───────────────────────────────────────────────────────
class ShiftOpen(BaseModel):
    store_id: int
    opening_cash: float = Field(default=0.0, ge=0)
    notes: str | None = None

class ShiftClose(BaseModel):
    closing_cash: float = Field(ge=0)
    notes: str | None = None

class ShiftOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    store_id: int
    user_id: int
    opened_at: datetime
    closed_at: datetime | None
    opening_cash: float
    closing_cash: float | None
    expected_cash: float | None
    cash_difference: float | None
    total_sales: float
    total_refunds: float
    sales_count: int
    notes: str | None
    status: str


# ── Stock ───────────────────────────────────────────────────────
class StockAdjust(BaseModel):
    product_id: int
    variant_id: int | None = None
    movement_type: str = Field(pattern="^(IN|OUT|ADJUST)$")
    quantity: float = Field(gt=0)
    reference: str | None = Field(None, max_length=100)
    reason: str | None = Field(None, max_length=300)

class StockMovementOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    variant_id: int | None
    movement_type: str
    quantity: float
    reference: str | None
    reason: str | None
    quantity_before: float
    quantity_after: float
    created_at: datetime


# ── Sale ────────────────────────────────────────────────────────
class SaleItemCreate(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float | None = Field(None, gt=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)

class SaleItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    variant_id: int | None
    quantity: float
    unit_price: float
    tax_rate: float
    discount_percent: float
    line_total: float
    cost_price: float

class SaleCreate(BaseModel):
    store_id: int
    shift_id: int | None = None
    customer_id: int | None = None
    promotion_code: str | None = None
    loyalty_points_to_use: int = Field(default=0, ge=0)
    payment_method: str = Field(default="CASH", pattern="^(CASH|MOBILE_MONEY|CARD|WAVE|OM|MTN|TRANSFER|SPLIT)$")
    payment_reference: str | None = Field(None, max_length=100)
    currency: str = Field(default="GNF", max_length=5)  # Franc Guinéen par défaut
    notes: str | None = None
    items: list[SaleItemCreate] = Field(min_length=1)

class SaleOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    sale_number: str
    store_id: int
    user_id: int
    shift_id: int | None
    customer_id: int | None
    subtotal: float
    tax_amount: float
    discount_amount: float
    loyalty_discount: float
    total_amount: float
    payment_method: str
    payment_reference: str | None
    status: str
    currency: str
    loyalty_points_earned: int
    loyalty_points_used: int
    notes: str | None
    items: list[SaleItemOut]
    created_at: datetime


# ── Refund ──────────────────────────────────────────────────────
class RefundItemCreate(BaseModel):
    sale_item_id: int
    quantity_returned: float = Field(gt=0)

class RefundCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    refund_method: str = Field(default="CASH", pattern="^(CASH|MOBILE_MONEY|CARD|WAVE|OM|MTN|STORE_CREDIT)$")
    restock_items: bool = True
    notes: str | None = None
    items: list[RefundItemCreate] = Field(min_length=1)

class RefundItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    quantity_returned: float
    unit_price: float
    line_refund: float

class RefundOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    refund_number: str
    sale_id: int
    user_id: int
    reason: str
    refund_amount: float
    refund_method: str
    restock_items: bool
    status: str
    notes: str | None
    items: list[RefundItemOut]
    created_at: datetime


# ── Store Transfer ──────────────────────────────────────────────
class TransferItemCreate(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: float = Field(gt=0)

class TransferCreate(BaseModel):
    from_store_id: int
    to_store_id: int
    notes: str | None = None
    items: list[TransferItemCreate] = Field(min_length=1)

class TransferItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    variant_id: int | None
    quantity: float
    quantity_received: float

class TransferOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    transfer_number: str
    from_store_id: int
    to_store_id: int
    user_id: int
    status: str
    notes: str | None
    shipped_at: datetime | None
    received_at: datetime | None
    items: list[TransferItemOut]
    created_at: datetime


# ── Purchase Order ──────────────────────────────────────────────
class POItemCreate(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: float = Field(gt=0)
    unit_cost: float = Field(gt=0)

class POCreate(BaseModel):
    store_id: int
    supplier_id: int
    expected_date: datetime | None = None
    currency: str = Field(default="XOF", max_length=5)
    notes: str | None = None
    items: list[POItemCreate] = Field(min_length=1)

class POReceiveItem(BaseModel):
    item_id: int
    quantity_received: float = Field(gt=0)

class POReceive(BaseModel):
    items: list[POReceiveItem]

class POItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    variant_id: int | None
    quantity: float
    quantity_received: float
    unit_cost: float
    line_total: float

class POOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    po_number: str
    store_id: int
    supplier_id: int
    user_id: int
    status: str
    order_date: datetime
    expected_date: datetime | None
    received_date: datetime | None
    total_amount: float
    currency: str
    notes: str | None
    items: list[POItemOut]
    created_at: datetime


# ── Reports ─────────────────────────────────────────────────────
class SalesReport(BaseModel):
    period: str
    total_sales: int
    total_revenue: float
    total_cost: float
    gross_margin: float
    gross_margin_pct: float
    by_payment_method: list[dict[str, Any]]
    top_products: list[dict[str, Any]]
    by_category: list[dict[str, Any]]
    by_hour: list[dict[str, Any]]

class POSDashboard(BaseModel):
    sales_today: int
    revenue_today: float
    sales_this_month: int
    revenue_this_month: float
    low_stock_count: int
    active_shift: ShiftOut | None
    top_products_today: list[dict[str, Any]]
    loyalty_customers_count: int
    pending_transfers: int
    pending_pos: int


# ── Pagination ──────────────────────────────────────────────────
class Paginated(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
