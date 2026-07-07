from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import startup_db, shutdown_db
from app.core.exceptions import register_exception_handlers
from app.api.v1.router import router as api_v1_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB and create indexes
    try:
        await startup_db()
        logger.info("Application startup complete.")
    except Exception as e:
        logger.error("Application startup failed", error=str(e))
        raise e
    yield
    # Shutdown: Close database connections
    await shutdown_db()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI COO - Business Operating System API",
    version="1.0.0",
    lifespan=lifespan,
    debug=settings.DEBUG,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exceptions
register_exception_handlers(app)

# Include v1 API routes
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "status": "online",
        "message": f"Welcome to the {settings.APP_NAME} API!",
        "version": "1.0.0",
    }
