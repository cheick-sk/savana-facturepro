"""Inter-Store Transfers endpoints — SavanaFlow."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Product, ProductVariant, StockMovement, Store, StoreTransfer, TransferItem, User
from app.schemas.schemas import Paginated, TransferCreate, TransferOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transfers", tags=["Transfers — Inter-magasins"])


def _gen_transfer_number(count: int) -> str:
    return f"TRF-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:05d}"


@router.get("", response_model=Paginated)
async def list_transfers(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    from_store_id: int | None = None, to_store_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(StoreTransfer)
    if from_store_id:
        q = q.where(StoreTransfer.from_store_id == from_store_id)
    if to_store_id:
        q = q.where(StoreTransfer.to_store_id == to_store_id)
    if status:
        q = q.where(StoreTransfer.status == status.upper())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(StoreTransfer.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[TransferOut.model_validate(t) for t in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{transfer_id}", response_model=TransferOut)
async def get_transfer(transfer_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    t = (await db.execute(select(StoreTransfer).where(StoreTransfer.id == transfer_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transfer not found")
    return TransferOut.model_validate(t)


@router.post("", response_model=TransferOut, status_code=201)
async def create_transfer(data: TransferCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.from_store_id == data.to_store_id:
        raise HTTPException(400, "Cannot transfer to the same store")

    from_store = (await db.execute(select(Store).where(Store.id == data.from_store_id))).scalar_one_or_none()
    to_store = (await db.execute(select(Store).where(Store.id == data.to_store_id))).scalar_one_or_none()
    if not from_store or not to_store:
        raise HTTPException(404, "Store not found")

    # Validate stock availability
    for item_data in data.items:
        prod = (await db.execute(select(Product).where(Product.id == item_data.product_id))).scalar_one_or_none()
        if not prod:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        target_stock = float(prod.stock_quantity)
        if item_data.variant_id:
            v = (await db.execute(select(ProductVariant).where(ProductVariant.id == item_data.variant_id))).scalar_one_or_none()
            if v:
                target_stock = float(v.stock_quantity)
        if target_stock < item_data.quantity:
            raise HTTPException(400, f"Insufficient stock for product {prod.name}: available={target_stock}, requested={item_data.quantity}")

    count = (await db.execute(select(func.count()).select_from(StoreTransfer))).scalar() or 0
    transfer = StoreTransfer(
        transfer_number=_gen_transfer_number(count),
        from_store_id=data.from_store_id,
        to_store_id=data.to_store_id,
        user_id=current_user.id,
        notes=data.notes,
        status="PENDING",
    )
    db.add(transfer)
    await db.flush()

    for item_data in data.items:
        db.add(TransferItem(
            transfer_id=transfer.id,
            product_id=item_data.product_id,
            variant_id=item_data.variant_id,
            quantity=item_data.quantity,
        ))

        # Deduct from source store immediately
        prod = (await db.execute(select(Product).where(Product.id == item_data.product_id))).scalar_one_or_none()
        if prod:
            qty_before = float(prod.stock_quantity)
            qty_after = round(qty_before - item_data.quantity, 4)
            prod.stock_quantity = qty_after
            db.add(StockMovement(
                product_id=prod.id,
                variant_id=item_data.variant_id,
                user_id=current_user.id,
                movement_type="TRANSFER",
                quantity=item_data.quantity,
                reference=transfer.transfer_number,
                reason=f"Transfer OUT → Store {data.to_store_id}",
                quantity_before=qty_before,
                quantity_after=qty_after,
            ))

    transfer.status = "IN_TRANSIT"
    transfer.shipped_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(transfer)
    return TransferOut.model_validate(transfer)


@router.post("/{transfer_id}/receive", response_model=TransferOut)
async def receive_transfer(transfer_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark a transfer as received — adds stock to destination store's products."""
    transfer = (await db.execute(select(StoreTransfer).where(StoreTransfer.id == transfer_id))).scalar_one_or_none()
    if not transfer:
        raise HTTPException(404, "Transfer not found")
    if transfer.status == "RECEIVED":
        raise HTTPException(409, "Transfer already received")
    if transfer.status == "CANCELLED":
        raise HTTPException(409, "Cannot receive a cancelled transfer")

    for item in transfer.items:
        prod = (await db.execute(select(Product).where(Product.id == item.product_id))).scalar_one_or_none()
        if prod:
            qty_before = float(prod.stock_quantity)
            qty_after = round(qty_before + float(item.quantity), 4)
            prod.stock_quantity = qty_after
            item.quantity_received = float(item.quantity)
            db.add(StockMovement(
                product_id=prod.id,
                variant_id=item.variant_id,
                user_id=current_user.id,
                movement_type="TRANSFER",
                quantity=float(item.quantity),
                reference=transfer.transfer_number,
                reason=f"Transfer IN ← Store {transfer.from_store_id}",
                quantity_before=qty_before,
                quantity_after=qty_after,
            ))

    transfer.status = "RECEIVED"
    transfer.received_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(transfer)
    return TransferOut.model_validate(transfer)


@router.delete("/{transfer_id}", status_code=204)
async def cancel_transfer(transfer_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    transfer = (await db.execute(select(StoreTransfer).where(StoreTransfer.id == transfer_id))).scalar_one_or_none()
    if not transfer:
        raise HTTPException(404, "Transfer not found")
    if transfer.status == "RECEIVED":
        raise HTTPException(409, "Cannot cancel a received transfer")

    # Restore stock to source store if already shipped
    if transfer.status == "IN_TRANSIT":
        for item in transfer.items:
            prod = (await db.execute(select(Product).where(Product.id == item.product_id))).scalar_one_or_none()
            if prod:
                qty_before = float(prod.stock_quantity)
                qty_after = round(qty_before + float(item.quantity), 4)
                prod.stock_quantity = qty_after
                db.add(StockMovement(
                    product_id=prod.id,
                    user_id=None,
                    movement_type="ADJUST",
                    quantity=float(item.quantity),
                    reference=transfer.transfer_number,
                    reason="Transfer cancelled — stock restored",
                    quantity_before=qty_before,
                    quantity_after=qty_after,
                ))

    transfer.status = "CANCELLED"
    await db.commit()
