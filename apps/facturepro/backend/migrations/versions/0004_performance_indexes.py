"""Database Performance Indexes Migration.

Creates optimized indexes for high-performance queries:
- Customer lookups by organisation
- Invoice searches by status and date
- Product searches by SKU/barcode
- Payment queries by invoice
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_performance_indexes"
down_revision = "0003_multi_tenant"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add performance indexes."""

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
        "ix_users_active",
        "users",
        ["is_active", "organisation_id"],
        postgresql_where=sa.text("is_active = true"),
    )

    # Customer indexes
    op.create_index(
        "ix_customers_search",
        "customers",
        ["organisation_id", "name"],
    )
    op.create_index(
        "ix_customers_active_org",
        "customers",
        ["organisation_id", "is_active"],
        postgresql_where=sa.text("is_active = true"),
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
        "ix_products_active_org",
        "products",
        ["organisation_id", "is_active"],
        postgresql_where=sa.text("is_active = true"),
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
        ["organisation_id", "status", "due_date"],
        postgresql_where=sa.text("status IN ('SENT', 'PARTIAL') AND due_date < CURRENT_DATE"),
    )

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
        postgresql_where=sa.text("status = 'DRAFT'"),
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

    # Supplier indexes
    op.create_index(
        "ix_suppliers_org_active",
        "suppliers",
        ["organisation_id", "is_active"],
        postgresql_where=sa.text("is_active = true"),
    )

    # Product categories indexes
    op.create_index(
        "ix_product_categories_org_active",
        "product_categories",
        ["organisation_id", "is_active"],
        postgresql_where=sa.text("is_active = true"),
    )


def downgrade() -> None:
    """Remove performance indexes."""
    # Drop in reverse order
    op.drop_index("ix_product_categories_org_active", "product_categories")
    op.drop_index("ix_suppliers_org_active", "suppliers")
    op.drop_index("ix_subscriptions_status_period", "subscriptions")
    op.drop_index("ix_audit_logs_resource", "audit_logs")
    op.drop_index("ix_audit_logs_user", "audit_logs")
    op.drop_index("ix_audit_logs_org_date", "audit_logs")
    op.drop_index("ix_expenses_org_category", "expenses")
    op.drop_index("ix_expenses_org_date", "expenses")
    op.drop_index("ix_quotes_expiry", "quotes")
    op.drop_index("ix_quotes_org_status", "quotes")
    op.drop_index("ix_payments_method", "payments")
    op.drop_index("ix_payments_invoice_date", "payments")
    op.drop_index("ix_invoice_items_invoice_product", "invoice_items")
    op.drop_index("ix_invoices_overdue", "invoices")
    op.drop_index("ix_invoices_org_due_date", "invoices")
    op.drop_index("ix_invoices_org_customer", "invoices")
    op.drop_index("ix_invoices_org_status_date", "invoices")
    op.drop_index("ix_products_active_org", "products")
    op.drop_index("ix_products_org_category", "products")
    op.drop_index("ix_customers_email_lower", "customers")
    op.drop_index("ix_customers_active_org", "customers")
    op.drop_index("ix_customers_search", "customers")
    op.drop_index("ix_users_active", "users")
    op.drop_index("ix_users_organisation_role", "users")
    op.drop_index("ix_users_email_lower", "users")
