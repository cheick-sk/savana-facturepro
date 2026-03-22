"""Webhook Management API Endpoints.

Provides endpoints for:
- Creating webhook endpoints
- Listing webhooks
- Deleting webhooks
- Viewing delivery logs
- Testing webhooks
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.webhook_service import (
    WebhookService,
    WebhookCreateRequest,
    WebhookResponse,
    WebhookEvent,
    WebhookEndpoint,
    WebhookDelivery,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


# Response Models
class WebhookEndpointResponse(BaseModel):
    """Webhook endpoint response with secret."""
    id: int
    name: str
    url: str
    events: List[str]
    is_active: bool
    secret: str  # Only shown once during creation
    created_at: str

    @classmethod
    def from_endpoint(cls, endpoint: WebhookEndpoint) -> "WebhookEndpointResponse":
        return cls(
            id=endpoint.id,
            name=endpoint.name,
            url=endpoint.url,
            events=endpoint.event_list,
            is_active=endpoint.is_active,
            secret=endpoint.secret,
            created_at=endpoint.created_at.isoformat(),
        )


class WebhookListResponse(BaseModel):
    """Webhook endpoint list response (without secret)."""
    id: int
    name: str
    url: str
    events: List[str]
    is_active: bool
    created_at: str

    @classmethod
    def from_endpoint(cls, endpoint: WebhookEndpoint) -> "WebhookListResponse":
        return cls(
            id=endpoint.id,
            name=endpoint.name,
            url=endpoint.url,
            events=endpoint.event_list,
            is_active=endpoint.is_active,
            created_at=endpoint.created_at.isoformat(),
        )


class DeliveryLogResponse(BaseModel):
    """Webhook delivery log response."""
    id: int
    endpoint_id: int
    event: str
    status: str
    response_code: Optional[int]
    attempts: int
    error_message: Optional[str]
    sent_at: Optional[str]
    created_at: str

    @classmethod
    def from_delivery(cls, delivery: WebhookDelivery) -> "DeliveryLogResponse":
        return cls(
            id=delivery.id,
            endpoint_id=delivery.endpoint_id,
            event=delivery.event,
            status=delivery.status,
            response_code=delivery.response_code,
            attempts=delivery.attempts,
            error_message=delivery.error_message,
            sent_at=delivery.sent_at.isoformat() if delivery.sent_at else None,
            created_at=delivery.created_at.isoformat(),
        )


class WebhookTestRequest(BaseModel):
    """Request to test a webhook endpoint."""
    event: WebhookEvent = Field(default=WebhookEvent.INVOICE_CREATED)


class WebhookTestResponse(BaseModel):
    """Webhook test response."""
    success: bool
    message: str
    response_code: Optional[int] = None


# Helper to get organisation ID from user
def get_organisation_id(current_user: dict) -> int:
    """Get organisation ID from current user."""
    org_id = current_user.get("organisation_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to an organisation"
        )
    return org_id


@router.post("", response_model=WebhookEndpointResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    request: WebhookCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new webhook endpoint.

    The secret is only returned once during creation. Store it securely.

    - **name**: Friendly name for this webhook
    - **url**: URL to receive webhook POST requests
    - **events**: List of events to subscribe to (use ["*"] for all events)
    - **is_active**: Whether the webhook is active
    - **verify_ssl**: Whether to verify SSL certificates
    - **timeout_seconds**: Request timeout (5-30 seconds)
    """
    service = WebhookService(db)
    organisation_id = get_organisation_id(current_user)

    # Validate events
    valid_events = [e.value for e in WebhookEvent]
    for event in request.events:
        if event != "*" and event not in valid_events:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid event: {event}. Valid events: {valid_events}"
            )

    endpoint = await service.create_endpoint(organisation_id, request)
    return WebhookEndpointResponse.from_endpoint(endpoint)


@router.get("", response_model=List[WebhookListResponse])
async def list_webhooks(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all webhook endpoints for the organisation.

    - **active_only**: Only return active endpoints
    """
    service = WebhookService(db)
    organisation_id = get_organisation_id(current_user)

    endpoints = await service.list_endpoints(organisation_id, active_only)
    return [WebhookListResponse.from_endpoint(ep) for ep in endpoints]


@router.get("/events", response_model=List[str])
async def list_available_events():
    """List all available webhook events."""
    return [event.value for event in WebhookEvent]


@router.get("/{webhook_id}", response_model=WebhookListResponse)
async def get_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific webhook endpoint."""
    from sqlalchemy.future import select

    organisation_id = get_organisation_id(current_user)

    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == webhook_id,
            WebhookEndpoint.organisation_id == organisation_id,
        )
    )
    endpoint = result.scalar_one_or_none()

    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )

    return WebhookListResponse.from_endpoint(endpoint)


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a webhook endpoint."""
    service = WebhookService(db)
    organisation_id = get_organisation_id(current_user)

    deleted = await service.delete_endpoint(webhook_id, organisation_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )


@router.post("/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    webhook_id: int,
    request: WebhookTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Test a webhook endpoint by sending a test event.

    - **event**: Event type to test (default: invoice.created)
    """
    from sqlalchemy.future import select

    organisation_id = get_organisation_id(current_user)

    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == webhook_id,
            WebhookEndpoint.organisation_id == organisation_id,
        )
    )
    endpoint = result.scalar_one_or_none()

    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )

    # Dispatch test event
    service = WebhookService(db)
    deliveries = await service.dispatch(
        event=request.event,
        data={
            "test": True,
            "message": "This is a test webhook",
            "webhook_id": webhook_id,
        },
        organisation_id=organisation_id,
    )

    if deliveries:
        delivery = deliveries[0]
        return WebhookTestResponse(
            success=delivery.status == "sent",
            message="Webhook sent successfully" if delivery.status == "sent" else f"Failed: {delivery.error_message}",
            response_code=delivery.response_code,
        )

    return WebhookTestResponse(
        success=False,
        message="No matching webhook endpoint found",
    )


@router.get("/{webhook_id}/deliveries", response_model=List[DeliveryLogResponse])
async def get_webhook_deliveries(
    webhook_id: int,
    event: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get delivery logs for a webhook endpoint.

    - **event**: Filter by event type
    - **limit**: Maximum number of results (default: 50)
    """
    service = WebhookService(db)
    organisation_id = get_organisation_id(current_user)

    deliveries = await service.get_delivery_logs(
        organisation_id=organisation_id,
        endpoint_id=webhook_id,
        event=event,
        limit=limit,
    )

    return [DeliveryLogResponse.from_delivery(d) for d in deliveries]


@router.get("/deliveries", response_model=List[DeliveryLogResponse])
async def get_all_deliveries(
    event: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all delivery logs for the organisation.

    - **event**: Filter by event type
    - **limit**: Maximum number of results (default: 50)
    """
    service = WebhookService(db)
    organisation_id = get_organisation_id(current_user)

    deliveries = await service.get_delivery_logs(
        organisation_id=organisation_id,
        event=event,
        limit=limit,
    )

    return [DeliveryLogResponse.from_delivery(d) for d in deliveries]


@router.post("/{webhook_id}/regenerate-secret", response_model=WebhookEndpointResponse)
async def regenerate_secret(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Regenerate the webhook secret.

    **Warning**: This will invalidate the existing secret immediately.
    The new secret is only returned once.
    """
    import secrets
    from sqlalchemy.future import select

    organisation_id = get_organisation_id(current_user)

    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == webhook_id,
            WebhookEndpoint.organisation_id == organisation_id,
        )
    )
    endpoint = result.scalar_one_or_none()

    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )

    # Generate new secret
    endpoint.secret = secrets.token_hex(32)
    await db.commit()
    await db.refresh(endpoint)

    return WebhookEndpointResponse.from_endpoint(endpoint)
