"""Sales + Refunds endpoints — SavanaFlow."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Product, Refund, RefundItem, Sale, SaleItem, Shift, StockMovement, User
from app.schemas.schemas import Paginated, RefundCreate, RefundOut, SaleCreate, SaleOut
from app.services.pos_service import process_sale

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sales", tags=["Sales — Ventes"])


@router.get("", response_model=Paginated)
async def list_sales(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None, shift_id: int | None = None,
    customer_id: int | None = None, status: str | None = None,
    date_from: datetime | None = None, date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Sale)
    if store_id:
        q = q.where(Sale.store_id == store_id)
    if shift_id:
        q = q.where(Sale.shift_id == shift_id)
    if customer_id:
        q = q.where(Sale.customer_id == customer_id)
    if status:
        q = q.where(Sale.status == status.upper())
    if date_from:
        q = q.where(Sale.created_at >= date_from)
    if date_to:
        q = q.where(Sale.created_at <= date_to)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Sale.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[SaleOut.model_validate(s) for s in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(sale_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Sale).where(Sale.id == sale_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Sale not found")
    return SaleOut.model_validate(s)


@router.post("", response_model=SaleOut, status_code=201)
async def create_sale(data: SaleCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        sale = await process_sale(db, data, current_user.id)
        await db.commit()
        return SaleOut.model_validate(sale)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(400, str(e))


# ── Refunds ────────────────────────────────────────────────────
@router.post("/{sale_id}/refund", response_model=RefundOut, status_code=201)
async def create_refund(
    sale_id: int,
    data: RefundCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process a return/refund for a sale."""
    sale = (await db.execute(select(Sale).where(Sale.id == sale_id))).scalar_one_or_none()
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.status == "REFUNDED":
        raise HTTPException(409, "Sale already fully refunded")

    sale_items_map = {item.id: item for item in sale.items}
    total_refund = 0.0
    refund_items_data = []

    for ref_item in data.items:
        sale_item = sale_items_map.get(ref_item.sale_item_id)
        if not sale_item:
            raise HTTPException(404, f"Sale item {ref_item.sale_item_id} not found in this sale")
        if ref_item.quantity_returned > float(sale_item.quantity):
            raise HTTPException(400, f"Cannot refund more than sold quantity ({float(sale_item.quantity)})")

        line_refund = round(ref_item.quantity_returned * float(sale_item.unit_price), 2)
        total_refund += line_refund
        refund_items_data.append({
            "sale_item_id": ref_item.sale_item_id,
            "product_id": sale_item.product_id,
            "quantity_returned": ref_item.quantity_returned,
            "unit_price": float(sale_item.unit_price),
            "line_refund": line_refund,
        })

    total_refund = round(total_refund, 2)

    # Generate refund number
    count = (await db.execute(select(func.count()).select_from(Refund))).scalar() or 0
    refund_number = f"RET-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:05d}"

    refund = Refund(
        refund_number=refund_number,
        sale_id=sale_id,
        user_id=current_user.id,
        reason=data.reason,
        refund_amount=total_refund,
        refund_method=data.refund_method,
        restock_items=data.restock_items,
        notes=data.notes,
        status="COMPLETED",
    )
    db.add(refund)
    await db.flush()

    for rd in refund_items_data:
        db.add(RefundItem(refund_id=refund.id, **rd))

        if data.restock_items:
            prod = (await db.execute(select(Product).where(Product.id == rd["product_id"]))).scalar_one_or_none()
            if prod:
                qty_before = float(prod.stock_quantity)
                qty_after = round(qty_before + rd["quantity_returned"], 4)
                prod.stock_quantity = qty_after
                db.add(StockMovement(
                    product_id=prod.id,
                    user_id=current_user.id,
                    movement_type="RETURN",
                    quantity=rd["quantity_returned"],
                    reference=refund_number,
                    reason=f"Return: {data.reason}",
                    quantity_before=qty_before,
                    quantity_after=qty_after,
                ))

    # Update sale status
    sale.status = "REFUNDED" if total_refund >= float(sale.total_amount) - 0.01 else "PARTIAL_REFUND"

    # Update shift
    if sale.shift_id:
        shift = (await db.execute(select(Shift).where(Shift.id == sale.shift_id))).scalar_one_or_none()
        if shift:
            shift.total_refunds = round(float(shift.total_refunds) + total_refund, 2)

    await db.commit()
    await db.refresh(refund)
    logger.info(f"Refund {refund_number} — {total_refund} {sale.currency}")
    return RefundOut.model_validate(refund)


@router.get("/{sale_id}/refunds", response_model=list[RefundOut])
async def list_sale_refunds(sale_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Refund).where(Refund.sale_id == sale_id).order_by(Refund.created_at.desc()))
    return [RefundOut.model_validate(r) for r in result.scalars().all()]
