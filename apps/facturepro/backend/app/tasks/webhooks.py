"""Webhook-related Celery tasks for FacturePro.

Handles:
- Webhook delivery
- Retry logic
- Cleanup of old events
- Daily summary
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.webhooks import WebhookEndpoint, WebhookEvent


@celery_app.task(
    bind=True,
    name="app.tasks.webhooks.deliver_webhook",
    max_retries=3,
    default_retry_delay=60,
)
def deliver_webhook(self, event_id: int, endpoint_id: int):
    """Envoyer un webhook.

    Args:
        event_id: ID of the WebhookEvent to deliver
        endpoint_id: ID of the WebhookEndpoint to send to
    """
    return asyncio.run(_deliver_webhook_async(event_id, endpoint_id))


async def _deliver_webhook_async(event_id: int, endpoint_id: int) -> dict:
    """Async implementation of webhook delivery."""
    from app.services.webhook_service import WebhookService

    async with AsyncSessionLocal() as db:
        # Get event and endpoint
        event_stmt = select(WebhookEvent).where(WebhookEvent.id == event_id)
        event_result = await db.execute(event_stmt)
        event = event_result.scalar_one_or_none()

        endpoint_stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == endpoint_id)
        endpoint_result = await db.execute(endpoint_stmt)
        endpoint = endpoint_result.scalar_one_or_none()

        if not event or not endpoint:
            return {
                "success": False,
                "event_id": event_id,
                "error": "Event or endpoint not found"
            }

        if not endpoint.is_active:
            return {
                "success": False,
                "event_id": event_id,
                "error": "Endpoint is not active"
            }

        webhook_service = WebhookService(db)
        try:
            success = await webhook_service.deliver(event, endpoint)
            await db.commit()
            return {
                "success": success,
                "event_id": event_id,
                "status": event.status,
                "attempt_count": event.attempt_count,
            }
        finally:
            await webhook_service.close()


@celery_app.task(
    bind=True,
    name="app.tasks.webhooks.retry_webhook",
    max_retries=5,
)
def retry_webhook(self, event_id: int):
    """Retry a failed webhook delivery.

    Args:
        event_id: ID of the WebhookEvent to retry
    """
    return asyncio.run(_retry_webhook_async(event_id))


async def _retry_webhook_async(event_id: int) -> dict:
    """Async implementation of webhook retry."""
    from app.services.webhook_service import WebhookService

    async with AsyncSessionLocal() as db:
        event_stmt = select(WebhookEvent).where(WebhookEvent.id == event_id)
        event_result = await db.execute(event_stmt)
        event = event_result.scalar_one_or_none()

        if not event:
            return {"success": False, "error": "Event not found"}

        if event.status not in ["retrying", "failed"]:
            return {"success": False, "error": f"Event status is {event.status}, not retryable"}

        endpoint_stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == event.endpoint_id)
        endpoint_result = await db.execute(endpoint_stmt)
        endpoint = endpoint_result.scalar_one_or_none()

        if not endpoint:
            return {"success": False, "error": "Endpoint not found"}

        webhook_service = WebhookService(db)
        try:
            success = await webhook_service.deliver(event, endpoint)
            await db.commit()
            return {
                "success": success,
                "event_id": event_id,
                "status": event.status,
                "attempt_count": event.attempt_count,
            }
        finally:
            await webhook_service.close()


@celery_app.task(
    bind=True,
    name="app.tasks.webhooks.retry_failed_webhooks",
)
def retry_failed_webhooks(self):
    """Retry all webhooks that are scheduled for retry.

    Finds events with status="retrying" and next_retry_at < now,
    then attempts delivery again.
    Runs every minute via Beat schedule.
    """
    return asyncio.run(_retry_failed_webhooks_async())


async def _retry_failed_webhooks_async() -> dict:
    """Async implementation of retry failed webhooks."""
    from app.services.webhook_service import WebhookService

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        # Find events ready for retry
        stmt = select(WebhookEvent).where(
            and_(
                WebhookEvent.status == "retrying",
                WebhookEvent.next_retry_at <= now,
            )
        )
        result = await db.execute(stmt)
        events = list(result.scalars().all())

        if not events:
            return {"retried": 0, "success": 0, "failed": 0}

        webhook_service = WebhookService(db)
        retried = 0
        success_count = 0
        failed_count = 0

        try:
            for event in events:
                # Get endpoint
                endpoint_stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == event.endpoint_id)
                endpoint_result = await db.execute(endpoint_stmt)
                endpoint = endpoint_result.scalar_one_or_none()

                if not endpoint or not endpoint.is_active:
                    event.status = "failed"
                    event.last_error = "Endpoint not found or inactive"
                    failed_count += 1
                    continue

                success = await webhook_service.deliver(event, endpoint)
                retried += 1
                if success:
                    success_count += 1
                else:
                    failed_count += 1

            await db.commit()
        finally:
            await webhook_service.close()

        return {
            "retried": retried,
            "success": success_count,
            "failed": failed_count,
            "timestamp": now.isoformat(),
        }


@celery_app.task(
    bind=True,
    name="app.tasks.webhooks.cleanup_old_webhook_events",
)
def cleanup_old_webhook_events(self, days_old: int = 90):
    """Clean up webhook events older than specified days.

    Args:
        days_old: Delete events older than this many days (default 90)
    """
    return asyncio.run(_cleanup_old_webhook_events_async(days_old))


async def _cleanup_old_webhook_events_async(days_old: int) -> dict:
    """Async implementation of webhook event cleanup."""
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)

        # Delete old events
        stmt = delete(WebhookEvent).where(WebhookEvent.created_at < cutoff)
        result = await db.execute(stmt)
        deleted = result.rowcount

        await db.commit()

        return {
            "deleted_count": deleted,
            "cutoff_date": cutoff.isoformat(),
        }


@celery_app.task(
    bind=True,
    name="app.tasks.webhooks.send_webhook_summary",
)
def send_webhook_summary(self):
    """Send daily summary of webhook activity to organisation admins.

    Runs daily at 8 AM UTC.
    """
    return asyncio.run(_send_webhook_summary_async())


async def _send_webhook_summary_async() -> dict:
    """Async implementation of webhook summary."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(days=1)

        # Get all organisations with active webhooks
        stmt = select(WebhookEndpoint).where(WebhookEndpoint.is_active == True)
        result = await db.execute(stmt)
        endpoints = list(result.scalars().all())

        # Group by organisation
        org_endpoints: dict[int, list[WebhookEndpoint]] = {}
        for endpoint in endpoints:
            if endpoint.organisation_id not in org_endpoints:
                org_endpoints[endpoint.organisation_id] = []
            org_endpoints[endpoint.organisation_id].append(endpoint)

        summaries_sent = 0

        for org_id, org_ep in org_endpoints.items():
            # Get stats for yesterday
            endpoint_ids = [ep.id for ep in org_ep]

            events_stmt = select(WebhookEvent).where(
                and_(
                    WebhookEvent.organisation_id == org_id,
                    WebhookEvent.created_at >= yesterday,
                    WebhookEvent.created_at < now,
                )
            )
            events_result = await db.execute(events_stmt)
            events = list(events_result.scalars().all())

            if not events:
                continue

            sent_count = sum(1 for e in events if e.status == "sent")
            failed_count = sum(1 for e in events if e.status == "failed")
            total = len(events)
            success_rate = round(sent_count / total * 100, 2) if total > 0 else 0

            # TODO: Send notification to org admins
            # For now, just log it
            print(f"Webhook summary for org {org_id}: {sent_count}/{total} sent ({success_rate}%)")
            summaries_sent += 1

        return {
            "summaries_sent": summaries_sent,
            "timestamp": now.isoformat(),
        }


@celery_app.task(
    bind=True,
    name="app.tasks.webhooks.trigger_webhook_event",
)
def trigger_webhook_event(self, organisation_id: int, event_type: str, data: dict):
    """Trigger a webhook event for an organisation.

    Args:
        organisation_id: ID of the organisation
        event_type: Type of event (e.g., "invoice.created")
        data: Event payload data
    """
    return asyncio.run(_trigger_webhook_event_async(organisation_id, event_type, data))


async def _trigger_webhook_event_async(
    organisation_id: int,
    event_type: str,
    data: dict,
) -> dict:
    """Async implementation of webhook event trigger."""
    from app.services.webhook_service import WebhookService

    async with AsyncSessionLocal() as db:
        webhook_service = WebhookService(db)
        try:
            events = await webhook_service.trigger_event(
                organisation_id=organisation_id,
                event_type=event_type,
                data=data,
            )
            return {
                "success": True,
                "events_created": len(events),
                "event_ids": [e.id for e in events],
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }
        finally:
            await webhook_service.close()
