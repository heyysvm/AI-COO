"""Order document helpers for MongoDB."""
from datetime import datetime, timezone

ORDER_COLLECTION = "orders"

VALID_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
VALID_PAYMENT_STATUSES = ["pending", "paid", "partial", "refunded"]


def order_helper(order: dict) -> dict:
    """Convert a MongoDB order document to a response-safe dict."""
    return {
        "id": str(order["_id"]),
        "business_id": order.get("business_id", ""),
        "customer_id": order.get("customer_id", ""),
        "customer_name": order.get("customer_name", ""),
        "order_number": order.get("order_number", ""),
        "items": order.get("items", []),
        "subtotal": order.get("subtotal", 0.0),
        "discount": order.get("discount", 0.0),
        "tax": order.get("tax", 0.0),
        "total_amount": order.get("total_amount", 0.0),
        "status": order.get("status", "pending"),
        "payment_method": order.get("payment_method", ""),
        "payment_status": order.get("payment_status", "pending"),
        "notes": order.get("notes", ""),
        "created_at": order.get("created_at"),
        "updated_at": order.get("updated_at"),
    }


def create_order_document(
    business_id: str,
    customer_id: str,
    customer_name: str,
    order_number: str,
    items: list[dict],
    subtotal: float,
    discount: float = 0.0,
    tax: float = 0.0,
    total_amount: float = 0.0,
    payment_method: str = "",
    notes: str = "",
) -> dict:
    """Build a new order document ready for MongoDB insertion."""
    now = datetime.now(timezone.utc)
    return {
        "business_id": business_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "order_number": order_number,
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "tax": tax,
        "total_amount": total_amount,
        "status": "pending",
        "payment_method": payment_method,
        "payment_status": "pending",
        "notes": notes,
        "created_at": now,
        "updated_at": now,
    }
