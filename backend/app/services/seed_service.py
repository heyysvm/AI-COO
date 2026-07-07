from datetime import datetime, timedelta, timezone
import random
from bson import ObjectId
import structlog

logger = structlog.get_logger()

# Sample lists for generating realistic seed data
PRODUCT_TEMPLATES = [
    {"name": "Basmati Rice Premium 5kg", "category": "grocery", "unit_price": 650.00, "cost_price": 480.00, "unit": "bag", "reorder_level": 15, "quantity": 45},
    {"name": "Organic Sunflower Oil 2L", "category": "grocery", "unit_price": 380.00, "cost_price": 290.00, "unit": "bottle", "reorder_level": 20, "quantity": 8},  # Low stock
    {"name": "Whole Wheat Atta 10kg", "category": "grocery", "unit_price": 490.00, "cost_price": 370.00, "unit": "bag", "reorder_level": 12, "quantity": 30},
    {"name": "Organic Honey 500g", "category": "packaged_foods", "unit_price": 280.00, "cost_price": 180.00, "unit": "jar", "reorder_level": 10, "quantity": 4},   # Low stock
    {"name": "Premium Green Tea 100 bags", "category": "beverages", "unit_price": 340.00, "cost_price": 230.00, "unit": "box", "reorder_level": 8, "quantity": 14},
    {"name": "Roasted Cashews 250g", "category": "packaged_foods", "unit_price": 390.00, "cost_price": 290.00, "unit": "packet", "reorder_level": 15, "quantity": 3},  # Low stock
    {"name": "Amul Salted Butter 500g", "category": "dairy", "unit_price": 260.00, "cost_price": 210.00, "unit": "pcs", "reorder_level": 25, "quantity": 60},
    {"name": "Organic Cow Ghee 1L", "category": "dairy", "unit_price": 720.00, "cost_price": 540.00, "unit": "jar", "reorder_level": 10, "quantity": 18},
    {"name": "Dettol Antiseptic Liquid 500ml", "category": "personal_care", "unit_price": 210.00, "cost_price": 155.00, "unit": "bottle", "reorder_level": 15, "quantity": 2}, # Low stock
    {"name": "Colgate MaxFresh Toothpaste 150g", "category": "personal_care", "unit_price": 120.00, "cost_price": 85.00, "unit": "pcs", "reorder_level": 30, "quantity": 55},
    {"name": "Surf Excel Matic Liquid 1L", "category": "household", "unit_price": 240.00, "cost_price": 180.00, "unit": "bottle", "reorder_level": 10, "quantity": 22},
    {"name": "Vim Dishwash Gel 750ml", "category": "household", "unit_price": 155.00, "cost_price": 115.00, "unit": "bottle", "reorder_level": 15, "quantity": 6},   # Low stock
    {"name": "Tropicana Orange Juice 1L", "category": "beverages", "unit_price": 110.00, "cost_price": 80.00, "unit": "pack", "reorder_level": 20, "quantity": 35},
    {"name": "Cadbury Dairy Milk Silk 150g", "category": "packaged_foods", "unit_price": 175.00, "cost_price": 130.00, "unit": "pcs", "reorder_level": 15, "quantity": 40},
    {"name": "Nescafe Classic Coffee 200g", "category": "beverages", "unit_price": 380.00, "cost_price": 285.00, "unit": "jar", "reorder_level": 12, "quantity": 9},   # Low stock
    {"name": "Britannia Marie Gold 250g", "category": "packaged_foods", "unit_price": 40.00, "cost_price": 28.00, "unit": "pack", "reorder_level": 50, "quantity": 120},
    {"name": "Aashirvaad Multigrain Atta 5kg", "category": "grocery", "unit_price": 290.00, "cost_price": 220.00, "unit": "bag", "reorder_level": 20, "quantity": 28},
    {"name": "Harpic Toilet Cleaner 1L", "category": "household", "unit_price": 185.00, "cost_price": 135.00, "unit": "bottle", "reorder_level": 15, "quantity": 19},
    {"name": "Handmade Organic Soaps Pack", "category": "personal_care", "unit_price": 450.00, "cost_price": 300.00, "unit": "box", "reorder_level": 8, "quantity": 3}, # Low stock
    {"name": "Almonds California 500g", "category": "packaged_foods", "unit_price": 550.00, "cost_price": 420.00, "unit": "packet", "reorder_level": 10, "quantity": 12},
]

CUSTOMER_TEMPLATES = [
    {"name": "Aarav Sharma", "email": "aarav.sharma@gmail.com", "phone": "9876543210", "segment": "vip"},
    {"name": "Neha Gupta", "email": "neha.gupta@yahoo.com", "phone": "9812345670", "segment": "regular"},
    {"name": "Rohan Verma", "email": "rohan.v@gmail.com", "phone": "9765432109", "segment": "at_risk"},
    {"name": "Priya Patel", "email": "priya.p@outlook.com", "phone": "9988776655", "segment": "vip"},
    {"name": "Vikram Singh", "email": "vikram.s@gmail.com", "phone": "9123456789", "segment": "regular"},
    {"name": "Anjali Deshmukh", "email": "anjali.d@gmail.com", "phone": "9555444333", "segment": "new"},
    {"name": "Amit Mishra", "email": "amit.mishra@rediffmail.com", "phone": "9444333222", "segment": "new"},
    {"name": "Shreya Ghoshal", "email": "shreya.g@gmail.com", "phone": "9333222111", "segment": "vip"},
    {"name": "Rajat Kapoor", "email": "rajat.k@yahoo.co.in", "phone": "9222111000", "segment": "at_risk"},
    {"name": "Meera Nair", "email": "meera.nair@gmail.com", "phone": "9000111222", "segment": "regular"},
    {"name": "Karan Johar", "email": "karan.j@gmail.com", "phone": "9111222333", "segment": "new"},
    {"name": "Aditya Roy", "email": "aditya.roy@gmail.com", "phone": "9222333444", "segment": "regular"},
    {"name": "Divya Dutta", "email": "divya.d@gmail.com", "phone": "9333444555", "segment": "vip"},
    {"name": "Sanjay Dutt", "email": "sanjay.d@yahoo.com", "phone": "9444555666", "segment": "at_risk"},
    {"name": "Deepika Padukone", "email": "deepika.p@gmail.com", "phone": "9555666777", "segment": "regular"},
]

EXPENSE_TEMPLATES = [
    {"category": "rent", "description": "Shop monthly rent", "amount": 25000.00, "vendor": "Gopal Raj (Landlord)"},
    {"category": "utilities", "description": "Electricity bill", "amount": 4200.00, "vendor": "BSES Yamuna Power"},
    {"category": "utilities", "description": "Highspeed Fiber Internet", "amount": 1200.00, "vendor": "ACT Fibernet"},
    {"category": "salary", "description": "Staff salary - Rajesh Kumar", "amount": 18000.00, "vendor": "Rajesh Kumar (Staff)"},
    {"category": "salary", "description": "Staff salary - Sunita Sharma", "amount": 16000.00, "vendor": "Sunita Sharma (Staff)"},
    {"category": "supplies", "description": "Bulk Grocery Ingestion", "amount": 45000.00, "vendor": "Wholesale Agro Distributors"},
    {"category": "marketing", "description": "Local flyers & Facebook ads", "amount": 5000.00, "vendor": "Meta Ads / Print Shop"},
    {"category": "maintenance", "description": "Air conditioner repair", "amount": 2200.00, "vendor": "CoolAir Services"},
    {"category": "supplies", "description": "Dairy & Beverage restock", "amount": 15000.00, "vendor": "Mother Dairy Distributor"},
    {"category": "other", "description": "Office stationeries & cleaning kits", "amount": 850.00, "vendor": "Stationery Junction"},
]


async def seed_demo_data(db, business_id: str):
    """Seed fresh, clean, and highly realistic operational data for the hackathon demo."""
    logger.info("Starting database seeding for business", business_id=business_id)

    # 1. Clear existing data for this business
    await db.products.delete_many({"business_id": business_id})
    await db.customers.delete_many({"business_id": business_id})
    await db.orders.delete_many({"business_id": business_id})
    await db.expenses.delete_many({"business_id": business_id})

    now = datetime.now(timezone.utc)

    # 2. Insert Products
    product_ids = []
    products_to_insert = []
    for i, t in enumerate(PRODUCT_TEMPLATES):
        sku = f"PROD-{t['category'][:3].upper()}-{100 + i}"
        doc = {
            "business_id": business_id,
            "name": t["name"],
            "sku": sku,
            "category": t["category"],
            "description": f"High quality {t['name']} sourced from top suppliers.",
            "unit_price": t["unit_price"],
            "cost_price": t["cost_price"],
            "unit": t["unit"],
            "tax_rate": 5.0,  # 5% GST
            "quantity": t["quantity"],
            "reorder_level": t["reorder_level"],
            "image_url": f"https://picsum.photos/200?random={i}",
            "is_active": True,
            "created_at": now - timedelta(days=90),
            "updated_at": now - timedelta(days=90),
        }
        products_to_insert.append(doc)

    prod_result = await db.products.insert_many(products_to_insert)
    product_ids = [str(pid) for pid in prod_result.inserted_ids]
    logger.info("Seeded products count", count=len(product_ids))

    # 3. Insert Customers
    customer_ids = []
    customers_to_insert = []
    for c in CUSTOMER_TEMPLATES:
        doc = {
            "business_id": business_id,
            "name": c["name"],
            "email": c["email"],
            "phone": c["phone"],
            "address": "Delhi, India",
            "segment": c["segment"],
            "loyalty_points": random.randint(10, 500),
            "total_spent": 0.0,  # Computed from orders below
            "total_orders": 0,
            "last_interaction": now - timedelta(days=random.randint(1, 45)),
            "notes": f"Regular customer since 2025. Prefers home delivery.",
            "created_at": now - timedelta(days=60),
            "updated_at": now - timedelta(days=60),
        }
        customers_to_insert.append(doc)

    cust_result = await db.customers.insert_many(customers_to_insert)
    customer_ids = [str(cid) for cid in cust_result.inserted_ids]
    logger.info("Seeded customers count", count=len(customer_ids))

    # Fetch seeded customer documents to bind to orders
    seeded_customers = await db.customers.find({"business_id": business_id}).to_list(length=100)

    # 4. Generate Orders spread across 6 months
    orders_to_insert = []
    order_count = 35

    # List of indices to pick products
    prod_docs = await db.products.find({"business_id": business_id}).to_list(length=100)

    for i in range(order_count):
        # Determine order date: distribute across the last 6 months (180 days)
        days_offset = (order_count - i) * 5  # evenly spaced
        order_date = now - timedelta(days=days_offset) + timedelta(hours=random.randint(0, 12))

        # Select random customer
        customer = random.choice(seeded_customers)
        
        # Select 1-4 random products
        selected_prods = random.sample(prod_docs, k=random.randint(1, 4))
        
        items = []
        subtotal = 0.0
        for p in selected_prods:
            qty = random.randint(1, 3)
            price = p["unit_price"]
            item_total = qty * price
            subtotal += item_total
            items.append({
                "product_id": str(p["_id"]),
                "product_name": p["name"],
                "quantity": qty,
                "unit_price": price,
                "total": item_total
            })

        discount = random.choice([0.0, 50.0, 100.0]) if subtotal > 500 else 0.0
        tax = subtotal * 0.05  # 5% tax
        total_amount = subtotal - discount + tax
        if total_amount < 0:
            total_amount = 0.0

        # status distributions
        status = "delivered"
        payment_status = "paid"
        if i == order_count - 1:
            status = "pending"
            payment_status = "pending"
        elif i == order_count - 2:
            status = "processing"
            payment_status = "paid"
        elif i == order_count - 3:
            status = "cancelled"
            payment_status = "refunded"

        order_number = f"ORD-{1000 + i:04d}-{random.randint(1000, 9999)}"

        order_doc = {
            "business_id": business_id,
            "customer_id": str(customer["_id"]),
            "customer_name": customer["name"],
            "order_number": order_number,
            "items": items,
            "subtotal": subtotal,
            "discount": discount,
            "tax": tax,
            "total_amount": total_amount,
            "status": status,
            "payment_method": random.choice(["gpay", "card", "cash", "net_banking"]),
            "payment_status": payment_status,
            "notes": "Home delivery requested." if random.choice([True, False]) else "",
            "created_at": order_date,
            "updated_at": order_date,
        }
        orders_to_insert.append(order_doc)

        # Update customer running stats
        if payment_status == "paid":
            customer["total_spent"] += total_amount
            customer["total_orders"] += 1

    await db.orders.insert_many(orders_to_insert)
    logger.info("Seeded orders count", count=len(orders_to_insert))

    # Update customer documents with computed total spendings
    for cust in seeded_customers:
        # segment adjustments
        segment = "new"
        if cust["total_spent"] > 8000:
            segment = "vip"
        elif cust["total_orders"] > 3:
            segment = "regular"

        await db.customers.update_one(
            {"_id": cust["_id"]},
            {
                "$set": {
                    "total_spent": cust["total_spent"],
                    "total_orders": cust["total_orders"],
                    "segment": segment,
                    "last_interaction": now - timedelta(days=random.randint(1, 15))
                }
            }
        )
    logger.info("Customers spendings updated.")

    # 5. Seed Expenses over the last 3 months
    expenses_to_insert = []
    for month_offset in range(3):
        # Seed standard expenses for each month
        for template in EXPENSE_TEMPLATES:
            # Spread expenses inside the month
            days_ago = (month_offset * 30) + random.randint(1, 28)
            exp_date = now - timedelta(days=days_ago)

            doc = {
                "business_id": business_id,
                "category": template["category"],
                "description": template["description"],
                "amount": template["amount"] + random.uniform(-100, 500),  # slight variation
                "date": exp_date,
                "vendor": template["vendor"],
                "receipt_url": f"https://s3.amazonaws.com/receipt-placeholder-{random.randint(100,999)}.png",
                "approved_by": "Owner Approved",
                "created_at": exp_date,
                "updated_at": exp_date,
            }
            expenses_to_insert.append(doc)

    await db.expenses.insert_many(expenses_to_insert)
    logger.info("Seeded expenses count", count=len(expenses_to_insert))
    logger.info("Database seeding complete!")
