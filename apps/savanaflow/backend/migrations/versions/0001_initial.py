"""Initial SavanaFlow schema
Revision ID: 0001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("users",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("stores",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("products",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("store_id", sa.BigInteger(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("barcode", sa.String(100), unique=True, nullable=True),
        sa.Column("sku", sa.String(100), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("unit", sa.String(50), nullable=False, server_default="unit"),
        sa.Column("sell_price", sa.Numeric(12,2), nullable=False),
        sa.Column("cost_price", sa.Numeric(12,2), nullable=False, server_default="0"),
        sa.Column("tax_rate", sa.Numeric(5,2), nullable=False, server_default="0"),
        sa.Column("stock_quantity", sa.Numeric(12,2), nullable=False, server_default="0"),
        sa.Column("low_stock_threshold", sa.Numeric(12,2), nullable=False, server_default="10"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_products_barcode", "products", ["barcode"])
    op.create_table("stock_movements",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("movement_type", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Numeric(12,2), nullable=False),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("reason", sa.String(300), nullable=True),
        sa.Column("quantity_before", sa.Numeric(12,2), nullable=False),
        sa.Column("quantity_after", sa.Numeric(12,2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("sales",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("sale_number", sa.String(50), nullable=False, unique=True),
        sa.Column("store_id", sa.BigInteger(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subtotal", sa.Numeric(14,2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(14,2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(14,2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(14,2), nullable=False, server_default="0"),
        sa.Column("payment_method", sa.String(30), nullable=False, server_default="CASH"),
        sa.Column("payment_reference", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="COMPLETED"),
        sa.Column("currency", sa.String(5), nullable=False, server_default="XOF"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("sale_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("sale_id", sa.BigInteger(), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Numeric(10,2), nullable=False),
        sa.Column("unit_price", sa.Numeric(12,2), nullable=False),
        sa.Column("tax_rate", sa.Numeric(5,2), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Numeric(14,2), nullable=False),
        sa.Column("cost_price", sa.Numeric(12,2), nullable=False, server_default="0"),
    )
    op.create_table("audit_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(50), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade() -> None:
    for t in ["audit_logs","sale_items","sales","stock_movements","products","stores","users"]:
        op.drop_table(t)
