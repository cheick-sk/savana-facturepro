"""Refunds / Returns endpoints — SavanaFlow."""
from __future__ import annotations
import logging
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import (
    Product, ProductVariant, Refund, RefundItem,
    Sale, SaleItem, StockMovement, User,
)
from app.schemas.schemas import Paginated, RefundCreate, RefundOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sales", tags=["Refunds — Retours"])


def _gen_refund_number() -> str:
    return f"RET-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


@router.get("/refunds", response_model=Paginated)
async def list_refunds(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Refund)
    if store_id:
        q = q.join(Sale, Sale.id == Refund.sale_id).where(Sale.store_id == store_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Refund.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[RefundOut.model_validate(r) for r in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{sale_id}/refunds", response_model=list[RefundOut])
async def list_sale_refunds(sale_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Refund).where(Refund.sale_id == sale_id).order_by(Refund.created_at.desc()))
    return [RefundOut.model_validate(r) for r in result.scalars().all()]


@router.post("/{sale_id}/refund", response_model=RefundOut, status_code=201)
async def create_refund(
    sale_id: int,
    data: RefundCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sale = (await db.execute(select(Sale).where(Sale.id == sale_id))).scalar_one_or_none()
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.status == "REFUNDED":
        raise HTTPException(409, "Sale has already been fully refunded")

    sale_items_map = {item.id: item for item in sale.items}
    refund_total = 0.0
    refund_items_data = []

    for ri in data.items:
        sale_item = sale_items_map.get(ri.sale_item_id)
        if not sale_item:
            raise HTTPException(404, f"Sale item {ri.sale_item_id} not found in this sale")

        # Check already refunded quantities
        already_refunded = float((await db.execute(
            select(func.coalesce(func.sum(RefundItem.quantity_returned), 0))
            .where(RefundItem.sale_item_id == ri.sale_item_id)
        )).scalar() or 0)

        available = float(sale_item.quantity) - already_refunded
        if ri.quantity_returned > available:
            raise HTTPException(400, f"Cannot refund {ri.quantity_returned} (max returnable: {available})")

        line_refund = round(ri.quantity_returned * float(sale_item.unit_price), 2)
        refund_total += line_refund
        refund_items_data.append({
            "sale_item_id": ri.sale_item_id,
            "product_id": sale_item.product_id,
            "quantity_returned": ri.quantity_returned,
            "unit_price": float(sale_item.unit_price),
            "line_refund": line_refund,
            "_product_id": sale_item.product_id,
            "_variant_id": sale_item.variant_id,
        })

    refund = Refund(
        refund_number=_gen_refund_number(),
        sale_id=sale_id,
        user_id=current_user.id,
        reason=data.reason,
        refund_amount=round(refund_total, 2),
        refund_method=data.refund_method,
        restock_items=data.restock_items,
        notes=data.notes,
        status="COMPLETED",
    )
    db.add(refund)
    await db.flush()

    for item_data in refund_items_data:
        product_id = item_data.pop("_product_id")
        variant_id = item_data.pop("_variant_id")
        db.add(RefundItem(refund_id=refund.id, **item_data))

        # Restock inventory
        if data.restock_items:
            prod = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
            if prod:
                qty_before = float(prod.stock_quantity)
                qty_after = round(qty_before + item_data["quantity_returned"], 4)
                prod.stock_quantity = qty_after
                db.add(StockMovement(
                    product_id=product_id,
                    variant_id=variant_id,
                    user_id=current_user.id,
                    movement_type="RETURN",
                    quantity=item_data["quantity_returned"],
                    reference=refund.refund_number,
                    reason=f"Refund from sale {sale.sale_number}",
                    quantity_before=qty_before,
                    quantity_after=qty_after,
                ))
                if variant_id:
                    v = (await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id))).scalar_one_or_none()
                    if v:
                        v.stock_quantity = round(float(v.stock_quantity) + item_data["quantity_returned"], 4)

    # Update sale status
    total_refunded = float((await db.execute(
        select(func.coalesce(func.sum(Refund.refund_amount), 0)).where(Refund.sale_id == sale_id)
    )).scalar() or 0) + refund_total

    if round(total_refunded, 2) >= float(sale.total_amount):
        sale.status = "REFUNDED"
    else:
        sale.status = "PARTIAL_REFUND"

    await db.commit()
    await db.refresh(refund)
    logger.info(f"Refund {refund.refund_number} — {refund.refund_amount} for sale {sale.sale_number}")
    return RefundOut.model_validate(refund)
