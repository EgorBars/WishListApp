"""Initial MySQL migration

Revision ID: 002_initial
Revises: 
Create Date: 2025-05-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reset_password_token', sa.Text(), nullable=True),
        sa.Column('reset_password_expires', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
        sa.UniqueConstraint('reset_password_token', name='uq_users_reset_password_token'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_reset_password_token', 'users', ['reset_password_token'])

    # Create wishlists table
    op.create_table(
        'wishlists',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('public_id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('public_id', name='uq_wishlists_public_id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_wishlists_user_id', 'wishlists', ['user_id'])
    op.create_index('ix_wishlists_public_id', 'wishlists', ['public_id'])

    # Create items table
    op.create_table(
        'items',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='BYN'),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('price >= 0', name='ck_items_price_non_negative'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )

    # Create wishlist_items table
    op.create_table(
        'wishlist_items',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('wishlist_id', sa.String(36), nullable=False),
        sa.Column('item_id', sa.String(36), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('is_purchased', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wishlist_id'], ['wishlists.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('wishlist_id', 'item_id', name='uq_wishlist_item_wishlist_id_item_id'),
        sa.CheckConstraint('priority BETWEEN 1 AND 5', name='ck_wishlist_items_priority_range'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_wishlist_items_wishlist_id', 'wishlist_items', ['wishlist_id'])
    op.create_index('ix_wishlist_items_item_id', 'wishlist_items', ['item_id'])

    # Create reservations table
    op.create_table(
        'reservations',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('wishlist_item_id', sa.String(36), nullable=False),
        sa.Column('guest_name', sa.String(100), nullable=False),
        sa.Column('guest_email', sa.String(255), nullable=False),
        sa.Column('reservation_token', sa.String(128), nullable=False),
        sa.Column('reserved_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wishlist_item_id'], ['wishlist_items.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('wishlist_item_id', name='uq_reservations_wishlist_item_id'),
        sa.UniqueConstraint('reservation_token', name='uq_reservations_token'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_reservations_wishlist_item_id', 'reservations', ['wishlist_item_id'])
    op.create_index('ix_reservations_token', 'reservations', ['reservation_token'])


def downgrade() -> None:
    op.drop_table('reservations')
    op.drop_table('wishlist_items')
    op.drop_table('items')
    op.drop_table('wishlists')
    op.drop_table('users')
