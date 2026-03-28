"""Client Portal service layer — FacturePro Africa.

Business logic for client registration, authentication, invoice viewing,
payment processing, and statement generation.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.all_models import (
    Customer, Invoice, InvoiceItem, Organisation, Payment, Quote, QuoteItem,
)
from app.models.client_portal import (
    ClientAccount, ClientPaymentMethod, ClientView,
)
from app.schemas.client_portal import (
    ClientDashboardOut, ClientInvoiceListOut, ClientPaymentOut,
    ClientStatementLine, ClientStatementOut,
)

logger = logging.getLogger(__name__)
settings = get_settings()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


# ── Token Generation ────────────────────────────────────────────
def _make_client_tokens(client: ClientAccount) -> dict:
    """Generate access and refresh tokens for client."""
    payload = {
        "sub": str(client.id),
        "email": client.email,
        "type": "client",  # Distinguish from admin users
        "customer_id": client.customer_id,
        "organisation_id": client.organisation_id,
    }
    access_payload = {
        **payload,
        "token_type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    refresh_payload = {
        **payload,
        "token_type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return {
        "access_token": jwt.encode(access_payload, settings.SECRET_KEY, algorithm=ALGORITHM),
        "refresh_token": jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=ALGORITHM),
    }


def generate_portal_token() -> str:
    """Generate a secure portal token."""
    return secrets.token_urlsafe(32)


# ── Client Registration ──────────────────────────────────────────
async def register_client(
    db: AsyncSession,
    email: str,
    organisation_id: int,
    customer_id: int | None = None,
    phone: str | None = None,
    password: str | None = None,
    preferred_language: str = "fr",
) -> ClientAccount:
    """Register a new client account."""
    # Check if email already exists
    existing = await db.execute(
        select(ClientAccount).where(ClientAccount.email == email)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    # If no customer_id provided, try to find by email
    if not customer_id:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.email == email,
                Customer.organisation_id == organisation_id,
            )
        )
        customer = customer_result.scalar_one_or_none()
        if customer:
            customer_id = customer.id

    if not customer_id:
        raise ValueError("No customer found for this email. Please contact the business.")

    # Create client account
    client = ClientAccount(
        organisation_id=organisation_id,
        customer_id=customer_id,
        email=email,
        phone=phone,
        password_hash=pwd_ctx.hash(password) if password else None,
        preferred_language=preferred_language,
        magic_token=generate_portal_token(),
        magic_token_expires=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


async def register_from_invoice(
    db: AsyncSession,
    invoice_id: int,
    email: str,
    phone: str | None = None,
    password: str | None = None,
) -> ClientAccount:
    """Register client account from invoice email link."""
    # Get invoice and verify
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.customer))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise ValueError("Invoice not found")

    # Verify email matches customer email
    if invoice.customer.email and invoice.customer.email.lower() != email.lower():
        raise ValueError("Email does not match invoice customer")

    # Check if client already exists
    existing = await db.execute(
        select(ClientAccount).where(ClientAccount.email == email)
    )
    if existing.scalar_one_or_none():
        # Client exists, just ensure portal token is set
        invoice.portal_token = generate_portal_token()
        invoice.portal_token_expires = datetime.now(timezone.utc) + timedelta(days=30)
        await db.flush()
        return existing.scalar_one_or_none()

    # Create new client
    client = ClientAccount(
        organisation_id=invoice.organisation_id,
        customer_id=invoice.customer_id,
        email=email,
        phone=phone,
        password_hash=pwd_ctx.hash(password) if password else None,
        magic_token=generate_portal_token(),
        magic_token_expires=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(client)
    await db.flush()

    # Set portal token on invoice
    invoice.portal_token = generate_portal_token()
    invoice.portal_token_expires = datetime.now(timezone.utc) + timedelta(days=30)

    await db.refresh(client)
    return client


# ── Magic Link Authentication ───────────────────────────────────
async def send_magic_link(
    db: AsyncSession,
    email: str,
    organisation_id: int | None = None,
) -> bool:
    """Generate and send magic link for passwordless login."""
    # Find client by email
    result = await db.execute(
        select(ClientAccount).where(
            ClientAccount.email == email,
            ClientAccount.is_active == True,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        # Don't reveal if email exists or not
        logger.info(f"Magic link requested for unknown email: {email}")
        return True

    # Generate new magic token
    token = generate_portal_token()
    client.magic_token = token
    client.magic_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.flush()

    # TODO: Send magic link email
    # For now, we'll return the token in development
    if settings.APP_ENV == "development":
        logger.info(f"Magic link for {email}: /portal/auth/verify?token={token}")

    return True


async def verify_magic_link(
    db: AsyncSession,
    token: str,
) -> ClientAccount:
    """Verify magic link token and return client."""
    result = await db.execute(
        select(ClientAccount).where(
            ClientAccount.magic_token == token,
            ClientAccount.is_active == True,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise ValueError("Invalid or expired magic link")

    if client.magic_token_expires and datetime.now(timezone.utc) > client.magic_token_expires:
        raise ValueError("Magic link has expired")

    # Clear magic token and mark email verified
    client.magic_token = None
    client.magic_token_expires = None
    client.email_verified = True
    client.last_login = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(client)
    return client


# ── Client Login ────────────────────────────────────────────────
async def login_client(
    db: AsyncSession,
    email: str,
    password: str,
) -> ClientAccount:
    """Authenticate client with email and password."""
    result = await db.execute(
        select(ClientAccount).where(
            ClientAccount.email == email,
            ClientAccount.is_active == True,
        )
    )
    client = result.scalar_one_or_none()
    if not client or not client.password_hash:
        raise ValueError("Invalid credentials")

    if not pwd_ctx.verify(password, client.password_hash):
        raise ValueError("Invalid credentials")

    client.last_login = datetime.now(timezone.utc)
    client.email_verified = True
    await db.flush()
    await db.refresh(client)
    return client


# ── View Tracking ───────────────────────────────────────────────
async def track_client_view(
    db: AsyncSession,
    client_account_id: int,
    organisation_id: int,
    entity_type: str,
    entity_id: int,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ClientView:
    """Track when a client views an invoice, quote, etc."""
    view = ClientView(
        organisation_id=organisation_id,
        client_account_id=client_account_id,
        viewed_entity_type=entity_type,
        viewed_entity_id=entity_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(view)
    await db.flush()
    return view


async def mark_invoice_viewed(
    db: AsyncSession,
    invoice: Invoice,
    client_account_id: int | None = None,
    ip_address: str | None = None,
) -> None:
    """Mark invoice as viewed in portal."""
    invoice.portal_viewed_at = datetime.now(timezone.utc)
    if client_account_id:
        await track_client_view(
            db,
            client_account_id,
            invoice.organisation_id,
            "invoice",
            invoice.id,
            ip_address,
        )
    await db.flush()


# ── Invoice Operations ───────────────────────────────────────────
async def get_client_invoices(
    db: AsyncSession,
    client_account_id: int,
    status: str | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Invoice], int]:
    """Get paginated invoices for a client."""
    # Get client's customer_id and organisation_id
    client_result = await db.execute(
        select(ClientAccount).where(ClientAccount.id == client_account_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise ValueError("Client not found")

    # Build query
    query = (
        select(Invoice)
        .where(
            Invoice.customer_id == client.customer_id,
            Invoice.organisation_id == client.organisation_id,
            Invoice.status != "DRAFT",
        )
        .order_by(Invoice.issue_date.desc())
    )

    if status:
        query = query.where(Invoice.status == status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    invoices = list(result.scalars().all())

    return invoices, total


async def get_client_invoice(
    db: AsyncSession,
    client_account_id: int,
    invoice_id: int,
) -> Invoice | None:
    """Get a specific invoice for a client."""
    client_result = await db.execute(
        select(ClientAccount).where(ClientAccount.id == client_account_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        return None

    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.payments),
            selectinload(Invoice.organisation),
        )
        .where(
            Invoice.id == invoice_id,
            Invoice.customer_id == client.customer_id,
            Invoice.organisation_id == client.organisation_id,
        )
    )
    return result.scalar_one_or_none()


async def get_public_invoice(
    db: AsyncSession,
    portal_token: str,
) -> Invoice | None:
    """Get invoice by public portal token."""
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.customer),
            selectinload(Invoice.organisation),
        )
        .where(Invoice.portal_token == portal_token)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        return None

    # Check expiration
    if invoice.portal_token_expires and datetime.now(timezone.utc) > invoice.portal_token_expires:
        return None

    return invoice


# ── Quote Operations ─────────────────────────────────────────────
async def get_client_quotes(
    db: AsyncSession,
    client_account_id: int,
    status: str | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Quote], int]:
    """Get paginated quotes for a client."""
    client_result = await db.execute(
        select(ClientAccount).where(ClientAccount.id == client_account_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise ValueError("Client not found")

    query = (
        select(Quote)
        .where(
            Quote.customer_id == client.customer_id,
            Quote.organisation_id == client.organisation_id,
            Quote.status != "DRAFT",
        )
        .order_by(Quote.issue_date.desc())
    )

    if status:
        query = query.where(Quote.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_client_quote(
    db: AsyncSession,
    client_account_id: int,
    quote_id: int,
) -> Quote | None:
    """Get a specific quote for a client."""
    client_result = await db.execute(
        select(ClientAccount).where(ClientAccount.id == client_account_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        return None

    result = await db.execute(
        select(Quote)
        .options(selectinload(Quote.items), selectinload(Quote.organisation))
        .where(
            Quote.id == quote_id,
            Quote.customer_id == client.customer_id,
            Quote.organisation_id == client.organisation_id,
        )
    )
    return result.scalar_one_or_none()


async def accept_quote(
    db: AsyncSession,
    client_account_id: int,
    quote_id: int,
) -> Invoice:
    """Accept a quote and convert to invoice."""
    quote = await get_client_quote(db, client_account_id, quote_id)
    if not quote:
        raise ValueError("Quote not found")

    if quote.status not in ("SENT", "DRAFT"):
        raise ValueError(f"Cannot accept quote with status: {quote.status}")

    # Check expiry
    if quote.expiry_date and datetime.now(timezone.utc) > quote.expiry_date:
        raise ValueError("Quote has expired")

    quote.status = "ACCEPTED"

    # Create invoice from quote
    from app.services.invoice_service import convert_quote_to_invoice

    # Get user_id from quote creator
    invoice = await convert_quote_to_invoice(db, quote, quote.created_by)
    await db.flush()
    return invoice


# ── Payment Operations ───────────────────────────────────────────
async def get_client_payments(
    db: AsyncSession,
    client_account_id: int,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Payment], int]:
    """Get payment history for a client."""
    client_result = await db.execute(
        select(ClientAccount).where(ClientAccount.id == client_account_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise ValueError("Client not found")

    # Get all invoice IDs for this client
    invoice_ids_query = (
        select(Invoice.id)
        .where(
            Invoice.customer_id == client.customer_id,
            Invoice.organisation_id == client.organisation_id,
        )
    )
    invoice_ids_result = await db.execute(invoice_ids_query)
    invoice_ids = [row[0] for row in invoice_ids_result.all()]

    if not invoice_ids:
        return [], 0

    query = (
        select(Payment)
        .where(Payment.invoice_id.in_(invoice_ids))
        .order_by(Payment.paid_at.desc())
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    return list(result.scalars().all()), total


async def process_client_payment(
    db: AsyncSession,
    invoice_id: int,
    amount: float,
    provider: str,
    phone_number: str | None = None,
    operator: str | None = None,
) -> Payment:
    """Process a payment from client portal."""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise ValueError("Invoice not found")

    if invoice.status in ("PAID", "CANCELLED"):
        raise ValueError(f"Invoice is already {invoice.status}")

    balance = float(invoice.total_amount) - float(invoice.amount_paid)
    if amount > balance + 0.01:
        raise ValueError(f"Payment amount exceeds balance due: {balance:.2f}")

    # Generate reference
    ref = f"{provider.upper()[:3]}-{secrets.token_hex(6).upper()}"

    # Create payment record
    payment = Payment(
        invoice_id=invoice_id,
        amount=round(amount, 2),
        method="MOBILE_MONEY" if provider in ("cinetpay", "mpesa", "mobile_money") else "CARD",
        reference=ref,
        phone_number=phone_number,
        operator=operator or provider,
        notes=f"Payment via {provider} from client portal",
    )
    db.add(payment)

    # Update invoice
    invoice.amount_paid = round(float(invoice.amount_paid) + amount, 2)
    if float(invoice.amount_paid) >= float(invoice.total_amount) - 0.01:
        invoice.status = "PAID"
    else:
        invoice.status = "PARTIAL"

    await db.flush()
    await db.refresh(payment)
    return payment


# ── Payment Methods ──────────────────────────────────────────────
async def get_client_payment_methods(
    db: AsyncSession,
    client_account_id: int,
) -> list[ClientPaymentMethod]:
    """Get saved payment methods for a client."""
    result = await db.execute(
        select(ClientPaymentMethod)
        .where(
            ClientPaymentMethod.client_account_id == client_account_id,
            ClientPaymentMethod.is_active == True,
        )
        .order_by(ClientPaymentMethod.is_default.desc(), ClientPaymentMethod.created_at.desc())
    )
    return list(result.scalars().all())


async def add_client_payment_method(
    db: AsyncSession,
    client_account_id: int,
    provider: str,
    method_type: str,
    provider_method_id: str | None = None,
    provider_customer_id: str | None = None,
    last_four: str | None = None,
    phone_number: str | None = None,
    card_brand: str | None = None,
    is_default: bool = False,
) -> ClientPaymentMethod:
    """Add a payment method for a client."""
    # If setting as default, unset other defaults
    if is_default:
        await db.execute(
            select(ClientPaymentMethod)
            .where(
                ClientPaymentMethod.client_account_id == client_account_id,
                ClientPaymentMethod.is_default == True,
            )
        )
        existing_methods = (await db.execute(
            select(ClientPaymentMethod)
            .where(
                ClientPaymentMethod.client_account_id == client_account_id,
                ClientPaymentMethod.is_default == True,
            )
        )).scalars().all()
        for method in existing_methods:
            method.is_default = False

    method = ClientPaymentMethod(
        client_account_id=client_account_id,
        provider=provider,
        method_type=method_type,
        provider_method_id=provider_method_id,
        provider_customer_id=provider_customer_id,
        last_four=last_four,
        phone_number=phone_number,
        card_brand=card_brand,
        is_default=is_default,
    )
    db.add(method)
    await db.flush()
    await db.refresh(method)
    return method


async def delete_client_payment_method(
    db: AsyncSession,
    client_account_id: int,
    method_id: int,
) -> bool:
    """Delete a payment method."""
    result = await db.execute(
        select(ClientPaymentMethod).where(
            ClientPaymentMethod.id == method_id,
            ClientPaymentMethod.client_account_id == client_account_id,
        )
    )
    method = result.scalar_one_or_none()
    if not method:
        return False

    method.is_active = False
    await db.flush()
    return True


# ── Statement Generation ─────────────────────────────────────────
async def generate_client_statement(
    db: AsyncSession,
    client_account_id: int,
    start_date: datetime,
    end_date: datetime,
) -> ClientStatementOut:
    """Generate account statement for a client."""
    client_result = await db.execute(
        select(ClientAccount)
        .options(selectinload(ClientAccount.customer))
        .where(ClientAccount.id == client_account_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise ValueError("Client not found")

    # Get all invoices in period
    invoices_result = await db.execute(
        select(Invoice)
        .where(
            Invoice.customer_id == client.customer_id,
            Invoice.organisation_id == client.organisation_id,
            Invoice.issue_date >= start_date,
            Invoice.issue_date <= end_date,
            Invoice.status != "DRAFT",
        )
        .order_by(Invoice.issue_date)
    )
    invoices = list(invoices_result.scalars().all())
    invoice_ids = [inv.id for inv in invoices]

    # Get all payments in period
    payments_result = await db.execute(
        select(Payment)
        .where(
            Payment.invoice_id.in_(invoice_ids),
            Payment.paid_at >= start_date,
            Payment.paid_at <= end_date,
        )
        .order_by(Payment.paid_at)
    )
    payments = list(payments_result.scalars().all())

    # Build statement lines
    lines: list[ClientStatementLine] = []
    running_balance = 0.0

    # Add invoices as debits
    for inv in invoices:
        running_balance += float(inv.total_amount)
        lines.append(ClientStatementLine(
            date=inv.issue_date,
            type="invoice",
            reference=inv.invoice_number,
            description=f"Facture {inv.invoice_number}",
            debit=float(inv.total_amount),
            credit=0.0,
            balance=running_balance,
        ))

    # Add payments as credits
    for pmt in payments:
        running_balance -= float(pmt.amount)
        lines.append(ClientStatementLine(
            date=pmt.paid_at,
            type="payment",
            reference=pmt.reference or f"PMT-{pmt.id}",
            description=f"Paiement via {pmt.method}",
            debit=0.0,
            credit=float(pmt.amount),
            balance=running_balance,
        ))

    # Sort by date
    lines.sort(key=lambda x: x.date)

    # Recalculate running balance
    running_balance = 0.0
    for line in lines:
        running_balance += line.debit - line.credit
        line.balance = running_balance

    # Calculate totals
    total_invoiced = sum(float(inv.total_amount) for inv in invoices)
    total_paid = sum(float(pmt.amount) for pmt in payments)

    return ClientStatementOut(
        client_id=client.id,
        customer_name=client.customer.name,
        period_start=start_date,
        period_end=end_date,
        currency=client.organisation.currency if hasattr(client, 'organisation') else "XOF",
        opening_balance=0.0,  # TODO: Calculate from previous period
        closing_balance=running_balance,
        total_invoiced=total_invoiced,
        total_paid=total_paid,
        lines=lines,
    )


# ── Dashboard ────────────────────────────────────────────────────
async def get_client_dashboard(
    db: AsyncSession,
    client_account_id: int,
) -> ClientDashboardOut:
    """Get dashboard data for client portal."""
    client_result = await db.execute(
        select(ClientAccount).where(ClientAccount.id == client_account_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise ValueError("Client not found")

    # Get invoice stats
    invoices_result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.payments))
        .where(
            Invoice.customer_id == client.customer_id,
            Invoice.organisation_id == client.organisation_id,
            Invoice.status.notin_(["DRAFT", "CANCELLED"]),
        )
        .order_by(Invoice.issue_date.desc())
    )
    all_invoices = list(invoices_result.scalars().all())

    # Calculate totals
    total_outstanding = sum(
        float(inv.balance_due) for inv in all_invoices
        if inv.status in ("SENT", "PARTIAL", "OVERDUE")
    )
    total_paid = sum(float(inv.amount_paid) for inv in all_invoices)

    # Count by status
    overdue_count = sum(1 for inv in all_invoices if inv.status == "OVERDUE")
    pending_count = sum(1 for inv in all_invoices if inv.status in ("SENT", "PARTIAL"))

    # Recent invoices
    recent_invoices = all_invoices[:5]

    # Get recent payments
    invoice_ids = [inv.id for inv in all_invoices]
    recent_payments: list[Payment] = []
    if invoice_ids:
        payments_result = await db.execute(
            select(Payment)
            .where(Payment.invoice_id.in_(invoice_ids))
            .order_by(Payment.paid_at.desc())
            .limit(5)
        )
        recent_payments = list(payments_result.scalars().all())

    return ClientDashboardOut(
        total_outstanding=total_outstanding,
        total_paid=total_paid,
        overdue_count=overdue_count,
        pending_count=pending_count,
        recent_invoices=[
            ClientInvoiceListOut.model_validate(inv) for inv in recent_invoices
        ],
        recent_payments=[
            ClientPaymentOut.model_validate(pmt) for pmt in recent_payments
        ],
    )
