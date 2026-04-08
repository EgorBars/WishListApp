from pydantic import BaseModel, HttpUrl, Field
from typing import Optional
from decimal import Decimal

class ParseRequest(BaseModel):
    url: str = Field(..., max_length=2048)

class ParseResponse(BaseModel):
    title: Optional[str] = None
    price: Optional[Decimal] = None
    currency: str = "BYN"
    image_url: Optional[str] = None
    url: str