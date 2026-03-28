"""Pydantic schemas for API Key management.

Provides request/response schemas for:
- API Key CRUD operations
- Usage statistics
- Webhook management
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ─── Available Scopes ────────────────────────────────────────────────────────

AVAILABLE_SCOPES = {
    # Invoice scopes
    "read:invoices": "Read invoices",
    "write:invoices": "Create and update invoices",
    # Customer scopes
    "read:customers": "Read customers",
    "write:customers": "Create and update customers",
    # Product scopes
    "read:products": "Read products",
    "write:products": "Create and update products",
    # Quote scopes
    "read:quotes": "Read quotes",
    "write:quotes": "Create and update quotes",
    # Payment scopes
    "read:payments": "Read payments",
    "write:payments": "Create payments",
    # Supplier scopes
    "read:suppliers": "Read suppliers",
    "write:suppliers": "Create and update suppliers",
    # Report scopes
    "read:reports": "Read reports and analytics",
    # Webhook scopes
    "read:webhooks": "Read webhooks",
    "write:webhooks": "Create and update webhooks",
    # Full access
    "*": "Full access to all resources",
}

SCOPE_GROUPS = {
    "invoices": ["read:invoices", "write:invoices"],
    "customers": ["read:customers", "write:customers"],
    "products": ["read:products", "write:products"],
    "quotes": ["read:quotes", "write:quotes"],
    "payments": ["read:payments", "write:payments"],
    "suppliers": ["read:suppliers", "write:suppliers"],
    "reports": ["read:reports"],
    "webhooks": ["read:webhooks", "write:webhooks"],
}


# ─── API Key Schemas ─────────────────────────────────────────────────────────

class APIKeyBase(BaseModel):
    """Base schema for API key."""
    name: str = Field(..., min_length=1, max_length=100, description="API key name")
    description: Optional[str] = Field(None, max_length=500, description="API key description")
    scopes: list[str] = Field(default_factory=list, description="Permission scopes")
    rate_limit: int = Field(default=1000, ge=100, le=100000, description="Rate limit per hour")
    expires_at: Optional[datetime] = Field(None, description="Expiration date")


class APIKeyCreate(APIKeyBase):
    """Schema for creating a new API key."""
    pass


class APIKeyUpdate(BaseModel):
    """Schema for updating an API key."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    scopes: Optional[list[str]] = None
    rate_limit: Optional[int] = Field(None, ge=100, le=100000)
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class APIKeyOut(BaseModel):
    """Schema for API key output (without sensitive data)."""
    id: int
    name: str
    description: Optional[str] = None
    key_prefix: str
    masked_key: str
    scopes: list[str]
    rate_limit: int
    is_active: bool
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    created_by: int
    
    model_config = {"from_attributes": True}


class APIKeyCreated(APIKeyOut):
    """Schema for newly created API key (includes the full key)."""
    key: str = Field(..., description="Full API key (shown only once)")
    secret: Optional[str] = Field(None, description="Secret for HMAC signatures")


class APIKeyListOut(BaseModel):
    """Schema for API key list item."""
    id: int
    name: str
    key_prefix: str
    masked_key: str
    scopes: list[str]
    is_active: bool
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ─── Usage Statistics Schemas ────────────────────────────────────────────────

class APIKeyUsageStats(BaseModel):
    """Schema for API key usage statistics."""
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    requests_by_endpoint: dict[str, int]
    requests_by_status: dict[int, int]
    requests_last_24h: int
    requests_last_7d: int
    requests_last_30d: int


class APIKeyUsageOut(BaseModel):
    """Schema for API key usage log entry."""
    id: int
    endpoint: str
    method: str
    status_code: int
    response_time_ms: int
    ip_address: Optional[str] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class APIKeyUsageList(BaseModel):
    """Schema for paginated usage logs."""
    items: list[APIKeyUsageOut]
    total: int
    page: int
    pages: int
    stats: APIKeyUsageStats


# ─── Webhook Schemas ─────────────────────────────────────────────────────────

AVAILABLE_WEBHOOK_EVENTS = {
    "invoice.created": "Invoice created",
    "invoice.sent": "Invoice sent to customer",
    "invoice.paid": "Invoice fully paid",
    "invoice.cancelled": "Invoice cancelled",
    "invoice.overdue": "Invoice overdue",
    "payment.received": "Payment received",
    "payment.failed": "Payment failed",
    "customer.created": "Customer created",
    "customer.updated": "Customer updated",
    "quote.created": "Quote created",
    "quote.accepted": "Quote accepted",
    "quote.rejected": "Quote rejected",
}


class WebhookEndpointBase(BaseModel):
    """Base schema for webhook endpoint."""
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., max_length=500)
    events: list[str] = Field(default_factory=list, description="Events to subscribe to")


class WebhookEndpointCreate(WebhookEndpointBase):
    """Schema for creating a webhook endpoint."""
    pass


class WebhookEndpointUpdate(BaseModel):
    """Schema for updating a webhook endpoint."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[str] = Field(None, max_length=500)
    events: Optional[list[str]] = None
    is_active: Optional[bool] = None


class WebhookEndpointOut(BaseModel):
    """Schema for webhook endpoint output."""
    id: int
    name: str
    url: str
    events: list[str]
    is_active: bool
    last_triggered_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    consecutive_failures: int
    created_at: datetime
    
    model_config = {"from_attributes": True}


class WebhookEndpointCreated(WebhookEndpointOut):
    """Schema for newly created webhook (includes secret)."""
    secret: str = Field(..., description="Secret for signature verification")


class WebhookDeliveryOut(BaseModel):
    """Schema for webhook delivery log."""
    id: int
    event_type: str
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    success: bool
    error_message: Optional[str] = None
    attempt_number: int
    created_at: datetime
    
    model_config = {"from_attributes": True}


class WebhookDeliveryList(BaseModel):
    """Schema for paginated delivery logs."""
    items: list[WebhookDeliveryOut]
    total: int
    page: int
    pages: int


# ─── Public API Response Schemas ─────────────────────────────────────────────

class PublicInvoiceItem(BaseModel):
    """Schema for invoice item in public API."""
    id: int
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    line_total: float
    product_id: Optional[int] = None
    
    model_config = {"from_attributes": True}


class PublicInvoiceOut(BaseModel):
    """Schema for invoice in public API."""
    id: int
    invoice_number: str
    status: str
    issue_date: datetime
    due_date: Optional[datetime] = None
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    notes: Optional[str] = None
    items: list[PublicInvoiceItem]
    customer_id: int
    created_at: datetime
    
    model_config = {"from_attributes": True}


class PublicInvoiceCreate(BaseModel):
    """Schema for creating invoice via public API."""
    customer_id: int
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: list[dict] = Field(..., min_length=1)
    discount_percent: Optional[float] = Field(default=0, ge=0, le=100)


class PublicCustomerOut(BaseModel):
    """Schema for customer in public API."""
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str
    tax_id: Optional[str] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class PublicCustomerCreate(BaseModel):
    """Schema for creating customer via public API."""
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Côte d'Ivoire"
    tax_id: Optional[str] = None


class PublicProductOut(BaseModel):
    """Schema for product in public API."""
    id: int
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    unit_price: float
    unit: str
    tax_rate: float
    category_id: Optional[int] = None
    is_active: bool
    
    model_config = {"from_attributes": True}


class PaginatedResponse(BaseModel):
    """Generic paginated response schema."""
    items: list
    total: int
    page: int
    pages: int
    has_next: bool
    has_prev: bool
