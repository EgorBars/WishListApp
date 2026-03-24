"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-03-25

"""

from typing import Sequence, Union

from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from db.session import Base
    from models.user import User  # noqa: F401
    from models.wishlist import Item, Wishlist, WishlistItem  # noqa: F401

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    from db.session import Base
    from models.user import User  # noqa: F401
    from models.wishlist import Item, Wishlist, WishlistItem  # noqa: F401

    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
