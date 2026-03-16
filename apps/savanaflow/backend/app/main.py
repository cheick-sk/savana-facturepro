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
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [savanaflow] %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SavanaFlow POS API",
    description="Système de caisse & gestion commerciale — Afrique",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": "2.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


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
