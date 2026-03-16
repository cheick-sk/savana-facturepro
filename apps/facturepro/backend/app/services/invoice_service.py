"""Invoice business logic service — FacturePro Africa."""
from __future__ import annotations

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.all_models import (
    AuditLog, Customer, Invoice, InvoiceItem, Payment,
    Quote, QuoteItem, RecurringInvoice,
)
from app.schemas.schemas import InvoiceCreate, InvoiceUpdate
from app.services.pdf_service import generate_invoice_pdf

logger = logging.getLogger(__name__)
UPLOAD_DIR = "/app/uploads/invoices"


# ── Number generators ───────────────────────────────────────────
def _next_invoice_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"FP-{year}-{count + 1:05d}"


def _next_quote_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"DEV-{year}-{count + 1:05d}"


def _next_credit_note_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"AV-{year}-{count + 1:05d}"


def _next_po_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"BC-{year}-{count + 1:05d}"


# ── Item calculations ───────────────────────────────────────────
def _calc_item_totals(
    quantity: float, unit_price: float, tax_rate: float, discount_percent: float = 0.0
) -> tuple[float, float, float]:
    """Returns (subtotal_ht, tax_amount, line_total_ttc)."""
    base = round(quantity * unit_price, 2)
    if discount_percent:
        base = round(base * (1 - discount_percent / 100), 2)
    tax = round(base * tax_rate / 100, 2)
    return base, tax, round(base + tax, 2)


def _compute_invoice_totals(
    items_data: list, discount_percent: float = 0.0
) -> tuple[float, float, float, float]:
    """Returns (subtotal_ht, tax_total, discount_amount, total_ttc)."""
    subtotal = 0.0
    tax_total = 0.0
    for item in items_data:
        base, tax, _ = _calc_item_totals(
            item["quantity"], item["unit_price"],
            item["tax_rate"], item.get("discount_percent", 0.0),
        )
        subtotal += base
        tax_total += tax
    # Global invoice discount on HT
    discount_amount = round(subtotal * discount_percent / 100, 2) if discount_percent else 0.0
    net_ht = round(subtotal - discount_amount, 2)
    # Recalculate tax on discounted base
    if discount_percent:
        factor = 1 - discount_percent / 100
        tax_total = round(tax_total * factor, 2)
    return round(subtotal, 2), round(tax_total, 2), discount_amount, round(net_ht + tax_total, 2)


# ── Invoice CRUD ────────────────────────────────────────────────
async def create_invoice(db: AsyncSession, data: InvoiceCreate, user_id: int) -> Invoice:
    count = (await db.execute(select(func.count()).select_from(Invoice))).scalar() or 0
    number = _next_invoice_number(count)

    items_raw = [
        {"quantity": i.quantity, "unit_price": i.unit_price,
         "tax_rate": i.tax_rate, "discount_percent": i.discount_percent,
         "description": i.description, "product_id": i.product_id}
        for i in data.items
    ]
    subtotal, tax_total, discount_amount, total = _compute_invoice_totals(items_raw, data.discount_percent)

    invoice = Invoice(
        invoice_number=number,
        customer_id=data.customer_id,
        created_by=user_id,
        quote_id=data.quote_id if hasattr(data, "quote_id") else None,
        due_date=data.due_date,
        currency=data.currency,
        notes=data.notes,
        notes_internal=getattr(data, "notes_internal", None),
        discount_percent=data.discount_percent,
        discount_amount=discount_amount,
        subtotal=subtotal,
        tax_amount=tax_total,
        total_amount=total,
    )
    db.add(invoice)
    await db.flush()

    for item_data in items_raw:
        base, tax, line_total = _calc_item_totals(
            item_data["quantity"], item_data["unit_price"],
            item_data["tax_rate"], item_data["discount_percent"],
        )
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            product_id=item_data["product_id"],
            description=item_data["description"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            tax_rate=item_data["tax_rate"],
            discount_percent=item_data["discount_percent"],
            line_total=line_total,
        ))

    await db.flush()
    await db.refresh(invoice)
    return invoice


async def update_invoice(db: AsyncSession, invoice: Invoice, data: InvoiceUpdate) -> Invoice:
    if data.due_date is not None:
        invoice.due_date = data.due_date
    if data.notes is not None:
        invoice.notes = data.notes
    if data.notes_internal is not None:
        invoice.notes_internal = data.notes_internal
    if data.status is not None:
        invoice.status = data.status
    if data.discount_percent is not None:
        invoice.discount_percent = data.discount_percent

    if data.items is not None:
        for old in list(invoice.items):
            await db.delete(old)
        await db.flush()

        items_raw = [
            {"quantity": i.quantity, "unit_price": i.unit_price,
             "tax_rate": i.tax_rate, "discount_percent": i.discount_percent,
             "description": i.description, "product_id": i.product_id}
            for i in data.items
        ]
        disc = data.discount_percent if data.discount_percent is not None else float(invoice.discount_percent)
        subtotal, tax_total, discount_amount, total = _compute_invoice_totals(items_raw, disc)

        for item_data in items_raw:
            _, _, line_total = _calc_item_totals(
                item_data["quantity"], item_data["unit_price"],
                item_data["tax_rate"], item_data["discount_percent"],
            )
            db.add(InvoiceItem(
                invoice_id=invoice.id,
                product_id=item_data["product_id"],
                description=item_data["description"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                tax_rate=item_data["tax_rate"],
                discount_percent=item_data["discount_percent"],
                line_total=line_total,
            ))
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_total
        invoice.discount_amount = discount_amount
        invoice.total_amount = total

    await db.flush()
    await db.refresh(invoice)
    return invoice


async def generate_and_store_pdf(db: AsyncSession, invoice: Invoice) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    pdf_data = {
        "invoice_number": invoice.invoice_number,
        "issue_date": invoice.issue_date,
        "due_date": invoice.due_date,
        "status": invoice.status,
        "currency": invoice.currency,
        "notes": invoice.notes,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "discount_amount": invoice.discount_amount,
        "total_amount": invoice.total_amount,
        "amount_paid": invoice.amount_paid,
        "customer_name": invoice.customer.name,
        "customer_email": invoice.customer.email,
        "customer_phone": invoice.customer.phone,
        "customer_address": invoice.customer.address,
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "tax_rate": item.tax_rate,
                "discount_percent": item.discount_percent,
                "line_total": item.line_total,
            }
            for item in invoice.items
        ],
    }
    pdf_bytes = generate_invoice_pdf(pdf_data)
    filename = f"{invoice.invoice_number}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)
    invoice.pdf_path = filepath
    await db.flush()
    logger.info(f"PDF saved: {filepath}")
    return filepath


async def convert_quote_to_invoice(db: AsyncSession, quote: Quote, user_id: int) -> Invoice:
    """Converts an accepted quote into an invoice."""
    from app.schemas.schemas import InvoiceCreate, InvoiceItemCreate
    invoice_data = InvoiceCreate(
        customer_id=quote.customer_id,
        currency=quote.currency,
        notes=quote.notes,
        discount_percent=float(quote.discount_percent),
        items=[
            InvoiceItemCreate(
                product_id=item.product_id,
                description=item.description,
                quantity=float(item.quantity),
                unit_price=float(item.unit_price),
                tax_rate=float(item.tax_rate),
                discount_percent=float(item.discount_percent),
            )
            for item in quote.items
        ],
    )
    invoice = await create_invoice(db, invoice_data, user_id)
    invoice.quote_id = quote.id
    quote.status = "CONVERTED"
    await db.flush()
    await db.refresh(invoice)
    return invoice


async def generate_invoice_from_recurring(db: AsyncSession, rec: RecurringInvoice) -> Invoice:
    """Generates a new invoice from a recurring template."""
    from app.schemas.schemas import InvoiceCreate, InvoiceItemCreate
    tpl = rec.template_data
    due_days = tpl.get("due_days", 30)
    now = datetime.now(timezone.utc)
    invoice_data = InvoiceCreate(
        customer_id=rec.customer_id,
        currency=tpl.get("currency", "XOF"),
        notes=tpl.get("notes"),
        discount_percent=tpl.get("discount_percent", 0.0),
        due_date=now + timedelta(days=due_days),
        items=[
            InvoiceItemCreate(
                description=it["description"],
                quantity=it.get("quantity", 1.0),
                unit_price=it["unit_price"],
                tax_rate=it.get("tax_rate", 0.0),
                discount_percent=it.get("discount_percent", 0.0),
                product_id=it.get("product_id"),
            )
            for it in tpl.get("items", [])
        ],
    )
    invoice = await create_invoice(db, invoice_data, rec.created_by)
    invoice.recurring_id = rec.id
    rec.last_run = now
    rec.invoices_generated = (rec.invoices_generated or 0) + 1
    # Advance next_run
    freq = rec.frequency
    if freq == "WEEKLY":
        rec.next_run = now + timedelta(weeks=1)
    elif freq == "MONTHLY":
        rec.next_run = now + timedelta(days=30)
    elif freq == "QUARTERLY":
        rec.next_run = now + timedelta(days=91)
    else:  # YEARLY
        rec.next_run = now + timedelta(days=365)
    await db.flush()
    return invoice


def generate_payment_link_token() -> str:
    return secrets.token_urlsafe(32)
