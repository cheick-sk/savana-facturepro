"""Pydantic v2 schemas for SavanaFlow POS — Production Edition."""
from __future__ import annotations
from datetime import datetime, date
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
    employee_id: int | None = None
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


# ── Employee ───────────────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    user_id: int | None = None
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    position: str = Field(pattern="^(vendeur|caissier|manager|gerant)$")
    hire_date: date
    store_ids: list[int] = Field(default_factory=list)  # Assigned stores
    primary_store_id: int | None = None
    
    # Access rights
    can_void_sale: bool = False
    can_refund: bool = False
    can_apply_discount: bool = False
    max_discount_percent: float = Field(default=0, ge=0, le=100)
    can_open_close_shift: bool = False
    can_manage_products: bool = False
    can_view_reports: bool = False
    can_manage_employees: bool = False
    
    # Commission settings
    commission_enabled: bool = False
    commission_type: str = Field(default="percent", pattern="^(percent|fixed)$")
    commission_value: float = Field(default=0, ge=0)
    
    # Salary info
    base_salary: float | None = Field(None, ge=0)
    salary_frequency: str = Field(default="monthly", pattern="^(daily|weekly|monthly)$")

class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    position: str | None = Field(None, pattern="^(vendeur|caissier|manager|gerant)$")
    termination_date: date | None = None
    store_ids: list[int] | None = None
    primary_store_id: int | None = None
    
    # Access rights
    can_void_sale: bool | None = None
    can_refund: bool | None = None
    can_apply_discount: bool | None = None
    max_discount_percent: float | None = Field(None, ge=0, le=100)
    can_open_close_shift: bool | None = None
    can_manage_products: bool | None = None
    can_view_reports: bool | None = None
    can_manage_employees: bool | None = None
    
    # Commission settings
    commission_enabled: bool | None = None
    commission_type: str | None = Field(None, pattern="^(percent|fixed)$")
    commission_value: float | None = Field(None, ge=0)
    
    # Salary info
    base_salary: float | None = Field(None, ge=0)
    salary_frequency: str | None = Field(None, pattern="^(daily|weekly|monthly)$")
    
    is_active: bool | None = None

class EmployeePermissionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    employee_id: int
    permission: str
    is_granted: bool

class EmployeePermissionUpdate(BaseModel):
    permission: str = Field(max_length=100)
    is_granted: bool = True

class StoreSimpleOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    city: str | None

class EmployeeOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    user_id: int | None
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    employee_number: str
    position: str
    hire_date: date
    termination_date: date | None
    
    # Access rights
    can_void_sale: bool
    can_refund: bool
    can_apply_discount: bool
    max_discount_percent: float
    can_open_close_shift: bool
    can_manage_products: bool
    can_view_reports: bool
    can_manage_employees: bool
    
    # Commission settings
    commission_enabled: bool
    commission_type: str
    commission_value: float
    
    # Salary info
    base_salary: float | None
    salary_frequency: str
    
    # Status & Stats
    is_active: bool
    total_sales: float
    total_commission: float
    
    assigned_stores: list[StoreSimpleOut] = []
    permissions: list[EmployeePermissionOut] = []
    
    created_at: datetime
    updated_at: datetime
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

class EmployeeListOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    employee_number: str
    position: str
    is_active: bool
    total_sales: float
    total_commission: float
    phone: str | None
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ── Shift Record ───────────────────────────────────────────────────
class ClockInRequest(BaseModel):
    employee_id: int
    store_id: int
    shift_id: int | None = None
    opening_cash: float | None = Field(None, ge=0)
    notes: str | None = None

class ClockOutRequest(BaseModel):
    shift_record_id: int
    closing_cash: float = Field(ge=0)
    notes: str | None = None

class ShiftRecordOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    employee_id: int
    store_id: int
    shift_id: int | None
    clock_in: datetime
    clock_out: datetime | None
    opening_cash: float | None
    closing_cash: float | None
    cash_difference: float
    sales_count: int
    sales_total: float
    refunds_count: int
    refunds_total: float
    commission_earned: float
    notes: str | None
    status: str
    created_at: datetime

class ShiftRecordDetailOut(ShiftRecordOut):
    employee: EmployeeListOut | None = None
    store: StoreSimpleOut | None = None

class ActiveShiftOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    employee_id: int
    store_id: int
    clock_in: datetime
    opening_cash: float | None
    sales_count: int
    sales_total: float
    employee: EmployeeListOut | None = None
    store: StoreSimpleOut | None = None


# ── Employee Commission ─────────────────────────────────────────────
class EmployeeCommissionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    employee_id: int
    shift_record_id: int | None
    sale_id: int | None
    sale_amount: float
    commission_rate: float
    commission_amount: float
    is_paid: bool
    paid_at: datetime | None
    created_at: datetime

class EmployeeCommissionDetailOut(EmployeeCommissionOut):
    employee: EmployeeListOut | None = None

class PayCommissionsRequest(BaseModel):
    commission_ids: list[int] = Field(min_length=1)

class CommissionReport(BaseModel):
    employee_id: int
    employee_name: str
    total_commission: float
    paid_commission: float
    unpaid_commission: float
    commission_count: int
    sales_total: float


# ── Employee Performance ────────────────────────────────────────────
class EmployeePerformanceOut(BaseModel):
    employee_id: int
    employee_name: str
    period: str
    sales_count: int
    sales_total: float
    refunds_count: int
    refunds_total: float
    commission_earned: float
    hours_worked: float
    avg_sale_value: float
    top_products: list[dict[str, Any]]
    sales_by_day: list[dict[str, Any]]
    sales_by_hour: list[dict[str, Any]]

class EmployeeCompareOut(BaseModel):
    employees: list[dict[str, Any]]
    metric: str
    period: str

class EmployeeHoursReport(BaseModel):
    employee_id: int
    employee_name: str
    total_hours: float
    shifts_count: int
    avg_hours_per_shift: float
    overtime_hours: float
    shifts: list[ShiftRecordOut]

class EmployeeSalesReport(BaseModel):
    employee_id: int
    employee_name: str
    period: str
    sales_count: int
    sales_total: float
    avg_sale_value: float
    top_products: list[dict[str, Any]]
    sales_by_payment_method: list[dict[str, Any]]


# ── Pagination ──────────────────────────────────────────────────
class Paginated(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
