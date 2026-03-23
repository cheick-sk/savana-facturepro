"""Database seeders for FacturePro Africa.
Populates initial data: plans, admin user, default organisation.

Usage:
    python -m app.seeders
    or
    python -c "from app.seeders import seed_all; import asyncio; asyncio.run(seed_all())"
"""
import asyncio
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionFactory
from app.core.config import get_settings
from app.models.all_models import User
from shared.libs.models.tenant import Plan, Organisation, Subscription, UsageQuota, PlanFeature

settings = get_settings()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─────────────────────────────────────────────────────────────────────────────
# PLAN DEFINITIONS - African SaaS Pricing
# ─────────────────────────────────────────────────────────────────────────────

PLANS_DATA = [
    {
        "name": "Starter",
        "slug": "starter",
        "description": "Idéal pour les freelances et micro-entreprises. Commencez gratuitement avec les fonctionnalités essentielles.",
        "price_monthly": 5000,  # 5,000 XOF (~€7.5)
        "price_yearly": 50000,  # 50,000 XOF (~€75) - 2 months free
        "currency": "XOF",
        "features": {
            PlanFeature.MAX_USERS: 2,
            PlanFeature.MAX_INVOICES: 50,
            PlanFeature.MAX_PRODUCTS: 100,
            PlanFeature.MAX_CUSTOMERS: 200,
            PlanFeature.STORAGE_GB: 1,
            PlanFeature.API_ACCESS: False,
            PlanFeature.WHATSAPP_NOTIFICATIONS: False,
            PlanFeature.RECURRING_INVOICES: False,
            PlanFeature.MULTI_CURRENCY: False,
            PlanFeature.REPORTS_BASIC: True,
            PlanFeature.REPORTS_ADVANCED: False,
            PlanFeature.SUPPORT: "email",
        },
        "limits": {
            "invoices_per_month": 50,
            "products": 100,
            "customers": 200,
        },
        "display_order": 1,
        "is_default": True,
    },
    {
        "name": "Pro",
        "slug": "pro",
        "description": "Pour les PME en croissance. Inclut WhatsApp, factures récurrentes et rapports avancés.",
        "price_monthly": 15000,  # 15,000 XOF (~€23)
        "price_yearly": 150000,  # 150,000 XOF (~€230)
        "currency": "XOF",
        "features": {
            PlanFeature.MAX_USERS: 5,
            PlanFeature.MAX_INVOICES: 500,
            PlanFeature.MAX_PRODUCTS: 500,
            PlanFeature.MAX_CUSTOMERS: 1000,
            PlanFeature.STORAGE_GB: 5,
            PlanFeature.API_ACCESS: True,
            PlanFeature.WHATSAPP_NOTIFICATIONS: True,
            PlanFeature.RECURRING_INVOICES: True,
            PlanFeature.MULTI_CURRENCY: True,
            PlanFeature.REPORTS_BASIC: True,
            PlanFeature.REPORTS_ADVANCED: True,
            PlanFeature.SUPPORT: "email",
        },
        "limits": {
            "invoices_per_month": 500,
            "products": 500,
            "customers": 1000,
        },
        "display_order": 2,
        "is_default": False,
    },
    {
        "name": "Business",
        "slug": "business",
        "description": "Pour les entreprises établies. Multi-utilisateurs, API complète et support prioritaire.",
        "price_monthly": 50000,  # 50,000 XOF (~€75)
        "price_yearly": 500000,  # 500,000 XOF (~€750)
        "currency": "XOF",
        "features": {
            PlanFeature.MAX_USERS: 20,
            PlanFeature.MAX_INVOICES: -1,  # Unlimited
            PlanFeature.MAX_PRODUCTS: -1,
            PlanFeature.MAX_CUSTOMERS: -1,
            PlanFeature.STORAGE_GB: 20,
            PlanFeature.API_ACCESS: True,
            PlanFeature.WHATSAPP_NOTIFICATIONS: True,
            PlanFeature.RECURRING_INVOICES: True,
            PlanFeature.MULTI_CURRENCY: True,
            PlanFeature.REPORTS_BASIC: True,
            PlanFeature.REPORTS_ADVANCED: True,
            PlanFeature.SUPPORT: "priority",
        },
        "limits": {
            "invoices_per_month": -1,  # Unlimited
            "products": -1,
            "customers": -1,
        },
        "display_order": 3,
        "is_default": False,
    },
    {
        "name": "Enterprise",
        "slug": "enterprise",
        "description": "Solution sur mesure pour les grandes entreprises. Support dédié et intégrations personnalisées.",
        "price_monthly": 0,  # Contact sales
        "price_yearly": 0,
        "currency": "XOF",
        "features": {
            PlanFeature.MAX_USERS: -1,
            PlanFeature.MAX_INVOICES: -1,
            PlanFeature.MAX_PRODUCTS: -1,
            PlanFeature.MAX_CUSTOMERS: -1,
            PlanFeature.STORAGE_GB: -1,
            PlanFeature.API_ACCESS: True,
            PlanFeature.WHATSAPP_NOTIFICATIONS: True,
            PlanFeature.RECURRING_INVOICES: True,
            PlanFeature.MULTI_CURRENCY: True,
            PlanFeature.REPORTS_BASIC: True,
            PlanFeature.REPORTS_ADVANCED: True,
            PlanFeature.SUPPORT: "dedicated",
        },
        "limits": {},
        "display_order": 4,
        "is_default": False,
    },
]


async def seed_plans(db: AsyncSession) -> None:
    """Seed subscription plans."""
    
    print("Seeding plans...")
    
    for plan_data in PLANS_DATA:
        # Check if plan exists
        result = await db.execute(
            select(Plan).where(Plan.slug == plan_data["slug"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"  Plan '{plan_data['name']}' already exists, updating...")
            # Update existing plan
            for key, value in plan_data.items():
                setattr(existing, key, value)
        else:
            print(f"  Creating plan '{plan_data['name']}'...")
            plan = Plan(**plan_data)
            db.add(plan)
    
    await db.commit()
    print("Plans seeded successfully!")


async def seed_admin_user(db: AsyncSession) -> User:
    """Seed admin user."""
    
    print("Seeding admin user...")
    
    # Check if admin exists
    result = await db.execute(
        select(User).where(User.email == settings.ADMIN_EMAIL)
    )
    admin = result.scalar_one_or_none()
    
    if admin:
        print(f"  Admin user already exists: {settings.ADMIN_EMAIL}")
        return admin
    
    # Create admin
    admin = User(
        email=settings.ADMIN_EMAIL,
        hashed_password=pwd_ctx.hash(settings.ADMIN_PASSWORD),
        first_name=settings.ADMIN_FIRST_NAME,
        last_name=settings.ADMIN_LAST_NAME,
        role="admin",
        is_active=True,
        email_verified=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    
    print(f"  Admin user created: {settings.ADMIN_EMAIL}")
    return admin


async def seed_default_organisation(db: AsyncSession, admin: User) -> Organisation:
    """Seed default organisation for admin."""
    
    print("Seeding default organisation...")
    
    # Check if org exists
    result = await db.execute(
        select(Organisation).where(Organisation.slug == "demo-company")
    )
    org = result.scalar_one_or_none()
    
    if org:
        print("  Default organisation already exists")
        return org
    
    # Get Pro plan
    result = await db.execute(select(Plan).where(Plan.slug == "pro"))
    pro_plan = result.scalar_one_or_none()
    
    # Create organisation
    org = Organisation(
        name="Demo Company",
        slug="demo-company",
        email="demo@facturepro.africa",
        phone="+2250707070707",
        address="Abidjan, Côte d'Ivoire",
        city="Abidjan",
        country="CI",
        currency="XOF",
        status="active",
    )
    db.add(org)
    await db.flush()
    
    # Associate admin with organisation
    admin.organisation_id = org.id
    admin.role = "admin"  # Organisation admin
    
    # Create subscription
    if pro_plan:
        subscription = Subscription(
            organisation_id=org.id,
            plan_id=pro_plan.id,
            status="active",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=365),
        )
        db.add(subscription)
        
        # Create usage quotas
        for feature, limit in pro_plan.features.items():
            quota = UsageQuota(
                organisation_id=org.id,
                feature=feature,
                used=0,
                limit=limit if isinstance(limit, int) else 0,
            )
            db.add(quota)
    
    await db.commit()
    await db.refresh(org)
    
    print(f"  Default organisation created: {org.name}")
    return org


async def seed_currencies(db: AsyncSession) -> None:
    """Seed supported currencies (could be a separate table)."""
    
    # For now, currencies are defined in config and i18n
    # This could be expanded to a currencies table if needed
    print("Currencies are configured in i18n and config files.")
    pass


async def seed_all() -> None:
    """Run all seeders."""
    
    print("=" * 60)
    print("FacturePro Africa - Database Seeder")
    print("=" * 60)
    
    async with AsyncSessionFactory() as db:
        # Seed plans first
        await seed_plans(db)
        
        # Seed admin user
        admin = await seed_admin_user(db)
        
        # Seed default organisation
        await seed_default_organisation(db, admin)
        
        # Seed currencies
        await seed_currencies(db)
    
    print("=" * 60)
    print("Seeding completed successfully!")
    print("=" * 60)


async def clear_all_data() -> None:
    """Clear all data (for testing). WARNING: Destroys all data!"""
    
    print("WARNING: This will delete ALL data!")
    confirm = input("Type 'DELETE ALL' to confirm: ")
    
    if confirm != "DELETE ALL":
        print("Cancelled.")
        return
    
    async with AsyncSessionFactory() as db:
        # Delete in reverse order of dependencies
        await db.execute("DELETE FROM usage_quotas")
        await db.execute("DELETE FROM subscriptions")
        await db.execute("DELETE FROM payments")
        await db.execute("DELETE FROM expenses")
        await db.execute("DELETE FROM invoice_items")
        await db.execute("DELETE FROM invoices")
        await db.execute("DELETE FROM quotes")
        await db.execute("DELETE FROM products")
        await db.execute("DELETE FROM customers")
        await db.execute("DELETE FROM categories")
        await db.execute("DELETE FROM suppliers")
        await db.execute("DELETE FROM users")
        await db.execute("DELETE FROM organisations")
        await db.commit()
    
    print("All data deleted.")


if __name__ == "__main__":
    asyncio.run(seed_all())
