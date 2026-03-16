"""Purchase Orders (Bons de commande) endpoints — FacturePro Africa."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import PurchaseOrder, PurchaseOrderItem, Supplier, User
from app.schemas.schemas import Paginated, POCreate, POOut, POReceive, POUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders — Bons de commande"])


def _next_po_number(count: int) -> str:
    return f"BC-{datetime.now(timezone.utc).year}-{count + 1:05d}"


def _calc_po_totals(items):
    subtotal, tax_total = 0.0, 0.0
    for it in items:
        base = round(it.quantity * it.unit_price, 2)
        tax = round(base * it.tax_rate / 100, 2)
        subtotal += base
        tax_total += tax
    return round(subtotal, 2), round(tax_total, 2), round(subtotal + tax_total, 2)


@router.get("", response_model=Paginated)
async def list_pos(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    supplier_id: int | None = None, status: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(PurchaseOrder)
    if supplier_id:
        q = q.where(PurchaseOrder.supplier_id == supplier_id)
    if status:
        q = q.where(PurchaseOrder.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[POOut.model_validate(po) for po in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{po_id}", response_model=POOut)
async def get_po(po_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    return POOut.model_validate(po)


@router.post("", response_model=POOut, status_code=201)
async def create_po(data: POCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    sup = (await db.execute(select(Supplier).where(Supplier.id == data.supplier_id))).scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Supplier not found")

    count = (await db.execute(select(func.count()).select_from(PurchaseOrder))).scalar() or 0
    subtotal, tax_total, total = _calc_po_totals(data.items)

    po = PurchaseOrder(
        po_number=_next_po_number(count),
        supplier_id=data.supplier_id,
        created_by=current_user.id,
        expected_date=data.expected_date,
        currency=data.currency,
        notes=data.notes,
        subtotal=subtotal,
        tax_amount=tax_total,
        total_amount=total,
    )
    db.add(po)
    await db.flush()

    for it in data.items:
        base = round(it.quantity * it.unit_price, 2)
        tax = round(base * it.tax_rate / 100, 2)
        db.add(PurchaseOrderItem(
            po_id=po.id,
            product_id=it.product_id,
            description=it.description,
            quantity=it.quantity,
            unit_price=it.unit_price,
            tax_rate=it.tax_rate,
            line_total=round(base + tax, 2),
        ))

    await db.commit()
    await db.refresh(po)
    return POOut.model_validate(po)


@router.put("/{po_id}", response_model=POOut)
async def update_po(po_id: int, data: POUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status in ("RECEIVED", "CANCELLED"):
        raise HTTPException(409, f"Cannot update PO in status {po.status}")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(po, k, v)
    await db.commit()
    await db.refresh(po)
    return POOut.model_validate(po)


@router.post("/{po_id}/receive", response_model=POOut)
async def receive_po(po_id: int, data: POReceive, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Mark items as received. Updates product stock if product_id is linked."""
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status == "CANCELLED":
        raise HTTPException(409, "PO is cancelled")

    item_map = {item.id: item for item in po.items}

    for receive_item in data.items:
        item = item_map.get(receive_item.item_id)
        if not item:
            raise HTTPException(404, f"PO item {receive_item.item_id} not found")
        item.quantity_received = round(float(item.quantity_received) + receive_item.quantity_received, 2)

    # Determine new status
    all_received = all(float(it.quantity_received) >= float(it.quantity) for it in po.items)
    any_received = any(float(it.quantity_received) > 0 for it in po.items)
    po.status = "RECEIVED" if all_received else ("PARTIAL" if any_received else po.status)
    po.received_date = data.received_date or datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(po)
    return POOut.model_validate(po)


@router.delete("/{po_id}", status_code=204)
async def cancel_po(po_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status == "RECEIVED":
        raise HTTPException(409, "Cannot cancel a received purchase order")
    po.status = "CANCELLED"
    await db.commit()
