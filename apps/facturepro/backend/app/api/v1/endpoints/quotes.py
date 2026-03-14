"""Quotes (Devis) endpoints — FacturePro Africa."""
from __future__ import annotations
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Customer, Quote, QuoteItem, User
from app.schemas.schemas import (
    Paginated, QuoteCreate, QuoteOut, QuoteUpdate,
)
from app.services.invoice_service import _calc_item_totals, _compute_invoice_totals, convert_quote_to_invoice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quotes", tags=["Quotes — Devis"])


def _next_quote_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"DEV-{year}-{count + 1:05d}"


@router.get("", response_model=Paginated)
async def list_quotes(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    customer_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Quote)
    if status:
        q = q.where(Quote.status == status)
    if customer_id:
        q = q.where(Quote.customer_id == customer_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Quote.created_at.desc()).offset((page - 1) * size).limit(size))
    items = [QuoteOut.model_validate(r) for r in result.scalars().all()]
    return Paginated(items=items, total=total, page=page, size=size, pages=max(1, (total + size - 1) // size))


@router.get("/{quote_id}", response_model=QuoteOut)
async def get_quote(quote_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    return QuoteOut.model_validate(quote)


@router.post("", response_model=QuoteOut, status_code=201)
async def create_quote(
    data: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify customer
    cust = (await db.execute(select(Customer).where(Customer.id == data.customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(404, "Customer not found")

    count = (await db.execute(select(func.count()).select_from(Quote))).scalar() or 0
    number = _next_quote_number(count)

    items_raw = [
        {"quantity": i.quantity, "unit_price": i.unit_price,
         "tax_rate": i.tax_rate, "discount_percent": i.discount_percent}
        for i in data.items
    ]
    subtotal, tax_total, discount_amount, total = _compute_invoice_totals(items_raw, data.discount_percent)

    quote = Quote(
        quote_number=number,
        customer_id=data.customer_id,
        created_by=current_user.id,
        expiry_date=data.expiry_date,
        currency=data.currency,
        notes=data.notes,
        terms=data.terms,
        discount_percent=data.discount_percent,
        discount_amount=discount_amount,
        subtotal=subtotal,
        tax_amount=tax_total,
        total_amount=total,
    )
    db.add(quote)
    await db.flush()

    for item_data in data.items:
        _, _, line_total = _calc_item_totals(
            item_data.quantity, item_data.unit_price,
            item_data.tax_rate, item_data.discount_percent,
        )
        db.add(QuoteItem(
            quote_id=quote.id,
            product_id=item_data.product_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            tax_rate=item_data.tax_rate,
            discount_percent=item_data.discount_percent,
            line_total=line_total,
        ))

    await db.commit()
    await db.refresh(quote)
    logger.info(f"Quote {number} created by user {current_user.id}")
    return QuoteOut.model_validate(quote)


@router.put("/{quote_id}", response_model=QuoteOut)
async def update_quote(
    quote_id: int,
    data: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.status in ("CONVERTED", "ACCEPTED") and data.items is not None:
        raise HTTPException(409, "Cannot edit items of a converted/accepted quote")

    if data.expiry_date is not None:
        quote.expiry_date = data.expiry_date
    if data.notes is not None:
        quote.notes = data.notes
    if data.terms is not None:
        quote.terms = data.terms
    if data.status is not None:
        quote.status = data.status
    if data.discount_percent is not None:
        quote.discount_percent = data.discount_percent

    if data.items is not None:
        for old in list(quote.items):
            await db.delete(old)
        await db.flush()
        disc = float(quote.discount_percent or 0)
        items_raw = [
            {"quantity": i.quantity, "unit_price": i.unit_price,
             "tax_rate": i.tax_rate, "discount_percent": i.discount_percent}
            for i in data.items
        ]
        subtotal, tax_total, discount_amount, total = _compute_invoice_totals(items_raw, disc)
        for item_data in data.items:
            _, _, line_total = _calc_item_totals(
                item_data.quantity, item_data.unit_price,
                item_data.tax_rate, item_data.discount_percent,
            )
            db.add(QuoteItem(
                quote_id=quote.id,
                product_id=item_data.product_id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                tax_rate=item_data.tax_rate,
                discount_percent=item_data.discount_percent,
                line_total=line_total,
            ))
        quote.subtotal = subtotal
        quote.tax_amount = tax_total
        quote.discount_amount = discount_amount
        quote.total_amount = total

    await db.commit()
    await db.refresh(quote)
    return QuoteOut.model_validate(quote)


@router.post("/{quote_id}/convert", response_model=dict, status_code=201)
async def convert_to_invoice(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert an accepted quote into an invoice."""
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.status == "CONVERTED":
        raise HTTPException(409, "Quote already converted")
    if quote.status not in ("DRAFT", "SENT", "ACCEPTED"):
        raise HTTPException(400, f"Cannot convert quote in status {quote.status}")

    invoice = await convert_quote_to_invoice(db, quote, current_user.id)
    await db.commit()
    return {"message": "Quote converted to invoice", "invoice_id": invoice.id, "invoice_number": invoice.invoice_number}


@router.delete("/{quote_id}", status_code=204)
async def delete_quote(quote_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.status == "CONVERTED":
        raise HTTPException(409, "Cannot delete a converted quote")
    await db.delete(quote)
    await db.commit()
