import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
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

    # НОВОЕ ПОЛЕ SPRINT 4: Публичный ID для шеринга
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        default=uuid.uuid4,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    # Связи
    items: Mapped[list["WishlistItem"]] = relationship(
        back_populates="wishlist", cascade="all, delete-orphan"
    )
    user: Mapped["User"] = relationship(lazy="select")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="BYN")
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    wishlists: Mapped[list["WishlistItem"]] = relationship(back_populates="item")

    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_items_price_non_negative"),
    )


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    # ИЗМЕНЕНИЕ SPRINT 4: Добавляем суррогатный ID для связи с Reservation
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
    )
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_purchased: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Связи
    wishlist: Mapped["Wishlist"] = relationship(back_populates="items")
    item: Mapped["Item"] = relationship(back_populates="wishlists")

    # НОВОЕ В SPRINT 4: Связь 1-к-1 с бронированием
    reservation: Mapped["Reservation | None"] = relationship(
        back_populates="wishlist_item",
        cascade="all, delete-orphan",
        uselist=False
    )

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
        Index("ix_wishlist_items_wishlist_id", "wishlist_id"),
        Index("ix_wishlist_items_item_id", "item_id"),
    )


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # UNIQUE обеспечивает, что один товар в списке забронирован только один раз
    wishlist_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wishlist_items.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    guest_name: Mapped[str] = mapped_column(String(100), nullable=False)
    guest_email: Mapped[str] = mapped_column(String(255), nullable=False)
    reserved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Связь обратно к товару в списке
    wishlist_item: Mapped["WishlistItem"] = relationship(back_populates="reservation")