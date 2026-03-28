"""Admin API endpoints for E-commerce — SavanaFlow."""
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.all_models import User
from app.schemas.ecommerce import (
    OnlineStoreCreate, OnlineStoreUpdate, OnlineStoreOut,
    OnlineProductCreate, OnlineProductUpdate, OnlineProductOut, OnlineProductDetailOut,
    BulkPublishRequest,
    OnlineCategoryCreate, OnlineCategoryUpdate, OnlineCategoryOut,
    OnlineOrderOut, OnlineOrderUpdate, OrderStatusUpdate,
    DeliveryZoneCreate, DeliveryZoneUpdate, DeliveryZoneOut,
    CouponCreate, CouponUpdate, CouponOut,
    EcommerceStats,
)
from app.services import ecommerce_service

router = APIRouter(prefix="/ecommerce", tags=["E-commerce Admin"])


# ── Store Management ───────────────────────────────────────────────────────

@router.post("/stores", response_model=OnlineStoreOut, status_code=status.HTTP_201_CREATED)
async def create_store(
    data: OnlineStoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new online store."""
    try:
        store = await ecommerce_service.create_online_store(db, data, current_user.id)
        return store
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/stores", response_model=list[OnlineStoreOut])
async def list_stores(
    store_id: int | None = Query(None, description="Filter by physical store ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List online stores."""
    if store_id:
        return await ecommerce_service.get_online_stores_by_store(db, store_id)
    # Return all stores for admin
    from sqlalchemy import select
    from app.models.ecommerce import OnlineStore
    result = await db.execute(select(OnlineStore))
    return list(result.scalars().all())


@router.get("/stores/{store_id}", response_model=OnlineStoreOut)
async def get_store(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get online store details."""
    store = await ecommerce_service.get_online_store(db, store_id)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")
    return store


@router.put("/stores/{store_id}", response_model=OnlineStoreOut)
async def update_store(
    store_id: int,
    data: OnlineStoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update online store."""
    try:
        store = await ecommerce_service.update_online_store(db, store_id, data)
        return store
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ── Product Management ───────────────────────────────────────────────────────

@router.post("/products", response_model=OnlineProductOut, status_code=status.HTTP_201_CREATED)
async def publish_product(
    data: OnlineProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publish a product to online store."""
    try:
        product = await ecommerce_service.publish_product(db, data, current_user.id)
        return product
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/products", response_model=dict)
async def list_products(
    online_store_id: int = Query(...),
    is_published: bool | None = Query(None),
    category_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List online products."""
    products, total = await ecommerce_service.get_online_products(
        db, online_store_id, is_published, category_id, search, page, per_page
    )
    return {
        "items": products,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/products/{product_id}", response_model=OnlineProductDetailOut)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get online product details."""
    from app.models.ecommerce import OnlineProduct
    from sqlalchemy.orm import selectinload

    product = await db.get(OnlineProduct, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    # Get original product info
    from app.models.all_models import Product
    original = await db.get(Product, product.product_id)

    result = OnlineProductDetailOut.model_validate(product)
    result.original_product = {
        "id": original.id,
        "name": original.name,
        "description": original.description,
        "price": float(original.sell_price),
        "stock_quantity": float(original.stock_quantity),
        "barcode": original.barcode,
    } if original else None

    return result


@router.put("/products/{product_id}", response_model=OnlineProductOut)
async def update_product(
    product_id: int,
    data: OnlineProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an online product."""
    try:
        product = await ecommerce_service.update_online_product(db, product_id, data)
        return product
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/products/{product_id}")
async def unpublish_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unpublish a product from online store."""
    success = await ecommerce_service.unpublish_product(db, product_id)
    if not success:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return {"message": "Product unpublished"}


@router.post("/products/bulk-publish")
async def bulk_publish_products(
    data: BulkPublishRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk publish products to online store."""
    from app.models.all_models import Product

    published = []
    errors = []

    for product_id in data.product_ids:
        try:
            product = await db.get(Product, product_id)
            if not product:
                errors.append({"product_id": product_id, "error": "Product not found"})
                continue

            online_product = await ecommerce_service.publish_product(
                db,
                OnlineProductCreate(
                    online_store_id=data.online_store_id,
                    product_id=product_id,
                ),
                current_user.id,
            )
            published.append(online_product.id)
        except ValueError as e:
            errors.append({"product_id": product_id, "error": str(e)})

    await db.commit()
    return {"published": published, "errors": errors, "total": len(published)}


@router.post("/products/sync-stock")
async def sync_stock(
    online_store_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync stock from POS to online store."""
    updated = await ecommerce_service.sync_stock_from_pos(db, online_store_id)
    await db.commit()
    return {"message": f"Synced {updated} products", "updated": updated}


# ── Category Management ───────────────────────────────────────────────────────

@router.post("/categories", response_model=OnlineCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: OnlineCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an online category."""
    try:
        category = await ecommerce_service.create_online_category(db, data)
        await db.commit()
        return category
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/categories", response_model=list[OnlineCategoryOut])
async def list_categories(
    online_store_id: int = Query(...),
    parent_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List online categories."""
    return await ecommerce_service.get_online_categories(db, online_store_id, parent_id)


@router.put("/categories/{category_id}", response_model=OnlineCategoryOut)
async def update_category(
    category_id: int,
    data: OnlineCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an online category."""
    try:
        category = await ecommerce_service.update_online_category(db, category_id, data)
        await db.commit()
        return category
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ── Order Management ───────────────────────────────────────────────────────

@router.get("/orders", response_model=dict)
async def list_orders(
    online_store_id: int = Query(...),
    status: str | None = Query(None),
    payment_status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List online orders."""
    orders, total = await ecommerce_service.get_orders(
        db, online_store_id, status, payment_status, search, page, per_page
    )
    return {
        "items": orders,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/orders/{order_id}", response_model=OnlineOrderOut)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get order details."""
    from app.models.ecommerce import OnlineOrder
    from sqlalchemy.orm import selectinload

    order = await db.execute(
        select(OnlineOrder)
        .where(OnlineOrder.id == order_id)
        .options(selectinload(OnlineOrder.items))
    )
    order = order.scalar_one_or_none()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


@router.put("/orders/{order_id}", response_model=OnlineOrderOut)
async def update_order(
    order_id: int,
    data: OnlineOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an order."""
    from app.models.ecommerce import OnlineOrder

    order = await db.get(OnlineOrder, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    await db.commit()
    await db.refresh(order)
    return order


@router.post("/orders/{order_id}/confirm")
async def confirm_order(
    order_id: int,
    data: OrderStatusUpdate = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm an order."""
    try:
        order = await ecommerce_service.update_order_status(
            db, order_id, "confirmed", data.notes if data else None
        )
        await db.commit()
        return order
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/orders/{order_id}/ship")
async def ship_order(
    order_id: int,
    data: OrderStatusUpdate = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark order as shipped."""
    try:
        order = await ecommerce_service.update_order_status(
            db, order_id, "shipped", data.notes if data else None
        )
        await db.commit()
        return order
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/orders/{order_id}/deliver")
async def deliver_order(
    order_id: int,
    data: OrderStatusUpdate = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark order as delivered."""
    try:
        order = await ecommerce_service.update_order_status(
            db, order_id, "delivered", data.notes if data else None
        )
        await db.commit()
        return order
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    data: OrderStatusUpdate = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel an order."""
    try:
        order = await ecommerce_service.update_order_status(
            db, order_id, "cancelled", data.notes if data else None
        )
        await db.commit()
        return order
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/orders/{order_id}/sync-pos")
async def sync_order_to_pos(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync order to POS as a sale."""
    try:
        sale = await ecommerce_service.sync_order_to_pos(db, order_id, current_user.id)
        await db.commit()
        return {"message": "Order synced to POS", "sale_id": sale.id}
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ── Delivery Zone Management ───────────────────────────────────────────────────────

@router.post("/delivery-zones", response_model=DeliveryZoneOut, status_code=status.HTTP_201_CREATED)
async def create_delivery_zone(
    data: DeliveryZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a delivery zone."""
    try:
        zone = await ecommerce_service.create_delivery_zone(db, data)
        await db.commit()
        return zone
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/delivery-zones", response_model=list[DeliveryZoneOut])
async def list_delivery_zones(
    online_store_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List delivery zones."""
    return await ecommerce_service.get_delivery_zones(db, online_store_id)


@router.put("/delivery-zones/{zone_id}", response_model=DeliveryZoneOut)
async def update_delivery_zone(
    zone_id: int,
    data: DeliveryZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a delivery zone."""
    try:
        zone = await ecommerce_service.update_delivery_zone(db, zone_id, data)
        await db.commit()
        return zone
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ── Coupon Management ───────────────────────────────────────────────────────

@router.post("/coupons", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    data: CouponCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a coupon."""
    try:
        coupon = await ecommerce_service.create_coupon(db, data)
        await db.commit()
        return coupon
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/coupons", response_model=list[CouponOut])
async def list_coupons(
    online_store_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List coupons."""
    return await ecommerce_service.get_coupons(db, online_store_id)


@router.put("/coupons/{coupon_id}", response_model=CouponOut)
async def update_coupon(
    coupon_id: int,
    data: CouponUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a coupon."""
    try:
        coupon = await ecommerce_service.update_coupon(db, coupon_id, data)
        await db.commit()
        return coupon
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ── Statistics ───────────────────────────────────────────────────────

@router.get("/stats", response_model=EcommerceStats)
async def get_stats(
    online_store_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get e-commerce statistics."""
    return await ecommerce_service.get_ecommerce_stats(db, online_store_id)


# Need to import select for the list_stores endpoint
from sqlalchemy import select
from app.models.ecommerce import OnlineStore
