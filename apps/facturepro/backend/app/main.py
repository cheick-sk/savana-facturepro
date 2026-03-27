"""FacturePro Africa — main FastAPI application."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine, AsyncSessionFactory
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


# ─── Startup: create admin and seed data ───
@app.on_event("startup")
async def create_initial_data():
    """Create initial admin user and seed data."""
    from passlib.context import CryptContext
    from sqlalchemy import select, text
    from app.models.all_models import User, Organisation, Plan
    
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    try:
        async with AsyncSessionFactory() as db:
            # Test database connection
            try:
                await db.execute(text("SELECT 1"))
                logger.info("Database connection successful")
            except Exception as e:
                logger.error(f"Database connection failed: {e}")
                return
            
            # Check if admin user exists
            result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
            admin = result.scalar_one_or_none()
            
            if not admin:
                logger.info(f"Creating initial admin user: {settings.ADMIN_EMAIL}")
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
                await db.refresh(admin)
                logger.info(f"Admin user created successfully with ID: {admin.id}")
            else:
                logger.info(f"Admin user already exists: {settings.ADMIN_EMAIL}")
            
            # Create default organisation if not exists
            result = await db.execute(select(Organisation).where(Organisation.slug == "default"))
            org = result.scalar_one_or_none()
            
            if not org:
                logger.info("Creating default organisation")
                org = Organisation(
                    name="Default Organisation",
                    slug="default",
                    plan="starter",
                    currency="XOF",
                    country="Côte d'Ivoire",
                    is_active=True,
                )
                db.add(org)
                await db.commit()
                await db.refresh(org)
                logger.info(f"Default organisation created with ID: {org.id}")
                
                # Link admin to organisation
                admin.organisation_id = org.id
                await db.commit()
            
            # Create default plans if not exist
            plans_data = [
                {"name": "Starter", "code": "starter", "price_monthly": 0, "price_yearly": 0, 
                 "max_users": 1, "max_invoices_month": 50, "max_products": 100, "max_stores": 1},
                {"name": "Professional", "code": "professional", "price_monthly": 15000, "price_yearly": 150000,
                 "max_users": 5, "max_invoices_month": 500, "max_products": 1000, "max_stores": 3},
                {"name": "Enterprise", "code": "enterprise", "price_monthly": 50000, "price_yearly": 500000,
                 "max_users": 50, "max_invoices_month": 5000, "max_products": 10000, "max_stores": 10},
            ]
            
            for plan_data in plans_data:
                result = await db.execute(select(Plan).where(Plan.code == plan_data["code"]))
                if not result.scalar_one_or_none():
                    plan = Plan(**plan_data, features={}, is_active=True)
                    db.add(plan)
                    logger.info(f"Created plan: {plan_data['name']}")
            
            await db.commit()
            logger.info("Initial data seeding completed")
            
    except Exception as e:
        logger.error(f"Error during startup data creation: {e}", exc_info=True)
    
    logger.info(f"FacturePro Africa started - Environment: {settings.APP_ENV}")
