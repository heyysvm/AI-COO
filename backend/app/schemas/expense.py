"""Expense Pydantic v2 schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str = Field(..., description="Expense category: rent, utilities, salary, supplies, marketing, maintenance, other")
    description: Optional[str] = ""
    amount: float = Field(..., gt=0.0)
    date: Optional[datetime] = None
    vendor: Optional[str] = ""
    receipt_url: Optional[str] = ""


class ExpenseUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[datetime] = None
    vendor: Optional[str] = None
    receipt_url: Optional[str] = None


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    category: str
    description: Optional[str] = ""
    amount: float
    date: Optional[datetime] = None
    vendor: Optional[str] = ""
    receipt_url: Optional[str] = ""
    approved_by: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
