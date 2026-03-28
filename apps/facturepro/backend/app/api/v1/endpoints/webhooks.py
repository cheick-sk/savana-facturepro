"""Webhook API endpoints for FacturePro Africa.

Provides endpoints for:
- Managing webhook endpoints (CRUD)
- Viewing event history
- Testing webhooks
- Manual retry
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.all_models import User
from app.models.webhooks import WebhookEndpoint, WebhookEvent
from app.schemas.webhooks import (
    AvailableEventsOut,
    WebhookDashboardStats,
    WebhookEndpointCreate,
    WebhookEndpointListOut,
    WebhookEndpointOut,
    WebhookEndpointStats,
    WebhookEndpointUpdate,
    WebhookEventDetailOut,
    WebhookEventListOut,
    WebhookEventOut,
    WebhookPaginated,
    WebhookTestRequest,
    WebhookTestResponse,
    WebhookEventTypeOut,
)
from app.services.webhook_service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


# ── Event Types ───────────────────────────────────────────────────
@router.get("/events/available", response_model=dict)
async def list_available_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all available webhook events grouped by app."""
    webhook_service = WebhookService(db)
    events = await webhook_service.get_available_events()
    return events


@router.get("/events/types", response_model=list[WebhookEventTypeOut])
async def list_event_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all webhook event types."""
    from sqlalchemy import select
    from app.models.webhooks import WebhookEventType

    stmt = select(WebhookEventType).where(WebhookEventType.is_active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── Dashboard Stats ────────────────────────────────────────────────
@router.get("/stats", response_model=WebhookDashboardStats)
async def get_webhook_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get webhook statistics for dashboard."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    stats = await webhook_service.get_dashboard_stats(current_user.organisation_id)

    # Get endpoint stats
    endpoints, _ = await webhook_service.list_endpoints(current_user.organisation_id)
    endpoints_stats = []
    for ep in endpoints:
        ep_stats = await _get_endpoint_stats(db, ep)
        endpoints_stats.append(ep_stats)

    return WebhookDashboardStats(
        total_endpoints=stats["total_endpoints"],
        active_endpoints=stats["active_endpoints"],
        total_events_today=stats["total_events_today"],
        total_events_week=stats["total_events_week"],
        success_rate_today=stats["success_rate_today"],
        success_rate_week=stats["success_rate_week"],
        endpoints_stats=endpoints_stats,
        recent_failures=[
            WebhookEventListOut.model_validate(e)
            for e in stats["recent_failures"]
        ],
    )


async def _get_endpoint_stats(db: AsyncSession, endpoint: WebhookEndpoint) -> WebhookEndpointStats:
    """Calculate stats for a single endpoint."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import func, and_
    from app.models.webhooks import WebhookEvent

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get event counts
    stmt = select(WebhookEvent).where(WebhookEvent.endpoint_id == endpoint.id)
    result = await db.execute(stmt)
    events = list(result.scalars().all())

    total = len(events)
    sent_count = sum(1 for e in events if e.status == "sent")
    failed_count = sum(1 for e in events if e.status == "failed")
    pending_count = sum(1 for e in events if e.status == "pending")
    retrying_count = sum(1 for e in events if e.status == "retrying")

    success_rate = round(sent_count / total * 100, 2) if total > 0 else 0.0

    # Average response time
    response_times = [e.response_time_ms for e in events if e.response_time_ms]
    avg_response_time = sum(response_times) / len(response_times) if response_times else None

    # Last 24h stats
    last_24h_events = [e for e in events if e.created_at >= today_start]
    last_24h_count = len(last_24h_events)
    last_24h_sent = sum(1 for e in last_24h_events if e.status == "sent")
    last_24h_success = round(last_24h_sent / last_24h_count * 100, 2) if last_24h_count > 0 else 0.0

    return WebhookEndpointStats(
        endpoint_id=endpoint.id,
        endpoint_name=endpoint.name,
        total_events=total,
        sent_count=sent_count,
        failed_count=failed_count,
        pending_count=pending_count,
        retrying_count=retrying_count,
        success_rate=success_rate,
        avg_response_time_ms=avg_response_time,
        last_24h_events=last_24h_count,
        last_24h_success_rate=last_24h_success,
    )


# ── Endpoint CRUD ──────────────────────────────────────────────────
@router.get("/endpoints", response_model=WebhookPaginated)
async def list_endpoints(
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List webhook endpoints for organisation."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoints, total = await webhook_service.list_endpoints(
        organisation_id=current_user.organisation_id,
        is_active=is_active,
        page=page,
        size=size,
    )

    pages = (total + size - 1) // size

    return WebhookPaginated(
        items=[WebhookEndpointListOut.model_validate(e) for e in endpoints],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post("/endpoints", response_model=WebhookEndpointOut, status_code=status.HTTP_201_CREATED)
async def create_endpoint(
    data: WebhookEndpointCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "manager")),
):
    """Create a new webhook endpoint."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoint = await webhook_service.register_endpoint(
        organisation_id=current_user.organisation_id,
        name=data.name,
        url=data.url,
        events=data.events,
        secret=data.secret,
        retry_count=data.retry_count,
        timeout_seconds=data.timeout_seconds,
    )
    await db.commit()
    await db.refresh(endpoint)

    return WebhookEndpointOut.model_validate(endpoint)


@router.get("/endpoints/{endpoint_id}", response_model=WebhookEndpointOut)
async def get_endpoint(
    endpoint_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get webhook endpoint details."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoint = await webhook_service.get_endpoint(endpoint_id, current_user.organisation_id)

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    return WebhookEndpointOut.model_validate(endpoint)


@router.put("/endpoints/{endpoint_id}", response_model=WebhookEndpointOut)
async def update_endpoint(
    endpoint_id: int,
    data: WebhookEndpointUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "manager")),
):
    """Update a webhook endpoint."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoint = await webhook_service.get_endpoint(endpoint_id, current_user.organisation_id)

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    endpoint = await webhook_service.update_endpoint(
        endpoint=endpoint,
        name=data.name,
        url=data.url,
        events=data.events,
        is_active=data.is_active,
        retry_count=data.retry_count,
        timeout_seconds=data.timeout_seconds,
    )
    await db.commit()

    return WebhookEndpointOut.model_validate(endpoint)


@router.delete("/endpoints/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_endpoint(
    endpoint_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Delete a webhook endpoint."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoint = await webhook_service.get_endpoint(endpoint_id, current_user.organisation_id)

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    await webhook_service.delete_endpoint(endpoint)
    await db.commit()


@router.post("/endpoints/{endpoint_id}/regenerate-secret")
async def regenerate_secret(
    endpoint_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Regenerate the secret for a webhook endpoint."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoint = await webhook_service.get_endpoint(endpoint_id, current_user.organisation_id)

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    new_secret = await webhook_service.regenerate_secret(endpoint)
    await db.commit()

    return {"secret": new_secret, "message": "Secret regenerated. Update your endpoint immediately."}


# ── Endpoint Events ────────────────────────────────────────────────
@router.get("/endpoints/{endpoint_id}/events", response_model=WebhookPaginated)
async def list_endpoint_events(
    endpoint_id: int,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List events for a webhook endpoint."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoint = await webhook_service.get_endpoint(endpoint_id, current_user.organisation_id)

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    events, total = await webhook_service.list_events(
        organisation_id=current_user.organisation_id,
        endpoint_id=endpoint_id,
        status=status,
        event_type=event_type,
        page=page,
        size=size,
    )

    pages = (total + size - 1) // size

    return WebhookPaginated(
        items=[WebhookEventListOut.model_validate(e) for e in events],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post("/endpoints/{endpoint_id}/test", response_model=WebhookTestResponse)
async def test_endpoint(
    endpoint_id: int,
    data: WebhookTestRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a test event to the endpoint."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    endpoint = await webhook_service.get_endpoint(endpoint_id, current_user.organisation_id)

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    event_type = data.event_type if data else "test"
    result = await webhook_service.test_endpoint(endpoint, event_type)

    return WebhookTestResponse(**result)


# ── Event Management ───────────────────────────────────────────────
@router.get("/events", response_model=WebhookPaginated)
async def list_events(
    endpoint_id: Optional[int] = None,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all webhook events for organisation."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    events, total = await webhook_service.list_events(
        organisation_id=current_user.organisation_id,
        endpoint_id=endpoint_id,
        status=status,
        event_type=event_type,
        page=page,
        size=size,
    )

    pages = (total + size - 1) // size

    return WebhookPaginated(
        items=[WebhookEventListOut.model_validate(e) for e in events],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/events/{event_id}", response_model=WebhookEventDetailOut)
async def get_event_details(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific webhook event."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    event = await webhook_service.get_event(event_id, current_user.organisation_id)

    if not event:
        raise HTTPException(status_code=404, detail="Webhook event not found")

    # Get endpoint name
    endpoint = await webhook_service.get_endpoint(event.endpoint_id, current_user.organisation_id)

    return WebhookEventDetailOut(
        id=event.id,
        organisation_id=event.organisation_id,
        endpoint_id=event.endpoint_id,
        endpoint_name=endpoint.name if endpoint else None,
        event_type=event.event_type,
        payload=event.payload,
        status=event.status,
        response_status_code=event.response_status_code,
        response_body=event.response_body,
        response_time_ms=event.response_time_ms,
        attempt_count=event.attempt_count,
        next_retry_at=event.next_retry_at,
        last_error=event.last_error,
        created_at=event.created_at,
        sent_at=event.sent_at,
    )


@router.post("/events/{event_id}/retry")
async def retry_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "manager")),
):
    """Manually retry a failed event."""
    if not current_user.organisation_id:
        raise HTTPException(status_code=400, detail="User has no organisation")

    webhook_service = WebhookService(db)
    event = await webhook_service.get_event(event_id, current_user.organisation_id)

    if not event:
        raise HTTPException(status_code=404, detail="Webhook event not found")

    if event.status not in ["failed", "retrying"]:
        raise HTTPException(status_code=400, detail="Only failed or retrying events can be retried")

    success = await webhook_service.retry_event(event)
    await db.commit()

    return {
        "success": success,
        "event_id": event.id,
        "status": event.status,
    }


# ── Seed Event Types ───────────────────────────────────────────────
@router.post("/seed-event-types")
async def seed_event_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Seed webhook event types (admin only)."""
    webhook_service = WebhookService(db)
    count = await webhook_service.seed_event_types()
    await db.commit()

    return {"seeded": count, "message": f"Seeded {count} event types"}
