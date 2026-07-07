"""User document helpers for MongoDB."""
from datetime import datetime, timezone

USER_COLLECTION = "users"

VALID_ROLES = ["owner", "manager", "staff"]


def user_helper(user: dict) -> dict:
    """Convert a MongoDB user document to a response-safe dict."""
    return {
        "id": str(user["_id"]),
        "email": user.get("email", ""),
        "full_name": user.get("full_name", ""),
        "role": user.get("role", "staff"),
        "is_active": user.get("is_active", True),
        "business_id": user.get("business_id", ""),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }


def create_user_document(
    email: str,
    password_hash: str,
    full_name: str,
    role: str = "owner",
    business_id: str = "",
) -> dict:
    """Build a new user document ready for MongoDB insertion."""
    now = datetime.now(timezone.utc)
    return {
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "full_name": full_name.strip(),
        "role": role if role in VALID_ROLES else "staff",
        "is_active": True,
        "business_id": business_id,
        "created_at": now,
        "updated_at": now,
    }
