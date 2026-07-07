"""Business Pydantic v2 schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BusinessCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(default="retail", description="Business type: retail, restaurant, clinic, salon, warehouse, manufacturing, education, service")
    description: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""


class BusinessUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    settings: Optional[dict] = None


class BusinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    description: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    owner_id: str
    settings: Optional[dict] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
