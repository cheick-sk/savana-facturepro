"""Pydantic schemas for Webhooks — FacturePro Africa."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ── Webhook Event Type Schemas ───────────────────────────────────
class WebhookEventTypeOut(BaseModel):
    """Schema for webhook event type."""
    model_config = {"from_attributes": True}
    id: int
    app: str
    event_type: str
    name: str
    description: str | None
    is_active: bool


class WebhookEventTypeCreate(BaseModel):
    """Schema for creating a webhook event type."""
    app: str = Field(min_length=1, max_length=50)
    event_type: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    payload_schema: dict | None = None
    is_active: bool = True


# ── Webhook Endpoint Schemas ──────────────────────────────────────
class WebhookEndpointCreate(BaseModel):
    """Schema for creating a webhook endpoint."""
    name: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=500)
    events: list[str] = Field(min_length=1)
    secret: str | None = Field(None, max_length=100)
    is_active: bool = True
    retry_count: int = Field(default=3, ge=0, le=10)
    timeout_seconds: int = Field(default=10, ge=1, le=60)

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

    @field_validator('events')
    @classmethod
    def validate_events(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError('At least one event must be selected')
        return v


class WebhookEndpointUpdate(BaseModel):
    """Schema for updating a webhook endpoint."""
    name: str | None = Field(None, max_length=200)
    url: str | None = Field(None, max_length=500)
    events: list[str] | None = None
    is_active: bool | None = None
    retry_count: int | None = Field(None, ge=0, le=10)
    timeout_seconds: int | None = Field(None, ge=1, le=60)

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class WebhookEndpointOut(BaseModel):
    """Schema for webhook endpoint output."""
    model_config = {"from_attributes": True}
    id: int
    organisation_id: int
    name: str
    url: str
    events: list[str]
    is_active: bool
    retry_count: int
    timeout_seconds: int
    total_sent: int
    total_failed: int
    last_triggered_at: datetime | None
    last_success_at: datetime | None
    created_at: datetime
    updated_at: datetime

    # Computed field for success rate
    @property
    def success_rate(self) -> float:
        total = self.total_sent + self.total_failed
        if total == 0:
            return 0.0
        return round(self.total_sent / total * 100, 2)


class WebhookEndpointListOut(BaseModel):
    """Schema for webhook endpoint list output (without sensitive data)."""
    model_config = {"from_attributes": True}
    id: int
    name: str
    url: str
    events: list[str]
    is_active: bool
    total_sent: int
    total_failed: int
    last_triggered_at: datetime | None
    last_success_at: datetime | None
    created_at: datetime


# ── Webhook Event Schemas ─────────────────────────────────────────
class WebhookEventOut(BaseModel):
    """Schema for webhook event output."""
    model_config = {"from_attributes": True}
    id: int
    organisation_id: int
    endpoint_id: int
    event_type: str
    payload: dict
    status: str
    response_status_code: int | None
    response_body: str | None
    response_time_ms: int | None
    attempt_count: int
    next_retry_at: datetime | None
    last_error: str | None
    created_at: datetime
    sent_at: datetime | None


class WebhookEventListOut(BaseModel):
    """Schema for webhook event list output (lighter payload)."""
    model_config = {"from_attributes": True}
    id: int
    endpoint_id: int
    event_type: str
    status: str
    response_status_code: int | None
    response_time_ms: int | None
    attempt_count: int
    created_at: datetime
    sent_at: datetime | None


class WebhookEventDetailOut(BaseModel):
    """Schema for webhook event detail with endpoint info."""
    model_config = {"from_attributes": True}
    id: int
    organisation_id: int
    endpoint_id: int
    endpoint_name: str | None = None
    event_type: str
    payload: dict
    status: str
    response_status_code: int | None
    response_body: str | None
    response_time_ms: int | None
    attempt_count: int
    next_retry_at: datetime | None
    last_error: str | None
    created_at: datetime
    sent_at: datetime | None


# ── Webhook Test Schema ───────────────────────────────────────────
class WebhookTestRequest(BaseModel):
    """Schema for testing a webhook endpoint."""
    event_type: str | None = None


class WebhookTestResponse(BaseModel):
    """Schema for webhook test response."""
    success: bool
    status_code: int | None
    response_time_ms: int | None
    error: str | None
    payload_sent: dict


# ── Webhook Stats Schema ──────────────────────────────────────────
class WebhookEndpointStats(BaseModel):
    """Schema for webhook endpoint statistics."""
    endpoint_id: int
    endpoint_name: str
    total_events: int
    sent_count: int
    failed_count: int
    pending_count: int
    retrying_count: int
    success_rate: float
    avg_response_time_ms: float | None
    last_24h_events: int
    last_24h_success_rate: float


class WebhookDashboardStats(BaseModel):
    """Schema for webhook dashboard statistics."""
    total_endpoints: int
    active_endpoints: int
    total_events_today: int
    total_events_week: int
    success_rate_today: float
    success_rate_week: float
    endpoints_stats: list[WebhookEndpointStats]
    recent_failures: list[WebhookEventListOut]


# ── Trigger Event Schema ──────────────────────────────────────────
class WebhookTriggerRequest(BaseModel):
    """Schema for manually triggering a webhook event."""
    event_type: str
    payload: dict


# ── Available Events Schema ───────────────────────────────────────
class AvailableEventsOut(BaseModel):
    """Schema for available webhook events grouped by app."""
    app: str
    app_name: str
    events: list[WebhookEventTypeOut]


# ── Paginated Response ────────────────────────────────────────────
class WebhookPaginated(BaseModel):
    """Paginated response for webhooks."""
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
