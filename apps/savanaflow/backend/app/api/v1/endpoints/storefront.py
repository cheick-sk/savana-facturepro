"""Public Storefront API endpoints — SavanaFlow."""
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Cookie, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.ecommerce import (
    OnlineStore, OnlineProduct, OnlineCategory, OnlineCustomer,
    Cart, CartItem, OnlineOrder, DeliveryZone, Coupon,
)
from app.schemas.ecommerce import (
    StorefrontInfo, StorefrontProductOut, StorefrontProductDetail,
    StorefrontCategoryOut,
    CartItemCreate, CartItemUpdate, CartOut, ApplyCouponRequest,
    OnlineOrderCreate, OnlineOrderOut,
    CustomerRegister, CustomerLogin, CustomerTokenResponse, OnlineCustomerOut,
    CustomerAddress,
    SearchParams,
)
from app.services import ecommerce_service

router = APIRouter(prefix="/store", tags=["Storefront"])


# Helper to get or create session ID
def get_session_id(request: Request, session_id: str | None = Cookie(None)) -> str:
    """Get or create a session ID for guest carts."""
    if session_id:
        return session_id
    import secrets
    return secrets.token_urlsafe(16)


# ── Store Info ───────────────────────────────────────────────────────

@router.get("/{store_slug}", response_model=StorefrontInfo)
async def get_store_info(
    store_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get public store information."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    return StorefrontInfo(
        name=store.name,
        slug=store.slug,
        logo_url=store.logo_url,
        banner_url=store.banner_url,
        primary_color=store.primary_color,
        secondary_color=store.secondary_color,
        contact_email=store.contact_email,
        contact_phone=store.contact_phone,
        address=store.address,
        facebook_url=store.facebook_url,
        instagram_url=store.instagram_url,
        whatsapp_number=store.whatsapp_number,
        currency=store.currency,
        language=store.language,
        delivery_enabled=store.delivery_enabled,
        pickup_enabled=store.pickup_enabled,
        guest_checkout=store.guest_checkout,
        cinetpay_enabled=store.cinetpay_enabled,
        paystack_enabled=store.paystack_enabled,
        mpesa_enabled=store.mpesa_enabled,
        cash_on_delivery=store.cash_on_delivery,
        meta_title=store.meta_title,
        meta_description=store.meta_description,
    )


# ── Products ───────────────────────────────────────────────────────

@router.get("/{store_slug}/products", response_model=dict)
async def list_products(
    store_slug: str,
    query: str | None = Query(None),
    category_id: int | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    in_stock_only: bool = Query(False),
    on_sale_only: bool = Query(False),
    sort_by: str = Query("newest"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List products in storefront."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    # Build query
    q = select(OnlineProduct).where(
        OnlineProduct.online_store_id == store.id,
        OnlineProduct.is_published == True,
    )

    # Apply filters
    if category_id:
        q = q.where(OnlineProduct.online_category_id == category_id)
    if in_stock_only:
        q = q.where(OnlineProduct.stock_quantity > 0)
    if on_sale_only:
        q = q.where(OnlineProduct.is_on_sale == True)

    # Search
    if query:
        q = q.where(
            or_(
                OnlineProduct.online_name.ilike(f"%{query}%"),
                OnlineProduct.online_description.ilike(f"%{query}%"),
            )
        )

    # Count
    from sqlalchemy import func
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Sort
    if sort_by == "price_asc":
        q = q.order_by(OnlineProduct.online_price.asc())
    elif sort_by == "price_desc":
        q = q.order_by(OnlineProduct.online_price.desc())
    elif sort_by == "popular":
        q = q.order_by(OnlineProduct.purchase_count.desc())
    else:  # newest
        q = q.order_by(OnlineProduct.published_at.desc())

    # Paginate
    q = q.offset((page - 1) * per_page).limit(per_page)
    q = q.options(selectinload(OnlineProduct.online_category))

    result = await db.execute(q)
    products = list(result.scalars().all())

    # Format output
    items = []
    for p in products:
        price = float(p.online_price or p.product.sell_price if p.product else 0)
        items.append(StorefrontProductOut(
            id=p.id,
            name=p.online_name or (p.product.name if p.product else "Unknown"),
            description=p.online_description or (p.product.description if p.product else None),
            price=price,
            sale_price=float(p.sale_price) if p.is_on_sale and p.sale_price else None,
            main_image_url=p.main_image_url,
            images=p.images or [],
            slug=p.slug,
            category_name=p.online_category.name if p.online_category else None,
            is_featured=p.is_featured,
            is_new=p.is_new,
            is_on_sale=p.is_on_sale,
            stock_quantity=float(p.stock_quantity),
            is_available=float(p.stock_quantity) > 0,
        ))

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/{store_slug}/products/{slug}", response_model=StorefrontProductDetail)
async def get_product_detail(
    store_slug: str,
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get product details."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    result = await db.execute(
        select(OnlineProduct).where(
            OnlineProduct.online_store_id == store.id,
            OnlineProduct.slug == slug,
            OnlineProduct.is_published == True,
        ).options(selectinload(OnlineProduct.online_category))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    # Increment view count
    product.view_count = (product.view_count or 0) + 1
    await db.flush()

    # Get related products
    related_result = await db.execute(
        select(OnlineProduct).where(
            OnlineProduct.online_store_id == store.id,
            OnlineProduct.online_category_id == product.online_category_id,
            OnlineProduct.id != product.id,
            OnlineProduct.is_published == True,
        ).limit(4)
    )
    related = related_result.scalars().all()

    price = float(product.online_price or product.product.sell_price if product.product else 0)

    return StorefrontProductDetail(
        id=product.id,
        name=product.online_name or (product.product.name if product.product else "Unknown"),
        description=product.online_description or (product.product.description if product.product else None),
        price=price,
        sale_price=float(product.sale_price) if product.is_on_sale and product.sale_price else None,
        main_image_url=product.main_image_url,
        images=product.images or [],
        slug=product.slug,
        category_name=product.online_category.name if product.online_category else None,
        is_featured=product.is_featured,
        is_new=product.is_new,
        is_on_sale=product.is_on_sale,
        stock_quantity=float(product.stock_quantity),
        is_available=float(product.stock_quantity) > 0,
        tags=product.tags or [],
        related_products=[
            StorefrontProductOut(
                id=r.id,
                name=r.online_name or (r.product.name if r.product else "Unknown"),
                description=r.online_description or (r.product.description if r.product else None),
                price=float(r.online_price or r.product.sell_price if r.product else 0),
                sale_price=float(r.sale_price) if r.is_on_sale and r.sale_price else None,
                main_image_url=r.main_image_url,
                images=r.images or [],
                slug=r.slug,
                category_name=None,
                is_featured=r.is_featured,
                is_new=r.is_new,
                is_on_sale=r.is_on_sale,
                stock_quantity=float(r.stock_quantity),
                is_available=float(r.stock_quantity) > 0,
            ) for r in related
        ],
    )


# ── Categories ───────────────────────────────────────────────────────

@router.get("/{store_slug}/categories", response_model=list[StorefrontCategoryOut])
async def list_categories(
    store_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """List store categories."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    categories = await ecommerce_service.get_online_categories(db, store.id)

    # Get product counts
    result = []
    for cat in categories:
        count_result = await db.execute(
            select(CartItem).where(  # Actually count OnlineProduct
                OnlineProduct.online_category_id == cat.id,
                OnlineProduct.is_published == True,
            )
        )
        from sqlalchemy import func
        count_q = select(func.count()).select_from(
            select(OnlineProduct).where(
                OnlineProduct.online_category_id == cat.id,
                OnlineProduct.is_published == True,
            ).subquery()
        )
        product_count = (await db.execute(count_q)).scalar() or 0

        result.append(StorefrontCategoryOut(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            description=cat.description,
            image_url=cat.image_url,
            product_count=product_count,
        ))

    return result


# ── Search ───────────────────────────────────────────────────────

@router.get("/{store_slug}/search", response_model=dict)
async def search_products(
    store_slug: str,
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search products."""
    # Reuse list_products with query
    return await list_products(
        store_slug=store_slug,
        query=q,
        page=page,
        per_page=per_page,
        db=db,
    )


# ── Cart ───────────────────────────────────────────────────────

@router.get("/{store_slug}/cart", response_model=CartOut)
async def get_cart(
    store_slug: str,
    request: Request,
    response: Response,
    session_id: str | None = Cookie(None),
    customer_id: int | None = None,  # From auth header if logged in
    db: AsyncSession = Depends(get_db),
):
    """Get current cart."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    # Get or create session ID
    if not session_id:
        import secrets
        session_id = secrets.token_urlsafe(16)
        response.set_cookie(key="session_id", value=session_id, httponly=True, max_age=60*60*24*7)

    cart = await ecommerce_service.get_or_create_cart(
        db, store.id, session_id=session_id, customer_id=customer_id
    )
    await db.commit()

    return await _format_cart(db, cart)


@router.post("/{store_slug}/cart/items", response_model=CartOut)
async def add_to_cart(
    store_slug: str,
    data: CartItemCreate,
    request: Request,
    response: Response,
    session_id: str | None = Cookie(None),
    customer_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Add item to cart."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    if not session_id:
        import secrets
        session_id = secrets.token_urlsafe(16)
        response.set_cookie(key="session_id", value=session_id, httponly=True, max_age=60*60*24*7)

    cart = await ecommerce_service.get_or_create_cart(
        db, store.id, session_id=session_id, customer_id=customer_id
    )

    try:
        await ecommerce_service.add_to_cart(db, cart.id, data.online_product_id, data.quantity)
        await db.commit()
        return await _format_cart(db, cart)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.put("/{store_slug}/cart/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    store_slug: str,
    item_id: int,
    data: CartItemUpdate,
    session_id: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Update cart item quantity."""
    try:
        await ecommerce_service.update_cart_item(db, item_id, data.quantity)
        await db.commit()
        # Get the cart
        item = await db.get(CartItem, item_id)
        cart = await db.get(Cart, item.cart_id)
        return await _format_cart(db, cart)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/{store_slug}/cart/items/{item_id}")
async def remove_cart_item(
    store_slug: str,
    item_id: int,
    session_id: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Remove item from cart."""
    success = await ecommerce_service.remove_cart_item(db, item_id)
    await db.commit()
    if not success:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return {"message": "Item removed"}


@router.post("/{store_slug}/cart/coupon")
async def apply_coupon(
    store_slug: str,
    data: ApplyCouponRequest,
    session_id: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Apply coupon to cart."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    cart = await ecommerce_service.get_or_create_cart(db, store.id, session_id=session_id)

    try:
        coupon = await ecommerce_service.apply_coupon_to_cart(db, cart.id, data.coupon_code)
        await db.commit()
        return {
            "message": "Coupon applied",
            "discount_amount": float(cart.discount_amount),
            "coupon": {
                "code": coupon.code,
                "discount_type": coupon.discount_type,
                "discount_value": float(coupon.discount_value),
            }
        }
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


async def _format_cart(db: AsyncSession, cart: Cart) -> CartOut:
    """Format cart for output with product details."""
    result = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.id)
        .options(selectinload(CartItem.online_product))
    )
    items = result.scalars().all()

    formatted_items = []
    for item in items:
        product = item.online_product
        formatted_items.append({
            "id": item.id,
            "online_product_id": item.online_product_id,
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "total": float(item.total),
            "product_name": product.online_name if product else None,
            "product_image": product.main_image_url if product else None,
        })

    return CartOut(
        id=cart.id,
        customer_id=cart.customer_id,
        session_id=cart.session_id,
        items=formatted_items,
        subtotal=float(cart.subtotal),
        tax_amount=float(cart.tax_amount),
        shipping_fee=float(cart.shipping_fee),
        discount_amount=float(cart.discount_amount),
        total=float(cart.total),
        coupon_code=cart.coupon_code,
        expires_at=cart.expires_at,
        created_at=cart.created_at,
    )


# ── Customer Auth ───────────────────────────────────────────────────────

@router.post("/{store_slug}/customer/register", response_model=OnlineCustomerOut)
async def register_customer(
    store_slug: str,
    data: CustomerRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a new customer."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    try:
        customer = await ecommerce_service.register_customer(db, data, store.id)
        await db.commit()
        return customer
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/{store_slug}/customer/login", response_model=CustomerTokenResponse)
async def login_customer(
    store_slug: str,
    data: CustomerLogin,
    db: AsyncSession = Depends(get_db),
):
    """Login as customer."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    customer = await ecommerce_service.authenticate_customer(
        db, data.email, data.password, store.id
    )
    if not customer:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    # Generate tokens
    from app.core.security import create_access_token, create_refresh_token
    access_token = create_access_token({"sub": str(customer.id), "type": "customer"})
    refresh_token = create_refresh_token({"sub": str(customer.id), "type": "customer"})

    await db.commit()

    return CustomerTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        customer=OnlineCustomerOut.model_validate(customer),
    )


@router.get("/{store_slug}/customer/profile", response_model=OnlineCustomerOut)
async def get_customer_profile(
    store_slug: str,
    customer_id: int = Query(...),  # Would normally come from JWT
    db: AsyncSession = Depends(get_db),
):
    """Get customer profile."""
    customer = await db.get(OnlineCustomer, customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    return customer


@router.get("/{store_slug}/customer/orders", response_model=list[OnlineOrderOut])
async def get_customer_orders(
    store_slug: str,
    customer_id: int = Query(...),  # Would normally come from JWT
    db: AsyncSession = Depends(get_db),
):
    """Get customer orders."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    result = await db.execute(
        select(OnlineOrder).where(
            OnlineOrder.customer_id == customer_id,
            OnlineOrder.online_store_id == store.id,
        ).order_by(OnlineOrder.created_at.desc())
        .options(selectinload(OnlineOrder.items))
    )
    return list(result.scalars().all())


# ── Checkout ───────────────────────────────────────────────────────

@router.post("/{store_slug}/checkout", response_model=OnlineOrderOut)
async def checkout(
    store_slug: str,
    data: OnlineOrderCreate,
    request: Request,
    response: Response,
    session_id: str | None = Cookie(None),
    customer_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Create an order from cart."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    # Get cart
    if not session_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No cart found")

    cart = await ecommerce_service.get_or_create_cart(db, store.id, session_id=session_id, customer_id=customer_id)

    try:
        order = await ecommerce_service.create_order(db, cart.id, data, store.id)
        await db.commit()

        # Clear session cookie
        response.delete_cookie("session_id")

        return order
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/{store_slug}/order/{order_number}", response_model=OnlineOrderOut)
async def get_order_status(
    store_slug: str,
    order_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Get order status by order number."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    result = await db.execute(
        select(OnlineOrder).where(
            OnlineOrder.order_number == order_number,
            OnlineOrder.online_store_id == store.id,
        ).options(selectinload(OnlineOrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    return order


@router.post("/{store_slug}/order/{order_number}/pay")
async def pay_order(
    store_slug: str,
    order_number: str,
    payment_method: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Pay for an existing order."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    result = await db.execute(
        select(OnlineOrder).where(
            OnlineOrder.order_number == order_number,
            OnlineOrder.online_store_id == store.id,
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    if order.payment_status == "paid":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order already paid")

    # Here you would integrate with payment providers
    # For now, just mark as paid for cash/CoD
    if payment_method in ["cash", "cash_on_delivery"]:
        order.payment_method = payment_method
        order.payment_status = "pending" if payment_method == "cash_on_delivery" else "paid"
        if payment_method == "cash":
            order.paid_at = datetime.now(timezone.utc)
        await db.commit()
        return {"message": "Payment recorded", "status": order.payment_status}

    # For other payment methods, return payment URL
    # This would be implemented with actual payment provider integration
    return {
        "message": "Payment initialization required",
        "payment_url": f"/store/{store_slug}/payment/{order.id}",
        "order_id": order.id,
    }


# ── Delivery Zones ───────────────────────────────────────────────────────

@router.get("/{store_slug}/delivery-zones", response_model=list[dict])
async def list_delivery_zones_public(
    store_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get delivery zones for checkout."""
    store = await ecommerce_service.get_online_store_by_slug(db, store_slug)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Store not found")

    zones = await ecommerce_service.get_delivery_zones(db, store.id)
    return [
        {
            "id": z.id,
            "name": z.name,
            "description": z.description,
            "areas": z.areas,
            "base_fee": float(z.base_fee),
            "free_delivery_minimum": float(z.free_delivery_minimum) if z.free_delivery_minimum else None,
            "estimated_delivery_hours": z.estimated_delivery_hours,
        }
        for z in zones
    ]


# Need datetime import
from datetime import datetime, timezone
