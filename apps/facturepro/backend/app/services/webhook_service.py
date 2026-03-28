"""Webhook service for FacturePro Africa.

Handles webhook endpoint registration, event triggering, delivery,
and retry logic with HMAC signature verification.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhooks import WebhookEndpoint, WebhookEvent, WebhookEventType

logger = logging.getLogger(__name__)


# ── Available Webhook Events ──────────────────────────────────────
WEBHOOK_EVENTS: dict[str, dict[str, str]] = {
    # FacturePro events
    "invoice.created": {"name": "Nouvelle facture créée", "app": "facturepro"},
    "invoice.updated": {"name": "Facture modifiée", "app": "facturepro"},
    "invoice.sent": {"name": "Facture envoyée", "app": "facturepro"},
    "invoice.paid": {"name": "Facture payée", "app": "facturepro"},
    "invoice.cancelled": {"name": "Facture annulée", "app": "facturepro"},
    "invoice.overdue": {"name": "Facture en retard", "app": "facturepro"},
    "payment.received": {"name": "Paiement reçu", "app": "facturepro"},
    "payment.refunded": {"name": "Remboursement effectué", "app": "facturepro"},
    "customer.created": {"name": "Nouveau client", "app": "facturepro"},
    "customer.updated": {"name": "Client modifié", "app": "facturepro"},
    "quote.accepted": {"name": "Devis accepté", "app": "facturepro"},
    "quote.rejected": {"name": "Devis rejeté", "app": "facturepro"},
    "subscription.created": {"name": "Nouvel abonnement", "app": "facturepro"},
    "subscription.expired": {"name": "Abonnement expiré", "app": "facturepro"},
    # SavanaFlow events
    "sale.completed": {"name": "Vente terminée", "app": "savanaflow"},
    "sale.refunded": {"name": "Vente remboursée", "app": "savanaflow"},
    "stock.low": {"name": "Stock faible", "app": "savanaflow"},
    "stock.out": {"name": "Rupture de stock", "app": "savanaflow"},
    "order.created": {"name": "Commande en ligne créée", "app": "savanaflow"},
    "order.confirmed": {"name": "Commande confirmée", "app": "savanaflow"},
    "order.delivered": {"name": "Commande livrée", "app": "savanaflow"},
    # SchoolFlow events
    "student.enrolled": {"name": "Élève inscrit", "app": "schoolflow"},
    "attendance.absent": {"name": "Absence enregistrée", "app": "schoolflow"},
    "fee.paid": {"name": "Frais payés", "app": "schoolflow"},
    "grade.entered": {"name": "Note saisie", "app": "schoolflow"},
    "term.closed": {"name": "Trimestre clôturé", "app": "schoolflow"},
}


class WebhookService:
    """Service de gestion des webhooks.

    Provides methods for:
    - Registering and managing webhook endpoints
    - Triggering webhook events
    - Delivering webhooks with HMAC signatures
    - Handling retries with exponential backoff
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._http_client: httpx.AsyncClient | None = None

    async def close(self):
        """Close HTTP client if opened."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    def _get_http_client(self, timeout: int = 10) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=timeout)
        return self._http_client

    # ── Secret Generation & Signing ───────────────────────────────
    @staticmethod
    def generate_secret() -> str:
        """Générer un secret pour HMAC signature."""
        return secrets.token_hex(32)

    @staticmethod
    def sign_payload(secret: str, payload: str) -> str:
        """Signer le payload avec HMAC-SHA256."""
        signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"

    @staticmethod
    def verify_signature(secret: str, payload: str, signature: str) -> bool:
        """Vérifier la signature HMAC."""
        expected = WebhookService.sign_payload(secret, payload)
        return hmac.compare_digest(expected, signature)

    # ── Endpoint Management ───────────────────────────────────────
    async def register_endpoint(
        self,
        organisation_id: int,
        name: str,
        url: str,
        events: list[str],
        secret: str | None = None,
        retry_count: int = 3,
        timeout_seconds: int = 10,
    ) -> WebhookEndpoint:
        """Enregistrer un nouveau endpoint webhook."""
        if not secret:
            secret = self.generate_secret()

        endpoint = WebhookEndpoint(
            organisation_id=organisation_id,
            name=name,
            url=url,
            events=events,
            secret=secret,
            retry_count=retry_count,
            timeout_seconds=timeout_seconds,
        )
        self.db.add(endpoint)
        await self.db.flush()
        await self.db.refresh(endpoint)
        return endpoint

    async def get_endpoint(self, endpoint_id: int, organisation_id: int) -> WebhookEvent | None:
        """Get a webhook endpoint by ID."""
        stmt = select(WebhookEndpoint).where(
            and_(
                WebhookEndpoint.id == endpoint_id,
                WebhookEndpoint.organisation_id == organisation_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_endpoints(
        self,
        organisation_id: int,
        is_active: bool | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[WebhookEndpoint], int]:
        """List webhook endpoints for an organisation."""
        filters = [WebhookEndpoint.organisation_id == organisation_id]
        if is_active is not None:
            filters.append(WebhookEndpoint.is_active == is_active)

        # Count total
        count_stmt = select(func.count()).select_from(WebhookEndpoint).where(and_(*filters))
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Get paginated
        stmt = (
            select(WebhookEndpoint)
            .where(and_(*filters))
            .order_by(WebhookEndpoint.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db.execute(stmt)
        endpoints = list(result.scalars().all())

        return endpoints, total

    async def update_endpoint(
        self,
        endpoint: WebhookEndpoint,
        name: str | None = None,
        url: str | None = None,
        events: list[str] | None = None,
        is_active: bool | None = None,
        retry_count: int | None = None,
        timeout_seconds: int | None = None,
    ) -> WebhookEndpoint:
        """Update a webhook endpoint."""
        if name is not None:
            endpoint.name = name
        if url is not None:
            endpoint.url = url
        if events is not None:
            endpoint.events = events
        if is_active is not None:
            endpoint.is_active = is_active
        if retry_count is not None:
            endpoint.retry_count = retry_count
        if timeout_seconds is not None:
            endpoint.timeout_seconds = timeout_seconds

        await self.db.flush()
        await self.db.refresh(endpoint)
        return endpoint

    async def delete_endpoint(self, endpoint: WebhookEndpoint) -> None:
        """Delete a webhook endpoint."""
        await self.db.delete(endpoint)
        await self.db.flush()

    async def regenerate_secret(self, endpoint: WebhookEndpoint) -> str:
        """Regenerate the secret for a webhook endpoint."""
        new_secret = self.generate_secret()
        endpoint.secret = new_secret
        await self.db.flush()
        return new_secret

    # ── Event Triggering ──────────────────────────────────────────
    async def trigger_event(
        self,
        organisation_id: int,
        event_type: str,
        data: dict[str, Any],
    ) -> list[WebhookEvent]:
        """Déclencher un événement webhook.

        Finds all active endpoints subscribed to this event
        and queues webhook deliveries.
        """
        # Find all endpoints subscribed to this event
        stmt = select(WebhookEndpoint).where(
            and_(
                WebhookEndpoint.organisation_id == organisation_id,
                WebhookEndpoint.is_active == True,
                WebhookEndpoint.events.contains([event_type]),
            )
        )
        result = await self.db.execute(stmt)
        endpoints = list(result.scalars().all())

        if not endpoints:
            return []

        payload = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        events = []
        for endpoint in endpoints:
            # Create event log
            event = WebhookEvent(
                organisation_id=organisation_id,
                endpoint_id=endpoint.id,
                event_type=event_type,
                payload=payload,
                status="pending",
            )
            self.db.add(event)
            events.append(event)

            # Update endpoint stats
            endpoint.last_triggered_at = datetime.now(timezone.utc)

        await self.db.flush()

        # Queue for async delivery (will be processed by Celery)
        for event in events:
            await self._queue_delivery(event)

        await self.db.commit()
        return events

    async def _queue_delivery(self, event: WebhookEvent) -> None:
        """Queue webhook delivery via Celery."""
        try:
            from app.tasks.webhooks import deliver_webhook
            deliver_webhook.delay(event.id, event.endpoint_id)
        except ImportError:
            # If Celery is not available, deliver directly
            await self._deliver_immediately(event)

    async def _deliver_immediately(self, event: WebhookEvent) -> bool:
        """Deliver webhook immediately (fallback when Celery is unavailable)."""
        stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == event.endpoint_id)
        result = await self.db.execute(stmt)
        endpoint = result.scalar_one_or_none()

        if not endpoint:
            return False

        return await self.deliver(event, endpoint)

    # ── Webhook Delivery ──────────────────────────────────────────
    async def deliver(
        self,
        event: WebhookEvent,
        endpoint: WebhookEndpoint,
    ) -> bool:
        """Envoyer le webhook au endpoint.

        Signs the payload with HMAC-SHA256 and sends via HTTP POST.
        Tracks response time and handles failures.
        """
        payload_str = json.dumps(event.payload, default=str)
        signature = self.sign_payload(endpoint.secret, payload_str)

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event.event_type,
            "X-Webhook-ID": str(event.id),
            "X-Webhook-Timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            start_time = datetime.now(timezone.utc)

            client = self._get_http_client(endpoint.timeout_seconds)
            response = await client.post(
                endpoint.url,
                content=payload_str,
                headers=headers,
                timeout=endpoint.timeout_seconds,
            )

            response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

            event.response_status_code = response.status_code
            event.response_time_ms = int(response_time)
            event.attempt_count += 1

            if 200 <= response.status_code < 300:
                event.status = "sent"
                event.sent_at = datetime.now(timezone.utc)
                endpoint.last_success_at = datetime.now(timezone.utc)
                endpoint.total_sent += 1
                await self.db.flush()
                logger.info(f"Webhook {event.id} delivered successfully to {endpoint.url}")
                return True
            else:
                event.response_body = response.text[:1000] if response.text else None
                await self._handle_failure(event, endpoint, f"HTTP {response.status_code}")
                return False

        except httpx.TimeoutException:
            event.attempt_count += 1
            await self._handle_failure(event, endpoint, "Request timeout")
            return False

        except httpx.RequestError as e:
            event.attempt_count += 1
            await self._handle_failure(event, endpoint, str(e))
            return False

        except Exception as e:
            event.attempt_count += 1
            await self._handle_failure(event, endpoint, f"Unexpected error: {str(e)}")
            return False

    async def _handle_failure(
        self,
        event: WebhookEvent,
        endpoint: WebhookEndpoint,
        error: str,
    ) -> None:
        """Gérer un échec d'envoi avec retry."""
        endpoint.total_failed += 1
        event.last_error = error

        if event.attempt_count < endpoint.retry_count:
            event.status = "retrying"
            # Exponential backoff: 1min, 5min, 15min
            delays = [60, 300, 900]
            delay = delays[min(event.attempt_count - 1, len(delays) - 1)]
            event.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=delay)

            # Queue retry
            try:
                from app.tasks.webhooks import retry_webhook
                retry_webhook.apply_async(args=[event.id], countdown=delay)
            except ImportError:
                pass

            logger.warning(
                f"Webhook {event.id} failed (attempt {event.attempt_count}/{endpoint.retry_count}): {error}. "
                f"Retrying in {delay}s"
            )
        else:
            event.status = "failed"
            logger.error(
                f"Webhook {event.id} permanently failed after {event.attempt_count} attempts: {error}"
            )

        await self.db.flush()

    # ── Event Management ───────────────────────────────────────────
    async def get_event(self, event_id: int, organisation_id: int) -> WebhookEvent | None:
        """Get a webhook event by ID."""
        stmt = select(WebhookEvent).where(
            and_(
                WebhookEvent.id == event_id,
                WebhookEvent.organisation_id == organisation_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_events(
        self,
        organisation_id: int,
        endpoint_id: int | None = None,
        status: str | None = None,
        event_type: str | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[WebhookEvent], int]:
        """List webhook events with filters."""
        filters = [WebhookEvent.organisation_id == organisation_id]

        if endpoint_id:
            filters.append(WebhookEvent.endpoint_id == endpoint_id)
        if status:
            filters.append(WebhookEvent.status == status)
        if event_type:
            filters.append(WebhookEvent.event_type == event_type)

        # Count total
        count_stmt = select(func.count()).select_from(WebhookEvent).where(and_(*filters))
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Get paginated
        stmt = (
            select(WebhookEvent)
            .where(and_(*filters))
            .order_by(WebhookEvent.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db.execute(stmt)
        events = list(result.scalars().all())

        return events, total

    async def retry_event(self, event: WebhookEvent) -> bool:
        """Manually retry a failed webhook event."""
        if event.status not in ["failed", "retrying"]:
            return False

        # Reset status
        event.status = "pending"
        event.attempt_count = 0
        event.last_error = None
        event.next_retry_at = None

        await self.db.flush()

        # Get endpoint
        stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == event.endpoint_id)
        result = await self.db.execute(stmt)
        endpoint = result.scalar_one_or_none()

        if not endpoint:
            return False

        return await self.deliver(event, endpoint)

    # ── Testing ────────────────────────────────────────────────────
    async def test_endpoint(
        self,
        endpoint: WebhookEndpoint,
        event_type: str = "test",
    ) -> dict[str, Any]:
        """Send a test event to the endpoint."""
        test_payload = {
            "event": event_type,
            "data": {
                "test": True,
                "message": "This is a test webhook from FacturePro",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        payload_str = json.dumps(test_payload)
        signature = self.sign_payload(endpoint.secret, payload_str)

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event_type,
            "X-Webhook-Test": "true",
        }

        try:
            start_time = datetime.now(timezone.utc)

            client = self._get_http_client(endpoint.timeout_seconds)
            response = await client.post(
                endpoint.url,
                content=payload_str,
                headers=headers,
                timeout=endpoint.timeout_seconds,
            )

            response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

            return {
                "success": 200 <= response.status_code < 300,
                "status_code": response.status_code,
                "response_time_ms": int(response_time),
                "error": None if 200 <= response.status_code < 300 else f"HTTP {response.status_code}",
                "payload_sent": test_payload,
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "status_code": None,
                "response_time_ms": None,
                "error": "Request timeout",
                "payload_sent": test_payload,
            }

        except httpx.RequestError as e:
            return {
                "success": False,
                "status_code": None,
                "response_time_ms": None,
                "error": str(e),
                "payload_sent": test_payload,
            }

    # ── Statistics ─────────────────────────────────────────────────
    async def get_dashboard_stats(self, organisation_id: int) -> dict[str, Any]:
        """Get webhook statistics for dashboard."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())

        # Total endpoints
        endpoints_stmt = select(func.count()).select_from(WebhookEndpoint).where(
            WebhookEndpoint.organisation_id == organisation_id
        )
        total_endpoints = (await self.db.execute(endpoints_stmt)).scalar() or 0

        # Active endpoints
        active_stmt = select(func.count()).select_from(WebhookEndpoint).where(
            and_(
                WebhookEndpoint.organisation_id == organisation_id,
                WebhookEndpoint.is_active == True,
            )
        )
        active_endpoints = (await self.db.execute(active_stmt)).scalar() or 0

        # Events today
        today_stmt = select(func.count()).select_from(WebhookEvent).where(
            and_(
                WebhookEvent.organisation_id == organisation_id,
                WebhookEvent.created_at >= today_start,
            )
        )
        events_today = (await self.db.execute(today_stmt)).scalar() or 0

        # Events this week
        week_stmt = select(func.count()).select_from(WebhookEvent).where(
            and_(
                WebhookEvent.organisation_id == organisation_id,
                WebhookEvent.created_at >= week_start,
            )
        )
        events_week = (await self.db.execute(week_stmt)).scalar() or 0

        # Success rates
        today_sent_stmt = select(func.count()).select_from(WebhookEvent).where(
            and_(
                WebhookEvent.organisation_id == organisation_id,
                WebhookEvent.created_at >= today_start,
                WebhookEvent.status == "sent",
            )
        )
        today_sent = (await self.db.execute(today_sent_stmt)).scalar() or 0

        week_sent_stmt = select(func.count()).select_from(WebhookEvent).where(
            and_(
                WebhookEvent.organisation_id == organisation_id,
                WebhookEvent.created_at >= week_start,
                WebhookEvent.status == "sent",
            )
        )
        week_sent = (await self.db.execute(week_sent_stmt)).scalar() or 0

        # Recent failures
        failures_stmt = (
            select(WebhookEvent)
            .where(
                and_(
                    WebhookEvent.organisation_id == organisation_id,
                    WebhookEvent.status == "failed",
                )
            )
            .order_by(WebhookEvent.created_at.desc())
            .limit(5)
        )
        failures_result = await self.db.execute(failures_stmt)
        recent_failures = list(failures_result.scalars().all())

        return {
            "total_endpoints": total_endpoints,
            "active_endpoints": active_endpoints,
            "total_events_today": events_today,
            "total_events_week": events_week,
            "success_rate_today": round(today_sent / events_today * 100, 2) if events_today > 0 else 0.0,
            "success_rate_week": round(week_sent / events_week * 100, 2) if events_week > 0 else 0.0,
            "recent_failures": recent_failures,
        }

    # ── Event Types ────────────────────────────────────────────────
    async def get_available_events(self) -> dict[str, list[dict]]:
        """Get all available webhook events grouped by app."""
        # Try to get from database first
        stmt = select(WebhookEventType).where(WebhookEventType.is_active == True)
        result = await self.db.execute(stmt)
        db_events = list(result.scalars().all())

        if db_events:
            # Group by app
            grouped: dict[str, list[dict]] = {}
            for event in db_events:
                if event.app not in grouped:
                    grouped[event.app] = []
                grouped[event.app].append({
                    "event_type": event.event_type,
                    "name": event.name,
                    "description": event.description,
                })
            return grouped

        # Return hardcoded events
        grouped: dict[str, list[dict]] = {}
        for event_type, info in WEBHOOK_EVENTS.items():
            app = info["app"]
            if app not in grouped:
                grouped[app] = []
            grouped[app].append({
                "event_type": event_type,
                "name": info["name"],
                "description": None,
            })
        return grouped

    async def seed_event_types(self) -> int:
        """Seed the webhook_event_types table with default events."""
        count = 0
        for event_type, info in WEBHOOK_EVENTS.items():
            # Check if exists
            stmt = select(WebhookEventType).where(WebhookEventType.event_type == event_type)
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                continue

            event = WebhookEventType(
                app=info["app"],
                event_type=event_type,
                name=info["name"],
                is_active=True,
            )
            self.db.add(event)
            count += 1

        if count > 0:
            await self.db.flush()

        return count
