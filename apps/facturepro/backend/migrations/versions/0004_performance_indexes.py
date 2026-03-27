"""Database Performance Indexes Migration.

Creates optimized indexes for high-performance queries:
- Customer lookups by organisation
- Invoice searches by status and date
- Product searches by SKU/barcode
- Payment queries by invoice

Note: is_active columns are added in migration 0005_soft_delete
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_performance_indexes"
down_revision = "0003_multi_tenant"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add performance indexes."""

    # Organisation indexes - simple unique index on lowercase slug
    op.create_index(
        "ix_organisations_slug_lower",
        "organisations",
        [sa.text("lower(slug)")],
        unique=True,
    )

    # User indexes
    op.create_index(
        "ix_users_email_lower",
        "users",
        [sa.text("lower(email)")],
        unique=True,
    )
    op.create_index(
        "ix_users_organisation_role",
        "users",
        ["organisation_id", "role"],
    )
    op.create_index(
        "ix_users_organisation",
        "users",
        ["organisation_id"],
    )

    # Customer indexes
    op.create_index(
        "ix_customers_search",
        "customers",
        ["organisation_id", "name"],
    )
    op.create_index(
        "ix_customers_organisation",
        "customers",
        ["organisation_id"],
    )
    op.create_index(
        "ix_customers_email_lower",
        "customers",
        [sa.text("lower(email)")],
    )

    # Product indexes
    op.create_index(
        "ix_products_org_category",
        "products",
        ["organisation_id", "category_id"],
    )
    op.create_index(
        "ix_products_organisation",
        "products",
        ["organisation_id"],
    )
    op.create_index(
        "ix_products_sku_lower",
        "products",
        [sa.text("lower(sku)")],
        unique=True,
    )
    op.create_index(
        "ix_products_barcode_lower",
        "products",
        [sa.text("lower(barcode)")],
        unique=True,
    )

    # Invoice indexes - critical for dashboard queries
    op.create_index(
        "ix_invoices_org_status_date",
        "invoices",
        ["organisation_id", "status", "issue_date"],
    )
    op.create_index(
        "ix_invoices_org_customer",
        "invoices",
        ["organisation_id", "customer_id"],
    )
    op.create_index(
        "ix_invoices_org_due_date",
        "invoices",
        ["organisation_id", "due_date"],
    )
    op.create_index(
        "ix_invoices_overdue",
        "invoices",
        ["organisation_id", "due_date", "status"],
    )
    op.create_index(
        "ix_invoices_payment_link",
        "invoices",
        ["payment_link_token"],
        unique=True,
    )
    # Note: ix_invoices_number already created in 0001_initial.py

    # Invoice items index
    op.create_index(
        "ix_invoice_items_invoice_product",
        "invoice_items",
        ["invoice_id", "product_id"],
    )

    # Payment indexes
    op.create_index(
        "ix_payments_invoice_date",
        "payments",
        ["invoice_id", "paid_at"],
    )
    op.create_index(
        "ix_payments_method",
        "payments",
        ["method", "paid_at"],
    )
    op.create_index(
        "ix_payments_organisation",
        "payments",
        ["organisation_id"],
    )

    # Quote indexes
    op.create_index(
        "ix_quotes_org_status",
        "quotes",
        ["organisation_id", "status"],
    )
    op.create_index(
        "ix_quotes_expiry",
        "quotes",
        ["organisation_id", "expiry_date"],
    )
    op.create_index(
        "ix_quotes_number",
        "quotes",
        ["quote_number"],
        unique=True,
    )

    # Expense indexes
    op.create_index(
        "ix_expenses_org_date",
        "expenses",
        ["organisation_id", "expense_date"],
    )
    op.create_index(
        "ix_expenses_org_category",
        "expenses",
        ["organisation_id", "category_id"],
    )

    # Audit log indexes
    op.create_index(
        "ix_audit_logs_org_date",
        "audit_logs",
        ["organisation_id", "created_at"],
    )
    op.create_index(
        "ix_audit_logs_user",
        "audit_logs",
        ["user_id", "created_at"],
    )
    op.create_index(
        "ix_audit_logs_resource",
        "audit_logs",
        ["resource", "resource_id"],
    )

    # Subscription indexes
    op.create_index(
        "ix_subscriptions_status_period",
        "subscriptions",
        ["status", "current_period_end"],
    )

    # Usage quota indexes
    op.create_index(
        "ix_usage_quotas_month",
        "usage_quotas",
        ["month", "year"],
    )


def downgrade() -> None:
    """Remove performance indexes."""
    # Drop in reverse order
    op.drop_index("ix_usage_quotas_month", "usage_quotas")
    op.drop_index("ix_subscriptions_status_period", "subscriptions")
    op.drop_index("ix_audit_logs_resource", "audit_logs")
    op.drop_index("ix_audit_logs_user", "audit_logs")
    op.drop_index("ix_audit_logs_org_date", "audit_logs")
    op.drop_index("ix_expenses_org_category", "expenses")
    op.drop_index("ix_expenses_org_date", "expenses")
    op.drop_index("ix_quotes_number", "quotes")
    op.drop_index("ix_quotes_expiry", "quotes")
    op.drop_index("ix_quotes_org_status", "quotes")
    op.drop_index("ix_payments_organisation", "payments")
    op.drop_index("ix_payments_method", "payments")
    op.drop_index("ix_payments_invoice_date", "payments")
    op.drop_index("ix_invoice_items_invoice_product", "invoice_items")
    op.drop_index("ix_invoices_payment_link", "invoices")
    # Note: ix_invoices_number dropped automatically when invoices table is dropped
    op.drop_index("ix_invoices_overdue", "invoices")
    op.drop_index("ix_invoices_org_due_date", "invoices")
    op.drop_index("ix_invoices_org_customer", "invoices")
    op.drop_index("ix_invoices_org_status_date", "invoices")
    op.drop_index("ix_products_barcode_lower", "products")
    op.drop_index("ix_products_sku_lower", "products")
    op.drop_index("ix_products_organisation", "products")
    op.drop_index("ix_products_org_category", "products")
    op.drop_index("ix_customers_email_lower", "customers")
    op.drop_index("ix_customers_organisation", "customers")
    op.drop_index("ix_customers_search", "customers")
    op.drop_index("ix_users_organisation", "users")
    op.drop_index("ix_users_organisation_role", "users")
    op.drop_index("ix_users_email_lower", "users")
    op.drop_index("ix_organisations_slug_lower", "organisations")
