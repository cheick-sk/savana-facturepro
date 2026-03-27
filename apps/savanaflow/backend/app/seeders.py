"""Database seeding script for SavanaFlow POS.

Run this script to initialize the database with required data:
    python -m app.seeders

This creates:
- Admin user
- Default store
- Sample categories
"""
from __future__ import annotations

import asyncio
import logging

from passlib.context import CryptContext
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import AsyncSessionFactory
from app.models.all_models import User, Store, Category

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
        
        # Create default store
        result = await db.execute(select(Store).where(Store.name == "Main Store"))
        store = result.scalar_one_or_none()
        
        if not store:
            logger.info("Creating default store")
            store = Store(
                name="Main Store",
                address="123 Main Street",
                phone="+225 07 00 00 00 00",
                city="Abidjan",
                currency="XOF",
                tax_rate=18.0,
                receipt_header="=== SAVANAFLOW POS ===",
                receipt_footer="Thank you for your purchase!",
                is_active=True,
            )
            db.add(store)
            await db.commit()
            await db.refresh(store)
            logger.info(f"Default store created with ID: {store.id}")
            
            # Link admin to store
            admin.store_id = store.id
            await db.commit()
        else:
            logger.info("Default store already exists")
        
        # Create sample categories
        categories_data = [
            {"name": "Food & Beverages", "description": "Food and drink items", "color": "#4CAF50", "icon": "food"},
            {"name": "Electronics", "description": "Electronic devices and accessories", "color": "#2196F3", "icon": "device"},
            {"name": "Clothing", "description": "Apparel and fashion items", "color": "#E91E63", "icon": "shirt"},
            {"name": "Household", "description": "Home and kitchen items", "color": "#FF9800", "icon": "home"},
            {"name": "Cosmetics", "description": "Beauty and personal care", "color": "#9C27B0", "icon": "beauty"},
        ]
        
        for cat_data in categories_data:
            result = await db.execute(select(Category).where(Category.name == cat_data["name"]))
            if not result.scalar_one_or_none():
                category = Category(**cat_data, is_active=True)
                db.add(category)
                logger.info(f"Created category: {cat_data['name']}")
        
        await db.commit()
        logger.info("Database seeding completed successfully!")
        
        # Print login credentials
        print("\n" + "="*50)
        print("SavanaFlow POS - Login Credentials")
        print("="*50)
        print(f"Email: {settings.ADMIN_EMAIL}")
        print(f"Password: {settings.ADMIN_PASSWORD}")
        print("="*50 + "\n")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_database())
