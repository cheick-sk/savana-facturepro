"""All SQLAlchemy models for SavanaFlow POS — Production-Ready Edition."""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, JSON, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── User ───────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user", lazy="noload")
    shifts: Mapped[list["Shift"]] = relationship(back_populates="user", lazy="noload")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ── Store ──────────────────────────────────────────────────────
class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    receipt_header: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_footer: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    products: Mapped[list["Product"]] = relationship(back_populates="store", lazy="noload")
    shifts: Mapped[list["Shift"]] = relationship(back_populates="store", lazy="noload")
    transfers_from: Mapped[list["StoreTransfer"]] = relationship(
        back_populates="from_store", lazy="noload", foreign_keys="StoreTransfer.from_store_id"
    )
    transfers_to: Mapped[list["StoreTransfer"]] = relationship(
        back_populates="to_store", lazy="noload", foreign_keys="StoreTransfer.to_store_id"
    )


# ── Product Category (hiérarchique) ───────────────────────────
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    color: Mapped[str | None] = mapped_column(String(10), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    parent: Mapped["Category | None"] = relationship(
        back_populates="children", remote_side="Category.id", lazy="selectin"
    )
    children: Mapped[list["Category"]] = relationship(back_populates="parent", lazy="noload")
    products: Mapped[list["Product"]] = relationship(back_populates="category", lazy="noload")


# ── Supplier ───────────────────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    payment_terms: Mapped[int] = mapped_column(Integer, default=30)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    products: Mapped[list["Product"]] = relationship(back_populates="supplier", lazy="noload")
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="supplier", lazy="noload")


# ── Product ────────────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[str] = mapped_column(String(50), default="unit")
    sell_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    stock_quantity: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    low_stock_threshold: Mapped[float] = mapped_column(Numeric(12, 2), default=10.0)
    has_variants: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    store: Mapped["Store"] = relationship(back_populates="products", lazy="selectin")
    category: Mapped["Category | None"] = relationship(back_populates="products", lazy="selectin")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="products", lazy="selectin")
    variants: Mapped[list["ProductVariant"]] = relationship(back_populates="product", lazy="selectin", cascade="all, delete-orphan")
    stock_movements: Mapped[list["StockMovement"]] = relationship(back_populates="product", lazy="noload")
    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="product", lazy="noload")
    promotions: Mapped[list["PromotionProduct"]] = relationship(back_populates="product", lazy="noload")

    @property
    def is_low_stock(self) -> bool:
        return float(self.stock_quantity) <= float(self.low_stock_threshold)


# ── Product Variant ────────────────────────────────────────────
class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (UniqueConstraint("product_id", "sku", name="uq_variant_sku"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # e.g. "Rouge / XL"
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)  # {"color": "Rouge", "size": "XL"}
    sell_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)  # overrides product price
    cost_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    stock_quantity: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped["Product"] = relationship(back_populates="variants")


# ── POS Customer (Fidélité) ────────────────────────────────────
class POSCustomer(Base):
    __tablename__ = "pos_customers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0)
    loyalty_tier: Mapped[str] = mapped_column(String(20), default="STANDARD")  # STANDARD/SILVER/GOLD/PLATINUM
    total_spent: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    visit_count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    last_visit: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sales: Mapped[list["Sale"]] = relationship(back_populates="customer", lazy="noload")
    loyalty_transactions: Mapped[list["LoyaltyTransaction"]] = relationship(back_populates="customer", lazy="noload")


# ── Loyalty Transaction ────────────────────────────────────────
class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("pos_customers.id"), nullable=False)
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id"), nullable=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False)  # positive = earned, negative = redeemed
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # EARN / REDEEM / ADJUST / EXPIRE
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    customer: Mapped["POSCustomer"] = relationship(back_populates="loyalty_transactions")


# ── Promotion ──────────────────────────────────────────────────
class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    promo_type: Mapped[str] = mapped_column(String(30), nullable=False)  # PERCENT/FIXED/BOGO/BUNDLE
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)  # % or fixed amount
    min_purchase: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    max_discount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    applies_to: Mapped[str] = mapped_column(String(20), default="ALL")  # ALL/CATEGORY/PRODUCT
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    code: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    products: Mapped[list["PromotionProduct"]] = relationship(back_populates="promotion", lazy="selectin")


class PromotionProduct(Base):
    __tablename__ = "promotion_products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    promotion_id: Mapped[int] = mapped_column(ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    promotion: Mapped["Promotion"] = relationship(back_populates="products")
    product: Mapped["Product"] = relationship(back_populates="promotions")


# ── Shift / Cash Register ──────────────────────────────────────
class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    opening_cash: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    closing_cash: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    expected_cash: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    cash_difference: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    total_sales: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    total_refunds: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    sales_count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="OPEN")  # OPEN / CLOSED

    store: Mapped["Store"] = relationship(back_populates="shifts", lazy="selectin")
    user: Mapped["User"] = relationship(back_populates="shifts", lazy="selectin")
    sales: Mapped[list["Sale"]] = relationship(back_populates="shift", lazy="noload")


# ── StockMovement ──────────────────────────────────────────────
class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id"), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)  # IN/OUT/ADJUST/TRANSFER/RETURN
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    quantity_before: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    quantity_after: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    product: Mapped["Product"] = relationship(back_populates="stock_movements", lazy="selectin")
    user: Mapped["User | None"] = relationship(lazy="selectin")


# ── Sale ───────────────────────────────────────────────────────
class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"), nullable=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("pos_customers.id"), nullable=True)
    promotion_id: Mapped[int | None] = mapped_column(ForeignKey("promotions.id"), nullable=True)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    discount_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    loyalty_discount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    payment_method: Mapped[str] = mapped_column(String(30), default="CASH")
    payment_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")  # COMPLETED/REFUNDED/PARTIAL_REFUND
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    loyalty_points_earned: Mapped[int] = mapped_column(Integer, default=0)
    loyalty_points_used: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    store: Mapped["Store"] = relationship(lazy="selectin")
    user: Mapped["User"] = relationship(lazy="selectin")
    shift: Mapped["Shift | None"] = relationship(back_populates="sales", lazy="selectin")
    customer: Mapped["POSCustomer | None"] = relationship(back_populates="sales", lazy="selectin")
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", lazy="selectin", cascade="all, delete-orphan")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="sale", lazy="noload")


# ── SaleItem ───────────────────────────────────────────────────
class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id"), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    line_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)

    sale: Mapped["Sale"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="sale_items", lazy="selectin")
    variant: Mapped["ProductVariant | None"] = relationship(lazy="selectin")


# ── Refund / Return ────────────────────────────────────────────
class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    refund_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    refund_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    refund_method: Mapped[str] = mapped_column(String(30), default="CASH")
    restock_items: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    sale: Mapped["Sale"] = relationship(back_populates="refunds", lazy="selectin")
    user: Mapped["User"] = relationship(lazy="selectin")
    items: Mapped[list["RefundItem"]] = relationship(back_populates="refund", lazy="selectin", cascade="all, delete-orphan")


class RefundItem(Base):
    __tablename__ = "refund_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    refund_id: Mapped[int] = mapped_column(ForeignKey("refunds.id", ondelete="CASCADE"), nullable=False)
    sale_item_id: Mapped[int] = mapped_column(ForeignKey("sale_items.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_returned: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    line_refund: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    refund: Mapped["Refund"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(lazy="selectin")


# ── Inter-Store Transfer ───────────────────────────────────────
class StoreTransfer(Base):
    __tablename__ = "store_transfers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    transfer_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    from_store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    to_store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING/IN_TRANSIT/RECEIVED/CANCELLED
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    from_store: Mapped["Store"] = relationship(back_populates="transfers_from", lazy="selectin", foreign_keys=[from_store_id])
    to_store: Mapped["Store"] = relationship(back_populates="transfers_to", lazy="selectin", foreign_keys=[to_store_id])
    user: Mapped["User"] = relationship(lazy="selectin")
    items: Mapped[list["TransferItem"]] = relationship(back_populates="transfer", lazy="selectin", cascade="all, delete-orphan")


class TransferItem(Base):
    __tablename__ = "transfer_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    transfer_id: Mapped[int] = mapped_column(ForeignKey("store_transfers.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id"), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantity_received: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)

    transfer: Mapped["StoreTransfer"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(lazy="selectin")


# ── Purchase Order ─────────────────────────────────────────────
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    po_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT/SENT/PARTIAL/RECEIVED/CANCELLED
    order_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    expected_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    store: Mapped["Store"] = relationship(lazy="selectin")
    supplier: Mapped["Supplier"] = relationship(back_populates="purchase_orders", lazy="selectin")
    user: Mapped["User"] = relationship(lazy="selectin")
    items: Mapped[list["PurchaseOrderItem"]] = relationship(back_populates="po", lazy="selectin", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id"), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantity_received: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    po: Mapped["PurchaseOrder"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(lazy="selectin")


# ── Audit Log ──────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped["User | None"] = relationship(back_populates="audit_logs")
