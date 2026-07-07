"""Expense document helpers for MongoDB."""
from datetime import datetime, timezone

EXPENSE_COLLECTION = "expenses"

VALID_CATEGORIES = [
    "rent", "utilities", "salary", "supplies",
    "marketing", "maintenance", "other",
]


def expense_helper(expense: dict) -> dict:
    """Convert a MongoDB expense document to a response-safe dict."""
    return {
        "id": str(expense["_id"]),
        "business_id": expense.get("business_id", ""),
        "category": expense.get("category", "other"),
        "description": expense.get("description", ""),
        "amount": expense.get("amount", 0.0),
        "date": expense.get("date"),
        "vendor": expense.get("vendor", ""),
        "receipt_url": expense.get("receipt_url", ""),
        "approved_by": expense.get("approved_by", ""),
        "created_at": expense.get("created_at"),
        "updated_at": expense.get("updated_at"),
    }


def create_expense_document(
    business_id: str,
    category: str,
    description: str,
    amount: float,
    date: datetime | str | None = None,
    vendor: str = "",
    receipt_url: str = "",
    approved_by: str = "",
) -> dict:
    """Build a new expense document ready for MongoDB insertion."""
    now = datetime.now(timezone.utc)
    if isinstance(date, str):
        try:
            date = datetime.fromisoformat(date)
        except (ValueError, TypeError):
            date = now
    return {
        "business_id": business_id,
        "category": category if category in VALID_CATEGORIES else "other",
        "description": description,
        "amount": amount,
        "date": date or now,
        "vendor": vendor,
        "receipt_url": receipt_url,
        "approved_by": approved_by,
        "created_at": now,
        "updated_at": now,
    }
