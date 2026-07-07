from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.businesses import router as business_router
from app.api.v1.products import router as products_router
from app.api.v1.customers import router as customers_router
from app.api.v1.orders import router as orders_router
from app.api.v1.expenses import router as expenses_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.chat import router as chat_router
from app.api.v1.seed import router as seed_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["Auth"])
router.include_router(business_router, prefix="/businesses", tags=["Businesses"])
router.include_router(products_router, prefix="/products", tags=["Products"])
router.include_router(customers_router, prefix="/customers", tags=["Customers"])
router.include_router(orders_router, prefix="/orders", tags=["Orders"])
router.include_router(expenses_router, prefix="/expenses", tags=["Expenses"])
router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(chat_router, prefix="/chat", tags=["AI Chat"])
router.include_router(seed_router, prefix="/seed", tags=["Seed Data"])
