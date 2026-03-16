"""Purchase Orders endpoints — SavanaFlow."""
from __future__ import annotations
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Product, ProductVariant, PurchaseOrder, PurchaseOrderItem, StockMovement, Supplier, User
from app.schemas.schemas import Paginated, POCreate, POOut, POReceive

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


def _gen_po_number() -> str:
    return f"BC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"


@router.get("", response_model=Paginated)
async def list_pos(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None, supplier_id: int | None = None, status: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(PurchaseOrder)
    if store_id:
        q = q.where(PurchaseOrder.store_id == store_id)
    if supplier_id:
        q = q.where(PurchaseOrder.supplier_id == supplier_id)
    if status:
        q = q.where(PurchaseOrder.status == status.upper())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[POOut.model_validate(p) for p in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{po_id}", response_model=POOut)
async def get_po(po_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Purchase order not found")
    return POOut.model_validate(p)


@router.post("", response_model=POOut, status_code=201)
async def create_po(
    data: POCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sup = (await db.execute(select(Supplier).where(Supplier.id == data.supplier_id))).scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Supplier not found")

    total = sum(round(it.quantity * it.unit_cost, 2) for it in data.items)
    po = PurchaseOrder(
        po_number=_gen_po_number(),
        store_id=data.store_id,
        supplier_id=data.supplier_id,
        user_id=current_user.id,
        expected_date=data.expected_date,
        currency=data.currency,
        notes=data.notes,
        total_amount=round(total, 2),
    )
    db.add(po)
    await db.flush()

    for it in data.items:
        db.add(PurchaseOrderItem(
            po_id=po.id,
            product_id=it.product_id,
            variant_id=it.variant_id,
            quantity=it.quantity,
            unit_cost=it.unit_cost,
            line_total=round(it.quantity * it.unit_cost, 2),
        ))

    await db.commit()
    await db.refresh(po)
    return POOut.model_validate(po)


@router.post("/{po_id}/receive", response_model=POOut)
async def receive_po(
    po_id: int, data: POReceive,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status == "CANCELLED":
        raise HTTPException(409, "PO is cancelled")

    item_map = {it.id: it for it in po.items}
    for ri in data.items:
        po_item = item_map.get(ri.item_id)
        if not po_item:
            raise HTTPException(404, f"PO item {ri.item_id} not found")
        po_item.quantity_received = round(float(po_item.quantity_received) + ri.quantity_received, 4)

        prod = (await db.execute(select(Product).where(Product.id == po_item.product_id))).scalar_one_or_none()
        if prod:
            qty_before = float(prod.stock_quantity)
            qty_after = round(qty_before + ri.quantity_received, 4)
            prod.stock_quantity = qty_after
            prod.cost_price = po_item.unit_cost  # update cost price
            db.add(StockMovement(
                product_id=prod.id,
                variant_id=po_item.variant_id,
                user_id=current_user.id,
                movement_type="IN",
                quantity=ri.quantity_received,
                reference=po.po_number,
                reason=f"Purchase order receipt",
                quantity_before=qty_before,
                quantity_after=qty_after,
            ))
        if po_item.variant_id:
            v = (await db.execute(select(ProductVariant).where(ProductVariant.id == po_item.variant_id))).scalar_one_or_none()
            if v:
                v.stock_quantity = round(float(v.stock_quantity) + ri.quantity_received, 4)
                if po_item.unit_cost:
                    v.cost_price = po_item.unit_cost

    all_received = all(float(it.quantity_received) >= float(it.quantity) for it in po.items)
    any_received = any(float(it.quantity_received) > 0 for it in po.items)
    po.status = "RECEIVED" if all_received else ("PARTIAL" if any_received else po.status)
    po.received_date = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(po)
    return POOut.model_validate(po)


@router.put("/{po_id}/cancel", status_code=204)
async def cancel_po(po_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po.status == "RECEIVED":
        raise HTTPException(409, "Cannot cancel a received PO")
    po.status = "CANCELLED"
    await db.commit()
