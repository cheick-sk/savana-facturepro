"""Public API Endpoints for FacturePro Africa.

Provides RESTful API endpoints for third-party integrations:
- Invoices CRUD
- Customers CRUD
- Products listing
- Webhooks management
- Usage statistics
"""
from __future__ import annotations

import time
from datetime import datetime, date, timezone
from typing import Optional

from fastapi import (
    APIRouter, Depends, Query, Request, HTTPException, status
)
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.all_models import (
    Invoice, InvoiceItem, Customer, Product, Organisation
)
from app.models.api_key import APIKey
from app.models.webhooks import WebhookEndpoint, WebhookEvent
from app.schemas.api_key import (
    APIKeyCreate, APIKeyUpdate, APIKeyOut, APIKeyCreated, APIKeyListOut,
    APIKeyUsageList, APIKeyUsageOut, APIKeyUsageStats,
    WebhookEndpointCreate, WebhookEndpointUpdate, WebhookEndpointOut,
    WebhookEndpointCreated, WebhookDeliveryList,
    PublicInvoiceOut, PublicInvoiceCreate, PublicInvoiceItem,
    PublicCustomerOut, PublicCustomerCreate,
    PublicProductOut, PaginatedResponse,
    AVAILABLE_SCOPES, AVAILABLE_WEBHOOK_EVENTS,
)
from app.middleware.api_auth import (
    get_api_key, require_scope, require_any_scope, api_key_auth
)
from app.services.api_key_service import APIKeyService, WebhookService

router = APIRouter(prefix="/public", tags=["Public API"])
api_keys_router = APIRouter(prefix="/api-keys", tags=["API Keys"])
webhooks_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


# ─── Invoices Endpoints ──────────────────────────────────────────────────────

@router.get("/invoices", response_model=PaginatedResponse)
async def list_invoices(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    from_date: Optional[date] = Query(None, description="From date"),
    to_date: Optional[date] = Query(None, description="To date"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    key: APIKey = Depends(require_scope("read:invoices")),
    db: AsyncSession = Depends(get_db),
):
    """List invoices with optional filters.
    
    Requires scope: `read:invoices`
    """
    start_time = time.time()
    organisation_id = key.organisation_id
    
    # Build query
    query = select(Invoice).where(
        Invoice.organisation_id == organisation_id
    ).options(
        selectinload(Invoice.items),
        selectinload(Invoice.customer),
    )
    
    # Apply filters
    if status:
        query = query.where(Invoice.status == status.upper())
    
    if customer_id:
        query = query.where(Invoice.customer_id == customer_id)
    
    if from_date:
        query = query.where(Invoice.issue_date >= from_date)
    
    if to_date:
        query = query.where(Invoice.issue_date <= to_date)
    
    # Count total
    count_query = select(func.count(Invoice.id)).where(
        Invoice.organisation_id == organisation_id
    )
    if status:
        count_query = count_query.where(Invoice.status == status.upper())
    if customer_id:
        count_query = count_query.where(Invoice.customer_id == customer_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    offset = (page - 1) * limit
    query = query.order_by(Invoice.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    invoices = list(result.scalars().all())
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(
        key, request, 200, response_time, db=db
    )
    
    return PaginatedResponse(
        items=[
            PublicInvoiceOut(
                id=inv.id,
                invoice_number=inv.invoice_number,
                status=inv.status,
                issue_date=inv.issue_date,
                due_date=inv.due_date,
                subtotal=float(inv.subtotal),
                tax_amount=float(inv.tax_amount),
                discount_amount=float(inv.discount_amount),
                total_amount=float(inv.total_amount),
                amount_paid=float(inv.amount_paid),
                balance_due=inv.balance_due,
                currency=inv.currency,
                notes=inv.notes,
                customer_id=inv.customer_id,
                items=[
                    PublicInvoiceItem(
                        id=item.id,
                        description=item.description,
                        quantity=float(item.quantity),
                        unit_price=float(item.unit_price),
                        tax_rate=float(item.tax_rate),
                        line_total=float(item.line_total),
                        product_id=item.product_id,
                    )
                    for item in inv.items
                ],
                created_at=inv.created_at,
            )
            for inv in invoices
        ],
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
        has_next=page * limit < total,
        has_prev=page > 1,
    )


@router.get("/invoices/{invoice_id}", response_model=PublicInvoiceOut)
async def get_invoice(
    invoice_id: int,
    request: Request,
    key: APIKey = Depends(require_scope("read:invoices")),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice by ID.
    
    Requires scope: `read:invoices`
    """
    start_time = time.time()
    
    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.organisation_id == key.organisation_id,
        ).options(
            selectinload(Invoice.items),
            selectinload(Invoice.customer),
        )
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Invoice not found", "code": "not_found"}
        )
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(key, request, 200, response_time, db=db)
    
    return PublicInvoiceOut(
        id=invoice.id,
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
        customer_id=invoice.customer_id,
        items=[
            PublicInvoiceItem(
                id=item.id,
                description=item.description,
                quantity=float(item.quantity),
                unit_price=float(item.unit_price),
                tax_rate=float(item.tax_rate),
                line_total=float(item.line_total),
                product_id=item.product_id,
            )
            for item in invoice.items
        ],
        created_at=invoice.created_at,
    )


@router.post("/invoices", response_model=PublicInvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    request: Request,
    data: PublicInvoiceCreate,
    key: APIKey = Depends(require_scope("write:invoices")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new invoice.
    
    Requires scope: `write:invoices`
    
    Items should include: product_id (optional), description, quantity, unit_price, tax_rate (optional)
    """
    start_time = time.time()
    organisation_id = key.organisation_id
    
    # Verify customer exists
    customer_result = await db.execute(
        select(Customer).where(
            Customer.id == data.customer_id,
            Customer.organisation_id == organisation_id,
        )
    )
    customer = customer_result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Customer not found", "code": "invalid_customer"}
        )
    
    # Generate invoice number
    count_result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.organisation_id == organisation_id
        )
    )
    count = count_result.scalar() or 0
    invoice_number = f"INV-{count + 1:06d}"
    
    # Create invoice
    invoice = Invoice(
        organisation_id=organisation_id,
        invoice_number=invoice_number,
        customer_id=data.customer_id,
        created_by=key.created_by,
        status="DRAFT",
        due_date=data.due_date,
        notes=data.notes,
        discount_percent=data.discount_percent or 0,
    )
    
    db.add(invoice)
    await db.flush()
    
    # Create invoice items
    subtotal = 0
    tax_amount = 0
    
    for item_data in data.items:
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=item_data.get("product_id"),
            description=item_data["description"],
            quantity=item_data.get("quantity", 1),
            unit_price=item_data["unit_price"],
            tax_rate=item_data.get("tax_rate", 0),
        )
        
        # Calculate line total
        line_subtotal = float(item.quantity) * float(item.unit_price)
        line_tax = line_subtotal * float(item.tax_rate) / 100
        item.line_total = line_subtotal + line_tax
        
        subtotal += line_subtotal
        tax_amount += line_tax
        
        db.add(item)
    
    # Calculate totals
    discount_amount = subtotal * float(data.discount_percent or 0) / 100
    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.discount_amount = discount_amount
    invoice.total_amount = subtotal + tax_amount - discount_amount
    
    await db.flush()
    await db.refresh(invoice)
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(key, request, 201, response_time, db=db)
    
    # Return created invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice.id).options(
            selectinload(Invoice.items)
        )
    )
    invoice = result.scalar_one()
    
    return PublicInvoiceOut(
        id=invoice.id,
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
        customer_id=invoice.customer_id,
        items=[
            PublicInvoiceItem(
                id=item.id,
                description=item.description,
                quantity=float(item.quantity),
                unit_price=float(item.unit_price),
                tax_rate=float(item.tax_rate),
                line_total=float(item.line_total),
                product_id=item.product_id,
            )
            for item in invoice.items
        ],
        created_at=invoice.created_at,
    )


# ─── Customers Endpoints ─────────────────────────────────────────────────────

@router.get("/customers", response_model=PaginatedResponse)
async def list_customers(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    key: APIKey = Depends(require_scope("read:customers")),
    db: AsyncSession = Depends(get_db),
):
    """List customers with optional search.
    
    Requires scope: `read:customers`
    """
    start_time = time.time()
    organisation_id = key.organisation_id
    
    # Build query
    query = select(Customer).where(
        Customer.organisation_id == organisation_id
    )
    
    # Apply filters
    if is_active is not None:
        query = query.where(Customer.is_active == is_active)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Customer.name.ilike(search_term),
                Customer.email.ilike(search_term),
                Customer.phone.ilike(search_term),
            )
        )
    
    # Count total
    count_query = select(func.count(Customer.id)).where(
        Customer.organisation_id == organisation_id
    )
    if is_active is not None:
        count_query = count_query.where(Customer.is_active == is_active)
    if search:
        count_query = count_query.where(
            or_(
                Customer.name.ilike(search_term),
                Customer.email.ilike(search_term),
                Customer.phone.ilike(search_term),
            )
        )
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    offset = (page - 1) * limit
    query = query.order_by(Customer.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    customers = list(result.scalars().all())
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(key, request, 200, response_time, db=db)
    
    return PaginatedResponse(
        items=[PublicCustomerOut.model_validate(c) for c in customers],
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
        has_next=page * limit < total,
        has_prev=page > 1,
    )


@router.post("/customers", response_model=PublicCustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
    request: Request,
    data: PublicCustomerCreate,
    key: APIKey = Depends(require_scope("write:customers")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new customer.
    
    Requires scope: `write:customers`
    """
    start_time = time.time()
    
    customer = Customer(
        organisation_id=key.organisation_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        address=data.address,
        city=data.city,
        country=data.country,
        tax_id=data.tax_id,
    )
    
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(key, request, 201, response_time, db=db)
    
    return PublicCustomerOut.model_validate(customer)


@router.get("/customers/{customer_id}", response_model=PublicCustomerOut)
async def get_customer(
    customer_id: int,
    request: Request,
    key: APIKey = Depends(require_scope("read:customers")),
    db: AsyncSession = Depends(get_db),
):
    """Get customer by ID.
    
    Requires scope: `read:customers`
    """
    start_time = time.time()
    
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.organisation_id == key.organisation_id,
        )
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Customer not found", "code": "not_found"}
        )
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(key, request, 200, response_time, db=db)
    
    return PublicCustomerOut.model_validate(customer)


# ─── Products Endpoints ──────────────────────────────────────────────────────

@router.get("/products", response_model=PaginatedResponse)
async def list_products(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name, SKU, or barcode"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    key: APIKey = Depends(require_scope("read:products")),
    db: AsyncSession = Depends(get_db),
):
    """List products with optional filters.
    
    Requires scope: `read:products`
    """
    start_time = time.time()
    organisation_id = key.organisation_id
    
    # Build query
    query = select(Product).where(
        Product.organisation_id == organisation_id
    )
    
    # Apply filters
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    
    if category_id:
        query = query.where(Product.category_id == category_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
            )
        )
    
    # Count total
    count_query = select(func.count(Product.id)).where(
        Product.organisation_id == organisation_id
    )
    if is_active is not None:
        count_query = count_query.where(Product.is_active == is_active)
    if category_id:
        count_query = count_query.where(Product.category_id == category_id)
    if search:
        count_query = count_query.where(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
            )
        )
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    offset = (page - 1) * limit
    query = query.order_by(Product.name).offset(offset).limit(limit)
    
    result = await db.execute(query)
    products = list(result.scalars().all())
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(key, request, 200, response_time, db=db)
    
    return PaginatedResponse(
        items=[PublicProductOut.model_validate(p) for p in products],
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
        has_next=page * limit < total,
        has_prev=page > 1,
    )


@router.get("/products/{product_id}", response_model=PublicProductOut)
async def get_product(
    product_id: int,
    request: Request,
    key: APIKey = Depends(require_scope("read:products")),
    db: AsyncSession = Depends(get_db),
):
    """Get product by ID.
    
    Requires scope: `read:products`
    """
    start_time = time.time()
    
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.organisation_id == key.organisation_id,
        )
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Product not found", "code": "not_found"}
        )
    
    # Record usage
    response_time = int((time.time() - start_time) * 1000)
    await api_key_auth.record_usage(key, request, 200, response_time, db=db)
    
    return PublicProductOut.model_validate(product)


# ─── API Keys Management Endpoints ───────────────────────────────────────────

@api_keys_router.get("", response_model=list[APIKeyListOut])
async def list_api_keys(
    include_inactive: bool = Query(False),
    key: APIKey = Depends(require_scope("read:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for the organisation.
    
    Requires scope: `read:webhooks`
    """
    keys = await APIKeyService.list_by_organisation(
        db, key.organisation_id, include_inactive
    )
    return [APIKeyListOut.model_validate(k) for k in keys]


@api_keys_router.post("", response_model=APIKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    data: APIKeyCreate,
    key: APIKey = Depends(require_scope("write:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key.
    
    Requires scope: `write:webhooks`
    
    The full key is only returned once - store it securely!
    """
    new_key = await APIKeyService.create(
        db, key.organisation_id, key.created_by, data
    )
    return APIKeyCreated(
        id=new_key.id,
        name=new_key.name,
        description=new_key.description,
        key_prefix=new_key.key_prefix,
        masked_key=new_key.masked_key,
        key=new_key.key,  # Full key - only shown once!
        secret=new_key.secret,  # Secret for HMAC - only shown once!
        scopes=new_key.scopes,
        rate_limit=new_key.rate_limit,
        is_active=new_key.is_active,
        last_used_at=new_key.last_used_at,
        expires_at=new_key.expires_at,
        created_at=new_key.created_at,
        created_by=new_key.created_by,
    )


@api_keys_router.get("/{key_id}", response_model=APIKeyOut)
async def get_api_key(
    key_id: int,
    key: APIKey = Depends(require_scope("read:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Get API key details.
    
    Requires scope: `read:webhooks`
    """
    api_key = await APIKeyService.get_by_id(db, key_id, key.organisation_id)
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "API key not found", "code": "not_found"}
        )
    
    return APIKeyOut.model_validate(api_key)


@api_keys_router.put("/{key_id}", response_model=APIKeyOut)
async def update_api_key(
    key_id: int,
    data: APIKeyUpdate,
    key: APIKey = Depends(require_scope("write:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Update an API key.
    
    Requires scope: `write:webhooks`
    """
    updated_key = await APIKeyService.update(db, key_id, key.organisation_id, data)
    
    if not updated_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "API key not found", "code": "not_found"}
        )
    
    return APIKeyOut.model_validate(updated_key)


@api_keys_router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: int,
    key: APIKey = Depends(require_scope("write:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Delete (deactivate) an API key.
    
    Requires scope: `write:webhooks`
    """
    success = await APIKeyService.delete(db, key_id, key.organisation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "API key not found", "code": "not_found"}
        )


@api_keys_router.post("/{key_id}/regenerate", response_model=APIKeyCreated)
async def regenerate_api_key(
    key_id: int,
    key: APIKey = Depends(require_scope("write:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate an API key.
    
    Requires scope: `write:webhooks`
    
    The old key will immediately stop working.
    """
    regenerated_key = await APIKeyService.regenerate(db, key_id, key.organisation_id)
    
    if not regenerated_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "API key not found", "code": "not_found"}
        )
    
    return APIKeyCreated(
        id=regenerated_key.id,
        name=regenerated_key.name,
        description=regenerated_key.description,
        key_prefix=regenerated_key.key_prefix,
        masked_key=regenerated_key.masked_key,
        key=regenerated_key.key,
        secret=regenerated_key.secret,
        scopes=regenerated_key.scopes,
        rate_limit=regenerated_key.rate_limit,
        is_active=regenerated_key.is_active,
        last_used_at=regenerated_key.last_used_at,
        expires_at=regenerated_key.expires_at,
        created_at=regenerated_key.created_at,
        created_by=regenerated_key.created_by,
    )


@api_keys_router.get("/{key_id}/usage", response_model=APIKeyUsageList)
async def get_api_key_usage(
    key_id: int,
    days: int = Query(30, ge=1, le=90),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    key: APIKey = Depends(require_scope("read:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Get usage statistics for an API key.
    
    Requires scope: `read:webhooks`
    """
    usage_logs, total = await APIKeyService.list_usage(
        db, key_id, key.organisation_id, page, limit
    )
    
    stats = await APIKeyService.get_usage_stats(
        db, key_id, key.organisation_id, days
    )
    
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "API key not found", "code": "not_found"}
        )
    
    return APIKeyUsageList(
        items=[APIKeyUsageOut.model_validate(log) for log in usage_logs],
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
        stats=APIKeyUsageStats(**stats),
    )


# ─── Webhooks Management Endpoints ───────────────────────────────────────────

@webhooks_router.get("", response_model=list[WebhookEndpointOut])
async def list_webhooks(
    include_inactive: bool = Query(False),
    key: APIKey = Depends(require_scope("read:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """List all webhooks for the organisation.
    
    Requires scope: `read:webhooks`
    """
    webhooks = await WebhookService.list_by_organisation(
        db, key.organisation_id, include_inactive
    )
    return [WebhookEndpointOut.model_validate(w) for w in webhooks]


@webhooks_router.post("", response_model=WebhookEndpointCreated, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    data: WebhookEndpointCreate,
    key: APIKey = Depends(require_scope("write:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook endpoint.
    
    Requires scope: `write:webhooks`
    
    The secret is only returned once - store it securely!
    Use it to verify webhook signatures.
    """
    webhook = await WebhookService.create(
        db, key.organisation_id, key.created_by, data
    )
    return WebhookEndpointCreated(
        id=webhook.id,
        name=webhook.name,
        url=webhook.url,
        events=webhook.events,
        is_active=webhook.is_active,
        last_triggered_at=webhook.last_triggered_at,
        last_failure_at=webhook.last_failure_at,
        consecutive_failures=webhook.consecutive_failures,
        created_at=webhook.created_at,
        secret=webhook.secret,
    )


@webhooks_router.get("/{webhook_id}", response_model=WebhookEndpointOut)
async def get_webhook(
    webhook_id: int,
    key: APIKey = Depends(require_scope("read:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Get webhook details.
    
    Requires scope: `read:webhooks`
    """
    webhook = await WebhookService.get_by_id(db, webhook_id, key.organisation_id)
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Webhook not found", "code": "not_found"}
        )
    
    return WebhookEndpointOut.model_validate(webhook)


@webhooks_router.put("/{webhook_id}", response_model=WebhookEndpointOut)
async def update_webhook(
    webhook_id: int,
    data: WebhookEndpointUpdate,
    key: APIKey = Depends(require_scope("write:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Update a webhook.
    
    Requires scope: `write:webhooks`
    """
    webhook = await WebhookService.update(db, webhook_id, key.organisation_id, data)
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Webhook not found", "code": "not_found"}
        )
    
    return WebhookEndpointOut.model_validate(webhook)


@webhooks_router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    key: APIKey = Depends(require_scope("write:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook.
    
    Requires scope: `write:webhooks`
    """
    success = await WebhookService.delete(db, webhook_id, key.organisation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Webhook not found", "code": "not_found"}
        )


@webhooks_router.get("/{webhook_id}/deliveries", response_model=WebhookDeliveryList)
async def list_webhook_deliveries(
    webhook_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    key: APIKey = Depends(require_scope("read:webhooks")),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery logs for a webhook.
    
    Requires scope: `read:webhooks`
    """
    deliveries, total = await WebhookService.list_deliveries(
        db, webhook_id, key.organisation_id, page, limit
    )
    
    return WebhookDeliveryList(
        items=[WebhookDeliveryOut.model_validate(d) for d in deliveries],
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
    )


# ─── Utility Endpoints ───────────────────────────────────────────────────────

@router.get("/scopes", response_model=dict)
async def list_available_scopes():
    """List all available API scopes."""
    return {
        "scopes": AVAILABLE_SCOPES,
        "groups": {
            "invoices": ["read:invoices", "write:invoices"],
            "customers": ["read:customers", "write:customers"],
            "products": ["read:products", "write:products"],
            "quotes": ["read:quotes", "write:quotes"],
            "payments": ["read:payments", "write:payments"],
            "suppliers": ["read:suppliers", "write:suppliers"],
            "reports": ["read:reports"],
            "webhooks": ["read:webhooks", "write:webhooks"],
        }
    }


@router.get("/events", response_model=dict)
async def list_available_events():
    """List all available webhook events."""
    return {"events": AVAILABLE_WEBHOOK_EVENTS}


# Include sub-routers
router.include_router(api_keys_router)
router.include_router(webhooks_router)
