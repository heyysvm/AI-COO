from datetime import datetime, timezone
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from app.core.database import get_database
from app.core.security import get_current_user
from app.models.order import create_order_document, order_helper
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse

router = APIRouter()


@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
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
    if status:
        query["status"] = status

    cursor = db.orders.find(query).sort("created_at", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(length=limit)
    return [order_helper(o) for o in orders]


@router.get("/stats/summary")
async def get_orders_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # 1. Total order count
    total_orders = await db.orders.count_documents({"business_id": business_id})

    # 2. Total revenue and average order value from paid orders
    pipeline = [
        {"$match": {"business_id": business_id, "payment_status": "paid"}},
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total_amount"},
                "avg_value": {"$avg": "$total_amount"},
            }
        },
    ]

    cursor = db.orders.aggregate(pipeline)
    revenue_results = await cursor.to_list(length=1)

    total_revenue = 0.0
    avg_order_value = 0.0
    if revenue_results:
        total_revenue = revenue_results[0].get("total_revenue", 0.0)
        avg_order_value = revenue_results[0].get("avg_value", 0.0)

    # 3. Counts by status
    status_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    cursor = db.orders.aggregate(status_pipeline)
    status_results = await cursor.to_list(length=10)

    status_counts = {}
    for r in status_results:
        status_counts[r["_id"]] = r["count"]

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "avg_order_value": avg_order_value,
        "status_counts": status_counts,
    }


@router.get("/{id}", response_model=OrderResponse)
async def get_order(
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
        order = await db.orders.find_one({"_id": ObjectId(id), "business_id": business_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID.")

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    return order_helper(order)


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # Validate customer
    customer = None
    if payload.customer_id:
        try:
            customer = await db.customers.find_one(
                {"_id": ObjectId(payload.customer_id), "business_id": business_id}
            )
            if not customer:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid customer ID.")

    # Calculate subtotal and validate items
    subtotal = 0.0
    items_to_save = []

    for item in payload.items:
        try:
            product = await db.products.find_one(
                {"_id": ObjectId(item.product_id), "business_id": business_id, "is_active": True}
            )
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {item.product_id} not found or inactive.",
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product ID: {item.product_id}",
            )

        # Check stock quantity
        if product.get("quantity", 0) < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{product.get('name')}'. Available: {product.get('quantity')}, Requested: {item.quantity}",
            )

        item_total = item.quantity * item.unit_price
        subtotal += item_total

        items_to_save.append(
            {
                "product_id": item.product_id,
                "product_name": product.get("name", ""),
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item_total,
            }
        )

    # Total calculations
    total_amount = subtotal - payload.discount + payload.tax
    if total_amount < 0:
        total_amount = 0.0

    # Auto-generate order number
    count = await db.orders.count_documents({"business_id": business_id})
    rand_suffix = random.randint(1000, 9999)
    order_number = f"ORD-{count + 1:04d}-{rand_suffix}"

    # Build order document
    customer_name = customer.get("name", "Walk-in Customer") if customer else payload.customer_name or "Walk-in Customer"
    customer_id_str = str(customer["_id"]) if customer else ""

    order_doc = create_order_document(
        business_id=business_id,
        customer_id=customer_id_str,
        customer_name=customer_name,
        order_number=order_number,
        items=items_to_save,
        subtotal=subtotal,
        discount=payload.discount,
        tax=payload.tax,
        total_amount=total_amount,
        payment_method=payload.payment_method or "cash",
        notes=payload.notes or "",
    )

    # Insert order
    result = await db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id

    # Deduct product quantities
    for item in items_to_save:
        await db.products.update_one(
            {"_id": ObjectId(item["product_id"])},
            {"$inc": {"quantity": -item["quantity"]}},
        )

    # Update customer loyalty/sales statistics if registered
    if customer:
        now = datetime.now(timezone.utc)
        # segment VIP logic
        new_total_spent = customer.get("total_spent", 0.0) + total_amount
        new_total_orders = customer.get("total_orders", 0) + 1

        segment = customer.get("segment", "new")
        if new_total_spent > 50000:
            segment = "vip"
        elif new_total_orders > 10:
            segment = "regular"

        await db.customers.update_one(
            {"_id": customer["_id"]},
            {
                "$set": {
                    "total_spent": new_total_spent,
                    "total_orders": new_total_orders,
                    "segment": segment,
                    "last_interaction": now,
                    "updated_at": now,
                },
                "$inc": {"loyalty_points": int(total_amount / 100)},  # 1 point per 100 Rs spent
            },
        )

    return order_helper(order_doc)


@router.patch("/{id}", response_model=OrderResponse)
async def update_order(
    id: str,
    payload: OrderUpdate,
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
        # Check order exists first to see if we need to adjust stock (e.g. if order is cancelled)
        order = await db.orders.find_one({"_id": ObjectId(id), "business_id": business_id})
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

        # If transitioning to cancelled status and wasn't cancelled before, refund stock quantities
        if update_data.get("status") == "cancelled" and order.get("status") != "cancelled":
            for item in order.get("items", []):
                await db.products.update_one(
                    {"_id": ObjectId(item["product_id"])},
                    {"$inc": {"quantity": item["quantity"]}},
                )

        result = await db.orders.find_one_and_update(
            {"_id": ObjectId(id), "business_id": business_id},
            {"$set": update_data},
            return_document=True,
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID.")

    return order_helper(result)
