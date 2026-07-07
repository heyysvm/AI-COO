from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.core.database import get_database
from app.core.security import get_current_user, require_role
from app.models.business import create_business_document, business_helper
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessResponse

router = APIRouter()


@router.post("/", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    payload: BusinessCreate,
    current_user: dict = Depends(require_role("owner")),
    db=Depends(get_database),
):
    # Check if user already has a business
    if current_user.get("business_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an associated business.",
        )

    business_doc = create_business_document(
        name=payload.name,
        type=payload.type,
        owner_id=current_user["id"],
        description=payload.description,
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
    )

    result = await db.businesses.insert_one(business_doc)
    business_id = str(result.inserted_id)

    # Update user's business_id
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"business_id": business_id, "updated_at": datetime.now(timezone.utc)}},
    )

    business_doc["_id"] = result.inserted_id
    return business_helper(business_doc)


@router.get("/", response_model=BusinessResponse)
async def get_my_business(
    current_user: dict = Depends(get_current_user), db=Depends(get_database)
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business associated with this user.",
        )

    business = await db.businesses.find_one({"_id": ObjectId(business_id)})
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    return business_helper(business)


@router.patch("/{id}", response_model=BusinessResponse)
async def update_business(
    id: str,
    payload: BusinessUpdate,
    current_user: dict = Depends(require_role("owner")),
    db=Depends(get_database),
):
    if current_user.get("business_id") != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this business.",
        )

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided.",
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    result = await db.businesses.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    return business_helper(result)


@router.get("/{id}/stats")
async def get_business_stats(
    id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if current_user.get("business_id") != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    product_count = await db.products.count_documents({"business_id": id})
    customer_count = await db.customers.count_documents({"business_id": id})
    order_count = await db.orders.count_documents({"business_id": id})
    expense_count = await db.expenses.count_documents({"business_id": id})

    return {
        "product_count": product_count,
        "customer_count": customer_count,
        "order_count": order_count,
        "expense_count": expense_count,
    }
