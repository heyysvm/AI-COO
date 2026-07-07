"""Product Pydantic v2 schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    category: Optional[str] = ""
    description: Optional[str] = ""
    unit_price: float = Field(default=0.0, ge=0)
    cost_price: float = Field(default=0.0, ge=0)
    unit: Optional[str] = "pcs"
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    quantity: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=10, ge=0)


class ProductUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None
    unit: Optional[str] = None
    tax_rate: Optional[float] = None
    quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    name: str
    sku: str
    category: Optional[str] = ""
    description: Optional[str] = ""
    unit_price: float = 0.0
    cost_price: float = 0.0
    unit: Optional[str] = "pcs"
    tax_rate: float = 0.0
    quantity: int = 0
    reorder_level: int = 10
    image_url: Optional[str] = ""
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
