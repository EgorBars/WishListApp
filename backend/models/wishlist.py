import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base


class Wishlist(Base):
    __tablename__ = "wishlists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship()
    items: Mapped[list["WishlistItem"]] = relationship(
        back_populates="wishlist", cascade="all, delete-orphan"
    )


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="RUB")
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    wishlists: Mapped[list["WishlistItem"]] = relationship(back_populates="item")

    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_items_price_non_negative"),
    )


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        primary_key=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_purchased: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    wishlist: Mapped["Wishlist"] = relationship(back_populates="items")
    item: Mapped["Item"] = relationship(back_populates="wishlists")

    __table_args__ = (
        UniqueConstraint(
            "wishlist_id",
            "item_id",
            name="uq_wishlist_item_wishlist_id_item_id",
        ),
        CheckConstraint(
            "priority BETWEEN 1 AND 5",
            name="ck_wishlist_items_priority_range",
        ),
    )

