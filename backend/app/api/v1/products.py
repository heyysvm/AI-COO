from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from app.core.database import get_database
from app.core.security import get_current_user
from app.models.product import create_product_document, product_helper
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter()


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
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

    query = {"business_id": business_id, "is_active": True}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
        ]

    cursor = db.products.find(query).skip(skip).limit(limit)
    products = await cursor.to_list(length=limit)
    return [product_helper(p) for p in products]


@router.get("/low-stock", response_model=List[ProductResponse])
async def get_low_stock_products(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # Find products where quantity <= reorder_level
    cursor = db.products.find(
        {
            "business_id": business_id,
            "is_active": True,
            "$expr": {"$lte": ["$quantity", "$reorder_level"]},
        }
    )
    products = await cursor.to_list(length=100)
    return [product_helper(p) for p in products]


@router.get("/{id}", response_model=ProductResponse)
async def get_product(
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
        product = await db.products.find_one({"_id": ObjectId(id), "business_id": business_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    return product_helper(product)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # Check unique SKU in the same business
    existing = await db.products.find_one({"business_id": business_id, "sku": payload.sku})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SKU '{payload.sku}' already exists for this business.",
        )

    product_doc = create_product_document(
        business_id=business_id,
        name=payload.name,
        sku=payload.sku,
        category=payload.category or "",
        description=payload.description or "",
        unit_price=payload.unit_price,
        cost_price=payload.cost_price,
        unit=payload.unit or "pcs",
        tax_rate=payload.tax_rate,
        quantity=payload.quantity,
        reorder_level=payload.reorder_level,
    )

    result = await db.products.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id
    return product_helper(product_doc)


@router.patch("/{id}", response_model=ProductResponse)
async def update_product(
    id: str,
    payload: ProductUpdate,
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
        result = await db.products.find_one_and_update(
            {"_id": ObjectId(id), "business_id": business_id},
            {"$set": update_data},
            return_document=True,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    return product_helper(result)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
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
        # Soft delete
        result = await db.products.find_one_and_update(
            {"_id": ObjectId(id), "business_id": business_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    return None
