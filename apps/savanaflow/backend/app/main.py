"""SavanaFlow POS — main FastAPI application."""
from __future__ import annotations
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.models import *  # noqa: F401,F403

settings = get_settings()

# ─── Logging Setup ───
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [savanaflow] %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Sentry Initialization (if configured) ───
SENTRY_DSN = getattr(settings, 'SENTRY_DSN', None)
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=getattr(settings, 'APP_ENV', 'development'),
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1,
    )
    logger.info("Sentry monitoring initialized")

# ─── FastAPI App ───
app = FastAPI(
    title="SavanaFlow POS API",
    description="Système de caisse & gestion commerciale — Afrique",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate Limiting Middleware ───
REDIS_URL = getattr(settings, 'REDIS_URL', None)
if REDIS_URL:
    from starlette.middleware.base import BaseHTTPMiddleware
    import redis.asyncio as redis
    import time
    from typing import Optional
    
    class SimpleRateLimitMiddleware(BaseHTTPMiddleware):
        """Simple rate limiting for SavanaFlow."""
        
        EXCLUDE_PATHS = ["/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico"]
        
        def __init__(self, app, redis_url: str):
            super().__init__(app)
            self.redis_url = redis_url
            self.redis: Optional[redis.Redis] = None
        
        async def get_redis(self):
            if self.redis is None:
                self.redis = redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
            return self.redis
        
        async def dispatch(self, request, call_next):
            # Skip excluded paths
            if any(request.url.path.startswith(p) for p in self.EXCLUDE_PATHS):
                return await call_next(request)
            
            # Get client IP
            forwarded = request.headers.get("X-Forwarded-For")
            client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
            
            try:
                r = await self.get_redis()
                key = f"ratelimit:{client_ip}"
                count = await r.incr(key)
                
                if count == 1:
                    await r.expire(key, 60)  # 1 minute window
                
                if count > 100:  # 100 requests per minute
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests", "retry_after": 60}
                    )
            except Exception as e:
                logger.warning(f"Rate limiting error: {e}")
            
            return await call_next(request)
    
    app.add_middleware(SimpleRateLimitMiddleware, redis_url=REDIS_URL)
    logger.info("Rate limiting middleware enabled")

# ─── Routes ───
app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "redis": bool(REDIS_URL),
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    
    # Capture in Sentry if available
    if SENTRY_DSN:
        from sentry_sdk import capture_exception
        capture_exception(exc)
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.on_event("startup")
async def create_initial_admin():
    from passlib.context import CryptContext
    from sqlalchemy import select
    from app.core.database import AsyncSessionFactory
    from app.models.all_models import User, Store
    
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

            # Create default store if none exists
            store_count = (await db.execute(
                select(__import__("sqlalchemy").func.count()).select_from(Store)
            )).scalar() or 0
            if store_count == 0:
                default_store = Store(
                    name="Magasin Principal",
                    city="Abidjan",
                    currency="XOF",
                )
                db.add(default_store)

            await db.commit()
            logger.info(f"Created admin: {settings.ADMIN_EMAIL}")
    
    logger.info(f"SavanaFlow POS started - Environment: {settings.APP_ENV}")
