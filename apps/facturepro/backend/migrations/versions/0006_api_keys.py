"""Add API key and usage tracking tables.

Revision ID: 0006_api_keys
Revises: 0004_performance_indexes
Create Date: 2024-01-15 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006_api_keys'
down_revision = '0004_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create api_keys table
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organisation_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('key', sa.String(length=64), nullable=False),
        sa.Column('key_prefix', sa.String(length=8), nullable=False),
        sa.Column('secret', sa.String(length=128), nullable=True),
        sa.Column('scopes', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('rate_limit', sa.Integer(), nullable=False, server_default='1000'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )
    op.create_index('ix_api_keys_organisation_id', 'api_keys', ['organisation_id'])
    op.create_index('ix_api_keys_key', 'api_keys', ['key'], unique=True)

    # Create api_key_usage table
    op.create_table(
        'api_key_usage',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.String(length=255), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('response_time_ms', sa.Integer(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('request_size_bytes', sa.Integer(), nullable=True),
        sa.Column('response_size_bytes', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_api_key_usage_key_id', 'api_key_usage', ['api_key_id'])
    op.create_index('ix_api_key_usage_created_at', 'api_key_usage', ['created_at'])
    op.create_index('ix_api_key_usage_key_created', 'api_key_usage', ['api_key_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_api_key_usage_key_created', table_name='api_key_usage')
    op.drop_index('ix_api_key_usage_created_at', table_name='api_key_usage')
    op.drop_index('ix_api_key_usage_key_id', table_name='api_key_usage')
    op.drop_table('api_key_usage')
    
    op.drop_index('ix_api_keys_key', table_name='api_keys')
    op.drop_index('ix_api_keys_organisation_id', table_name='api_keys')
    op.drop_table('api_keys')
