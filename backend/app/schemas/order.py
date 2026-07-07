"""Order Pydantic v2 schemas."""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class OrderItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: str
    product_name: str
    quantity: int = Field(..., ge=1)
    unit_price: float = Field(..., ge=0)


class OrderCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: Optional[str] = ""
    customer_name: Optional[str] = ""
    items: List[OrderItemSchema] = Field(..., min_length=1)
    discount: float = Field(default=0.0, ge=0)
    tax: float = Field(default=0.0, ge=0)
    payment_method: Optional[str] = ""
    notes: Optional[str] = ""


class OrderUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    customer_id: Optional[str] = ""
    customer_name: Optional[str] = ""
    order_number: str
    items: List[dict] = []
    subtotal: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    total_amount: float = 0.0
    status: str = "pending"
    payment_method: Optional[str] = ""
    payment_status: str = "pending"
    notes: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
