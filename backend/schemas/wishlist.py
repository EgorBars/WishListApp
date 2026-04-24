import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ReservationInfo(BaseModel):
    guest_name: str
    reserved_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WishlistSummary(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    is_public: bool
    public_id: Optional[uuid.UUID] = None
    share_url: Optional[str] = None
    items_count: int
    reserved_count: int = 0
    purchased_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WishlistCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = False


class WishlistUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None


class WishlistOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    is_public: bool
    public_id: uuid.UUID
    share_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WishlistItemInList(BaseModel):
    id: uuid.UUID
    title: str
    price: Decimal
    currency: str
    url: str
    image_url: Optional[str] = None
    priority: int
    note: Optional[str] = None
    is_purchased: bool
    is_reserved: bool = False
    reserved_by: Optional[ReservationInfo] = None
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WishlistDetail(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    is_public: bool
    public_id: uuid.UUID
    share_url: Optional[str] = None
    items: list[WishlistItemInList]

    model_config = ConfigDict(from_attributes=True)


class WishlistItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=2000)
    price: Decimal = Field(..., ge=0)
    currency: Literal["BYN", "USD", "EUR"] = "BYN"
    image_url: Optional[str] = Field(None, max_length=2000)
    priority: int = Field(3, ge=1, le=5)
    note: Optional[str] = Field(None, max_length=500)


class WishlistItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, max_length=2000)
    price: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=2000)
    note: Optional[str] = Field(None, max_length=500)
    priority: Optional[int] = Field(None, ge=1, le=5)
    is_purchased: Optional[bool] = None


class WishlistItemOut(BaseModel):
    id: uuid.UUID
    title: str
    price: Decimal
    currency: str
    url: str
    image_url: Optional[str] = None
    priority: int
    note: Optional[str] = None
    is_purchased: bool
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShareLinkResponse(BaseModel):
    public_id: uuid.UUID
    share_url: str


class PublicWishlistItem(BaseModel):
    id: uuid.UUID
    title: str
    price: Decimal
    currency: str
    url: str
    image_url: Optional[str] = None
    priority: int
    is_purchased: bool
    is_reserved: bool
    reserved_by: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class PublicWishlist(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    owner_name: str
    items: list[PublicWishlistItem]

    model_config = ConfigDict(from_attributes=True)


class ReservationRequest(BaseModel):
    guest_name: str = Field(..., min_length=2, max_length=100)
    guest_email: EmailStr = Field(..., max_length=255)

    @field_validator("guest_name")
    @classmethod
    def validate_guest_name(cls, value: str) -> str:
        if not re.match(r"^[A-Za-zА-Яа-яЁёІіЇїЄєЎў\s]+$", value):
            raise ValueError("Имя должно содержать только буквы и пробелы")
        return value.strip()


class ReservationResponse(BaseModel):
    message: str
    reservation_id: uuid.UUID
    item_title: str


class PurchaseResponse(BaseModel):
    message: str
    item_title: str
