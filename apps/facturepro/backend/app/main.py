"""FacturePro Africa — main FastAPI application."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.models import *  # noqa: F401,F403 — ensure models registered

settings = get_settings()

# ─── Logging Setup ───
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [facturepro] %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Sentry Initialization ───
if settings.SENTRY_DSN:
    from app.core.monitoring import init_sentry
    init_sentry()
    logger.info("Sentry monitoring initialized")

# ─── FastAPI App ───
app = FastAPI(
    title="FacturePro Africa API",
    description="Facturation professionnelle pour l'Afrique — SaaS Multi-tenant",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate Limiting Middleware ───
if settings.REDIS_URL:
    from app.middleware.rate_limit import RateLimitMiddleware
    app.add_middleware(
        RateLimitMiddleware,
        redis_url=settings.REDIS_URL,
        exclude_paths=["/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico", "/static"],
    )
    logger.info("Rate limiting middleware enabled")

# ─── Sentry Transaction Middleware ───
if settings.SENTRY_DSN:
    from app.core.monitoring import SentryTransactionMiddleware
    app.add_middleware(SentryTransactionMiddleware)

# ─── Tenant Middleware (Multi-tenant) ───
from app.middleware.tenant import TenantMiddleware
app.add_middleware(TenantMiddleware)
logger.info("Tenant middleware enabled")

# ─── Routes ───
app.include_router(api_router)


# ─── Health ───
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "version": "1.0.0",
        "sentry": bool(settings.SENTRY_DSN),
        "redis": bool(settings.REDIS_URL),
    }


# ─── Exception handlers ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    
    # Capture in Sentry if available
    if settings.SENTRY_DSN:
        from app.core.monitoring import capture_error
        capture_error(
            exc,
            context={"path": str(request.url), "method": request.method},
            tags={"source": "global_handler"}
        )
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


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
            
    logger.info(f"FacturePro Africa started - Environment: {settings.APP_ENV}")
