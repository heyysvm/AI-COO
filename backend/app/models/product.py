"""Product document helpers for MongoDB."""
from datetime import datetime, timezone

PRODUCT_COLLECTION = "products"


def product_helper(product: dict) -> dict:
    """Convert a MongoDB product document to a response-safe dict."""
    return {
        "id": str(product["_id"]),
        "business_id": product.get("business_id", ""),
        "name": product.get("name", ""),
        "sku": product.get("sku", ""),
        "category": product.get("category", ""),
        "description": product.get("description", ""),
        "unit_price": product.get("unit_price", 0.0),
        "cost_price": product.get("cost_price", 0.0),
        "unit": product.get("unit", "pcs"),
        "tax_rate": product.get("tax_rate", 0.0),
        "quantity": product.get("quantity", 0),
        "reorder_level": product.get("reorder_level", 10),
        "image_url": product.get("image_url", ""),
        "is_active": product.get("is_active", True),
        "created_at": product.get("created_at"),
        "updated_at": product.get("updated_at"),
    }


def create_product_document(
    business_id: str,
    name: str,
    sku: str,
    category: str = "",
    description: str = "",
    unit_price: float = 0.0,
    cost_price: float = 0.0,
    unit: str = "pcs",
    tax_rate: float = 0.0,
    quantity: int = 0,
    reorder_level: int = 10,
    image_url: str = "",
    is_active: bool = True,
) -> dict:
    """Build a new product document ready for MongoDB insertion."""
    now = datetime.now(timezone.utc)
    return {
        "business_id": business_id,
        "name": name.strip(),
        "sku": sku.strip(),
        "category": category,
        "description": description,
        "unit_price": unit_price,
        "cost_price": cost_price,
        "unit": unit,
        "tax_rate": tax_rate,
        "quantity": quantity,
        "reorder_level": reorder_level,
        "image_url": image_url,
        "is_active": is_active,
        "created_at": now,
        "updated_at": now,
    }
