"""Webhook trigger helpers for FacturePro Africa.

Provides utility functions to trigger webhooks from any service.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def trigger_webhook(
    db: AsyncSession,
    organisation_id: int,
    event_type: str,
    data: dict[str, Any],
) -> None:
    """Trigger a webhook event for an organisation.

    This is a fire-and-forget operation that queues the webhook
    for async delivery. It does not block the caller.

    Args:
        db: Database session
        organisation_id: ID of the organisation
        event_type: Type of event (e.g., "invoice.created")
        data: Event payload data
    """
    try:
        # Import here to avoid circular imports
        from app.services.webhook_service import WebhookService
        
        webhook_service = WebhookService(db)
        await webhook_service.trigger_event(
            organisation_id=organisation_id,
            event_type=event_type,
            data=data,
        )
        logger.info(f"Triggered webhook event: {event_type} for org {organisation_id}")
    except Exception as e:
        # Log error but don't fail the main operation
        logger.error(f"Failed to trigger webhook {event_type}: {e}")


async def trigger_webhook_async(
    organisation_id: int,
    event_type: str,
    data: dict[str, Any],
) -> None:
    """Trigger a webhook event asynchronously via Celery.

    This is the preferred method for triggering webhooks from
    synchronous code or when you don't have a db session.

    Args:
        organisation_id: ID of the organisation
        event_type: Type of event
        data: Event payload data
    """
    try:
        from app.tasks.webhooks import trigger_webhook_event
        trigger_webhook_event.delay(organisation_id, event_type, data)
        logger.info(f"Queued webhook event via Celery: {event_type}")
    except Exception as e:
        logger.error(f"Failed to queue webhook {event_type}: {e}")


# ── Invoice Webhooks ──────────────────────────────────────────────
def invoice_to_webhook_data(invoice) -> dict[str, Any]:
    """Convert an Invoice model to webhook payload data."""
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "customer_id": invoice.customer_id,
        "customer_name": invoice.customer.name if invoice.customer else None,
        "customer_email": invoice.customer.email if invoice.customer else None,
        "status": invoice.status,
        "issue_date": invoice.issue_date.isoformat() if invoice.issue_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "subtotal": float(invoice.subtotal) if invoice.subtotal else 0,
        "tax_amount": float(invoice.tax_amount) if invoice.tax_amount else 0,
        "total_amount": float(invoice.total_amount) if invoice.total_amount else 0,
        "amount_paid": float(invoice.amount_paid) if invoice.amount_paid else 0,
        "currency": invoice.currency,
    }


# ── Payment Webhooks ──────────────────────────────────────────────
def payment_to_webhook_data(payment, invoice) -> dict[str, Any]:
    """Convert a Payment model to webhook payload data."""
    return {
        "id": payment.id,
        "invoice_id": payment.invoice_id,
        "invoice_number": invoice.invoice_number if invoice else None,
        "customer_id": invoice.customer_id if invoice else None,
        "customer_name": invoice.customer.name if invoice and invoice.customer else None,
        "amount": float(payment.amount) if payment.amount else 0,
        "method": payment.method,
        "reference": payment.reference,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "currency": invoice.currency if invoice else "XOF",
    }


# ── Customer Webhooks ─────────────────────────────────────────────
def customer_to_webhook_data(customer) -> dict[str, Any]:
    """Convert a Customer model to webhook payload data."""
    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
        "city": customer.city,
        "country": customer.country,
    }


# ── Quote Webhooks ────────────────────────────────────────────────
def quote_to_webhook_data(quote) -> dict[str, Any]:
    """Convert a Quote model to webhook payload data."""
    return {
        "id": quote.id,
        "quote_number": quote.quote_number,
        "customer_id": quote.customer_id,
        "customer_name": quote.customer.name if quote.customer else None,
        "status": quote.status,
        "issue_date": quote.issue_date.isoformat() if quote.issue_date else None,
        "expiry_date": quote.expiry_date.isoformat() if quote.expiry_date else None,
        "total_amount": float(quote.total_amount) if quote.total_amount else 0,
        "currency": quote.currency,
    }
