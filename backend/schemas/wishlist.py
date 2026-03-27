import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class WishlistSummary(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    is_public: bool
    items_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WishlistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    is_public: bool = False


class WishlistUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    is_public: bool | None = None


class WishlistOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    is_public: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WishlistItemInList(BaseModel):
    id: uuid.UUID
    title: str
    price: Decimal
    currency: str
    url: str
    image_url: str | None
    priority: int
    note: str | None
    is_purchased: bool
    added_at: datetime


class WishlistDetail(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    is_public: bool
    items: list[WishlistItemInList]


class WishlistItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=2000)
    price: Decimal = Field(ge=0)
    currency: Literal["BYN", "USD", "EUR"] = "BYN"
    image_url: str | None = Field(default=None, max_length=2000)
    priority: int = Field(default=3, ge=1, le=5)
    note: str | None = Field(default=None, max_length=500)


class WishlistItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, max_length=2000)
    price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = None
    image_url: str | None = Field(default=None, max_length=2000)
    note: str | None = Field(default=None, max_length=500)
    priority: int | None = Field(default=None, ge=1, le=5)
    is_purchased: bool | None = None


class WishlistItemOut(BaseModel):
    id: uuid.UUID
    title: str
    price: Decimal
    currency: str
    url: str
    image_url: str | None
    priority: int
    note: str | None
    is_purchased: bool
    added_at: datetime
