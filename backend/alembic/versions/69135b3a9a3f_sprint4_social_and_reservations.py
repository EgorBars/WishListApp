"""sprint4_social_and_reservations

Revision ID: 69135b3a9a3f
Revises: 001_initial
Create Date: 2026-04-22 23:42:00.586818

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69135b3a9a3f'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Добавляем public_id в wishlists (безопасно)
    op.add_column('wishlists', sa.Column('public_id', sa.UUID(), nullable=True))
    op.execute("UPDATE wishlists SET public_id = gen_random_uuid() WHERE public_id IS NULL")
    op.alter_column('wishlists', 'public_id', nullable=False)
    op.create_index(op.f('ix_wishlists_public_id'), 'wishlists', ['public_id'], unique=True)

    # 2. Подготовка wishlist_items
    op.add_column('wishlist_items', sa.Column('id', sa.UUID(), nullable=True))
    op.execute("UPDATE wishlist_items SET id = gen_random_uuid() WHERE id IS NULL")
    op.alter_column('wishlist_items', 'id', nullable=False)

    # УМНОЕ УДАЛЕНИЕ PK: находим имя первичного ключа в системных таблицах Postgres и удаляем его
    op.execute("""
        DO $$ 
        DECLARE 
            pk_name TEXT;
        BEGIN
            SELECT conname INTO pk_name
            FROM pg_constraint 
            WHERE conrelid = 'wishlist_items'::regclass AND contype = 'p';

            IF pk_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE wishlist_items DROP CONSTRAINT ' || quote_ident(pk_name);
            END IF;
        END $$;
    """)

    # Устанавливаем новый первичный ключ на колонку id
    op.create_primary_key('wishlist_items_pkey', 'wishlist_items', ['id'])

    # Пересоздаем уникальность для пары (wishlist_id, item_id), если её еще нет
    op.execute("ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS uq_wishlist_item_wishlist_id_item_id")
    op.create_unique_constraint('uq_wishlist_item_wishlist_id_item_id', 'wishlist_items', ['wishlist_id', 'item_id'])

    # 3. Создаем таблицу reservations
    op.create_table('reservations',
                    sa.Column('id', sa.UUID(), nullable=False),
                    sa.Column('wishlist_item_id', sa.UUID(), nullable=False),
                    sa.Column('guest_name', sa.String(length=100), nullable=False),
                    sa.Column('guest_email', sa.String(length=255), nullable=False),
                    sa.Column('reserved_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
                    sa.ForeignKeyConstraint(['wishlist_item_id'], ['wishlist_items.id'], ondelete='CASCADE'),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_reservations_wishlist_item_id'), 'reservations', ['wishlist_item_id'], unique=True)


def downgrade() -> None:
    op.drop_table('reservations')
    op.drop_index(op.f('ix_wishlists_public_id'), table_name='wishlists')
    op.drop_column('wishlists', 'public_id')
    op.drop_constraint('uq_wishlist_item_wishlist_id_item_id', 'wishlist_items', type_='unique')

    # Возвращаем старый составной ключ (на всякий случай)
    op.drop_constraint('wishlist_items_pkey', 'wishlist_items', type_='primary')
    op.create_primary_key('wishlist_items_pkey', 'wishlist_items', ['wishlist_id', 'item_id'])
    op.drop_column('wishlist_items', 'id')