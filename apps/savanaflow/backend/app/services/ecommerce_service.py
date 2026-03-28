"""E-commerce service layer — SavanaFlow."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ecommerce import (
    OnlineStore, OnlineProduct, OnlineCategory, OnlineCustomer,
    Cart, CartItem, OnlineOrder, OnlineOrderItem, DeliveryZone, Coupon,
)
from app.models.all_models import (
    Store, Product, ProductVariant, POSCustomer, Sale, SaleItem,
    StockMovement,
)
from app.core.security import get_password_hash, verify_password

logger = logging.getLogger(__name__)


# ── Store Management ───────────────────────────────────────────────────────

async def create_online_store(
    db: AsyncSession, data, user_id: int
) -> OnlineStore:
    """Create a new online store for a physical store."""
    # Check if slug already exists
    existing = await db.execute(
        select(OnlineStore).where(OnlineStore.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Store slug '{data.slug}' already exists")

    # Verify physical store exists
    store = await db.get(Store, data.store_id)
    if not store:
        raise ValueError(f"Store {data.store_id} not found")

    online_store = OnlineStore(
        store_id=data.store_id,
        name=data.name,
        slug=data.slug,
        custom_domain=data.custom_domain,
        logo_url=data.logo_url,
        banner_url=data.banner_url,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        address=data.address,
        facebook_url=data.facebook_url,
        instagram_url=data.instagram_url,
        whatsapp_number=data.whatsapp_number,
        currency=data.currency,
        language=data.language,
        timezone=data.timezone,
        delivery_enabled=data.delivery_enabled,
        pickup_enabled=data.pickup_enabled,
        guest_checkout=data.guest_checkout,
        cinetpay_enabled=data.cinetpay_enabled,
        cinetpay_site_id=data.cinetpay_site_id,
        cinetpay_api_key=data.cinetpay_api_key,
        paystack_enabled=data.paystack_enabled,
        paystack_public_key=data.paystack_public_key,
        paystack_secret_key=data.paystack_secret_key,
        mpesa_enabled=data.mpesa_enabled,
        mpesa_shortcode=data.mpesa_shortcode,
        cash_on_delivery=data.cash_on_delivery,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
    )
    db.add(online_store)
    await db.flush()
    await db.refresh(online_store)
    logger.info(f"Online store '{data.name}' created for store {data.store_id}")
    return online_store


async def get_online_store(db: AsyncSession, store_id: int) -> OnlineStore | None:
    """Get online store by ID."""
    return await db.get(OnlineStore, store_id)


async def get_online_store_by_slug(db: AsyncSession, slug: str) -> OnlineStore | None:
    """Get online store by slug."""
    result = await db.execute(
        select(OnlineStore).where(OnlineStore.slug == slug, OnlineStore.is_active == True)
    )
    return result.scalar_one_or_none()


async def get_online_stores_by_store(db: AsyncSession, store_id: int) -> list[OnlineStore]:
    """Get all online stores for a physical store."""
    result = await db.execute(
        select(OnlineStore).where(OnlineStore.store_id == store_id)
    )
    return list(result.scalars().all())


async def update_online_store(db: AsyncSession, store_id: int, data) -> OnlineStore:
    """Update online store."""
    online_store = await db.get(OnlineStore, store_id)
    if not online_store:
        raise ValueError(f"Online store {store_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(online_store, key, value)

    await db.flush()
    await db.refresh(online_store)
    return online_store


# ── Product Publishing ───────────────────────────────────────────────────────

async def publish_product(
    db: AsyncSession, data, user_id: int
) -> OnlineProduct:
    """Publish a product to an online store."""
    # Verify online store exists
    online_store = await db.get(OnlineStore, data.online_store_id)
    if not online_store:
        raise ValueError(f"Online store {data.online_store_id} not found")

    # Verify product exists
    product = await db.get(Product, data.product_id)
    if not product:
        raise ValueError(f"Product {data.product_id} not found")

    # Check if already published
    existing = await db.execute(
        select(OnlineProduct).where(
            OnlineProduct.online_store_id == data.online_store_id,
            OnlineProduct.product_id == data.product_id,
            OnlineProduct.variant_id == data.variant_id,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Product already published to this store")

    # Create slug if not provided
    slug = data.slug or product.name.lower().replace(" ", "-").replace("/", "-")

    online_product = OnlineProduct(
        store_id=online_store.store_id,
        online_store_id=data.online_store_id,
        product_id=data.product_id,
        variant_id=data.variant_id,
        online_name=data.online_name,
        online_description=data.online_description,
        online_price=data.online_price,
        images=data.images,
        main_image_url=data.main_image_url,
        online_category_id=data.online_category_id,
        tags=data.tags,
        slug=slug,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
        sync_stock=data.sync_stock,
        stock_quantity=data.stock_quantity if not data.sync_stock else product.stock_quantity,
        low_stock_threshold=data.low_stock_threshold,
        is_featured=data.is_featured,
        is_new=data.is_new,
        is_on_sale=data.is_on_sale,
        sale_price=data.sale_price,
        is_published=True,
        published_at=datetime.now(timezone.utc),
    )
    db.add(online_product)
    await db.flush()
    await db.refresh(online_product)
    logger.info(f"Product {data.product_id} published to store {data.online_store_id}")
    return online_product


async def update_online_product(
    db: AsyncSession, product_id: int, data
) -> OnlineProduct:
    """Update an online product."""
    online_product = await db.get(OnlineProduct, product_id)
    if not online_product:
        raise ValueError(f"Online product {product_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(online_product, key, value)

    # Set published_at if being published for the first time
    if data.is_published and not online_product.published_at:
        online_product.published_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(online_product)
    return online_product


async def unpublish_product(db: AsyncSession, product_id: int) -> bool:
    """Unpublish (delete) a product from online store."""
    online_product = await db.get(OnlineProduct, product_id)
    if not online_product:
        return False

    await db.delete(online_product)
    await db.flush()
    logger.info(f"Online product {product_id} unpublished")
    return True


async def get_online_products(
    db: AsyncSession,
    online_store_id: int,
    is_published: bool | None = None,
    category_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[OnlineProduct], int]:
    """Get online products with filters."""
    query = select(OnlineProduct).where(OnlineProduct.online_store_id == online_store_id)

    if is_published is not None:
        query = query.where(OnlineProduct.is_published == is_published)
    if category_id:
        query = query.where(OnlineProduct.online_category_id == category_id)
    if search:
        query = query.where(
            or_(
                OnlineProduct.online_name.ilike(f"%{search}%"),
                OnlineProduct.product_id.in_(
                    select(Product.id).where(Product.name.ilike(f"%{search}%"))
                ),
            )
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(OnlineProduct.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    query = query.options(selectinload(OnlineProduct.product))

    result = await db.execute(query)
    products = list(result.scalars().all())
    return products, total


async def sync_stock_from_pos(db: AsyncSession, online_store_id: int) -> int:
    """Sync stock quantities from POS products."""
    result = await db.execute(
        select(OnlineProduct).where(
            OnlineProduct.online_store_id == online_store_id,
            OnlineProduct.sync_stock == True,
        )
    )
    online_products = list(result.scalars().all())

    updated = 0
    for op in online_products:
        product = await db.get(Product, op.product_id)
        if product:
            op.stock_quantity = product.stock_quantity
            updated += 1

    await db.flush()
    logger.info(f"Synced stock for {updated} products in store {online_store_id}")
    return updated


# ── Category Management ───────────────────────────────────────────────────────

async def create_online_category(db: AsyncSession, data) -> OnlineCategory:
    """Create an online store category."""
    online_store = await db.get(OnlineStore, data.online_store_id)
    if not online_store:
        raise ValueError(f"Online store {data.online_store_id} not found")

    # Check slug uniqueness
    existing = await db.execute(
        select(OnlineCategory).where(
            OnlineCategory.online_store_id == data.online_store_id,
            OnlineCategory.slug == data.slug,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Category slug '{data.slug}' already exists")

    category = OnlineCategory(
        store_id=online_store.store_id,
        online_store_id=data.online_store_id,
        name=data.name,
        slug=data.slug,
        description=data.description,
        image_url=data.image_url,
        parent_id=data.parent_id,
        display_order=data.display_order,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


async def get_online_categories(
    db: AsyncSession, online_store_id: int, parent_id: int | None = None
) -> list[OnlineCategory]:
    """Get categories for an online store."""
    query = select(OnlineCategory).where(
        OnlineCategory.online_store_id == online_store_id,
        OnlineCategory.is_active == True,
    )
    if parent_id is not None:
        query = query.where(OnlineCategory.parent_id == parent_id)
    query = query.order_by(OnlineCategory.display_order, OnlineCategory.name)

    result = await db.execute(query)
    return list(result.scalars().all())


async def update_online_category(
    db: AsyncSession, category_id: int, data
) -> OnlineCategory:
    """Update an online category."""
    category = await db.get(OnlineCategory, category_id)
    if not category:
        raise ValueError(f"Category {category_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    await db.flush()
    await db.refresh(category)
    return category


# ── Customer Management ───────────────────────────────────────────────────────

async def register_customer(
    db: AsyncSession, data, online_store_id: int
) -> OnlineCustomer:
    """Register a new customer."""
    # Check if email already exists
    existing = await db.execute(
        select(OnlineCustomer).where(
            OnlineCustomer.online_store_id == online_store_id,
            OnlineCustomer.email == data.email,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Email '{data.email}' already registered")

    online_store = await db.get(OnlineStore, online_store_id)

    customer = OnlineCustomer(
        store_id=online_store.store_id if online_store else None,
        online_store_id=online_store_id,
        email=data.email,
        phone=data.phone,
        first_name=data.first_name,
        last_name=data.last_name,
        password_hash=get_password_hash(data.password) if data.password else None,
        verification_token=secrets.token_urlsafe(32),
    )
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    logger.info(f"Customer registered: {data.email}")
    return customer


async def authenticate_customer(
    db: AsyncSession, email: str, password: str, online_store_id: int
) -> OnlineCustomer | None:
    """Authenticate a customer."""
    result = await db.execute(
        select(OnlineCustomer).where(
            OnlineCustomer.online_store_id == online_store_id,
            OnlineCustomer.email == email,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer or not customer.password_hash:
        return None
    if not verify_password(password, customer.password_hash):
        return None

    customer.last_login = datetime.now(timezone.utc)
    await db.flush()
    return customer


async def get_customer_by_email(
    db: AsyncSession, email: str, online_store_id: int
) -> OnlineCustomer | None:
    """Get customer by email."""
    result = await db.execute(
        select(OnlineCustomer).where(
            OnlineCustomer.online_store_id == online_store_id,
            OnlineCustomer.email == email,
        )
    )
    return result.scalar_one_or_none()


async def get_or_create_guest_customer(
    db: AsyncSession, email: str, online_store_id: int, first_name: str = "", last_name: str = ""
) -> OnlineCustomer:
    """Get or create a customer (for guest checkout)."""
    customer = await get_customer_by_email(db, email, online_store_id)
    if customer:
        return customer

    online_store = await db.get(OnlineStore, online_store_id)
    customer = OnlineCustomer(
        store_id=online_store.store_id if online_store else None,
        online_store_id=online_store_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )
    db.add(customer)
    await db.flush()
    return customer


# ── Cart Management ───────────────────────────────────────────────────────

async def get_or_create_cart(
    db: AsyncSession,
    online_store_id: int,
    session_id: str | None = None,
    customer_id: int | None = None,
) -> Cart:
    """Get or create a cart for session/customer."""
    query = select(Cart).where(Cart.online_store_id == online_store_id)

    if customer_id:
        query = query.where(Cart.customer_id == customer_id)
    elif session_id:
        query = query.where(Cart.session_id == session_id)
    else:
        # Create new cart with new session
        session_id = secrets.token_urlsafe(16)
        online_store = await db.get(OnlineStore, online_store_id)
        cart = Cart(
            store_id=online_store.store_id if online_store else None,
            online_store_id=online_store_id,
            session_id=session_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add(cart)
        await db.flush()
        return cart

    result = await db.execute(query)
    cart = result.scalar_one_or_none()

    if not cart:
        online_store = await db.get(OnlineStore, online_store_id)
        cart = Cart(
            store_id=online_store.store_id if online_store else None,
            online_store_id=online_store_id,
            session_id=session_id,
            customer_id=customer_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add(cart)
        await db.flush()

    return cart


async def add_to_cart(
    db: AsyncSession,
    cart_id: int,
    online_product_id: int,
    quantity: float,
) -> CartItem:
    """Add item to cart."""
    cart = await db.get(Cart, cart_id)
    if not cart:
        raise ValueError(f"Cart {cart_id} not found")

    online_product = await db.get(OnlineProduct, online_product_id)
    if not online_product or not online_product.is_published:
        raise ValueError(f"Product {online_product_id} not available")

    # Check stock
    if online_product.stock_quantity < quantity:
        raise ValueError(f"Insufficient stock. Available: {online_product.stock_quantity}")

    # Check if item already in cart
    result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart_id,
            CartItem.online_product_id == online_product_id,
        )
    )
    existing_item = result.scalar_one_or_none()

    price = float(online_product.sale_price or online_product.online_price or 0)

    if existing_item:
        new_qty = float(existing_item.quantity) + quantity
        if online_product.stock_quantity < new_qty:
            raise ValueError(f"Insufficient stock. Available: {online_product.stock_quantity}")
        existing_item.quantity = new_qty
        existing_item.total = round(new_qty * price, 2)
        await db.flush()
        await _recalculate_cart_totals(db, cart)
        return existing_item

    item = CartItem(
        cart_id=cart_id,
        online_product_id=online_product_id,
        quantity=quantity,
        unit_price=price,
        total=round(quantity * price, 2),
    )
    db.add(item)
    await db.flush()
    await _recalculate_cart_totals(db, cart)
    return item


async def update_cart_item(
    db: AsyncSession, cart_item_id: int, quantity: float
) -> CartItem:
    """Update cart item quantity."""
    item = await db.get(CartItem, cart_item_id)
    if not item:
        raise ValueError(f"Cart item {cart_item_id} not found")

    online_product = await db.get(OnlineProduct, item.online_product_id)
    if online_product and online_product.stock_quantity < quantity:
        raise ValueError(f"Insufficient stock. Available: {online_product.stock_quantity}")

    item.quantity = quantity
    item.total = round(quantity * float(item.unit_price), 2)
    await db.flush()
    await _recalculate_cart_totals(db, await db.get(Cart, item.cart_id))
    return item


async def remove_cart_item(db: AsyncSession, cart_item_id: int) -> bool:
    """Remove item from cart."""
    item = await db.get(CartItem, cart_item_id)
    if not item:
        return False

    cart_id = item.cart_id
    await db.delete(item)
    await db.flush()
    await _recalculate_cart_totals(db, await db.get(Cart, cart_id))
    return True


async def _recalculate_cart_totals(db: AsyncSession, cart: Cart | None):
    """Recalculate cart totals."""
    if not cart:
        return

    result = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.id)
    )
    items = list(result.scalars().all())

    subtotal = sum(float(item.total) for item in items)
    cart.subtotal = subtotal
    cart.total = subtotal + float(cart.shipping_fee) + float(cart.tax_amount) - float(cart.discount_amount)
    cart.updated_at = datetime.now(timezone.utc)
    await db.flush()


async def apply_coupon_to_cart(
    db: AsyncSession, cart_id: int, coupon_code: str
) -> Coupon:
    """Apply coupon to cart."""
    cart = await db.get(Cart, cart_id)
    if not cart:
        raise ValueError(f"Cart {cart_id} not found")

    # Find coupon
    result = await db.execute(
        select(Coupon).where(
            Coupon.online_store_id == cart.online_store_id,
            Coupon.code == coupon_code.upper(),
            Coupon.is_active == True,
        )
    )
    coupon = result.scalar_one_or_none()

    if not coupon:
        raise ValueError("Invalid coupon code")

    # Check validity
    now = datetime.now(timezone.utc)
    if coupon.starts_at and now < coupon.starts_at:
        raise ValueError("Coupon not yet active")
    if coupon.expires_at and now > coupon.expires_at:
        raise ValueError("Coupon has expired")
    if coupon.max_uses and coupon.current_uses >= coupon.max_uses:
        raise ValueError("Coupon has reached usage limit")
    if coupon.min_order_amount and float(cart.subtotal) < float(coupon.min_order_amount):
        raise ValueError(f"Minimum order amount is {coupon.min_order_amount}")

    # Calculate discount
    if coupon.discount_type == "percent":
        discount = float(cart.subtotal) * float(coupon.discount_value) / 100
    else:
        discount = float(coupon.discount_value)

    cart.coupon_code = coupon.code
    cart.discount_amount = round(discount, 2)
    await _recalculate_cart_totals(db, cart)

    return coupon


# ── Order Management ───────────────────────────────────────────────────────

async def create_order(
    db: AsyncSession,
    cart_id: int,
    data,
    online_store_id: int,
) -> OnlineOrder:
    """Create an order from cart."""
    cart = await db.get(Cart, cart_id)
    if not cart:
        raise ValueError(f"Cart {cart_id} not found")

    # Get cart items
    result = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart_id)
    )
    items = list(result.scalars().all())

    if not items:
        raise ValueError("Cart is empty")

    # Get or create customer
    customer = await get_or_create_guest_customer(
        db, data.customer_email, online_store_id,
        data.customer_first_name or "", data.customer_last_name or ""
    )

    # Calculate delivery fee
    delivery_fee = 0.0
    delivery_zone = None
    if data.delivery_method == "delivery" and data.delivery_zone_id:
        delivery_zone = await db.get(DeliveryZone, data.delivery_zone_id)
        if delivery_zone:
            delivery_fee = float(delivery_zone.base_fee)
            # Check for free delivery
            if (delivery_zone.free_delivery_minimum and
                float(cart.subtotal) >= float(delivery_zone.free_delivery_minimum)):
                delivery_fee = 0.0

    # Generate order number
    count = (await db.execute(select(func.count()).select_from(OnlineOrder))).scalar() or 0
    order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:05d}"

    # Create order
    order = OnlineOrder(
        store_id=cart.store_id,
        online_store_id=online_store_id,
        customer_id=customer.id,
        order_number=order_number,
        customer_email=data.customer_email,
        customer_phone=data.customer_phone,
        customer_name=f"{data.customer_first_name or ''} {data.customer_last_name or ''}".strip(),
        delivery_method=data.delivery_method,
        shipping_address=data.shipping_address.model_dump() if data.shipping_address else None,
        delivery_fee=delivery_fee,
        delivery_notes=data.delivery_notes,
        delivery_zone_id=data.delivery_zone_id,
        payment_method=data.payment_method,
        subtotal=float(cart.subtotal),
        tax_amount=float(cart.tax_amount),
        shipping_fee=delivery_fee,
        discount_amount=float(cart.discount_amount),
        total=float(cart.subtotal) + float(cart.tax_amount) + delivery_fee - float(cart.discount_amount),
        customer_notes=data.customer_notes,
    )
    db.add(order)
    await db.flush()

    # Create order items
    for item in items:
        online_product = await db.get(OnlineProduct, item.online_product_id)
        order_item = OnlineOrderItem(
            order_id=order.id,
            online_product_id=item.online_product_id,
            product_name=online_product.online_name if online_product else "Unknown Product",
            product_image=online_product.main_image_url if online_product else None,
            quantity=float(item.quantity),
            unit_price=float(item.unit_price),
            total=float(item.total),
        )
        db.add(order_item)

        # Decrease stock
        if online_product:
            online_product.stock_quantity = float(online_product.stock_quantity) - float(item.quantity)
            online_product.purchase_count = (online_product.purchase_count or 0) + 1

    # Update customer stats
    customer.total_orders = (customer.total_orders or 0) + 1
    customer.total_spent = float(customer.total_spent or 0) + float(order.total)

    # Update coupon usage
    if cart.coupon_code:
        result = await db.execute(
            select(Coupon).where(Coupon.code == cart.coupon_code)
        )
        coupon = result.scalar_one_or_none()
        if coupon:
            coupon.current_uses = (coupon.current_uses or 0) + 1

    # Clear cart
    for item in items:
        await db.delete(item)
    await db.delete(cart)

    await db.flush()
    await db.refresh(order)
    logger.info(f"Order {order_number} created for {data.customer_email}")
    return order


async def get_orders(
    db: AsyncSession,
    online_store_id: int,
    status: str | None = None,
    payment_status: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[OnlineOrder], int]:
    """Get orders with filters."""
    query = select(OnlineOrder).where(OnlineOrder.online_store_id == online_store_id)

    if status:
        query = query.where(OnlineOrder.status == status)
    if payment_status:
        query = query.where(OnlineOrder.payment_status == payment_status)
    if search:
        query = query.where(
            or_(
                OnlineOrder.order_number.ilike(f"%{search}%"),
                OnlineOrder.customer_email.ilike(f"%{search}%"),
                OnlineOrder.customer_name.ilike(f"%{search}%"),
            )
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(OnlineOrder.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    query = query.options(selectinload(OnlineOrder.items))

    result = await db.execute(query)
    orders = list(result.scalars().all())
    return orders, total


async def update_order_status(
    db: AsyncSession, order_id: int, status: str, notes: str | None = None
) -> OnlineOrder:
    """Update order status."""
    order = await db.get(OnlineOrder, order_id)
    if not order:
        raise ValueError(f"Order {order_id} not found")

    order.status = status
    if notes:
        order.internal_notes = notes

    now = datetime.now(timezone.utc)
    if status == "confirmed":
        order.confirmed_at = now
    elif status == "shipped":
        order.shipped_at = now
    elif status == "delivered":
        order.delivered_at = now

    await db.flush()
    await db.refresh(order)
    logger.info(f"Order {order.order_number} status updated to {status}")
    return order


async def update_payment_status(
    db: AsyncSession, order_id: int, payment_status: str, payment_reference: str | None = None
) -> OnlineOrder:
    """Update payment status."""
    order = await db.get(OnlineOrder, order_id)
    if not order:
        raise ValueError(f"Order {order_id} not found")

    order.payment_status = payment_status
    if payment_reference:
        order.payment_reference = payment_reference
    if payment_status == "paid":
        order.paid_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(order)
    return order


# ── Delivery Zone Management ───────────────────────────────────────────────────────

async def create_delivery_zone(db: AsyncSession, data) -> DeliveryZone:
    """Create a delivery zone."""
    online_store = await db.get(OnlineStore, data.online_store_id)
    if not online_store:
        raise ValueError(f"Online store {data.online_store_id} not found")

    zone = DeliveryZone(
        store_id=online_store.store_id,
        online_store_id=data.online_store_id,
        name=data.name,
        description=data.description,
        areas=data.areas,
        base_fee=data.base_fee,
        free_delivery_minimum=data.free_delivery_minimum,
        estimated_delivery_hours=data.estimated_delivery_hours,
    )
    db.add(zone)
    await db.flush()
    await db.refresh(zone)
    return zone


async def get_delivery_zones(db: AsyncSession, online_store_id: int) -> list[DeliveryZone]:
    """Get delivery zones for a store."""
    result = await db.execute(
        select(DeliveryZone).where(
            DeliveryZone.online_store_id == online_store_id,
            DeliveryZone.is_active == True,
        ).order_by(DeliveryZone.name)
    )
    return list(result.scalars().all())


async def update_delivery_zone(db: AsyncSession, zone_id: int, data) -> DeliveryZone:
    """Update a delivery zone."""
    zone = await db.get(DeliveryZone, zone_id)
    if not zone:
        raise ValueError(f"Delivery zone {zone_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(zone, key, value)

    await db.flush()
    await db.refresh(zone)
    return zone


# ── Coupon Management ───────────────────────────────────────────────────────

async def create_coupon(db: AsyncSession, data) -> Coupon:
    """Create a coupon."""
    online_store = await db.get(OnlineStore, data.online_store_id)
    if not online_store:
        raise ValueError(f"Online store {data.online_store_id} not found")

    # Check if code exists
    existing = await db.execute(
        select(Coupon).where(
            Coupon.online_store_id == data.online_store_id,
            Coupon.code == data.code,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Coupon code '{data.code}' already exists")

    coupon = Coupon(
        store_id=online_store.store_id,
        online_store_id=data.online_store_id,
        code=data.code,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_order_amount=data.min_order_amount,
        max_uses=data.max_uses,
        uses_per_customer=data.uses_per_customer,
        starts_at=data.starts_at,
        expires_at=data.expires_at,
    )
    db.add(coupon)
    await db.flush()
    await db.refresh(coupon)
    return coupon


async def get_coupons(db: AsyncSession, online_store_id: int) -> list[Coupon]:
    """Get coupons for a store."""
    result = await db.execute(
        select(Coupon).where(Coupon.online_store_id == online_store_id)
        .order_by(Coupon.created_at.desc())
    )
    return list(result.scalars().all())


async def update_coupon(db: AsyncSession, coupon_id: int, data) -> Coupon:
    """Update a coupon."""
    coupon = await db.get(Coupon, coupon_id)
    if not coupon:
        raise ValueError(f"Coupon {coupon_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(coupon, key, value)

    await db.flush()
    await db.refresh(coupon)
    return coupon


# ── Statistics ───────────────────────────────────────────────────────────────

async def get_ecommerce_stats(db: AsyncSession, online_store_id: int) -> dict:
    """Get e-commerce dashboard statistics."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # Order counts by status
    order_counts = {}
    for status in ["pending", "confirmed", "processing", "ready", "shipped", "delivered", "cancelled"]:
        result = await db.execute(
            select(func.count()).select_from(OnlineOrder).where(
                OnlineOrder.online_store_id == online_store_id,
                OnlineOrder.status == status,
            )
        )
        order_counts[status] = result.scalar() or 0

    total_orders = sum(order_counts.values())

    # Revenue
    revenue_result = await db.execute(
        select(func.sum(OnlineOrder.total)).where(
            OnlineOrder.online_store_id == online_store_id,
            OnlineOrder.payment_status == "paid",
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    today_revenue_result = await db.execute(
        select(func.sum(OnlineOrder.total)).where(
            OnlineOrder.online_store_id == online_store_id,
            OnlineOrder.payment_status == "paid",
            OnlineOrder.paid_at >= today_start,
        )
    )
    today_revenue = float(today_revenue_result.scalar() or 0)

    week_revenue_result = await db.execute(
        select(func.sum(OnlineOrder.total)).where(
            OnlineOrder.online_store_id == online_store_id,
            OnlineOrder.payment_status == "paid",
            OnlineOrder.paid_at >= week_start,
        )
    )
    week_revenue = float(week_revenue_result.scalar() or 0)

    month_revenue_result = await db.execute(
        select(func.sum(OnlineOrder.total)).where(
            OnlineOrder.online_store_id == online_store_id,
            OnlineOrder.payment_status == "paid",
            OnlineOrder.paid_at >= month_start,
        )
    )
    month_revenue = float(month_revenue_result.scalar() or 0)

    # Product counts
    total_products_result = await db.execute(
        select(func.count()).select_from(OnlineProduct).where(
            OnlineProduct.online_store_id == online_store_id,
        )
    )
    total_products = total_products_result.scalar() or 0

    published_products_result = await db.execute(
        select(func.count()).select_from(OnlineProduct).where(
            OnlineProduct.online_store_id == online_store_id,
            OnlineProduct.is_published == True,
        )
    )
    published_products = published_products_result.scalar() or 0

    out_of_stock_result = await db.execute(
        select(func.count()).select_from(OnlineProduct).where(
            OnlineProduct.online_store_id == online_store_id,
            OnlineProduct.is_published == True,
            OnlineProduct.stock_quantity <= 0,
        )
    )
    out_of_stock = out_of_stock_result.scalar() or 0

    # Customer counts
    total_customers_result = await db.execute(
        select(func.count()).select_from(OnlineCustomer).where(
            OnlineCustomer.online_store_id == online_store_id,
        )
    )
    total_customers = total_customers_result.scalar() or 0

    new_customers_today_result = await db.execute(
        select(func.count()).select_from(OnlineCustomer).where(
            OnlineCustomer.online_store_id == online_store_id,
            OnlineCustomer.created_at >= today_start,
        )
    )
    new_customers_today = new_customers_today_result.scalar() or 0

    returning_customers_result = await db.execute(
        select(func.count()).select_from(OnlineCustomer).where(
            OnlineCustomer.online_store_id == online_store_id,
            OnlineCustomer.total_orders > 1,
        )
    )
    returning_customers = returning_customers_result.scalar() or 0

    # Top products
    top_products_result = await db.execute(
        select(
            OnlineProduct.id,
            OnlineProduct.online_name,
            func.sum(OnlineOrderItem.quantity).label("total_sold"),
            func.sum(OnlineOrderItem.total).label("total_revenue"),
        )
        .join(OnlineOrderItem)
        .join(OnlineOrder)
        .where(
            OnlineProduct.online_store_id == online_store_id,
            OnlineOrder.payment_status == "paid",
        )
        .group_by(OnlineProduct.id, OnlineProduct.online_name)
        .order_by(func.sum(OnlineOrderItem.total).desc())
        .limit(5)
    )
    top_products = [
        {
            "id": row.id,
            "name": row.online_name,
            "total_sold": float(row.total_sold or 0),
            "total_revenue": float(row.total_revenue or 0),
        }
        for row in top_products_result
    ]

    # Recent orders
    recent_orders_result = await db.execute(
        select(OnlineOrder)
        .where(OnlineOrder.online_store_id == online_store_id)
        .order_by(OnlineOrder.created_at.desc())
        .limit(5)
    )
    recent_orders = [
        {
            "id": o.id,
            "order_number": o.order_number,
            "customer_name": o.customer_name,
            "total": float(o.total),
            "status": o.status,
            "created_at": o.created_at.isoformat(),
        }
        for o in recent_orders_result.scalars()
    ]

    return {
        "total_orders": total_orders,
        "pending_orders": order_counts.get("pending", 0),
        "processing_orders": order_counts.get("processing", 0) + order_counts.get("confirmed", 0),
        "completed_orders": order_counts.get("delivered", 0),
        "cancelled_orders": order_counts.get("cancelled", 0),
        "total_revenue": total_revenue,
        "today_revenue": today_revenue,
        "week_revenue": week_revenue,
        "month_revenue": month_revenue,
        "total_products": total_products,
        "published_products": published_products,
        "out_of_stock": out_of_stock,
        "total_customers": total_customers,
        "new_customers_today": new_customers_today,
        "returning_customers": returning_customers,
        "top_products": top_products,
        "recent_orders": recent_orders,
        "sales_by_day": [],  # TODO: Implement daily sales breakdown
    }


# ── Sync with POS ───────────────────────────────────────────────────────

async def sync_order_to_pos(
    db: AsyncSession, order_id: int, user_id: int
) -> Sale:
    """Sync an online order to POS as a sale."""
    order = await db.get(OnlineOrder, order_id)
    if not order:
        raise ValueError(f"Order {order_id} not found")

    if order.sale_id:
        raise ValueError(f"Order already synced to sale {order.sale_id}")

    # Generate sale number
    count = (await db.execute(select(func.count()).select_from(Sale))).scalar() or 0
    sale_number = f"SV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:05d}"

    # Create sale
    sale = Sale(
        sale_number=sale_number,
        store_id=order.store_id,
        user_id=user_id,
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total,
        payment_method=order.payment_method or "CASH",
        payment_reference=order.payment_reference,
        status="COMPLETED",
        currency="XOF",
        notes=f"Online order {order.order_number}",
    )
    db.add(sale)
    await db.flush()

    # Create sale items
    for order_item in order.items:
        online_product = await db.get(OnlineProduct, order_item.online_product_id)
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=online_product.product_id if online_product else None,
            variant_id=online_product.variant_id if online_product else None,
            quantity=order_item.quantity,
            unit_price=order_item.unit_price,
            line_total=order_item.total,
        )
        db.add(sale_item)

        # Create stock movement
        if online_product and online_product.product_id:
            product = await db.get(Product, online_product.product_id)
            if product:
                movement = StockMovement(
                    product_id=product.id,
                    variant_id=online_product.variant_id,
                    user_id=user_id,
                    movement_type="OUT",
                    quantity=order_item.quantity,
                    reference=sale_number,
                    reason=f"Online order {order.order_number}",
                    quantity_before=float(product.stock_quantity),
                    quantity_after=float(product.stock_quantity) - float(order_item.quantity),
                )
                db.add(movement)

    order.sale_id = sale.id
    await db.flush()
    await db.refresh(sale)
    logger.info(f"Order {order.order_number} synced to sale {sale_number}")
    return sale
