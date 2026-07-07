from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from app.core.database import get_database
from app.core.security import get_current_user
from app.models.expense import create_expense_document, expense_helper
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter()


@router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    query = {"business_id": business_id}
    if category:
        query["category"] = category

    cursor = db.expenses.find(query).sort("date", -1).skip(skip).limit(limit)
    expenses = await cursor.to_list(length=limit)
    return [expense_helper(e) for e in expenses]


@router.get("/stats/summary")
async def get_expenses_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # 1. Total expenses
    pipeline_total = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    cursor_total = db.expenses.aggregate(pipeline_total)
    total_res = await cursor_total.to_list(length=1)
    total_expenses = total_res[0].get("total", 0.0) if total_res else 0.0

    # 2. Total by category
    pipeline_category = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": "$category", "amount": {"$sum": "$amount"}}},
    ]
    cursor_category = db.expenses.aggregate(pipeline_category)
    category_res = await cursor_category.to_list(length=20)
    category_totals = {c["_id"]: c["amount"] for c in category_res}

    return {
        "total_expenses": total_expenses,
        "category_totals": category_totals,
    }


@router.get("/{id}", response_model=ExpenseResponse)
async def get_expense(
    id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    try:
        expense = await db.expenses.find_one({"_id": ObjectId(id), "business_id": business_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense ID.")

    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")

    return expense_helper(expense)


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    expense_doc = create_expense_document(
        business_id=business_id,
        category=payload.category,
        description=payload.description or "",
        amount=payload.amount,
        date=payload.date,
        vendor=payload.vendor or "",
        receipt_url=payload.receipt_url or "",
        approved_by=current_user.get("full_name", ""),
    )

    result = await db.expenses.insert_one(expense_doc)
    expense_doc["_id"] = result.inserted_id
    return expense_helper(expense_doc)


@router.patch("/{id}", response_model=ExpenseResponse)
async def update_expense(
    id: str,
    payload: ExpenseUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided.",
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    try:
        result = await db.expenses.find_one_and_update(
            {"_id": ObjectId(id), "business_id": business_id},
            {"$set": update_data},
            return_document=True,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense ID.")

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")

    return expense_helper(result)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    try:
        result = await db.expenses.delete_one({"_id": ObjectId(id), "business_id": business_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense ID.")

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")

    return None
