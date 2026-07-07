"""Customer Pydantic v2 schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    segment: Optional[str] = Field(default="new", description="Customer segment: new, regular, vip, at_risk")
    notes: Optional[str] = ""


class CustomerUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    segment: Optional[str] = None
    notes: Optional[str] = None
    loyalty_points: Optional[int] = None


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    segment: str = "new"
    loyalty_points: int = 0
    total_spent: float = 0.0
    total_orders: int = 0
    last_interaction: Optional[datetime] = None
    notes: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
