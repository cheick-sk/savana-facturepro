#!/usr/bin/env python3
"""
SavanaFlow POS - Database Seeder
Initializes admin, store, categories, and sample products.

Usage:
    python seed_db.py
"""
import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from passlib.context import CryptContext
from sqlalchemy import select

from app.core.database import AsyncSessionFactory
from app.core.config import get_settings
from app.models.all_models import (
    User, Store, Category, Supplier, Product, POSCustomer
)

settings = get_settings()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_admin_user(db) -> User:
    """Create admin user."""
    print("\n👤 Seeding admin user...")
    
    result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
    admin = result.scalar_one_or_none()
    
    if admin:
        print(f"  ✓ Admin exists: {settings.ADMIN_EMAIL}")
        return admin
    
    admin = User(
        email=settings.ADMIN_EMAIL,
        hashed_password=pwd_ctx.hash(settings.ADMIN_PASSWORD),
        first_name=settings.ADMIN_FIRST_NAME,
        last_name=settings.ADMIN_LAST_NAME,
        role="admin",
        is_active=True,
    )
    db.add(admin)
    await db.flush()
    print(f"  ✓ Created admin: {settings.ADMIN_EMAIL}")
    return admin


async def seed_stores(db, admin: User) -> Store:
    """Create default store."""
    print("\n🏪 Seeding stores...")
    
    result = await db.execute(select(Store).where(Store.name == "Magasin Principal"))
    store = result.scalar_one_or_none()
    
    if store:
        print(f"  ✓ Store exists: {store.name}")
        return store
    
    store = Store(
        name="Magasin Principal",
        address="Abidjan, Côte d'Ivoire",
        phone="+2250707070707",
        city="Abidjan",
        currency="XOF",
        tax_rate=18.0,  # 18% TVA
        receipt_header="** SAVANA POS **\nVotre boutique de confiance\n",
        receipt_footer="\nMerci de votre visite!\nA bientôt\n",
        is_active=True,
    )
    db.add(store)
    await db.flush()
    
    # Assign store to admin
    admin.store_id = store.id
    
    print(f"  ✓ Created store: {store.name}")
    return store


async def seed_categories(db) -> list[Category]:
    """Create product categories."""
    print("\n📁 Seeding categories...")
    
    categories_data = [
        {"name": "Boissons", "color": "#3B82F6", "icon": "drink", "sort_order": 1},
        {"name": "Alimentation", "color": "#10B981", "icon": "food", "sort_order": 2},
        {"name": "Hygiène", "color": "#EC4899", "icon": "hygiene", "sort_order": 3},
        {"name": "Ménage", "color": "#F59E0B", "icon": "home", "sort_order": 4},
        {"name": "Électronique", "color": "#6366F1", "icon": "electronics", "sort_order": 5},
        {"name": "Snacks", "color": "#F97316", "icon": "snack", "sort_order": 6},
        {"name": "Cosmétiques", "color": "#A855F7", "icon": "cosmetic", "sort_order": 7},
        {"name": "Papeterie", "color": "#64748B", "icon": "paper", "sort_order": 8},
    ]
    
    categories = []
    for cat_data in categories_data:
        result = await db.execute(select(Category).where(Category.name == cat_data["name"]))
        cat = result.scalar_one_or_none()
        
        if not cat:
            cat = Category(**cat_data, is_active=True)
            db.add(cat)
            await db.flush()
        
        categories.append(cat)
    
    print(f"  ✓ {len(categories_data)} categories ready")
    return categories


async def seed_suppliers(db) -> list[Supplier]:
    """Create suppliers."""
    print("\n🚚 Seeding suppliers...")
    
    suppliers_data = [
        {"name": "Prodis Côte d'Ivoire", "phone": "+2252720304050", "email": "contact@prodis.ci"},
        {"name": "Distrib Food Africa", "phone": "+2252720304060", "email": "info@distribfood.com"},
        {"name": "SIFCA Groupe", "phone": "+2252720304070", "email": "orders@sifca.ci"},
    ]
    
    suppliers = []
    for sup_data in suppliers_data:
        result = await db.execute(select(Supplier).where(Supplier.name == sup_data["name"]))
        sup = result.scalar_one_or_none()
        
        if not sup:
            sup = Supplier(**sup_data, is_active=True)
            db.add(sup)
            await db.flush()
        
        suppliers.append(sup)
    
    print(f"  ✓ {len(suppliers_data)} suppliers ready")
    return suppliers


async def seed_products(db, store: Store, categories: list, suppliers: list) -> None:
    """Create sample products."""
    print("\n📦 Seeding products...")
    
    # Map categories by name
    cat_map = {c.name: c for c in categories}
    sup = suppliers[0] if suppliers else None
    
    products_data = [
        # Boissons
        {"name": "Eau minérale 1.5L", "barcode": "3401234567890", "sell_price": 500, "cost_price": 300, "category": "Boissons", "stock": 100},
        {"name": "Coca-Cola 33cl", "barcode": "3401234567891", "sell_price": 500, "cost_price": 350, "category": "Boissons", "stock": 200},
        {"name": "Coca-Cola 50cl", "barcode": "3401234567892", "sell_price": 700, "cost_price": 500, "category": "Boissons", "stock": 150},
        {"name": "Fanta Orange 33cl", "barcode": "3401234567893", "sell_price": 500, "cost_price": 350, "category": "Boissons", "stock": 120},
        {"name": "Sprite 33cl", "barcode": "3401234567894", "sell_price": 500, "cost_price": 350, "category": "Boissons", "stock": 100},
        {"name": "Jus Top 1L", "barcode": "3401234567895", "sell_price": 1500, "cost_price": 1000, "category": "Boissons", "stock": 50},
        
        # Alimentation
        {"name": "Riz 5kg Premium", "barcode": "3402234567890", "sell_price": 4500, "cost_price": 3500, "category": "Alimentation", "stock": 80},
        {"name": "Huile 5L", "barcode": "3402234567891", "sell_price": 6000, "cost_price": 4800, "category": "Alimentation", "stock": 40},
        {"name": "Sucre 1kg", "barcode": "3402234567892", "sell_price": 1000, "cost_price": 700, "category": "Alimentation", "stock": 100},
        {"name": "Pâte tomate 400g", "barcode": "3402234567893", "sell_price": 800, "cost_price": 500, "category": "Alimentation", "stock": 150},
        {"name": "Lait concentré 400g", "barcode": "3402234567894", "sell_price": 1200, "cost_price": 800, "category": "Alimentation", "stock": 80},
        
        # Snacks
        {"name": "Biscuits LU 200g", "barcode": "3406234567890", "sell_price": 800, "cost_price": 500, "category": "Snacks", "stock": 60},
        {"name": "Chips 100g", "barcode": "3406234567891", "sell_price": 600, "cost_price": 400, "category": "Snacks", "stock": 100},
        {"name": "Bonbons Mix 500g", "barcode": "3406234567892", "sell_price": 1500, "cost_price": 1000, "category": "Snacks", "stock": 50},
        
        # Hygiène
        {"name": "Savon 250g", "barcode": "3403234567890", "sell_price": 500, "cost_price": 300, "category": "Hygiène", "stock": 200},
        {"name": "Dentifrice 100ml", "barcode": "3403234567891", "sell_price": 1000, "cost_price": 600, "category": "Hygiène", "stock": 80},
        {"name": "Shampooing 400ml", "barcode": "3403234567892", "sell_price": 2500, "cost_price": 1800, "category": "Hygiène", "stock": 50},
        
        # Ménage
        {"name": "Lessive 1kg", "barcode": "3404234567890", "sell_price": 2500, "cost_price": 1800, "category": "Ménage", "stock": 60},
        {"name": "Javel 1L", "barcode": "3404234567891", "sell_price": 800, "cost_price": 500, "category": "Ménage", "stock": 100},
        {"name": "Éponge pack 3", "barcode": "3404234567892", "sell_price": 1500, "cost_price": 1000, "category": "Ménage", "stock": 80},
    ]
    
    created = 0
    for prod_data in products_data:
        result = await db.execute(select(Product).where(Product.barcode == prod_data["barcode"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            category = cat_map.get(prod_data.pop("category"))
            stock = prod_data.pop("stock")
            
            product = Product(
                store_id=store.id,
                category_id=category.id if category else None,
                supplier_id=sup.id if sup else None,
                stock_quantity=stock,
                tax_rate=18.0,
                unit="unit",
                is_active=True,
                **prod_data
            )
            db.add(product)
            created += 1
    
    print(f"  ✓ Created {created} products ({len(products_data)} total ready)")


async def seed_customers(db, store: Store) -> None:
    """Create sample loyalty customers."""
    print("\n👥 Seeding customers...")
    
    customers_data = [
        {"name": "Client Demo 1", "phone": "+22507080910"},
        {"name": "Client Demo 2", "phone": "+22507080911"},
        {"name": "Amadou Koné", "phone": "+22507080912"},
        {"name": "Fatou Diallo", "phone": "+22507080913"},
        {"name": "Ibrahim Touré", "phone": "+22507080914"},
    ]
    
    created = 0
    for cust_data in customers_data:
        result = await db.execute(
            select(POSCustomer).where(POSCustomer.phone == cust_data["phone"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            customer = POSCustomer(
                store_id=store.id,
                loyalty_points=0,
                loyalty_tier="STANDARD",
                is_active=True,
                **cust_data
            )
            db.add(customer)
            created += 1
    
    print(f"  ✓ Created {created} customers")


async def seed_all() -> None:
    """Run all seeders."""
    print("=" * 60)
    print("🚀 SavanaFlow POS - Database Seeder")
    print("=" * 60)
    
    async with AsyncSessionFactory() as db:
        try:
            # Seed in order
            admin = await seed_admin_user(db)
            store = await seed_stores(db, admin)
            categories = await seed_categories(db)
            suppliers = await seed_suppliers(db)
            await seed_products(db, store, categories, suppliers)
            await seed_customers(db, store)
            
            await db.commit()
            
            print("\n" + "=" * 60)
            print("✅ Seeding completed successfully!")
            print("=" * 60)
            print(f"\n📋 Login credentials:")
            print(f"   Email: {settings.ADMIN_EMAIL}")
            print(f"   Password: {settings.ADMIN_PASSWORD}")
            print(f"\n🏪 Default Store: {store.name}")
            print(f"   Currency: XOF (FCFA)")
            print(f"   Tax Rate: 18%")
            print("=" * 60)
            
        except Exception as e:
            await db.rollback()
            print(f"\n❌ Seeding failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_all())
