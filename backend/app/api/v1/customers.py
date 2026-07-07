from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from app.core.database import get_database
from app.core.security import get_current_user
from app.models.customer import create_customer_document, customer_helper
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse

router = APIRouter()


@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    segment: Optional[str] = None,
    search: Optional[str] = None,
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
    if segment:
        query["segment"] = segment
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]

    cursor = db.customers.find(query).skip(skip).limit(limit)
    customers = await cursor.to_list(length=limit)
    return [customer_helper(c) for c in customers]


@router.get("/segments/summary")
async def get_segments_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": "$segment", "count": {"$sum": 1}}},
    ]

    cursor = db.customers.aggregate(pipeline)
    results = await cursor.to_list(length=10)

    summary = {"new": 0, "regular": 0, "vip": 0, "at_risk": 0}
    for r in results:
        segment_name = r["_id"]
        if segment_name in summary:
            summary[segment_name] = r["count"]

    return summary


@router.get("/{id}", response_model=CustomerResponse)
async def get_customer(
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
        customer = await db.customers.find_one({"_id": ObjectId(id), "business_id": business_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid customer ID.")

    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    return customer_helper(customer)


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # Check if customer already exists by email (optional, scoped by business)
    if payload.email:
        existing = await db.customers.find_one({"business_id": business_id, "email": payload.email.lower().strip()})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer with email '{payload.email}' already exists.",
            )

    customer_doc = create_customer_document(
        business_id=business_id,
        name=payload.name,
        email=payload.email or "",
        phone=payload.phone or "",
        address=payload.address or "",
        segment=payload.segment or "new",
        notes=payload.notes or "",
    )

    result = await db.customers.insert_one(customer_doc)
    customer_doc["_id"] = result.inserted_id
    return customer_helper(customer_doc)


@router.patch("/{id}", response_model=CustomerResponse)
async def update_customer(
    id: str,
    payload: CustomerUpdate,
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
        result = await db.customers.find_one_and_update(
            {"_id": ObjectId(id), "business_id": business_id},
            {"$set": update_data},
            return_document=True,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid customer ID.")

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    return customer_helper(result)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
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
        result = await db.customers.delete_one({"_id": ObjectId(id), "business_id": business_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid customer ID.")

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    return None
