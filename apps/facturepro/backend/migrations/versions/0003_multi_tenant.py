"""Multi-tenant schema migration for FacturePro Africa.
Adds organisation context to all business entities and creates tenant infrastructure.

Revision ID: 0003_multi_tenant
Revises: 0002_extended_schema
Create Date: 2025-01-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0003_multi_tenant'
down_revision = '0002_extended_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add multi-tenant infrastructure and organisation context."""
    
    # ─────────────────────────────────────────────────────────────────────────
    # 1. PLANS TABLE - Subscription plans
    # ─────────────────────────────────────────────────────────────────────────
    op.create_table(
        'plans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('slug', sa.String(50), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('price_monthly', sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column('price_yearly', sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column('currency', sa.String(3), nullable=False, default='XOF'),
        sa.Column('features', postgresql.JSONB, default={}),
        sa.Column('limits', postgresql.JSONB, default={}),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_default', sa.Boolean(), default=False),
        sa.Column('display_order', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 2. ORGANISATIONS TABLE - Tenant organisations
    # ─────────────────────────────────────────────────────────────────────────
    op.create_table(
        'organisations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('logo_url', sa.String(500)),
        sa.Column('email', sa.String(200)),
        sa.Column('phone', sa.String(50)),
        sa.Column('address', sa.Text()),
        sa.Column('city', sa.String(100)),
        sa.Column('country', sa.String(2), default='CI'),
        sa.Column('currency', sa.String(3), default='XOF'),
        sa.Column('timezone', sa.String(50), default='Africa/Abidjan'),
        sa.Column('tax_id', sa.String(50)),
        sa.Column('tax_number', sa.String(50)),
        sa.Column('status', sa.String(20), default='trial'),
        sa.Column('settings', postgresql.JSONB, default={}),
        sa.Column('metadata', postgresql.JSONB, default={}),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True)),
        sa.Column('suspended_at', sa.DateTime(timezone=True)),
        sa.Column('suspension_reason', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 3. SUBSCRIPTIONS TABLE - Organisation subscriptions
    # ─────────────────────────────────────────────────────────────────────────
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan_id', sa.Integer(), sa.ForeignKey('plans.id'), nullable=False),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('billing_cycle', sa.String(20), default='monthly'),
        sa.Column('current_period_start', sa.DateTime(timezone=True)),
        sa.Column('current_period_end', sa.DateTime(timezone=True)),
        sa.Column('cancel_at_period_end', sa.Boolean(), default=False),
        sa.Column('cancelled_at', sa.DateTime(timezone=True)),
        sa.Column('cancellation_reason', sa.Text()),
        sa.Column('stripe_subscription_id', sa.String(100)),
        sa.Column('stripe_customer_id', sa.String(100)),
        sa.Column('metadata', postgresql.JSONB, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 4. USAGE_QUOTAS TABLE - Track usage limits per organisation
    # ─────────────────────────────────────────────────────────────────────────
    op.create_table(
        'usage_quotas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('feature', sa.String(50), nullable=False),
        sa.Column('used', sa.Integer(), default=0),
        sa.Column('limit', sa.Integer(), default=0),
        sa.Column('period_start', sa.DateTime(timezone=True)),
        sa.Column('period_end', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 5. Add organisation_id to existing tables
    # ─────────────────────────────────────────────────────────────────────────
    
    # Add to users table
    op.add_column('users', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='SET NULL')))
    op.create_index('ix_users_organisation_id', 'users', ['organisation_id'])
    
    # Add to customers table
    op.add_column('customers', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_customers_organisation_id', 'customers', ['organisation_id'])
    
    # Add to invoices table
    op.add_column('invoices', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_invoices_organisation_id', 'invoices', ['organisation_id'])
    
    # Add to quotes table
    op.add_column('quotes', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_quotes_organisation_id', 'quotes', ['organisation_id'])
    
    # Add to products table
    op.add_column('products', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_products_organisation_id', 'products', ['organisation_id'])
    
    # Add to expenses table
    op.add_column('expenses', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_expenses_organisation_id', 'expenses', ['organisation_id'])
    
    # Add to payments table
    op.add_column('payments', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_payments_organisation_id', 'payments', ['organisation_id'])
    
    # Add to product_categories table (created in 0002_extended_schema)
    op.add_column('product_categories', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_product_categories_organisation_id', 'product_categories', ['organisation_id'])
    
    # Add to suppliers table
    op.add_column('suppliers', sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='CASCADE')))
    op.create_index('ix_suppliers_organisation_id', 'suppliers', ['organisation_id'])
    
    # ─────────────────────────────────────────────────────────────────────────
    # 6. Create indexes for subscriptions
    # ─────────────────────────────────────────────────────────────────────────
    op.create_index('ix_subscriptions_organisation_id', 'subscriptions', ['organisation_id'])
    op.create_index('ix_subscriptions_plan_id', 'subscriptions', ['plan_id'])
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])
    
    # ─────────────────────────────────────────────────────────────────────────
    # 7. Create unique constraint for usage_quotas
    # ─────────────────────────────────────────────────────────────────────────
    op.create_unique_constraint(
        'uq_usage_quotas_org_feature',
        'usage_quotas',
        ['organisation_id', 'feature']
    )


def downgrade() -> None:
    """Remove multi-tenant infrastructure."""
    
    # Remove unique constraint
    op.drop_constraint('uq_usage_quotas_org_feature', 'usage_quotas')
    
    # Drop indexes
    op.drop_index('ix_subscriptions_status')
    op.drop_index('ix_subscriptions_plan_id')
    op.drop_index('ix_subscriptions_organisation_id')
    op.drop_index('ix_suppliers_organisation_id')
    op.drop_index('ix_product_categories_organisation_id')
    op.drop_index('ix_payments_organisation_id')
    op.drop_index('ix_expenses_organisation_id')
    op.drop_index('ix_products_organisation_id')
    op.drop_index('ix_quotes_organisation_id')
    op.drop_index('ix_invoices_organisation_id')
    op.drop_index('ix_customers_organisation_id')
    op.drop_index('ix_users_organisation_id')
    
    # Remove organisation_id columns
    op.drop_column('suppliers', 'organisation_id')
    op.drop_column('product_categories', 'organisation_id')
    op.drop_column('payments', 'organisation_id')
    op.drop_column('expenses', 'organisation_id')
    op.drop_column('products', 'organisation_id')
    op.drop_column('quotes', 'organisation_id')
    op.drop_column('invoices', 'organisation_id')
    op.drop_column('customers', 'organisation_id')
    op.drop_column('users', 'organisation_id')
    
    # Drop tables
    op.drop_table('usage_quotas')
    op.drop_table('subscriptions')
    op.drop_table('organisations')
    op.drop_table('plans')
