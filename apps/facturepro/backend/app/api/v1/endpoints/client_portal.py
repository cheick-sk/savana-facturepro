"""Client Portal API endpoints — FacturePro Africa.

Public endpoints for client registration and authentication.
Authenticated endpoints for invoice viewing, payments, and profile management.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.client_portal import ClientAccount
from app.schemas.client_portal import (
    ClientAccountOut, ClientDashboardOut, ClientInvoiceListOut, ClientInvoiceOut,
    ClientLoginRequest, ClientMobileMoneyPayment, ClientOrganisationOut,
    ClientPaginatedInvoices, ClientPaginatedPayments, ClientPaginatedQuotes,
    ClientPasswordChange, ClientPaymentMethodCreate, ClientPaymentMethodOut,
    ClientPaymentOut, ClientPaymentRequest, ClientProfileUpdate,
    ClientQuoteListOut, ClientQuoteOut, ClientRegisterFromInvoice, ClientRegisterRequest,
    ClientStatementOut, ClientTokenResponse, MagicLinkRequest, MagicLinkVerify,
    PublicInvoiceOut,
)
from app.services import client_portal_service as service

logger = logging.getLogger(__name__)
settings = get_settings()
ALGORITHM = "HS256"

# ── Routers ─────────────────────────────────────────────────────
public_router = APIRouter(prefix="/portal/public", tags=["Client Portal - Public"])
auth_router = APIRouter(prefix="/portal/auth", tags=["Client Portal - Auth"])
portal_router = APIRouter(prefix="/portal", tags=["Client Portal"])


# ── Client Authentication Dependency ─────────────────────────────
async def get_current_client(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ClientAccount:
    """Get the current authenticated client from JWT token."""
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
    bearer = HTTPBearer()

    try:
        credentials = await bearer(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "client":
            raise HTTPException(status_code=401, detail="Invalid token type")
        if payload.get("token_type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        client_id = payload.get("sub")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    result = await db.execute(
        ClientAccount.__table__.select().where(ClientAccount.id == int(client_id))
    )
    client = result.fetchone()
    if not client:
        raise HTTPException(status_code=401, detail="Client not found")

    # Get full client object
    client_obj = await db.get(ClientAccount, int(client_id))
    if not client_obj or not client_obj.is_active:
        raise HTTPException(status_code=401, detail="Client not found or inactive")

    return client_obj


# ── Public Endpoints ────────────────────────────────────────────
@public_router.get("/invoice/{token}", response_model=PublicInvoiceOut)
async def get_public_invoice(
    token: str,
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    """Get invoice by public portal token (for email links)."""
    invoice = await service.get_public_invoice(db, token)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or link expired")

    # Mark as viewed
    await service.mark_invoice_viewed(
        db, invoice,
        ip_address=request.client.host if request and request.client else None,
    )

    return PublicInvoiceOut(
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        subtotal=float(invoice.subtotal),
        tax_amount=float(invoice.tax_amount),
        discount_amount=float(invoice.discount_amount),
        total_amount=float(invoice.total_amount),
        amount_paid=float(invoice.amount_paid),
        balance_due=invoice.balance_due,
        currency=invoice.currency,
        notes=invoice.notes,
        items=[{
            "id": item.id,
            "description": item.description,
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "tax_rate": float(item.tax_rate),
            "discount_percent": float(item.discount_percent),
            "line_total": float(item.line_total),
        } for item in invoice.items],
        customer_name=invoice.customer.name,
        organisation=ClientOrganisationOut.model_validate(invoice.organisation),
        portal_token=invoice.portal_token,
    )


@public_router.post("/pay/{token}")
async def public_pay_invoice(
    token: str,
    data: ClientPaymentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Process payment for public invoice view."""
    invoice = await service.get_public_invoice(db, token)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or link expired")

    payment = await service.process_client_payment(
        db,
        invoice.id,
        data.amount,
        data.provider,
        data.phone_number,
    )
    await db.commit()
    return {"success": True, "payment": ClientPaymentOut.model_validate(payment)}


# ── Authentication Endpoints ────────────────────────────────────
@auth_router.post("/register", response_model=ClientAccountOut, status_code=201)
async def register_client(
    data: ClientRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new client account."""
    try:
        # TODO: Get organisation_id from request or token
        # For now, we'll require customer_id and get org from there
        if not data.customer_id:
            raise HTTPException(status_code=400, detail="customer_id is required")

        from app.models.all_models import Customer
        customer = await db.get(Customer, data.customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        client = await service.register_client(
            db,
            email=data.email,
            organisation_id=customer.organisation_id,
            customer_id=data.customer_id,
            phone=data.phone,
            password=data.password,
            preferred_language=data.preferred_language,
        )
        await db.commit()
        return ClientAccountOut.model_validate(client)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@auth_router.post("/register-from-invoice", response_model=ClientTokenResponse, status_code=201)
async def register_from_invoice(
    data: ClientRegisterFromInvoice,
    db: AsyncSession = Depends(get_db),
):
    """Register client account from invoice email link."""
    try:
        client = await service.register_from_invoice(
            db,
            invoice_id=data.invoice_id,
            email=data.email,
            phone=data.phone,
            password=data.password,
        )
        await db.commit()

        tokens = service._make_client_tokens(client)
        return ClientTokenResponse(
            **tokens,
            client=ClientAccountOut.model_validate(client),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@auth_router.post("/magic-link", status_code=202)
async def request_magic_link(
    data: MagicLinkRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a magic link for passwordless login."""
    await service.send_magic_link(db, data.email)
    await db.commit()
    return {"message": "If an account exists, a magic link has been sent"}


@auth_router.post("/verify-magic", response_model=ClientTokenResponse)
async def verify_magic_link(
    data: MagicLinkVerify,
    db: AsyncSession = Depends(get_db),
):
    """Verify magic link token and get access tokens."""
    try:
        client = await service.verify_magic_link(db, data.token)
        await db.commit()

        tokens = service._make_client_tokens(client)
        return ClientTokenResponse(
            **tokens,
            client=ClientAccountOut.model_validate(client),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@auth_router.post("/login", response_model=ClientTokenResponse)
async def login_client(
    data: ClientLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password."""
    try:
        client = await service.login_client(db, data.email, data.password)
        await db.commit()

        tokens = service._make_client_tokens(client)
        return ClientTokenResponse(
            **tokens,
            client=ClientAccountOut.model_validate(client),
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@auth_router.post("/refresh", response_model=ClientTokenResponse)
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
    bearer = HTTPBearer()

    try:
        credentials = await bearer(request)
    except Exception:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "client" or payload.get("token_type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        client_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    client = await db.get(ClientAccount, int(client_id))
    if not client or not client.is_active:
        raise HTTPException(status_code=401, detail="Client not found")

    tokens = service._make_client_tokens(client)
    return ClientTokenResponse(
        **tokens,
        client=ClientAccountOut.model_validate(client),
    )


# ── Profile Endpoints ───────────────────────────────────────────
@portal_router.get("/profile", response_model=ClientAccountOut)
async def get_profile(
    client: ClientAccount = Depends(get_current_client),
):
    """Get client profile."""
    return ClientAccountOut.model_validate(client)


@portal_router.put("/profile", response_model=ClientAccountOut)
async def update_profile(
    data: ClientProfileUpdate,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Update client profile."""
    if data.phone is not None:
        client.phone = data.phone
    if data.preferred_language is not None:
        client.preferred_language = data.preferred_language
    if data.preferred_payment_method is not None:
        client.preferred_payment_method = data.preferred_payment_method

    await db.flush()
    await db.refresh(client)
    return ClientAccountOut.model_validate(client)


@portal_router.put("/password", status_code=200)
async def change_password(
    data: ClientPasswordChange,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Change client password."""
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # If client has a password, verify current password
    if client.password_hash:
        if not data.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not pwd_ctx.verify(data.current_password, client.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

    client.password_hash = pwd_ctx.hash(data.new_password)
    await db.flush()
    return {"message": "Password updated successfully"}


# ── Invoice Endpoints ────────────────────────────────────────────
@portal_router.get("/invoices", response_model=ClientPaginatedInvoices)
async def list_invoices(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """List invoices for client."""
    invoices, total = await service.get_client_invoices(
        db, client.id, status_filter, page, size
    )
    return ClientPaginatedInvoices(
        items=[ClientInvoiceListOut.model_validate(inv) for inv in invoices],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@portal_router.get("/invoices/{invoice_id}", response_model=ClientInvoiceOut)
async def get_invoice(
    invoice_id: int,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    """Get invoice details."""
    invoice = await service.get_client_invoice(db, client.id, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Track view
    await service.mark_invoice_viewed(
        db, invoice, client.id,
        ip_address=request.client.host if request and request.client else None,
    )

    return ClientInvoiceOut.model_validate(invoice)


@portal_router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: int,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Download invoice PDF."""
    invoice = await service.get_client_invoice(db, client.id, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.pdf_path:
        # Generate PDF if not exists
        from app.services.invoice_service import generate_and_store_pdf
        await generate_and_store_pdf(db, invoice)
        await db.refresh(invoice)

    if not invoice.pdf_path:
        raise HTTPException(status_code=404, detail="PDF not available")

    # Read and return PDF
    with open(invoice.pdf_path, "rb") as f:
        pdf_bytes = f.read()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="facture_{invoice.invoice_number}.pdf"'
        },
    )


# ── Quote Endpoints ──────────────────────────────────────────────
@portal_router.get("/quotes", response_model=ClientPaginatedQuotes)
async def list_quotes(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """List quotes for client."""
    quotes, total = await service.get_client_quotes(
        db, client.id, status_filter, page, size
    )
    return ClientPaginatedQuotes(
        items=[ClientQuoteListOut.model_validate(q) for q in quotes],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@portal_router.get("/quotes/{quote_id}", response_model=ClientQuoteOut)
async def get_quote(
    quote_id: int,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Get quote details."""
    quote = await service.get_client_quote(db, client.id, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return ClientQuoteOut.model_validate(quote)


@portal_router.post("/quotes/{quote_id}/accept", response_model=ClientInvoiceOut)
async def accept_quote(
    quote_id: int,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Accept a quote and convert to invoice."""
    try:
        invoice = await service.accept_quote(db, client.id, quote_id)
        await db.commit()
        return ClientInvoiceOut.model_validate(invoice)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Payment Endpoints ────────────────────────────────────────────
@portal_router.get("/payments", response_model=ClientPaginatedPayments)
async def list_payments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """List payment history for client."""
    payments, total = await service.get_client_payments(db, client.id, page, size)
    return ClientPaginatedPayments(
        items=[ClientPaymentOut.model_validate(p) for p in payments],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@portal_router.post("/payments/process", response_model=ClientPaymentOut)
async def process_payment(
    data: ClientPaymentRequest,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Process a payment."""
    try:
        # Verify invoice belongs to client
        invoice = await service.get_client_invoice(db, client.id, data.invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        payment = await service.process_client_payment(
            db,
            data.invoice_id,
            data.amount,
            data.provider,
            data.phone_number,
        )
        await db.commit()
        return ClientPaymentOut.model_validate(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@portal_router.post("/payments/mobile-money", response_model=ClientPaymentOut)
async def process_mobile_money(
    data: ClientMobileMoneyPayment,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Process mobile money payment."""
    try:
        # Verify invoice belongs to client
        invoice = await service.get_client_invoice(db, client.id, data.invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        payment = await service.process_client_payment(
            db,
            data.invoice_id,
            data.amount,
            "mobile_money",
            data.phone_number,
            data.operator,
        )
        await db.commit()
        return ClientPaymentOut.model_validate(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@portal_router.get("/payments/methods", response_model=list[ClientPaymentMethodOut])
async def list_payment_methods(
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """List saved payment methods."""
    methods = await service.get_client_payment_methods(db, client.id)
    return [ClientPaymentMethodOut.model_validate(m) for m in methods]


@portal_router.post("/payments/methods", response_model=ClientPaymentMethodOut, status_code=201)
async def add_payment_method(
    data: ClientPaymentMethodCreate,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Add a payment method."""
    method = await service.add_client_payment_method(
        db,
        client.id,
        provider=data.provider,
        method_type=data.method_type,
        provider_method_id=data.provider_method_id,
        provider_customer_id=data.provider_customer_id,
        last_four=data.last_four,
        phone_number=data.phone_number,
        card_brand=data.card_brand,
        is_default=data.is_default,
    )
    await db.commit()
    return ClientPaymentMethodOut.model_validate(method)


@portal_router.delete("/payments/methods/{method_id}", status_code=204)
async def delete_payment_method(
    method_id: int,
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Delete a payment method."""
    success = await service.delete_client_payment_method(db, client.id, method_id)
    if not success:
        raise HTTPException(status_code=404, detail="Payment method not found")
    await db.commit()


# ── Statement Endpoint ───────────────────────────────────────────
@portal_router.get("/statement", response_model=ClientStatementOut)
async def get_statement(
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Get account statement."""
    if not start_date:
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
    if not end_date:
        end_date = datetime.now(timezone.utc)

    statement = await service.generate_client_statement(
        db, client.id, start_date, end_date
    )
    return statement


# ── Dashboard Endpoint ───────────────────────────────────────────
@portal_router.get("/dashboard", response_model=ClientDashboardOut)
async def get_dashboard(
    client: ClientAccount = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Get client dashboard data."""
    return await service.get_client_dashboard(db, client.id)
