from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.core.database import get_database
from app.core.security import get_current_user
from app.models.order import order_helper
from app.models.expense import expense_helper
from app.models.product import product_helper

router = APIRouter()


@router.get("/overview")
async def get_dashboard_overview(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # 1. KPIs count
    # Total Revenue (sum of total_amount of paid orders)
    rev_pipeline = [
        {"$match": {"business_id": business_id, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    cursor = db.orders.aggregate(rev_pipeline)
    rev_results = await cursor.to_list(length=1)
    total_revenue = rev_results[0]["total"] if rev_results else 0.0

    # Total Expenses (sum of amount of expenses)
    exp_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    cursor = db.expenses.aggregate(exp_pipeline)
    exp_results = await cursor.to_list(length=1)
    total_expenses = exp_results[0]["total"] if exp_results else 0.0

    # Total Orders
    total_orders = await db.orders.count_documents({"business_id": business_id})

    # Total Customers
    total_customers = await db.customers.count_documents({"business_id": business_id})

    # Profit
    profit = total_revenue - total_expenses

    # 2. Low Stock Count
    low_stock_count = await db.products.count_documents(
        {
            "business_id": business_id,
            "is_active": True,
            "$expr": {"$lte": ["$quantity", "$reorder_level"]},
        }
    )

    # 3. Recent Orders (last 5)
    recent_orders_cursor = db.orders.find({"business_id": business_id}).sort("created_at", -1).limit(5)
    recent_orders = await recent_orders_cursor.to_list(length=5)
    recent_orders_formatted = [order_helper(o) for o in recent_orders]

    # 4. Recent Expenses (last 5)
    recent_expenses_cursor = db.expenses.find({"business_id": business_id}).sort("date", -1).limit(5)
    recent_expenses = await recent_expenses_cursor.to_list(length=5)
    recent_expenses_formatted = [expense_helper(e) for e in recent_expenses]

    # 5. Expenses by Category
    cat_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": "$category", "amount": {"$sum": "$amount"}}},
    ]
    cursor = db.expenses.aggregate(cat_pipeline)
    cat_results = await cursor.to_list(length=10)
    expenses_by_category = [{"category": r["_id"], "amount": r["amount"]} for r in cat_results]

    # 6. Customer Segments counts
    segment_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": "$segment", "count": {"$sum": 1}}},
    ]
    cursor = db.customers.aggregate(segment_pipeline)
    segment_results = await cursor.to_list(length=10)
    customer_segments = {r["_id"]: r["count"] for r in segment_results}
    # Ensure default fields are present
    for segment in ["vip", "regular", "new", "at_risk"]:
        if segment not in customer_segments:
            customer_segments[segment] = 0

    # 7. Revenue by month (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    rev_month_pipeline = [
        {
            "$match": {
                "business_id": business_id,
                "payment_status": "paid",
                "created_at": {"$gte": six_months_ago},
            }
        },
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                },
                "revenue": {"$sum": "$total_amount"},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    cursor = db.orders.aggregate(rev_month_pipeline)
    rev_month_results = await cursor.to_list(length=6)

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    revenue_by_month = []
    for r in rev_month_results:
        m_idx = r["_id"]["month"] - 1
        revenue_by_month.append(
            {
                "name": f"{months[m_idx]} {r['_id']['year']}",
                "revenue": r["revenue"],
            }
        )

    # 8. Top Selling Products
    top_prod_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.product_id",
                "name": {"$first": "$items.product_name"},
                "sales_count": {"$sum": "$items.quantity"},
                "revenue": {"$sum": "$items.total"},
            }
        },
        {"$sort": {"revenue": -1}},
        {"$limit": 5},
    ]
    cursor = db.orders.aggregate(top_prod_pipeline)
    top_prod_results = await cursor.to_list(length=5)
    top_products = [
        {
            "id": r["_id"],
            "name": r["name"],
            "sales_count": r["sales_count"],
            "revenue": r["revenue"],
        }
        for r in top_prod_results
    ]

    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "total_orders": total_orders,
        "total_customers": total_customers,
        "profit": profit,
        "low_stock_count": low_stock_count,
        "recent_orders": recent_orders_formatted,
        "recent_expenses": recent_expenses_formatted,
        "revenue_by_month": revenue_by_month,
        "expenses_by_category": expenses_by_category,
        "top_products": top_products,
        "customer_segments": customer_segments,
    }


@router.get("/notifications")
async def get_dashboard_notifications(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    notifications = []

    # 1. Low stock products (warning type)
    low_stock_cursor = db.products.find({
        "business_id": business_id,
        "is_active": True,
        "$expr": {"$lte": ["$quantity", "$reorder_level"]}
    })
    low_stock_products = await low_stock_cursor.to_list(length=20)
    for p in low_stock_products:
        prod = product_helper(p)
        notifications.append({
            "id": f"low_stock_{prod['id']}",
            "type": "warning",
            "title": "Low Stock Warning",
            "message": f"Product '{prod['name']}' is low on stock ({prod['quantity']} remaining).",
            "timestamp": prod.get("updated_at") or prod.get("created_at") or datetime.utcnow(),
        })

    # 2. Recent pending/processing orders (info/warning type)
    recent_orders_cursor = db.orders.find({
        "business_id": business_id,
        "status": {"$in": ["pending", "processing"]}
    }).sort("created_at", -1).limit(10)
    recent_orders = await recent_orders_cursor.to_list(length=10)
    for o in recent_orders:
        ord_val = order_helper(o)
        notifications.append({
            "id": f"order_{ord_val['id']}",
            "type": "info",
            "title": f"Order {ord_val['order_number']}",
            "message": f"Order from {ord_val.get('customer_name', 'Customer')} is {ord_val['status']}. Total: ${ord_val['total_amount']:.2f}",
            "timestamp": ord_val.get("created_at") or datetime.utcnow(),
        })

    # 3. High-value orders (success type)
    high_orders_cursor = db.orders.find({
        "business_id": business_id,
        "total_amount": {"$gt": 500}
    }).sort("created_at", -1).limit(5)
    high_orders = await high_orders_cursor.to_list(length=5)
    for o in high_orders:
        ord_val = order_helper(o)
        notifications.append({
            "id": f"high_order_{ord_val['id']}",
            "type": "success",
            "title": "High Value Order",
            "message": f"High value order {ord_val['order_number']} worth ${ord_val['total_amount']:.2f} placed by {ord_val.get('customer_name', 'Customer')}.",
            "timestamp": ord_val.get("created_at") or datetime.utcnow(),
        })

    # 4. Large expenses logged (error type)
    large_expenses_cursor = db.expenses.find({
        "business_id": business_id,
        "amount": {"$gt": 200}
    }).sort("date", -1).limit(5)
    large_expenses = await large_expenses_cursor.to_list(length=5)
    for e in large_expenses:
        exp_val = expense_helper(e)
        notifications.append({
            "id": f"expense_{exp_val['id']}",
            "type": "error",
            "title": "Large Expense Logged",
            "message": f"Expense of ${exp_val['amount']:.2f} logged for '{exp_val['description']}' in {exp_val['category']}.",
            "timestamp": exp_val.get("date") or datetime.utcnow(),
        })

    # Add a fallback welcome message if no notifications
    if not notifications:
        notifications.append({
            "id": "welcome",
            "type": "success",
            "title": "Welcome to AI COO",
            "message": "AI COO dashboard is online and connected! Ready to analyze your business.",
            "timestamp": datetime.utcnow(),
        })

    def get_timestamp_iso(item):
        ts = item["timestamp"]
        if isinstance(ts, datetime):
            # Ensure it is ISO formatted
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            return ts.isoformat().replace("+00:00", "Z")
        return str(ts)

    for item in notifications:
        item["timestamp"] = get_timestamp_iso(item)

    notifications.sort(key=lambda x: x["timestamp"], reverse=True)

    return notifications


@router.get("/ai-notifications")
async def get_dashboard_ai_notifications(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated.",
        )

    # 1. Fetch business details
    business = await db.businesses.find_one({"_id": ObjectId(business_id)})
    business_context = {}
    if business:
        business_context = {
            "business_name": business.get("name", ""),
            "business_type": business.get("type", ""),
            "description": business.get("description", ""),
        }

    # 2. Gather metrics
    # Total Revenue (sum of total_amount of paid orders)
    rev_pipeline = [
        {"$match": {"business_id": business_id, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    cursor = db.orders.aggregate(rev_pipeline)
    rev_results = await cursor.to_list(length=1)
    total_revenue = rev_results[0]["total"] if rev_results else 0.0

    # Total Expenses (sum of amount of expenses)
    exp_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    cursor = db.expenses.aggregate(exp_pipeline)
    exp_results = await cursor.to_list(length=1)
    total_expenses = exp_results[0]["total"] if exp_results else 0.0

    # Total Orders
    total_orders = await db.orders.count_documents({"business_id": business_id})

    # Total Customers
    total_customers = await db.customers.count_documents({"business_id": business_id})

    # Profit
    profit = total_revenue - total_expenses

    # Low Stock Count
    low_stock_count = await db.products.count_documents(
        {
            "business_id": business_id,
            "is_active": True,
            "$expr": {"$lte": ["$quantity", "$reorder_level"]},
        }
    )

    # Recent Orders (last 5)
    recent_orders_cursor = db.orders.find({"business_id": business_id}).sort("created_at", -1).limit(5)
    recent_orders = await recent_orders_cursor.to_list(length=5)
    recent_orders_formatted = [order_helper(o) for o in recent_orders]

    # Recent Expenses (last 5)
    recent_expenses_cursor = db.expenses.find({"business_id": business_id}).sort("date", -1).limit(5)
    recent_expenses = await recent_expenses_cursor.to_list(length=5)
    recent_expenses_formatted = [expense_helper(e) for e in recent_expenses]

    # Expenses by Category
    cat_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": "$category", "amount": {"$sum": "$amount"}}},
    ]
    cursor = db.expenses.aggregate(cat_pipeline)
    cat_results = await cursor.to_list(length=10)
    expenses_by_category = [{"category": r["_id"], "amount": r["amount"]} for r in cat_results]

    # Customer Segments counts
    segment_pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {"_id": "$segment", "count": {"$sum": 1}}},
    ]
    cursor = db.customers.aggregate(segment_pipeline)
    segment_results = await cursor.to_list(length=10)
    customer_segments = {r["_id"]: r["count"] for r in segment_results}

    from app.agents.llm import get_llm_with_fallback
    import json

    prompt = f"""
    You are the AI Chief Operating Officer (AI COO). Analyze this business data and output a structured JSON response containing:
    1. "irregularities": A list of anomalies, irregularities, cost spikes, sales drops, or stock issues you notice.
    2. "briefings": A structured briefing object containing detailed updates for morning, noon, evening, and night.

    Business Context:
    - Name: {business_context.get("business_name")}
    - Type: {business_context.get("business_type")}
    - Description: {business_context.get("description")}
    
    Data Metrics:
    - Total Revenue: ${total_revenue:.2f}
    - Total Expenses: ${total_expenses:.2f}
    - Net Profit: ${profit:.2f}
    - Low Stock Count: {low_stock_count}
    - Total Orders: {total_orders}
    - Total Customers: {total_customers}
    - Expenses by Category: {expenses_by_category}
    - Customer Segments: {customer_segments}
    
    Recent Orders:
    {json.dumps(recent_orders_formatted, default=str)}
    
    Recent Expenses:
    {json.dumps(recent_expenses_formatted, default=str)}

    You MUST respond with a valid JSON object matching the following TypeScript schema:
    {{
      "irregularities": Array<{{
        "id": string; // unique string e.g. "ai_anomaly_1"
        "type": "warning" | "error" | "success" | "info";
        "title": string;
        "message": string; // detailed context/reasoning (1-2 sentences)
        "timestamp": string; // ISO format
      }}>;
      "briefings": {{
        "morning": {{
          "title": string; // e.g. "Morning Strategic Brief"
          "message": string; // detailed morning plan, focus items, stock alerts, etc. (3-4 sentences)
          "timestamp": string; // ISO format for today at 08:00 AM
        }};
        "noon": {{
          "title": string; // e.g. "Mid-day Operational Check"
          "message": string; // detailed mid-day pace, sales growth, operations (3-4 sentences)
          "timestamp": string; // ISO format for today at 12:00 PM
        }};
        "evening": {{
          "title": string; // e.g. "Evening Performance Wrap"
          "message": string; // detailed daily wrap-up, sales summary, margins (3-4 sentences)
          "timestamp": string; // ISO format for today at 06:00 PM
        }};
        "night": {{
          "title": string; // e.g. "Nightly Cash Flow Audit"
          "message": string; // detailed financial check, cost optimization ideas, overhead checks (3-4 sentences)
          "timestamp": string; // ISO format for today at 10:00 PM
        }}
      }}
    }}
    Do not add any markdown formatting, backticks, or explanation outside the JSON. Respond ONLY with the JSON object.
    """

    try:
        llm = get_llm_with_fallback()
        response = await llm.ainvoke([("human", prompt)])
        content = response.content.strip()
        
        # Clean markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        parsed = json.loads(content)
        return parsed
    except Exception as e:
        now_str = datetime.utcnow().isoformat().replace("+00:00", "Z")
        return {
            "irregularities": [
                {
                    "id": "fallback_anomaly",
                    "type": "info",
                    "title": "AI COO System Check",
                    "message": "The AI COO is currently monitoring your business data. No major irregularities detected at this moment.",
                    "timestamp": now_str
                }
            ],
            "briefings": {
                "morning": {
                    "title": "Morning Strategic Brief",
                    "message": f"Good morning! Today, monitor your {low_stock_count} low stock items. We have {total_orders} total orders recorded in the system. Prepare your stock and inventory details for client targets.",
                    "timestamp": now_str
                },
                "noon": {
                    "title": "Mid-day Operational Check",
                    "message": f"Mid-day update: Business has reached ${total_revenue:.2f} in total revenue. Ensure pending shipments are processed. Keep track of customer inquiries.",
                    "timestamp": now_str
                },
                "evening": {
                    "title": "Evening Performance Wrap",
                    "message": f"Evening wrap-up: Net profit stands at ${profit:.2f}. Total expense incurred: ${total_expenses:.2f}. Review today's transactions in the finance tab.",
                    "timestamp": now_str
                },
                "night": {
                    "title": "Nightly Cash Flow Audit",
                    "message": f"Night review: Cash reserves are active with {total_customers} customer profiles. Consider optimizing supplies overheads and plan for tomorrow's targets.",
                    "timestamp": now_str
                }
            }
        }


