"""Inter-store transfers endpoints — SavanaFlow."""
from __future__ import annotations
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import (
    Product, ProductVariant, Store, StockMovement, StoreTransfer, TransferItem, User,
)
from app.schemas.schemas import Paginated, TransferCreate, TransferOut

router = APIRouter(prefix="/transfers", tags=["Transfers — Inter-magasins"])


def _gen_transfer_number() -> str:
    return f"TRF-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


@router.get("", response_model=Paginated)
async def list_transfers(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None, status: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(StoreTransfer)
    if store_id:
        q = q.where((StoreTransfer.from_store_id == store_id) | (StoreTransfer.to_store_id == store_id))
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
async def create_transfer(
    data: TransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.from_store_id == data.to_store_id:
        raise HTTPException(400, "Source and destination stores must be different")

    from_store = (await db.execute(select(Store).where(Store.id == data.from_store_id))).scalar_one_or_none()
    to_store = (await db.execute(select(Store).where(Store.id == data.to_store_id))).scalar_one_or_none()
    if not from_store or not to_store:
        raise HTTPException(404, "One or both stores not found")

    # Validate stock availability
    for item_data in data.items:
        p = (await db.execute(select(Product).where(Product.id == item_data.product_id))).scalar_one_or_none()
        if not p:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        if p.store_id != data.from_store_id:
            raise HTTPException(400, f"Product {p.name} does not belong to source store")
        if float(p.stock_quantity) < item_data.quantity:
            raise HTTPException(400, f"Insufficient stock for {p.name}: {float(p.stock_quantity)} available")

    transfer = StoreTransfer(
        transfer_number=_gen_transfer_number(),
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

    await db.commit()
    await db.refresh(transfer)
    return TransferOut.model_validate(transfer)


@router.post("/{transfer_id}/ship", response_model=TransferOut)
async def ship_transfer(
    transfer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark transfer as shipped — deducts stock from source store."""
    t = (await db.execute(select(StoreTransfer).where(StoreTransfer.id == transfer_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transfer not found")
    if t.status != "PENDING":
        raise HTTPException(409, f"Cannot ship transfer in status {t.status}")

    for item in t.items:
        p = (await db.execute(select(Product).where(Product.id == item.product_id))).scalar_one_or_none()
        if not p:
            continue
        qty_before = float(p.stock_quantity)
        if qty_before < float(item.quantity):
            raise HTTPException(400, f"Insufficient stock for {p.name}")
        qty_after = round(qty_before - float(item.quantity), 4)
        p.stock_quantity = qty_after
        db.add(StockMovement(
            product_id=p.id,
            variant_id=item.variant_id,
            user_id=current_user.id,
            movement_type="TRANSFER",
            quantity=float(item.quantity),
            reference=t.transfer_number,
            reason=f"Transfer OUT → store {t.to_store_id}",
            quantity_before=qty_before,
            quantity_after=qty_after,
        ))

    t.status = "IN_TRANSIT"
    t.shipped_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(t)
    return TransferOut.model_validate(t)


@router.post("/{transfer_id}/receive", response_model=TransferOut)
async def receive_transfer(
    transfer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark transfer as received — adds stock to destination store."""
    t = (await db.execute(select(StoreTransfer).where(StoreTransfer.id == transfer_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transfer not found")
    if t.status not in ("IN_TRANSIT", "PENDING"):
        raise HTTPException(409, f"Cannot receive transfer in status {t.status}")

    for item in t.items:
        # Find/create product in destination store or update its stock
        p = (await db.execute(select(Product).where(Product.id == item.product_id))).scalar_one_or_none()
        if not p:
            continue
        qty_before = float(p.stock_quantity)
        qty_after = round(qty_before + float(item.quantity), 4)
        p.stock_quantity = qty_after
        item.quantity_received = float(item.quantity)
        db.add(StockMovement(
            product_id=p.id,
            variant_id=item.variant_id,
            user_id=current_user.id,
            movement_type="TRANSFER",
            quantity=float(item.quantity),
            reference=t.transfer_number,
            reason=f"Transfer IN ← store {t.from_store_id}",
            quantity_before=qty_before,
            quantity_after=qty_after,
        ))

    t.status = "RECEIVED"
    t.received_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(t)
    return TransferOut.model_validate(t)


@router.put("/{transfer_id}/cancel", response_model=TransferOut)
async def cancel_transfer(transfer_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    t = (await db.execute(select(StoreTransfer).where(StoreTransfer.id == transfer_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transfer not found")
    if t.status in ("RECEIVED", "CANCELLED"):
        raise HTTPException(409, f"Cannot cancel transfer in status {t.status}")
    t.status = "CANCELLED"
    await db.commit()
    await db.refresh(t)
    return TransferOut.model_validate(t)
