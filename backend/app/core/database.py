from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def startup_db() -> None:
    """Connect to MongoDB and create indexes on startup."""
    global _client, _database
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    _database = _client["aicoo_db"]

    # Verify connection
    try:
        await _client.admin.command("ping")
        logger.info("MongoDB connection established successfully.")
    except Exception as e:
        logger.error("Failed to connect to MongoDB", error=str(e))
        raise

    # Create indexes
    await _create_indexes(_database)


async def _create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create indexes for all collections."""
    try:
        # Users: unique email
        await db.users.create_index([("email", ASCENDING)], unique=True)

        # Businesses: owner_id for lookup
        await db.businesses.create_index([("owner_id", ASCENDING)])

        # Products: business_id + sku compound, business_id for listing
        await db.products.create_index([("business_id", ASCENDING), ("sku", ASCENDING)], unique=True)
        await db.products.create_index([("business_id", ASCENDING)])

        # Customers: business_id + email compound, business_id for listing
        await db.customers.create_index([("business_id", ASCENDING), ("email", ASCENDING)])
        await db.customers.create_index([("business_id", ASCENDING)])

        # Orders: business_id + order_number, business_id for listing
        await db.orders.create_index([("business_id", ASCENDING), ("order_number", ASCENDING)], unique=True)
        await db.orders.create_index([("business_id", ASCENDING)])

        # Expenses: business_id for listing
        await db.expenses.create_index([("business_id", ASCENDING)])

        # Chat history: user_id + conversation_id
        await db.chat_history.create_index([("user_id", ASCENDING), ("conversation_id", ASCENDING)])

        logger.info("Database indexes created successfully.")
    except Exception as e:
        logger.warning("Index creation warning (may already exist)", error=str(e))


async def shutdown_db() -> None:
    """Close MongoDB connection on shutdown."""
    global _client, _database
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")
    _client = None
    _database = None


def get_database() -> AsyncIOMotorDatabase:
    """Dependency to get the database instance."""
    if _database is None:
        raise RuntimeError("Database not initialized. Call startup_db() first.")
    return _database
