"""E-commerce models for SavanaFlow — Online Store Module."""
from __future__ import annotations

from datetime import datetime, timezone, date

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, JSON, UniqueConstraint, Date,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class OnlineStore(Base):
    """Configuration boutique en ligne"""
    __tablename__ = "online_stores"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    custom_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Branding
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(10), default="#2563eb")
    secondary_color: Mapped[str] = mapped_column(String(10), default="#1e40af")

    # Contact
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Social links
    facebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    whatsapp_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Configuration
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    language: Mapped[str] = mapped_column(String(5), default="fr")
    timezone: Mapped[str] = mapped_column(String(50), default="Africa/Abidjan")

    # Features
    delivery_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    pickup_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    guest_checkout: Mapped[bool] = mapped_column(Boolean, default=True)

    # Payment
    cinetpay_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    cinetpay_site_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cinetpay_api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paystack_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    paystack_public_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paystack_secret_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mpesa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mpesa_shortcode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cash_on_delivery: Mapped[bool] = mapped_column(Boolean, default=False)

    # SEO
    meta_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    store: Mapped["Store"] = relationship(lazy="selectin")
    online_products: Mapped[list["OnlineProduct"]] = relationship(
        back_populates="online_store", lazy="noload", cascade="all, delete-orphan"
    )
    categories: Mapped[list["OnlineCategory"]] = relationship(
        back_populates="online_store", lazy="noload", cascade="all, delete-orphan"
    )
    online_customers: Mapped[list["OnlineCustomer"]] = relationship(
        back_populates="online_store", lazy="noload", cascade="all, delete-orphan"
    )
    carts: Mapped[list["Cart"]] = relationship(
        back_populates="online_store", lazy="noload", cascade="all, delete-orphan"
    )
    online_orders: Mapped[list["OnlineOrder"]] = relationship(
        back_populates="online_store", lazy="noload", cascade="all, delete-orphan"
    )
    delivery_zones: Mapped[list["DeliveryZone"]] = relationship(
        back_populates="online_store", lazy="noload", cascade="all, delete-orphan"
    )
    coupons: Mapped[list["Coupon"]] = relationship(
        back_populates="online_store", lazy="noload", cascade="all, delete-orphan"
    )


class OnlineProduct(Base):
    """Produit publié en ligne"""
    __tablename__ = "online_products"
    __table_args__ = (
        UniqueConstraint("store_id", "product_id", name="uq_online_product_store_product"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    online_store_id: Mapped[int] = mapped_column(ForeignKey("online_stores.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id"), nullable=True)

    # Override product data for online
    online_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    online_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    online_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Images (JSON array of URLs)
    images: Mapped[list] = mapped_column(JSON, default=list)
    main_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Categories for online store
    online_category_id: Mapped[int | None] = mapped_column(ForeignKey("online_categories.id"), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)

    # SEO
    slug: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    meta_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Inventory sync
    sync_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    stock_quantity: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5)

    # Status
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    is_on_sale: Mapped[bool] = mapped_column(Boolean, default=False)
    sale_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Stats
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    purchase_count: Mapped[int] = mapped_column(Integer, default=0)

    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    store: Mapped["Store"] = relationship(lazy="selectin")
    online_store: Mapped["OnlineStore"] = relationship(back_populates="online_products")
    product: Mapped["Product"] = relationship(lazy="selectin")
    variant: Mapped["ProductVariant | None"] = relationship(lazy="selectin")
    online_category: Mapped["OnlineCategory | None"] = relationship(back_populates="online_products")
    cart_items: Mapped[list["CartItem"]] = relationship(back_populates="online_product", lazy="noload")
    order_items: Mapped[list["OnlineOrderItem"]] = relationship(back_populates="online_product", lazy="noload")


class OnlineCategory(Base):
    """Catégorie de la boutique en ligne"""
    __tablename__ = "online_categories"
    __table_args__ = (
        UniqueConstraint("online_store_id", "slug", name="uq_online_category_store_slug"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    online_store_id: Mapped[int] = mapped_column(ForeignKey("online_stores.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    parent_id: Mapped[int | None] = mapped_column(ForeignKey("online_categories.id"), nullable=True)

    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    online_store: Mapped["OnlineStore"] = relationship(back_populates="categories")
    parent: Mapped["OnlineCategory | None"] = relationship(
        back_populates="children", remote_side="OnlineCategory.id", lazy="selectin"
    )
    children: Mapped[list["OnlineCategory"]] = relationship(back_populates="parent", lazy="noload")
    online_products: Mapped[list["OnlineProduct"]] = relationship(back_populates="online_category", lazy="noload")


class OnlineCustomer(Base):
    """Client de la boutique en ligne"""
    __tablename__ = "online_customers"
    __table_args__ = (
        UniqueConstraint("online_store_id", "email", name="uq_online_customer_store_email"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    online_store_id: Mapped[int] = mapped_column(ForeignKey("online_stores.id"), nullable=False)
    pos_customer_id: Mapped[int | None] = mapped_column(ForeignKey("pos_customers.id"), nullable=True)

    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Addresses
    default_billing_address: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    default_shipping_address: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Stats
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_spent: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    online_store: Mapped["OnlineStore"] = relationship(back_populates="online_customers")
    pos_customer: Mapped["POSCustomer | None"] = relationship(lazy="selectin")
    carts: Mapped[list["Cart"]] = relationship(back_populates="customer", lazy="noload")
    online_orders: Mapped[list["OnlineOrder"]] = relationship(back_populates="customer", lazy="noload")


class Cart(Base):
    """Panier d'achat"""
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    online_store_id: Mapped[int] = mapped_column(ForeignKey("online_stores.id"), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("online_customers.id"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    shipping_fee: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    # Coupon
    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    online_store: Mapped["OnlineStore"] = relationship(back_populates="carts")
    customer: Mapped["OnlineCustomer | None"] = relationship(back_populates="carts")
    items: Mapped[list["CartItem"]] = relationship(
        back_populates="cart", lazy="selectin", cascade="all, delete-orphan"
    )


class CartItem(Base):
    """Article du panier"""
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    online_product_id: Mapped[int] = mapped_column(ForeignKey("online_products.id"), nullable=False)

    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    # Relationships
    cart: Mapped["Cart"] = relationship(back_populates="items")
    online_product: Mapped["OnlineProduct"] = relationship(back_populates="cart_items")


class OnlineOrder(Base):
    """Commande en ligne"""
    __tablename__ = "online_orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    online_store_id: Mapped[int] = mapped_column(ForeignKey("online_stores.id"), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("online_customers.id"), nullable=True)

    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Customer info (snapshot)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Delivery
    delivery_method: Mapped[str] = mapped_column(String(20), nullable=False)  # "pickup", "delivery"
    shipping_address: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    delivery_fee: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    delivery_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_zone_id: Mapped[int | None] = mapped_column(ForeignKey("delivery_zones.id"), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending, confirmed, processing, ready, shipped, delivered, cancelled, refunded

    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending, paid, failed, refunded

    # Payment info
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    payment_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Totals
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    shipping_fee: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    # Notes
    customer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Link to POS sale (after sync)
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id"), nullable=True)

    # Tracking
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    online_store: Mapped["OnlineStore"] = relationship(back_populates="online_orders")
    customer: Mapped["OnlineCustomer | None"] = relationship(back_populates="online_orders")
    delivery_zone: Mapped["DeliveryZone | None"] = relationship(lazy="selectin")
    sale: Mapped["Sale | None"] = relationship(lazy="selectin")
    items: Mapped[list["OnlineOrderItem"]] = relationship(
        back_populates="order", lazy="selectin", cascade="all, delete-orphan"
    )


class OnlineOrderItem(Base):
    """Ligne de commande en ligne"""
    __tablename__ = "online_order_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("online_orders.id", ondelete="CASCADE"), nullable=False)
    online_product_id: Mapped[int] = mapped_column(ForeignKey("online_products.id"), nullable=False)

    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    product_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    # Relationships
    order: Mapped["OnlineOrder"] = relationship(back_populates="items")
    online_product: Mapped["OnlineProduct"] = relationship(back_populates="order_items")


class DeliveryZone(Base):
    """Zone de livraison"""
    __tablename__ = "delivery_zones"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    online_store_id: Mapped[int] = mapped_column(ForeignKey("online_stores.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Areas covered
    areas: Mapped[list] = mapped_column(JSON, default=list)

    # Pricing
    base_fee: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    free_delivery_minimum: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)

    # Time
    estimated_delivery_hours: Mapped[int] = mapped_column(Integer, default=24)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    online_store: Mapped["OnlineStore"] = relationship(back_populates="delivery_zones")
    orders: Mapped[list["OnlineOrder"]] = relationship(lazy="noload")


class Coupon(Base):
    """Code promo"""
    __tablename__ = "coupons"
    __table_args__ = (
        UniqueConstraint("online_store_id", "code", name="uq_coupon_store_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    online_store_id: Mapped[int] = mapped_column(ForeignKey("online_stores.id"), nullable=False)

    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)

    discount_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "percent", "fixed"
    discount_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Limits
    min_order_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_uses: Mapped[int] = mapped_column(Integer, default=0)
    uses_per_customer: Mapped[int] = mapped_column(Integer, default=1)

    # Validity
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    online_store: Mapped["OnlineStore"] = relationship(back_populates="coupons")
