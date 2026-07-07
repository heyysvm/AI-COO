from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.core.config import settings
from app.core.database import get_database
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.user import create_user_document, user_helper
from app.models.business import create_business_document
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db=Depends(get_database)):
    # Check if user email already exists
    existing_user = await db.users.find_one({"email": payload.email.lower().strip()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered.",
        )

    # 1. Create a placeholder business ID if name is provided, or we create a business first
    business_id = ""
    user_id = str(ObjectId())  # Pre-generate user ID

    if payload.business_name:
        business_doc = create_business_document(
            name=payload.business_name,
            type="retail",  # Default type
            owner_id=user_id,
            email=payload.email,
        )
        business_result = await db.businesses.insert_one(business_doc)
        business_id = str(business_result.inserted_id)

    # 2. Hash password and create user doc
    pwd_hash = hash_password(payload.password)
    user_doc = create_user_document(
        email=payload.email,
        password_hash=pwd_hash,
        full_name=payload.full_name,
        role="owner",
        business_id=business_id,
    )
    user_doc["_id"] = ObjectId(user_id)  # Set the pre-generated ID

    await db.users.insert_one(user_doc)

    # Generate tokens
    access_token = create_access_token({"sub": user_id, "role": "owner"})
    refresh_token = create_refresh_token({"sub": user_id, "role": "owner"})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db=Depends(get_database)):
    user = await db.users.find_one({"email": payload.email.lower().strip()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    user_id = str(user["_id"])
    role = user.get("role", "staff")

    access_token = create_access_token({"sub": user_id, "role": role})
    refresh_token = create_refresh_token({"sub": user_id, "role": role})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db=Depends(get_database)):
    token_payload = decode_token(payload.refresh_token)
    if token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Refresh token required.",
        )

    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim.",
        )

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated.",
        )

    role = user.get("role", "staff")
    new_access_token = create_access_token({"sub": user_id, "role": role})
    new_refresh_token = create_refresh_token({"sub": user_id, "role": role})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_helper(current_user)
