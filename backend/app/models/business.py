"""Business document helpers for MongoDB."""
from datetime import datetime, timezone

BUSINESS_COLLECTION = "businesses"

VALID_BUSINESS_TYPES = [
    "retail", "restaurant", "clinic", "salon",
    "warehouse", "manufacturing", "education", "service",
]


def business_helper(business: dict) -> dict:
    """Convert a MongoDB business document to a response-safe dict."""
    return {
        "id": str(business["_id"]),
        "name": business.get("name", ""),
        "type": business.get("type", "retail"),
        "description": business.get("description", ""),
        "address": business.get("address", ""),
        "phone": business.get("phone", ""),
        "email": business.get("email", ""),
        "owner_id": business.get("owner_id", ""),
        "settings": business.get("settings", {}),
        "created_at": business.get("created_at"),
        "updated_at": business.get("updated_at"),
    }


def create_business_document(
    name: str,
    type: str,
    owner_id: str,
    description: str = "",
    address: str = "",
    phone: str = "",
    email: str = "",
    settings: dict | None = None,
) -> dict:
    """Build a new business document ready for MongoDB insertion."""
    now = datetime.now(timezone.utc)
    return {
        "name": name.strip(),
        "type": type if type in VALID_BUSINESS_TYPES else "retail",
        "description": description,
        "address": address,
        "phone": phone,
        "email": email,
        "owner_id": owner_id,
        "settings": settings or {},
        "created_at": now,
        "updated_at": now,
    }
