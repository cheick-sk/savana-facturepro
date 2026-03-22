"""Webhook Service for Third-Party Integrations.

Provides:
- Webhook registration and management
- Event dispatching with retry logic
- Signature verification
- Delivery tracking and logs
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class WebhookEvent(str, Enum):
    """Supported webhook events."""
    # Invoice events
    INVOICE_CREATED = "invoice.created"
    INVOICE_SENT = "invoice.sent"
    INVOICE_PAID = "invoice.paid"
    INVOICE_PARTIAL = "invoice.partial"
    INVOICE_OVERDUE = "invoice.overdue"
    INVOICE_CANCELLED = "invoice.cancelled"

    # Payment events
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_REFUNDED = "payment.refunded"

    # Customer events
    CUSTOMER_CREATED = "customer.created"
    CUSTOMER_UPDATED = "customer.updated"
    CUSTOMER_DELETED = "customer.deleted"

    # Quote events
    QUOTE_CREATED = "quote.created"
    QUOTE_ACCEPTED = "quote.accepted"
    QUOTE_REJECTED = "quote.rejected"
    QUOTE_EXPIRED = "quote.expired"

    # Subscription events
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_RENEWED = "subscription.renewed"
    SUBSCRIPTION_CANCELLED = "subscription.cancelled"
    SUBSCRIPTION_EXPIRED = "subscription.expired"

    # Organisation events
    ORGANISATION_CREATED = "organisation.created"
    ORGANISATION_UPGRADED = "organisation.upgraded"
    ORGANISATION_DOWNGRADED = "organisation.downgraded"


class WebhookStatus(str, Enum):
    """Webhook delivery status."""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    RETRY = "retry"


# Database Models
class WebhookEndpoint(Base):
    """Webhook endpoint configuration."""
    __tablename__ = "webhook_endpoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    secret: Mapped[str] = mapped_column(String(64), nullable=False)
    events: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array of events
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    verify_ssl: Mapped[bool] = mapped_column(Boolean, default=True)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def event_list(self) -> List[str]:
        return json.loads(self.events) if self.events else []


class WebhookDelivery(Base):
    """Webhook delivery log."""
    __tablename__ = "webhook_deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    endpoint_id: Mapped[int] = mapped_column(ForeignKey("webhook_endpoints.id"), nullable=False, index=True)
    event: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    response_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


# Pydantic Models
class WebhookPayload(BaseModel):
    """Webhook payload structure."""
    event: str
    timestamp: datetime
    data: Dict[str, Any]
    organisation_id: int
    signature: Optional[str] = None


class WebhookCreateRequest(BaseModel):
    """Request to create a webhook endpoint."""
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., max_length=500)
    events: List[str]
    is_active: bool = True
    verify_ssl: bool = True
    timeout_seconds: int = Field(default=10, ge=5, le=30)


class WebhookResponse(BaseModel):
    """Webhook endpoint response."""
    id: int
    name: str
    url: str
    events: List[str]
    is_active: bool
    created_at: datetime


class WebhookService:
    """Service for managing webhooks."""

    MAX_RETRIES = 3
    RETRY_DELAYS = [60, 300, 900]  # 1min, 5min, 15min

    def __init__(self, db: AsyncSession):
        """Initialize webhook service.

        Args:
            db: Database session
        """
        self.db = db
        self.settings = get_settings()

    def _generate_signature(self, secret: str, payload: str) -> str:
        """Generate HMAC signature for webhook payload.

        Args:
            secret: Webhook secret
            payload: JSON payload

        Returns:
            Signature string
        """
        signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"

    def _verify_signature(self, secret: str, payload: str, signature: str) -> bool:
        """Verify webhook signature.

        Args:
            secret: Webhook secret
            payload: Raw request body
            signature: Signature from header

        Returns:
            True if signature is valid
        """
        if not signature.startswith("sha256="):
            return False

        expected = self._generate_signature(secret, payload)
        return hmac.compare_digest(expected, signature)

    async def create_endpoint(
        self,
        organisation_id: int,
        request: WebhookCreateRequest,
    ) -> WebhookEndpoint:
        """Create a new webhook endpoint.

        Args:
            organisation_id: Organisation ID
            request: Webhook creation request

        Returns:
            Created webhook endpoint
        """
        import secrets

        endpoint = WebhookEndpoint(
            organisation_id=organisation_id,
            name=request.name,
            url=request.url,
            secret=secrets.token_hex(32),
            events=json.dumps(request.events),
            is_active=request.is_active,
            verify_ssl=request.verify_ssl,
            timeout_seconds=request.timeout_seconds,
        )

        self.db.add(endpoint)
        await self.db.commit()
        await self.db.refresh(endpoint)

        return endpoint

    async def list_endpoints(
        self,
        organisation_id: int,
        active_only: bool = True,
    ) -> List[WebhookEndpoint]:
        """List webhook endpoints for an organisation.

        Args:
            organisation_id: Organisation ID
            active_only: Only return active endpoints

        Returns:
            List of webhook endpoints
        """
        query = select(WebhookEndpoint).where(
            WebhookEndpoint.organisation_id == organisation_id
        )

        if active_only:
            query = query.where(WebhookEndpoint.is_active == True)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete_endpoint(self, endpoint_id: int, organisation_id: int) -> bool:
        """Delete a webhook endpoint.

        Args:
            endpoint_id: Endpoint ID
            organisation_id: Organisation ID (for authorization)

        Returns:
            True if deleted
        """
        result = await self.db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.id == endpoint_id,
                WebhookEndpoint.organisation_id == organisation_id,
            )
        )
        endpoint = result.scalar_one_or_none()

        if not endpoint:
            return False

        await self.db.delete(endpoint)
        await self.db.commit()
        return True

    async def dispatch(
        self,
        event: WebhookEvent,
        data: Dict[str, Any],
        organisation_id: int,
    ) -> List[WebhookDelivery]:
        """Dispatch a webhook event to all subscribed endpoints.

        Args:
            event: Event type
            data: Event data
            organisation_id: Organisation ID

        Returns:
            List of delivery records
        """
        # Get all active endpoints for this event
        endpoints = await self.list_endpoints(organisation_id, active_only=True)

        # Filter endpoints that subscribe to this event
        endpoints = [
            ep for ep in endpoints
            if event.value in ep.event_list or "*" in ep.event_list
        ]

        deliveries = []

        for endpoint in endpoints:
            # Create delivery record
            payload = WebhookPayload(
                event=event.value,
                timestamp=datetime.utcnow(),
                data=data,
                organisation_id=organisation_id,
            )

            payload_json = payload.model_dump_json()
            signature = self._generate_signature(endpoint.secret, payload_json)

            delivery = WebhookDelivery(
                endpoint_id=endpoint.id,
                event=event.value,
                payload=payload_json,
                status=WebhookStatus.PENDING.value,
            )

            self.db.add(delivery)
            await self.db.commit()
            await self.db.refresh(delivery)

            # Send webhook
            success = await self._send_webhook(endpoint, delivery, signature)

            deliveries.append(delivery)

        return deliveries

    async def _send_webhook(
        self,
        endpoint: WebhookEndpoint,
        delivery: WebhookDelivery,
        signature: str,
    ) -> bool:
        """Send a webhook delivery.

        Args:
            endpoint: Webhook endpoint
            delivery: Delivery record
            signature: Payload signature

        Returns:
            True if successful
        """
        delivery.attempts += 1

        try:
            async with httpx.AsyncClient(
                timeout=endpoint.timeout_seconds,
                verify=endpoint.verify_ssl,
            ) as client:
                response = await client.post(
                    endpoint.url,
                    content=delivery.payload,
                    headers={
                        "Content-Type": "application/json",
                        "X-Savana-Signature": signature,
                        "X-Savana-Event": delivery.event,
                        "X-Savana-Delivery": str(delivery.id),
                        "User-Agent": "Savana-Webhook/1.0",
                    },
                )

                delivery.response_code = response.status_code
                delivery.response_body = response.text[:5000]  # Limit response body size

                if 200 <= response.status_code < 300:
                    delivery.status = WebhookStatus.SENT.value
                    delivery.sent_at = datetime.utcnow()
                    logger.info(f"Webhook {delivery.id} sent successfully to {endpoint.url}")
                    return True
                else:
                    delivery.status = WebhookStatus.FAILED.value
                    delivery.error_message = f"HTTP {response.status_code}: {response.text[:500]}"
                    logger.warning(f"Webhook {delivery.id} failed with status {response.status_code}")
                    return False

        except Exception as e:
            delivery.status = WebhookStatus.FAILED.value
            delivery.error_message = str(e)[:500]
            logger.error(f"Webhook {delivery.id} failed with error: {e}")
            return False

        finally:
            await self.db.commit()

    async def retry_failed(self) -> int:
        """Retry failed webhook deliveries.

        Returns:
            Number of retries attempted
        """
        # Find failed deliveries that haven't exceeded max retries
        cutoff = datetime.utcnow() - timedelta(hours=1)

        result = await self.db.execute(
            select(WebhookDelivery).where(
                WebhookDelivery.status == WebhookStatus.FAILED.value,
                WebhookDelivery.attempts < self.MAX_RETRIES,
                WebhookDelivery.created_at >= cutoff,
            )
        )
        deliveries = list(result.scalars().all())

        retry_count = 0

        for delivery in deliveries:
            # Get endpoint
            endpoint_result = await self.db.execute(
                select(WebhookEndpoint).where(WebhookEndpoint.id == delivery.endpoint_id)
            )
            endpoint = endpoint_result.scalar_one_or_none()

            if not endpoint or not endpoint.is_active:
                continue

            # Generate signature
            signature = self._generate_signature(endpoint.secret, delivery.payload)

            # Retry
            success = await self._send_webhook(endpoint, delivery, signature)
            if success:
                retry_count += 1

        return retry_count

    async def get_delivery_logs(
        self,
        organisation_id: int,
        endpoint_id: Optional[int] = None,
        event: Optional[str] = None,
        limit: int = 50,
    ) -> List[WebhookDelivery]:
        """Get webhook delivery logs.

        Args:
            organisation_id: Organisation ID
            endpoint_id: Filter by endpoint
            event: Filter by event type
            limit: Max results

        Returns:
            List of delivery records
        """
        # Get endpoint IDs for this organisation
        endpoints_result = await self.db.execute(
            select(WebhookEndpoint.id).where(
                WebhookEndpoint.organisation_id == organisation_id
            )
        )
        endpoint_ids = [row[0] for row in endpoints_result.fetchall()]

        if not endpoint_ids:
            return []

        # Build query
        query = select(WebhookDelivery).where(
            WebhookDelivery.endpoint_id.in_(endpoint_ids)
        )

        if endpoint_id:
            query = query.where(WebhookDelivery.endpoint_id == endpoint_id)

        if event:
            query = query.where(WebhookDelivery.event == event)

        query = query.order_by(WebhookDelivery.created_at.desc()).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())
