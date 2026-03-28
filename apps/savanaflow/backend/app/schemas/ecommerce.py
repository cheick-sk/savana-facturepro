"""Pydantic schemas for E-commerce module — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, date
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field


# ── Online Store ───────────────────────────────────────────────────────
class OnlineStoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    store_id: int
    custom_domain: str | None = None

    # Branding
    logo_url: str | None = None
    banner_url: str | None = None
    primary_color: str = Field(default="#2563eb", max_length=10)
    secondary_color: str = Field(default="#1e40af", max_length=10)

    # Contact
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(None, max_length=30)
    address: str | None = None

    # Social
    facebook_url: str | None = None
    instagram_url: str | None = None
    whatsapp_number: str | None = Field(None, max_length=30)

    # Configuration
    currency: str = Field(default="XOF", max_length=5)
    language: str = Field(default="fr", max_length=5)
    timezone: str = Field(default="Africa/Abidjan", max_length=50)

    # Features
    delivery_enabled: bool = False
    pickup_enabled: bool = True
    guest_checkout: bool = True

    # Payment
    cinetpay_enabled: bool = False
    cinetpay_site_id: str | None = None
    cinetpay_api_key: str | None = None
    paystack_enabled: bool = False
    paystack_public_key: str | None = None
    paystack_secret_key: str | None = None
    mpesa_enabled: bool = False
    mpesa_shortcode: str | None = None
    cash_on_delivery: bool = False

    # SEO
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)


class OnlineStoreUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    custom_domain: str | None = None

    logo_url: str | None = None
    banner_url: str | None = None
    primary_color: str | None = Field(None, max_length=10)
    secondary_color: str | None = Field(None, max_length=10)

    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(None, max_length=30)
    address: str | None = None

    facebook_url: str | None = None
    instagram_url: str | None = None
    whatsapp_number: str | None = Field(None, max_length=30)

    currency: str | None = Field(None, max_length=5)
    language: str | None = Field(None, max_length=5)
    timezone: str | None = Field(None, max_length=50)

    delivery_enabled: bool | None = None
    pickup_enabled: bool | None = None
    guest_checkout: bool | None = None

    cinetpay_enabled: bool | None = None
    cinetpay_site_id: str | None = None
    cinetpay_api_key: str | None = None
    paystack_enabled: bool | None = None
    paystack_public_key: str | None = None
    paystack_secret_key: str | None = None
    mpesa_enabled: bool | None = None
    mpesa_shortcode: str | None = None
    cash_on_delivery: bool | None = None

    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)

    is_active: bool | None = None


class OnlineStoreOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    store_id: int
    name: str
    slug: str
    custom_domain: str | None

    logo_url: str | None
    banner_url: str | None
    primary_color: str
    secondary_color: str

    contact_email: str | None
    contact_phone: str | None
    address: str | None

    facebook_url: str | None
    instagram_url: str | None
    whatsapp_number: str | None

    currency: str
    language: str
    timezone: str

    delivery_enabled: bool
    pickup_enabled: bool
    guest_checkout: bool

    cinetpay_enabled: bool
    paystack_enabled: bool
    mpesa_enabled: bool
    cash_on_delivery: bool

    meta_title: str | None
    meta_description: str | None

    is_active: bool
    created_at: datetime
    updated_at: datetime


# ── Online Product ───────────────────────────────────────────────────────
class OnlineProductCreate(BaseModel):
    online_store_id: int
    product_id: int
    variant_id: int | None = None

    online_name: str | None = Field(None, max_length=200)
    online_description: str | None = None
    online_price: float | None = Field(None, ge=0)

    images: list[str] = Field(default_factory=list)
    main_image_url: str | None = None

    online_category_id: int | None = None
    tags: list[str] = Field(default_factory=list)

    slug: str | None = Field(None, max_length=200)
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)

    sync_stock: bool = True
    stock_quantity: float = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)

    is_featured: bool = False
    is_new: bool = False
    is_on_sale: bool = False
    sale_price: float | None = Field(None, ge=0)


class OnlineProductUpdate(BaseModel):
    online_name: str | None = Field(None, max_length=200)
    online_description: str | None = None
    online_price: float | None = Field(None, ge=0)

    images: list[str] | None = None
    main_image_url: str | None = None

    online_category_id: int | None = None
    tags: list[str] | None = None

    slug: str | None = Field(None, max_length=200)
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)

    sync_stock: bool | None = None
    stock_quantity: float | None = Field(None, ge=0)
    low_stock_threshold: int | None = Field(None, ge=0)

    is_published: bool | None = None
    is_featured: bool | None = None
    is_new: bool | None = None
    is_on_sale: bool | None = None
    sale_price: float | None = Field(None, ge=0)


class OnlineProductOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    store_id: int
    online_store_id: int
    product_id: int
    variant_id: int | None

    online_name: str | None
    online_description: str | None
    online_price: float | None

    images: list
    main_image_url: str | None

    online_category_id: int | None
    tags: list

    slug: str | None
    meta_title: str | None
    meta_description: str | None

    sync_stock: bool
    stock_quantity: float
    low_stock_threshold: int

    is_published: bool
    is_featured: bool
    is_new: bool
    is_on_sale: bool
    sale_price: float | None

    view_count: int
    purchase_count: int

    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class OnlineProductDetailOut(OnlineProductOut):
    """Online product with original product info"""
    original_product: dict[str, Any] | None = None
    original_variant: dict[str, Any] | None = None
    category_name: str | None = None


class BulkPublishRequest(BaseModel):
    product_ids: list[int] = Field(min_length=1)
    online_store_id: int


# ── Online Category ───────────────────────────────────────────────────────
class OnlineCategoryCreate(BaseModel):
    online_store_id: int
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    description: str | None = None
    image_url: str | None = None
    parent_id: int | None = None
    display_order: int = 0


class OnlineCategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = None
    image_url: str | None = None
    parent_id: int | None = None
    display_order: int | None = None
    is_active: bool | None = None


class OnlineCategoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    online_store_id: int
    name: str
    slug: str
    description: str | None
    image_url: str | None
    parent_id: int | None
    display_order: int
    is_active: bool
    created_at: datetime


class OnlineCategoryTreeOut(OnlineCategoryOut):
    """Category with children for tree view"""
    children: list["OnlineCategoryTreeOut"] = []
    product_count: int = 0


# ── Online Customer ───────────────────────────────────────────────────────
class OnlineCustomerCreate(BaseModel):
    online_store_id: int
    email: EmailStr
    phone: str | None = Field(None, max_length=30)
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    password: str | None = Field(None, min_length=6)
    pos_customer_id: int | None = None


class OnlineCustomerUpdate(BaseModel):
    phone: str | None = Field(None, max_length=30)
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    default_billing_address: dict | None = None
    default_shipping_address: dict | None = None


class OnlineCustomerOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    online_store_id: int
    email: str
    phone: str | None
    first_name: str | None
    last_name: str | None
    default_billing_address: dict | None
    default_shipping_address: dict | None
    total_orders: int
    total_spent: float
    is_verified: bool
    last_login: datetime | None
    created_at: datetime

    @property
    def full_name(self) -> str:
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or self.email.split("@")[0]


class CustomerAddress(BaseModel):
    """Address for checkout"""
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    address_line1: str = Field(min_length=1, max_length=200)
    address_line2: str | None = None
    city: str = Field(min_length=1, max_length=100)
    state: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str = Field(default="CI", max_length=3)
    phone: str | None = Field(None, max_length=30)


# ── Cart ───────────────────────────────────────────────────────────────
class CartItemCreate(BaseModel):
    online_product_id: int
    quantity: float = Field(gt=0)


class CartItemUpdate(BaseModel):
    quantity: float = Field(gt=0)


class CartItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    online_product_id: int
    quantity: float
    unit_price: float
    total: float
    product_name: str | None = None
    product_image: str | None = None


class CartOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    customer_id: int | None
    session_id: str | None
    items: list[CartItemOut] = []
    subtotal: float
    tax_amount: float
    shipping_fee: float
    discount_amount: float
    total: float
    coupon_code: str | None
    expires_at: datetime | None
    created_at: datetime


class ApplyCouponRequest(BaseModel):
    coupon_code: str = Field(min_length=1, max_length=50)


# ── Online Order ───────────────────────────────────────────────────────
class OnlineOrderCreate(BaseModel):
    """Checkout request"""
    customer_email: EmailStr
    customer_phone: str | None = Field(None, max_length=30)
    customer_first_name: str | None = Field(None, max_length=100)
    customer_last_name: str | None = Field(None, max_length=100)

    delivery_method: str = Field(pattern="^(pickup|delivery)$")
    shipping_address: CustomerAddress | None = None
    delivery_zone_id: int | None = None
    delivery_notes: str | None = None

    payment_method: str = Field(pattern="^(cinetpay|paystack|mpesa|cash_on_delivery|cash)$")

    customer_notes: str | None = None
    coupon_code: str | None = None


class OnlineOrderUpdate(BaseModel):
    status: str | None = Field(None, pattern="^(pending|confirmed|processing|ready|shipped|delivered|cancelled|refunded)$")
    payment_status: str | None = Field(None, pattern="^(pending|paid|failed|refunded)$")
    internal_notes: str | None = None
    shipping_address: dict | None = None
    delivery_zone_id: int | None = None
    delivery_fee: float | None = Field(None, ge=0)


class OnlineOrderItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    online_product_id: int
    product_name: str
    product_image: str | None
    quantity: float
    unit_price: float
    total: float


class OnlineOrderOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    online_store_id: int
    customer_id: int | None
    order_number: str

    customer_email: str
    customer_phone: str | None
    customer_name: str

    delivery_method: str
    shipping_address: dict | None
    delivery_fee: float
    delivery_notes: str | None
    delivery_zone_id: int | None

    status: str
    payment_status: str

    payment_method: str | None
    payment_reference: str | None
    paid_at: datetime | None

    subtotal: float
    tax_amount: float
    shipping_fee: float
    discount_amount: float
    total: float

    customer_notes: str | None
    internal_notes: str | None

    sale_id: int | None

    confirmed_at: datetime | None
    shipped_at: datetime | None
    delivered_at: datetime | None

    items: list[OnlineOrderItemOut] = []

    created_at: datetime
    updated_at: datetime


class OrderStatusUpdate(BaseModel):
    notes: str | None = None


# ── Delivery Zone ───────────────────────────────────────────────────────
class DeliveryZoneCreate(BaseModel):
    online_store_id: int
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    areas: list[str] = Field(min_length=1)
    base_fee: float = Field(ge=0)
    free_delivery_minimum: float | None = Field(None, ge=0)
    estimated_delivery_hours: int = Field(default=24, ge=1)


class DeliveryZoneUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = None
    areas: list[str] | None = None
    base_fee: float | None = Field(None, ge=0)
    free_delivery_minimum: float | None = Field(None, ge=0)
    estimated_delivery_hours: int | None = Field(None, ge=1)
    is_active: bool | None = None


class DeliveryZoneOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    online_store_id: int
    name: str
    description: str | None
    areas: list
    base_fee: float
    free_delivery_minimum: float | None
    estimated_delivery_hours: int
    is_active: bool
    created_at: datetime


# ── Coupon ───────────────────────────────────────────────────────────────
class CouponCreate(BaseModel):
    online_store_id: int
    code: str = Field(min_length=1, max_length=50, pattern="^[A-Z0-9-]+$")
    description: str | None = Field(None, max_length=300)
    discount_type: str = Field(pattern="^(percent|fixed)$")
    discount_value: float = Field(gt=0)
    min_order_amount: float | None = Field(None, ge=0)
    max_uses: int | None = Field(None, gt=0)
    uses_per_customer: int = Field(default=1, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class CouponUpdate(BaseModel):
    description: str | None = Field(None, max_length=300)
    discount_type: str | None = Field(None, pattern="^(percent|fixed)$")
    discount_value: float | None = Field(None, gt=0)
    min_order_amount: float | None = Field(None, ge=0)
    max_uses: int | None = Field(None, gt=0)
    uses_per_customer: int | None = Field(None, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None


class CouponOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    online_store_id: int
    code: str
    description: str | None
    discount_type: str
    discount_value: float
    min_order_amount: float | None
    max_uses: int | None
    current_uses: int
    uses_per_customer: int
    starts_at: datetime | None
    expires_at: datetime | None
    is_active: bool
    created_at: datetime


class CouponValidation(BaseModel):
    """Result of coupon validation"""
    valid: bool
    discount_amount: float
    message: str | None = None
    coupon: CouponOut | None = None


# ── E-commerce Stats ───────────────────────────────────────────────────────
class EcommerceStats(BaseModel):
    """Dashboard stats for e-commerce"""
    # Sales
    total_orders: int
    pending_orders: int
    processing_orders: int
    completed_orders: int
    cancelled_orders: int

    # Revenue
    total_revenue: float
    today_revenue: float
    week_revenue: float
    month_revenue: float

    # Products
    total_products: int
    published_products: int
    out_of_stock: int

    # Customers
    total_customers: int
    new_customers_today: int
    returning_customers: int

    # Top products
    top_products: list[dict[str, Any]]

    # Recent orders
    recent_orders: list[dict[str, Any]]

    # Sales by day (last 30 days)
    sales_by_day: list[dict[str, Any]]


# ── Storefront Public Schemas ───────────────────────────────────────────────
class StorefrontInfo(BaseModel):
    """Public store information"""
    name: str
    slug: str
    logo_url: str | None
    banner_url: str | None
    primary_color: str
    secondary_color: str
    contact_email: str | None
    contact_phone: str | None
    address: str | None
    facebook_url: str | None
    instagram_url: str | None
    whatsapp_number: str | None
    currency: str
    language: str
    delivery_enabled: bool
    pickup_enabled: bool
    guest_checkout: bool
    cinetpay_enabled: bool
    paystack_enabled: bool
    mpesa_enabled: bool
    cash_on_delivery: bool
    meta_title: str | None
    meta_description: str | None


class StorefrontProductOut(BaseModel):
    """Product for storefront listing"""
    id: int
    name: str
    description: str | None
    price: float
    sale_price: float | None
    main_image_url: str | None
    images: list[str]
    slug: str | None
    category_name: str | None
    is_featured: bool
    is_new: bool
    is_on_sale: bool
    stock_quantity: float
    is_available: bool


class StorefrontProductDetail(StorefrontProductOut):
    """Detailed product for storefront"""
    tags: list[str]
    related_products: list[StorefrontProductOut] = []


class StorefrontCategoryOut(BaseModel):
    """Category for storefront"""
    id: int
    name: str
    slug: str
    description: str | None
    image_url: str | None
    product_count: int


class SearchParams(BaseModel):
    """Search parameters"""
    query: str | None = None
    category_id: int | None = None
    min_price: float | None = None
    max_price: float | None = None
    in_stock_only: bool = False
    on_sale_only: bool = False
    sort_by: str = "newest"  # newest, price_asc, price_desc, popular
    page: int = 1
    per_page: int = 20


# ── Customer Auth Schemas ───────────────────────────────────────────────
class CustomerRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=30)


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    customer: OnlineCustomerOut


class CustomerRefreshRequest(BaseModel):
    refresh_token: str


# ── Payment Schemas ───────────────────────────────────────────────────────
class PaymentInitRequest(BaseModel):
    """Initialize payment for an order"""
    order_id: int
    payment_method: str
    return_url: str | None = None


class PaymentCallback(BaseModel):
    """Payment callback from provider"""
    reference: str
    status: str
    transaction_id: str | None = None
    amount: float | None = None


class PaymentResult(BaseModel):
    """Payment result"""
    success: bool
    message: str
    payment_url: str | None = None  # For redirect-based payments
    order_id: int
    order_number: str
