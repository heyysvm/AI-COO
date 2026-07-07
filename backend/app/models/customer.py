"""Customer document helpers for MongoDB."""
from datetime import datetime, timezone

CUSTOMER_COLLECTION = "customers"

VALID_SEGMENTS = ["new", "regular", "vip", "at_risk"]


def customer_helper(customer: dict) -> dict:
    """Convert a MongoDB customer document to a response-safe dict."""
    return {
        "id": str(customer["_id"]),
        "business_id": customer.get("business_id", ""),
        "name": customer.get("name", ""),
        "email": customer.get("email", ""),
        "phone": customer.get("phone", ""),
        "address": customer.get("address", ""),
        "segment": customer.get("segment", "new"),
        "loyalty_points": customer.get("loyalty_points", 0),
        "total_spent": customer.get("total_spent", 0.0),
        "total_orders": customer.get("total_orders", 0),
        "last_interaction": customer.get("last_interaction"),
        "notes": customer.get("notes", ""),
        "created_at": customer.get("created_at"),
        "updated_at": customer.get("updated_at"),
    }


def create_customer_document(
    business_id: str,
    name: str,
    email: str = "",
    phone: str = "",
    address: str = "",
    segment: str = "new",
    notes: str = "",
) -> dict:
    """Build a new customer document ready for MongoDB insertion."""
    now = datetime.now(timezone.utc)
    return {
        "business_id": business_id,
        "name": name.strip(),
        "email": email.lower().strip() if email else "",
        "phone": phone,
        "address": address,
        "segment": segment if segment in VALID_SEGMENTS else "new",
        "loyalty_points": 0,
        "total_spent": 0.0,
        "total_orders": 0,
        "last_interaction": now,
        "notes": notes,
        "created_at": now,
        "updated_at": now,
    }
