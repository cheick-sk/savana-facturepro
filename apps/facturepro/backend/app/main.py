"""FacturePro Africa — main FastAPI application."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.core.metrics import (
    PrometheusMiddleware,
    metrics_endpoint,
    set_app_info,
)
from app.core.monitoring import init_sentry
from app.models import *  # noqa: F401,F403 — ensure models registered

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [facturepro] %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize Sentry for error tracking (if configured)
init_sentry()

app = FastAPI(
    title="FacturePro Africa API",
    description="Facturation professionnelle pour l'Afrique — MVP",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set application info for Prometheus metrics
set_app_info(
    version="1.0.0",
    environment=settings.APP_ENV,
)

# ─── Prometheus Metrics Middleware ───
# Must be added before other middleware for accurate timing
app.add_middleware(PrometheusMiddleware)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───
app.include_router(api_router)


# ─── Health ───
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


# ─── Prometheus Metrics ───
@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    """Prometheus metrics endpoint.
    
    Exposes application metrics for Prometheus to scrape.
    Includes business metrics, system metrics, and subscription metrics.
    """
    return metrics_endpoint()


# ─── Exception handlers ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ─── Startup: create admin if missing ───
@app.on_event("startup")
async def create_initial_admin():
    from passlib.context import CryptContext
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.database import AsyncSessionFactory
    from app.models.all_models import User

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    async with AsyncSessionFactory() as db:
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        if not result.scalar_one_or_none():
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=pwd_ctx.hash(settings.ADMIN_PASSWORD),
                first_name=settings.ADMIN_FIRST_NAME,
                last_name=settings.ADMIN_LAST_NAME,
                role="admin",
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            logger.info(f"Created initial admin: {settings.ADMIN_EMAIL}")
