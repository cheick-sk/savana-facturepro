"""Extended schema — Quotes, Credit Notes, Expenses, Suppliers, Purchase Orders, Recurring, Payment Links

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
    # ── 1. Create NEW tables FIRST (so FKs can reference them) ────

    # Product categories
    op.create_table(
        "product_categories",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.BigInteger(), sa.ForeignKey("product_categories.id"), nullable=True),
        sa.Column("color", sa.String(10), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Suppliers
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

    # Recurring invoices (needed before invoices FK)
    op.create_table(
        "recurring_invoices",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.BigInteger(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("frequency", sa.String(20), nullable=False),
        sa.Column("next_run_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("template_data", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("last_run_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Quotes (needed before invoices FK)
    op.create_table(
        "quotes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("quote_number", sa.String(50), unique=True, nullable=False),
        sa.Column("customer_id", sa.BigInteger(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), server_default="DRAFT"),
        sa.Column("subtotal", sa.Numeric(14, 2), server_default="0"),
        sa.Column("tax_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("discount_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("discount_percent", sa.Numeric(5, 2), server_default="0"),
        sa.Column("total_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "quote_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("quote_id", sa.BigInteger(), sa.ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("tax_rate", sa.Numeric(5, 2), server_default="0"),
        sa.Column("discount_percent", sa.Numeric(5, 2), server_default="0"),
        sa.Column("line_total", sa.Numeric(14, 2), nullable=False),
    )

    # ── 2. Now alter existing tables (FKs reference tables that now exist) ──

    # Extend customers
    with op.batch_alter_table("customers") as batch_op:
        batch_op.add_column(sa.Column("city", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("country", sa.String(50), server_default="Côte d'Ivoire"))
        batch_op.add_column(sa.Column("tax_number", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("credit_limit", sa.Numeric(14, 2), server_default="0"))

    # Extend products (now product_categories and suppliers exist)
    with op.batch_alter_table("products") as batch_op:
        batch_op.add_column(sa.Column("sku", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("barcode", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("purchase_price", sa.Numeric(12, 2), server_default="0"))
        batch_op.add_column(sa.Column("category_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("supplier_id", sa.BigInteger(), nullable=True))

    # Add FK constraints separately using execute (avoids batch_alter FK issues)
    op.execute("ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id)")
    op.execute("ALTER TABLE products ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)")

    # Extend invoices (now quotes and recurring_invoices exist)
    with op.batch_alter_table("invoices") as batch_op:
        batch_op.add_column(sa.Column("quote_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("recurring_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("amount_paid", sa.Numeric(14, 2), server_default="0"))
        batch_op.add_column(sa.Column("discount_amount", sa.Numeric(14, 2), server_default="0"))
        batch_op.add_column(sa.Column("discount_percent", sa.Numeric(5, 2), server_default="0"))
        batch_op.add_column(sa.Column("notes_internal", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("payment_link_token", sa.String(64), nullable=True))

    op.execute("ALTER TABLE invoices ADD CONSTRAINT fk_invoices_quote FOREIGN KEY (quote_id) REFERENCES quotes(id)")
    op.execute("ALTER TABLE invoices ADD CONSTRAINT fk_invoices_recurring FOREIGN KEY (recurring_id) REFERENCES recurring_invoices(id)")

    # Extend invoice_items
    with op.batch_alter_table("invoice_items") as batch_op:
        batch_op.add_column(sa.Column("discount_percent", sa.Numeric(5, 2), server_default="0"))

    # ── 3. Create remaining tables ─────────────────────────────────

    op.create_table(
        "credit_notes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("credit_number", sa.String(50), unique=True, nullable=False),
        sa.Column("invoice_id", sa.BigInteger(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("customer_id", sa.BigInteger(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("subtotal", sa.Numeric(14, 2), server_default="0"),
        sa.Column("tax_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("total_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("status", sa.String(20), server_default="DRAFT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "credit_note_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("credit_note_id", sa.BigInteger(), sa.ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("tax_rate", sa.Numeric(5, 2), server_default="0"),
        sa.Column("line_total", sa.Numeric(14, 2), nullable=False),
    )

    op.create_table(
        "expense_categories",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
    )

    op.create_table(
        "expenses",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category_id", sa.BigInteger(), sa.ForeignKey("expense_categories.id"), nullable=True),
        sa.Column("supplier_id", sa.BigInteger(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("expense_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payment_method", sa.String(30), server_default="CASH"),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("receipt_path", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("po_number", sa.String(50), unique=True, nullable=False),
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

    op.create_table(
        "purchase_order_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("po_id", sa.BigInteger(), sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity_received", sa.Numeric(10, 2), server_default="0"),
        sa.Column("unit_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(14, 2), nullable=False),
    )

    op.create_table(
        "payment_links",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("token", sa.String(64), unique=True, nullable=False),
        sa.Column("invoice_id", sa.BigInteger(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("views", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Extend payments table — add notes (column missing from 0001)
    with op.batch_alter_table("payments") as batch_op:
        batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))

        # Indexes
    op.create_index("ix_payment_links_token", "payment_links", ["token"])
    op.create_index("ix_purchase_orders_po_number", "purchase_orders", ["po_number"])
    op.create_index("ix_quotes_quote_number", "quotes", ["quote_number"])
    op.create_index("ix_credit_notes_credit_number", "credit_notes", ["credit_number"])
    op.create_index("ix_recurring_invoices_next_run", "recurring_invoices", ["next_run_date"])


def downgrade() -> None:
    op.drop_table("payment_links")
    op.drop_table("payments")
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")
    op.drop_table("expenses")
    op.drop_table("expense_categories")
    op.drop_table("credit_note_items")
    op.drop_table("credit_notes")
    op.drop_table("quote_items")
    op.drop_table("quotes")
    op.drop_table("recurring_invoices")
    op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_quote")
    op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_recurring")
    op.execute("ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_category")
    op.execute("ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_supplier")
    op.drop_table("suppliers")
    op.drop_table("product_categories")
