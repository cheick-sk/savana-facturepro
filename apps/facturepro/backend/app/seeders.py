"""Database seeding script for FacturePro Africa.

Run this script to initialize the database with required data:
    python -m app.seed

This creates:
- Admin user
- Default organisation
- Subscription plans
"""
from __future__ import annotations

import asyncio
import logging

from passlib.context import CryptContext
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import AsyncSessionFactory
from app.models.all_models import User, Organisation, Plan

logger = logging.getLogger(__name__)
settings = get_settings()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_database():
    """Seed the database with initial data."""
    logger.info("Starting database seeding...")
    
    async with AsyncSessionFactory() as db:
        # Create admin user
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        admin = result.scalar_one_or_none()
        
        if not admin:
            logger.info(f"Creating admin user: {settings.ADMIN_EMAIL}")
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
            logger.info(f"Admin user created with ID: {admin.id}")
        else:
            logger.info(f"Admin user already exists: {settings.ADMIN_EMAIL}")
        
        # Create default organisation
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
        else:
            logger.info(f"Default organisation already exists")
        
        # Create subscription plans
        plans_data = [
            {
                "name": "Starter",
                "code": "starter",
                "price_monthly": 0,
                "price_yearly": 0,
                "max_users": 1,
                "max_invoices_month": 50,
                "max_products": 100,
                "max_stores": 1,
                "features": {"basic_invoicing": True, "reports": False}
            },
            {
                "name": "Professional",
                "code": "professional",
                "price_monthly": 15000,
                "price_yearly": 150000,
                "max_users": 5,
                "max_invoices_month": 500,
                "max_products": 1000,
                "max_stores": 3,
                "features": {"basic_invoicing": True, "reports": True, "api_access": True}
            },
            {
                "name": "Enterprise",
                "code": "enterprise",
                "price_monthly": 50000,
                "price_yearly": 500000,
                "max_users": 50,
                "max_invoices_month": 5000,
                "max_products": 10000,
                "max_stores": 10,
                "features": {"basic_invoicing": True, "reports": True, "api_access": True, "custom_branding": True, "priority_support": True}
            },
        ]
        
        for plan_data in plans_data:
            result = await db.execute(select(Plan).where(Plan.code == plan_data["code"]))
            if not result.scalar_one_or_none():
                plan = Plan(**plan_data, is_active=True)
                db.add(plan)
                logger.info(f"Created plan: {plan_data['name']}")
        
        await db.commit()
        logger.info("Database seeding completed successfully!")
        
        # Print login credentials
        print("\n" + "="*50)
        print("FacturePro Africa - Login Credentials")
        print("="*50)
        print(f"Email: {settings.ADMIN_EMAIL}")
        print(f"Password: {settings.ADMIN_PASSWORD}")
        print("="*50 + "\n")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_database())
