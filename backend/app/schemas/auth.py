"""Auth Pydantic v2 schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: str = Field(..., min_length=1, max_length=100)
    business_name: Optional[str] = Field(None, max_length=200)


class LoginRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    business_id: Optional[str] = ""
    created_at: Optional[datetime] = None
