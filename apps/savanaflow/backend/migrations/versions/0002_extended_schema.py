"""Extended SavanaFlow schema — Categories, Variants, Loyalty, Promotions, Shifts, Refunds, Transfers, Suppliers, POs

Revision ID: 0002_extended_schema
Revises: 0001_initial
Create Date: 2024-06-01 00:00:00.000000
"""
from __future__ import annotations
import sqlalchemy as sa
from alembic import op

revision = "0002_extended_schema"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Create new standalone tables first ─────────────────────

    op.create_table(
        "categories",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.BigInteger(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("color", sa.String(10), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
    )

    op.create_table(
        "suppliers",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("contact_name", sa.String(200), nullable=True),
        sa.Column("payment_terms", sa.Integer(), server_default="30"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── 2. Extend existing tables (only NEW columns not in 0001) ──

    # stores: add city, currency, tax_rate, receipt_header, receipt_footer
    with op.batch_alter_table("stores") as batch_op:
        batch_op.add_column(sa.Column("city", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("currency", sa.String(5), server_default="XOF"))
        batch_op.add_column(sa.Column("tax_rate", sa.Numeric(5, 2), server_default="0"))
        batch_op.add_column(sa.Column("receipt_header", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("receipt_footer", sa.Text(), nullable=True))

    # users: add store_id
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("store_id", sa.BigInteger(), nullable=True))

    # products: add category_id, supplier_id, has_variants
    # NOTE: barcode and sku already exist in 0001 — DO NOT add them again
    with op.batch_alter_table("products") as batch_op:
        batch_op.add_column(sa.Column("category_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("supplier_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("has_variants", sa.Boolean(), server_default="false"))

    # Add FK constraints for products (tables now exist)
    op.execute("ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)")
    op.execute("ALTER TABLE products ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)")

    # stock_movements: add variant_id
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.add_column(sa.Column("variant_id", sa.BigInteger(), nullable=True))

    # sales: add shift_id, customer_id, promotion_id, loyalty columns
    # NOTE: discount_amount, payment_method, payment_reference, status, currency already in 0001
    with op.batch_alter_table("sales") as batch_op:
        batch_op.add_column(sa.Column("shift_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("customer_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("promotion_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("loyalty_discount", sa.Numeric(14, 2), server_default="0"))
        batch_op.add_column(sa.Column("loyalty_points_earned", sa.Integer(), server_default="0"))
        batch_op.add_column(sa.Column("loyalty_points_used", sa.Integer(), server_default="0"))

    # sale_items: add variant_id, discount_percent
    # NOTE: id, sale_id, product_id, quantity, unit_price, tax_rate, line_total, cost_price already in 0001
    with op.batch_alter_table("sale_items") as batch_op:
        batch_op.add_column(sa.Column("variant_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("discount_percent", sa.Numeric(5, 2), server_default="0"))

    # ── 3. Create remaining new tables ────────────────────────────

    op.create_table(
        "product_variants",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sku", sa.String(100), nullable=True),
        sa.Column("barcode", sa.String(100), unique=True, nullable=True),
        sa.Column("attributes", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("sell_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("cost_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("stock_quantity", sa.Numeric(12, 2), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
    )
    op.create_index("ix_product_variants_barcode", "product_variants", ["barcode"])

    # Add FK from stock_movements.variant_id → product_variants
    op.execute("ALTER TABLE stock_movements ADD CONSTRAINT fk_sm_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)")

    op.create_table(
        "pos_customers",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("store_id", sa.BigInteger(), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("loyalty_points", sa.Integer(), server_default="0"),
        sa.Column("loyalty_tier", sa.String(20), server_default="STANDARD"),
        sa.Column("total_spent", sa.Numeric(14, 2), server_default="0"),
        sa.Column("visit_count", sa.Integer(), server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_visit", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_pos_customers_phone", "pos_customers", ["phone"])

    op.create_table(
        "promotions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("promo_type", sa.String(30), nullable=False),
        sa.Column("value", sa.Numeric(10, 2), nullable=False),
        sa.Column("min_purchase", sa.Numeric(12, 2), server_default="0"),
        sa.Column("max_discount", sa.Numeric(12, 2), nullable=True),
        sa.Column("applies_to", sa.String(20), server_default="ALL"),
        sa.Column("category_id", sa.BigInteger(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("code", sa.String(50), unique=True, nullable=True),
        sa.Column("usage_limit", sa.Integer(), nullable=True),
        sa.Column("usage_count", sa.Integer(), server_default="0"),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_promotions_code", "promotions", ["code"])

    op.create_table(
        "promotion_products",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("promotion_id", sa.BigInteger(), sa.ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
    )

    op.create_table(
        "shifts",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("store_id", sa.BigInteger(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("opening_cash", sa.Numeric(14, 2), server_default="0"),
        sa.Column("closing_cash", sa.Numeric(14, 2), nullable=True),
        sa.Column("expected_cash", sa.Numeric(14, 2), nullable=True),
        sa.Column("cash_difference", sa.Numeric(14, 2), nullable=True),
        sa.Column("total_sales", sa.Numeric(14, 2), server_default="0"),
        sa.Column("total_refunds", sa.Numeric(14, 2), server_default="0"),
        sa.Column("sales_count", sa.Integer(), server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="OPEN"),
    )

    # Now add FKs from sales to the newly created tables
    op.execute("ALTER TABLE sales ADD CONSTRAINT fk_sales_shift FOREIGN KEY (shift_id) REFERENCES shifts(id)")
    op.execute("ALTER TABLE sales ADD CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES pos_customers(id)")
    op.execute("ALTER TABLE sales ADD CONSTRAINT fk_sales_promotion FOREIGN KEY (promotion_id) REFERENCES promotions(id)")
    op.execute("ALTER TABLE sale_items ADD CONSTRAINT fk_si_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)")

    op.create_table(
        "loyalty_transactions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.BigInteger(), sa.ForeignKey("pos_customers.id"), nullable=False),
        sa.Column("sale_id", sa.BigInteger(), sa.ForeignKey("sales.id"), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("description", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "refunds",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("refund_number", sa.String(50), unique=True, nullable=False),
        sa.Column("sale_id", sa.BigInteger(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("refund_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("refund_method", sa.String(30), server_default="CASH"),
        sa.Column("restock_items", sa.Boolean(), server_default="true"),
        sa.Column("status", sa.String(20), server_default="COMPLETED"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "refund_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("refund_id", sa.BigInteger(), sa.ForeignKey("refunds.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sale_item_id", sa.BigInteger(), sa.ForeignKey("sale_items.id"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity_returned", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_refund", sa.Numeric(14, 2), nullable=False),
    )

    op.create_table(
        "store_transfers",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("transfer_number", sa.String(50), unique=True, nullable=False),
        sa.Column("from_store_id", sa.BigInteger(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("to_store_id", sa.BigInteger(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), server_default="PENDING"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "transfer_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("transfer_id", sa.BigInteger(), sa.ForeignKey("store_transfers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("variant_id", sa.BigInteger(), sa.ForeignKey("product_variants.id"), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity_received", sa.Numeric(10, 2), server_default="0"),
    )

    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("po_number", sa.String(50), unique=True, nullable=False),
        sa.Column("store_id", sa.BigInteger(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("supplier_id", sa.BigInteger(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), server_default="DRAFT"),
        sa.Column("order_date", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expected_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("currency", sa.String(5), server_default="XOF"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_purchase_orders_po_number", "purchase_orders", ["po_number"])

    op.create_table(
        "purchase_order_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("po_id", sa.BigInteger(), sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("variant_id", sa.BigInteger(), sa.ForeignKey("product_variants.id"), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity_received", sa.Numeric(10, 2), server_default="0"),
        sa.Column("unit_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(14, 2), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")
    op.drop_table("transfer_items")
    op.drop_table("store_transfers")
    op.drop_table("refund_items")
    op.drop_table("refunds")
    op.drop_table("loyalty_transactions")
    op.drop_table("shifts")
    op.drop_table("promotion_products")
    op.drop_table("promotions")
    op.drop_table("pos_customers")
    op.drop_table("product_variants")
    op.drop_table("categories")
    op.drop_table("suppliers")
