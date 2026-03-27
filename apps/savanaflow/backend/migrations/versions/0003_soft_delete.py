"""Add soft delete columns to SavanaFlow tables

Revision ID: 0003_soft_delete
Revises: 0002_extended_schema
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003_soft_delete'
down_revision = '0002_extended_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add soft delete columns to all relevant tables."""

    # List of tables to add soft delete columns
    tables = [
        'users',
        'stores',
        'products',
        'categories',
        'customers',
        'sales',
        'sale_items',
        'suppliers',
        'inventory_transactions',
        'purchase_orders',
        'shifts',
        'refunds',
        'promotions',
        'loyalty_points',
    ]

    for table in tables:
        # Check if table exists
        conn = op.get_bind()
        inspector = sa.inspect(conn)
        if table in inspector.get_table_names():
            # Check if columns already exist
            columns = [col['name'] for col in inspector.get_columns(table)]

            if 'deleted_at' not in columns:
                op.add_column(
                    table,
                    sa.Column('deleted_at', sa.DateTime(), nullable=True)
                )

            if 'is_deleted' not in columns:
                op.add_column(
                    table,
                    sa.Column(
                        'is_deleted',
                        sa.Boolean(),
                        nullable=False,
                        server_default='0'
                    )
                )
                # Create index for is_deleted
                op.create_index(
                    f'ix_{table}_is_deleted',
                    table,
                    ['is_deleted']
                )

            # Create composite index for deleted_at
            op.create_index(
                f'ix_{table}_deleted_at',
                table,
                ['deleted_at']
            )


def downgrade() -> None:
    """Remove soft delete columns from all tables."""

    tables = [
        'users',
        'stores',
        'products',
        'categories',
        'customers',
        'sales',
        'sale_items',
        'suppliers',
        'inventory_transactions',
        'purchase_orders',
        'shifts',
        'refunds',
        'promotions',
        'loyalty_points',
    ]

    for table in tables:
        conn = op.get_bind()
        inspector = sa.inspect(conn)

        if table in inspector.get_table_names():
            # Drop indexes first
            try:
                op.drop_index(f'ix_{table}_is_deleted', table)
            except Exception:
                pass
            try:
                op.drop_index(f'ix_{table}_deleted_at', table)
            except Exception:
                pass

            # Drop columns
            columns = [col['name'] for col in inspector.get_columns(table)]
            if 'is_deleted' in columns:
                op.drop_column(table, 'is_deleted')
            if 'deleted_at' in columns:
                op.drop_column(table, 'deleted_at')
