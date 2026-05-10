"""add_reservation_token

Revision ID: b7c4f2fcb2a1
Revises: 69135b3a9a3f
Create Date: 2026-05-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c4f2fcb2a1"
down_revision: Union[str, None] = "69135b3a9a3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reservations", sa.Column("reservation_token", sa.String(length=128), nullable=True))
    op.execute("UPDATE reservations SET reservation_token = encode(gen_random_bytes(24), 'hex') WHERE reservation_token IS NULL")
    op.alter_column("reservations", "reservation_token", nullable=False)
    op.create_index(op.f("ix_reservations_reservation_token"), "reservations", ["reservation_token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_reservations_reservation_token"), table_name="reservations")
    op.drop_column("reservations", "reservation_token")
