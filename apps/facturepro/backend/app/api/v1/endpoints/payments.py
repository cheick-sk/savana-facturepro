"""Payments + Payment Links endpoints — FacturePro Africa."""
from __future__ import annotations
import logging
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Invoice, Payment, PaymentLink, User
from app.schemas.schemas import PaymentCreate, PaymentLinkOut, PaymentOut, SimulatePaymentRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["Payments"])
payment_links_router = APIRouter(prefix="/payment-links", tags=["Payment Links"])


def _update_invoice_status(invoice: Invoice) -> None:
    paid = float(invoice.amount_paid)
    total = float(invoice.total_amount)
    if paid <= 0:
        invoice.status = "SENT" if invoice.status != "DRAFT" else "DRAFT"
    elif paid >= total:
        invoice.status = "PAID"
    else:
        invoice.status = "PARTIAL"


# ── Invoice Payments ───────────────────────────────────────────
@router.post("/{invoice_id}/payments", response_model=PaymentOut, status_code=201)
async def add_payment(
    invoice_id: int,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Record a manual payment against an invoice."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if invoice.status == "CANCELLED":
        raise HTTPException(409, "Cannot pay a cancelled invoice")

    balance = float(invoice.total_amount) - float(invoice.amount_paid)
    if data.amount > balance + 0.01:
        raise HTTPException(400, f"Payment amount {data.amount} exceeds balance due {balance:.2f}")

    payment = Payment(
        invoice_id=invoice_id,
        amount=round(data.amount, 2),
        method=data.method,
        reference=data.reference,
        phone_number=data.phone_number,
        operator=data.operator,
        notes=data.notes,
    )
    db.add(payment)
    invoice.amount_paid = round(float(invoice.amount_paid) + data.amount, 2)
    _update_invoice_status(invoice)
    await db.commit()
    await db.refresh(payment)
    logger.info(f"Payment of {data.amount} recorded for invoice {invoice.invoice_number}")
    return PaymentOut.model_validate(payment)


@router.get("/{invoice_id}/payments", response_model=list[PaymentOut])
async def list_payments(invoice_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Invoice not found")
    pmts = await db.execute(select(Payment).where(Payment.invoice_id == invoice_id).order_by(Payment.paid_at))
    return [PaymentOut.model_validate(p) for p in pmts.scalars().all()]


@router.delete("/{invoice_id}/payments/{payment_id}", status_code=204)
async def delete_payment(invoice_id: int, payment_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    pmt = (await db.execute(select(Payment).where(Payment.id == payment_id, Payment.invoice_id == invoice_id))).scalar_one_or_none()
    if not pmt:
        raise HTTPException(404, "Payment not found")
    inv = (await db.execute(select(Invoice).where(Invoice.id == invoice_id))).scalar_one_or_none()
    inv.amount_paid = max(0.0, round(float(inv.amount_paid) - float(pmt.amount), 2))
    _update_invoice_status(inv)
    await db.delete(pmt)
    await db.commit()


@router.post("/{invoice_id}/simulate-mobile-money", response_model=PaymentOut, status_code=201)
async def simulate_mobile_money(
    invoice_id: int,
    data: SimulatePaymentRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Simulate a Mobile Money payment (Orange Money, MTN, Wave, etc.)."""
    invoice = (await db.execute(select(Invoice).where(Invoice.id == invoice_id))).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if invoice.status in ("PAID", "CANCELLED"):
        raise HTTPException(409, f"Invoice already {invoice.status}")

    amount = data.amount or float(invoice.total_amount) - float(invoice.amount_paid)
    if amount <= 0:
        raise HTTPException(400, "Invoice is already fully paid")

    ref = f"MM-{secrets.token_hex(6).upper()}"
    payment = Payment(
        invoice_id=invoice_id,
        amount=round(amount, 2),
        method="MOBILE_MONEY",
        reference=ref,
        phone_number=data.phone_number,
        operator=data.operator,
        notes=f"Mobile Money simulation — {data.operator}",
    )
    db.add(payment)
    invoice.amount_paid = round(float(invoice.amount_paid) + amount, 2)
    _update_invoice_status(invoice)
    await db.commit()
    await db.refresh(payment)
    return PaymentOut.model_validate(payment)


# ── Payment Links ──────────────────────────────────────────────
@payment_links_router.post("/invoices/{invoice_id}/payment-link", response_model=PaymentLinkOut, status_code=201)
async def create_payment_link(
    invoice_id: int,
    expires_days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Generate a shareable payment link (with QR code data) for an invoice."""
    invoice = (await db.execute(select(Invoice).where(Invoice.id == invoice_id))).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if invoice.status in ("PAID", "CANCELLED"):
        raise HTTPException(409, f"Invoice is {invoice.status}")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    link = PaymentLink(
        token=token,
        invoice_id=invoice_id,
        expires_at=expires_at,
    )
    invoice.payment_link_token = token
    db.add(link)
    await db.commit()
    await db.refresh(link)

    out = PaymentLinkOut.model_validate(link)
    out.url = f"/pay/{token}"
    return out


@payment_links_router.get("/pay/{token}", response_model=dict)
async def get_invoice_by_payment_link(token: str, db: AsyncSession = Depends(get_db)):
    """Public endpoint: resolve a payment link token to invoice details."""
    link = (await db.execute(select(PaymentLink).where(PaymentLink.token == token))).scalar_one_or_none()
    if not link:
        raise HTTPException(404, "Payment link not found")
    if not link.is_active:
        raise HTTPException(410, "Payment link is no longer active")
    if link.expires_at and datetime.now(timezone.utc) > link.expires_at:
        raise HTTPException(410, "Payment link has expired")

    link.views = (link.views or 0) + 1
    await db.commit()

    invoice = link.invoice
    return {
        "invoice_number": invoice.invoice_number,
        "customer_name": invoice.customer.name,
        "total_amount": float(invoice.total_amount),
        "amount_paid": float(invoice.amount_paid),
        "balance_due": invoice.balance_due,
        "currency": invoice.currency,
        "status": invoice.status,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
    }


@payment_links_router.delete("/payment-links/{link_id}", status_code=204)
async def deactivate_payment_link(link_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    link = (await db.execute(select(PaymentLink).where(PaymentLink.id == link_id))).scalar_one_or_none()
    if not link:
        raise HTTPException(404, "Payment link not found")
    link.is_active = False
    await db.commit()
