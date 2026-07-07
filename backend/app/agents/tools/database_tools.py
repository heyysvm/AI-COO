import pymongo
from crewai.tools import BaseTool
from app.core.config import settings


def _get_sync_db():
    """Helper to get a synchronous MongoDB connection for agent tools."""
    client = pymongo.MongoClient(settings.MONGODB_URL)
    return client["aicoo_db"]


class QueryRevenueTool(BaseTool):
    name: str = "query_revenue_tool"
    description: str = "Queries total revenue, paid order statistics, and monthly revenue trends for the business."

    def _run(self, business_id: str) -> str:
        try:
            db = _get_sync_db()
            pipeline = [
                {"$match": {"business_id": business_id, "payment_status": "paid"}},
                {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}, "order_count": {"$sum": 1}}},
            ]
            results = list(db.orders.aggregate(pipeline))

            total_revenue = 0.0
            order_count = 0
            if results:
                total_revenue = results[0].get("total_revenue", 0.0)
                order_count = results[0].get("order_count", 0)

            pipeline_month = [
                {"$match": {"business_id": business_id, "payment_status": "paid"}},
                {
                    "$group": {
                        "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}},
                        "revenue": {"$sum": "$total_amount"},
                    }
                },
                {"$sort": {"_id.year": -1, "_id.month": -1}},
                {"$limit": 6},
            ]
            month_results = list(db.orders.aggregate(pipeline_month))

            monthly_trends = []
            for r in month_results:
                monthly_trends.append(f"Month: {r['_id']['month']}/{r['_id']['year']} -> Revenue: {r['revenue']:.2f}")

            return (
                f"Financial Overview for Business {business_id}:\n"
                f"- Total Paid Revenue: {total_revenue:.2f}\n"
                f"- Total Paid Orders Count: {order_count}\n"
                f"- Monthly Revenue Trends:\n" + "\n".join(monthly_trends)
            )
        except Exception as e:
            return f"Error querying revenue data: {str(e)}"


class QueryExpensesTool(BaseTool):
    name: str = "query_expenses_tool"
    description: str = "Queries all business expenses, category-wise breakdown, and total expenses."

    def _run(self, business_id: str) -> str:
        try:
            db = _get_sync_db()
            total = db.expenses.aggregate([
                {"$match": {"business_id": business_id}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ])
            total_list = list(total)
            total_expense = total_list[0]["total"] if total_list else 0.0

            categories = db.expenses.aggregate([
                {"$match": {"business_id": business_id}},
                {"$group": {"_id": "$category", "amount": {"$sum": "$amount"}, "count": {"$sum": 1}}}
            ])
            category_list = list(categories)

            category_breakdown = []
            for c in category_list:
                category_breakdown.append(f"- Category: {c['_id']} -> Total: {c['amount']:.2f} ({c['count']} expenses)")

            return (
                f"Expenses Overview for Business {business_id}:\n"
                f"- Total Expenses: {total_expense:.2f}\n"
                f"- Category Breakdown:\n" + "\n".join(category_breakdown)
            )
        except Exception as e:
            return f"Error querying expense data: {str(e)}"


class QueryInventoryTool(BaseTool):
    name: str = "query_inventory_tool"
    description: str = "Queries inventory items, total stock, and low stock products requiring replenishment."

    def _run(self, business_id: str) -> str:
        try:
            db = _get_sync_db()
            total_products = db.products.count_documents({"business_id": business_id, "is_active": True})

            low_stock_cursor = db.products.find({
                "business_id": business_id,
                "is_active": True,
                "$expr": {"$lte": ["$quantity", "$reorder_level"]}
            })
            low_stock_items = list(low_stock_cursor)

            low_stock_details = []
            for item in low_stock_items:
                low_stock_details.append(
                    f"- Product: {item.get('name')} (SKU: {item.get('sku')}) -> Current Qty: {item.get('quantity')}, Reorder Level: {item.get('reorder_level')}"
                )

            return (
                f"Inventory Overview for Business {business_id}:\n"
                f"- Active Products in Catalog: {total_products}\n"
                f"- Low Stock Alert Items Count: {len(low_stock_items)}\n"
                f"- Low Stock Details:\n" + ("\n".join(low_stock_details) if low_stock_details else "All products are well stocked!")
            )
        except Exception as e:
            return f"Error querying inventory data: {str(e)}"


class QueryCustomersTool(BaseTool):
    name: str = "query_customers_tool"
    description: str = "Queries customer data, total customer count, segment counts (vip, regular, new, at_risk) and highest spending customers."

    def _run(self, business_id: str) -> str:
        try:
            db = _get_sync_db()
            total_customers = db.customers.count_documents({"business_id": business_id})

            segments = db.customers.aggregate([
                {"$match": {"business_id": business_id}},
                {"$group": {"_id": "$segment", "count": {"$sum": 1}}}
            ])
            segment_list = list(segments)
            segment_counts = {s["_id"]: s["count"] for s in segment_list}

            top_spenders = db.customers.find({"business_id": business_id}).sort("total_spent", -1).limit(5)
            spender_list = list(top_spenders)

            spender_details = []
            for c in spender_list:
                spender_details.append(f"- {c.get('name')} ({c.get('email')}) -> Spent: {c.get('total_spent', 0.0):.2f}, Orders: {c.get('total_orders', 0)}")

            return (
                f"Customer Overview for Business {business_id}:\n"
                f"- Total Customers: {total_customers}\n"
                f"- Segment Counts: VIP: {segment_counts.get('vip', 0)}, Regular: {segment_counts.get('regular', 0)}, New: {segment_counts.get('new', 0)}, At Risk: {segment_counts.get('at_risk', 0)}\n"
                f"- Top 5 Spenders:\n" + "\n".join(spender_details)
            )
        except Exception as e:
            return f"Error querying customer data: {str(e)}"


class QueryOrdersTool(BaseTool):
    name: str = "query_orders_tool"
    description: str = "Queries order history, status summary, and recent order trends."

    def _run(self, business_id: str) -> str:
        try:
            db = _get_sync_db()
            total_orders = db.orders.count_documents({"business_id": business_id})

            statuses = db.orders.aggregate([
                {"$match": {"business_id": business_id}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ])
            status_counts = {s["_id"]: s["count"] for s in list(statuses)}

            recent = db.orders.find({"business_id": business_id}).sort("created_at", -1).limit(5)
            recent_list = list(recent)

            recent_details = []
            for o in recent_list:
                recent_details.append(f"- Order #{o.get('order_number')} -> Customer: {o.get('customer_name')} | Total: {o.get('total_amount'):.2f} | Status: {o.get('status')} | Paid: {o.get('payment_status')}")

            return (
                f"Order History Overview for Business {business_id}:\n"
                f"- Total Orders Placed: {total_orders}\n"
                f"- Status breakdown: Pending: {status_counts.get('pending', 0)}, Confirmed: {status_counts.get('confirmed', 0)}, Processing: {status_counts.get('processing', 0)}, Delivered: {status_counts.get('delivered', 0)}, Cancelled: {status_counts.get('cancelled', 0)}\n"
                f"- Recent Orders:\n" + "\n".join(recent_details)
            )
        except Exception as e:
            return f"Error querying order data: {str(e)}"


# Export tool instances for backward compatibility
query_revenue_tool = QueryRevenueTool()
query_expenses_tool = QueryExpensesTool()
query_inventory_tool = QueryInventoryTool()
query_customers_tool = QueryCustomersTool()
query_orders_tool = QueryOrdersTool()
