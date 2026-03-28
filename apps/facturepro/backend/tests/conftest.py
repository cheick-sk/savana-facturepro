"""Shared pytest fixtures for FacturePro tests.

This module provides:
- Async database session (using SQLite in-memory for tests)
- Test client (httpx AsyncClient)
- Test user factory (admin, manager, user roles)
- Test organisation factory
- Authentication headers helper
- Sample data factories (customers, products, invoices)
"""
from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator, Generator
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
import pytest_asyncio
from faker import Faker
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from passlib.context import CryptContext
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

# Set test environment before importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-32chars"
os.environ["APP_ENV"] = "test"
os.environ["SMTP_HOST"] = "localhost"
os.environ["SMTP_PORT"] = "1025"

from app.core.config import get_settings
from app.core.database import Base, get_db
from app.main import app
from app.models.all_models import (
    Customer,
    Expense,
    ExpenseCategory,
    Invoice,
    InvoiceItem,
    Organisation,
    Payment,
    Plan,
    Product,
    ProductCategory,
    Quote,
    QuoteItem,
    RecurringInvoice,
    Subscription,
    Supplier,
    UsageQuota,
    User,
)

fake = Faker()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Async Database Fixtures ──────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create async engine with SQLite in-memory database for each test."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async database session for each test."""
    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with async_session_maker() as session:
        # Begin a transaction
        async with session.begin():
            yield session
        # Rollback at the end to keep tests isolated
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def db(db_session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    """Alias for db_session for convenience."""
    yield db_session


# ─── Test Client Fixtures ─────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client with database dependency override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def sync_client(db_session: AsyncSession) -> Generator[TestClient, None, None]:
    """Create synchronous test client for simpler tests."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as tc:
        yield tc

    app.dependency_overrides.clear()


# ─── User Factories ───────────────────────────────────────────────────────────

class UserFactory:
    """Factory for creating test users."""

    @staticmethod
    async def create(
        db: AsyncSession,
        email: str | None = None,
        password: str = "TestPassword123!",
        first_name: str | None = None,
        last_name: str | None = None,
        role: str = "user",
        is_active: bool = True,
        organisation_id: int | None = None,
    ) -> User:
        """Create a user with specified attributes."""
        user = User(
            email=email or fake.email(),
            hashed_password=pwd_ctx.hash(password),
            first_name=first_name or fake.first_name(),
            last_name=last_name or fake.last_name(),
            role=role,
            is_active=is_active,
            organisation_id=organisation_id,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def create_admin(db: AsyncSession, **kwargs) -> User:
        """Create an admin user."""
        kwargs["role"] = "admin"
        return await UserFactory.create(db, **kwargs)

    @staticmethod
    async def create_manager(db: AsyncSession, **kwargs) -> User:
        """Create a manager user."""
        kwargs["role"] = "manager"
        return await UserFactory.create(db, **kwargs)

    @staticmethod
    async def create_regular_user(db: AsyncSession, **kwargs) -> User:
        """Create a regular user."""
        kwargs["role"] = "user"
        return await UserFactory.create(db, **kwargs)


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    """Create a standard test user."""
    return await UserFactory.create(
        db,
        email="test@example.com",
        password="TestPassword123!",
        first_name="Test",
        last_name="User",
        role="user",
    )


@pytest_asyncio.fixture
async def admin_user(db: AsyncSession) -> User:
    """Create an admin test user."""
    return await UserFactory.create(
        db,
        email="admin@example.com",
        password="AdminPassword123!",
        first_name="Admin",
        last_name="User",
        role="admin",
    )


@pytest_asyncio.fixture
async def manager_user(db: AsyncSession) -> User:
    """Create a manager test user."""
    return await UserFactory.create(
        db,
        email="manager@example.com",
        password="ManagerPassword123!",
        first_name="Manager",
        last_name="User",
        role="manager",
    )


# ─── Organisation & Plan Factories ────────────────────────────────────────────

class OrganisationFactory:
    """Factory for creating test organisations."""

    @staticmethod
    async def create(
        db: AsyncSession,
        name: str | None = None,
        slug: str | None = None,
        plan: str = "starter",
        currency: str = "XOF",
        country: str = "Côte d'Ivoire",
        is_active: bool = True,
    ) -> Organisation:
        """Create an organisation with specified attributes."""
        org_name = name or fake.company()
        org = Organisation(
            name=org_name,
            slug=slug or org_name.lower().replace(" ", "-")[:50],
            plan=plan,
            currency=currency,
            country=country,
            is_active=is_active,
            email=fake.company_email(),
            phone=fake.phone_number()[:30] if fake.phone_number() else None,
            address=fake.address(),
        )
        db.add(org)
        await db.flush()
        await db.refresh(org)
        return org


class PlanFactory:
    """Factory for creating test plans."""

    @staticmethod
    async def create(
        db: AsyncSession,
        name: str = "Starter",
        code: str = "starter",
        price_monthly: float = 0.0,
        price_yearly: float = 0.0,
        max_users: int = 1,
        max_invoices_month: int = 50,
        max_products: int = 100,
        max_stores: int = 1,
        features: dict | None = None,
    ) -> Plan:
        """Create a plan with specified attributes."""
        plan = Plan(
            name=name,
            code=code,
            price_monthly=price_monthly,
            price_yearly=price_yearly,
            max_users=max_users,
            max_invoices_month=max_invoices_month,
            max_products=max_products,
            max_stores=max_stores,
            features=features or {},
        )
        db.add(plan)
        await db.flush()
        await db.refresh(plan)
        return plan


class SubscriptionFactory:
    """Factory for creating test subscriptions."""

    @staticmethod
    async def create(
        db: AsyncSession,
        organisation: Organisation,
        plan: Plan,
        status: str = "active",
        current_period_start: datetime | None = None,
        current_period_end: datetime | None = None,
    ) -> Subscription:
        """Create a subscription with specified attributes."""
        now = datetime.now(timezone.utc)
        subscription = Subscription(
            organisation_id=organisation.id,
            plan_id=plan.id,
            status=status,
            current_period_start=current_period_start or now,
            current_period_end=current_period_end or now + timedelta(days=30),
        )
        db.add(subscription)
        await db.flush()
        await db.refresh(subscription)
        return subscription


@pytest_asyncio.fixture
async def test_plan(db: AsyncSession) -> Plan:
    """Create a test plan."""
    return await PlanFactory.create(
        db,
        name="Test Plan",
        code="test",
        max_invoices_month=100,
    )


@pytest_asyncio.fixture
async def test_organisation(db: AsyncSession, test_plan: Plan) -> Organisation:
    """Create a test organisation with subscription."""
    org = await OrganisationFactory.create(db, name="Test Organisation")
    await SubscriptionFactory.create(db, organisation=org, plan=test_plan)
    return org


# ─── Customer Factory ─────────────────────────────────────────────────────────

class CustomerFactory:
    """Factory for creating test customers."""

    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        address: str | None = None,
        city: str | None = None,
        country: str = "Côte d'Ivoire",
        tax_id: str | None = None,
        credit_limit: float = 0.0,
        is_active: bool = True,
    ) -> Customer:
        """Create a customer with specified attributes."""
        customer = Customer(
            organisation_id=organisation_id,
            name=name or fake.name(),
            email=email or fake.email(),
            phone=phone or fake.phone_number()[:30],
            address=address or fake.address(),
            city=city or fake.city(),
            country=country,
            tax_id=tax_id,
            credit_limit=credit_limit,
            is_active=is_active,
        )
        db.add(customer)
        await db.flush()
        await db.refresh(customer)
        return customer


@pytest_asyncio.fixture
async def test_customer(db: AsyncSession, test_organisation: Organisation) -> Customer:
    """Create a test customer."""
    return await CustomerFactory.create(
        db,
        organisation_id=test_organisation.id,
        name="Test Customer",
        email="customer@example.com",
    )


# ─── Product Factory ──────────────────────────────────────────────────────────

class ProductFactory:
    """Factory for creating test products."""

    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        name: str | None = None,
        description: str | None = None,
        sku: str | None = None,
        unit_price: float = 10000.0,
        tax_rate: float = 18.0,
        is_active: bool = True,
        category_id: int | None = None,
    ) -> Product:
        """Create a product with specified attributes."""
        product = Product(
            organisation_id=organisation_id,
            name=name or fake.word().title(),
            description=description or fake.sentence(),
            sku=sku or fake.bothify(text="SKU-####"),
            unit_price=unit_price,
            tax_rate=tax_rate,
            is_active=is_active,
            category_id=category_id,
        )
        db.add(product)
        await db.flush()
        await db.refresh(product)
        return product


@pytest_asyncio.fixture
async def test_product(db: AsyncSession, test_organisation: Organisation) -> Product:
    """Create a test product."""
    return await ProductFactory.create(
        db,
        organisation_id=test_organisation.id,
        name="Test Product",
        unit_price=5000.0,
    )


# ─── Supplier Factory ─────────────────────────────────────────────────────────

class SupplierFactory:
    """Factory for creating test suppliers."""

    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        payment_terms: int = 30,
        is_active: bool = True,
    ) -> Supplier:
        """Create a supplier with specified attributes."""
        supplier = Supplier(
            organisation_id=organisation_id,
            name=name or fake.company(),
            email=email or fake.company_email(),
            phone=phone or fake.phone_number()[:30],
            payment_terms=payment_terms,
            is_active=is_active,
        )
        db.add(supplier)
        await db.flush()
        await db.refresh(supplier)
        return supplier


@pytest_asyncio.fixture
async def test_supplier(db: AsyncSession, test_organisation: Organisation) -> Supplier:
    """Create a test supplier."""
    return await SupplierFactory.create(
        db,
        organisation_id=test_organisation.id,
        name="Test Supplier",
    )


# ─── Invoice Factory ──────────────────────────────────────────────────────────

class InvoiceFactory:
    """Factory for creating test invoices."""

    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        customer_id: int,
        created_by: int,
        invoice_number: str | None = None,
        status: str = "DRAFT",
        total_amount: float = 50000.0,
        due_date: datetime | None = None,
        currency: str = "XOF",
    ) -> Invoice:
        """Create an invoice with specified attributes."""
        count = (await db.execute(
            "SELECT COUNT(*) FROM invoices"
        )).scalar() if "invoices" in str(db.bind.url) else 0

        invoice = Invoice(
            organisation_id=organisation_id,
            invoice_number=invoice_number or f"FP-{datetime.now().year}-{count + 1:05d}",
            customer_id=customer_id,
            created_by=created_by,
            status=status,
            total_amount=total_amount,
            subtotal=total_amount / 1.18,
            tax_amount=total_amount - (total_amount / 1.18),
            due_date=due_date or datetime.now(timezone.utc) + timedelta(days=30),
            currency=currency,
        )
        db.add(invoice)
        await db.flush()
        await db.refresh(invoice)
        return invoice

    @staticmethod
    async def add_item(
        db: AsyncSession,
        invoice: Invoice,
        description: str = "Test Item",
        quantity: float = 1.0,
        unit_price: float = 10000.0,
        tax_rate: float = 18.0,
    ) -> InvoiceItem:
        """Add an item to an invoice."""
        base = round(quantity * unit_price, 2)
        tax = round(base * tax_rate / 100, 2)
        line_total = round(base + tax, 2)

        item = InvoiceItem(
            invoice_id=invoice.id,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            tax_rate=tax_rate,
            line_total=line_total,
        )
        db.add(item)
        await db.flush()
        await db.refresh(item)
        return item


@pytest_asyncio.fixture
async def test_invoice(
    db: AsyncSession,
    test_organisation: Organisation,
    test_customer: Customer,
    test_user: User,
) -> Invoice:
    """Create a test invoice with items."""
    invoice = await InvoiceFactory.create(
        db,
        organisation_id=test_organisation.id,
        customer_id=test_customer.id,
        created_by=test_user.id,
        total_amount=59000.0,
    )
    await InvoiceFactory.add_item(
        db,
        invoice,
        description="Test Service",
        quantity=1,
        unit_price=50000.0,
        tax_rate=18.0,
    )
    return invoice


# ─── Quote Factory ────────────────────────────────────────────────────────────

class QuoteFactory:
    """Factory for creating test quotes."""

    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        customer_id: int,
        created_by: int,
        quote_number: str | None = None,
        status: str = "DRAFT",
        total_amount: float = 50000.0,
        expiry_date: datetime | None = None,
    ) -> Quote:
        """Create a quote with specified attributes."""
        count = 0
        quote = Quote(
            organisation_id=organisation_id,
            quote_number=quote_number or f"DEV-{datetime.now().year}-{count + 1:05d}",
            customer_id=customer_id,
            created_by=created_by,
            status=status,
            total_amount=total_amount,
            subtotal=total_amount / 1.18,
            tax_amount=total_amount - (total_amount / 1.18),
            expiry_date=expiry_date or datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(quote)
        await db.flush()
        await db.refresh(quote)
        return quote


# ─── Payment Factory ──────────────────────────────────────────────────────────

class PaymentFactory:
    """Factory for creating test payments."""

    @staticmethod
    async def create(
        db: AsyncSession,
        invoice_id: int,
        amount: float,
        method: str = "MOBILE_MONEY",
        reference: str | None = None,
        phone_number: str | None = None,
        operator: str | None = None,
    ) -> Payment:
        """Create a payment with specified attributes."""
        payment = Payment(
            invoice_id=invoice_id,
            amount=amount,
            method=method,
            reference=reference or fake.bothify(text="PAY-####"),
            phone_number=phone_number,
            operator=operator,
        )
        db.add(payment)
        await db.flush()
        await db.refresh(payment)
        return payment


# ─── Usage Quota Factory ──────────────────────────────────────────────────────

class UsageQuotaFactory:
    """Factory for creating test usage quotas."""

    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        month: int | None = None,
        year: int | None = None,
        invoices_count: int = 0,
        users_count: int = 1,
        products_count: int = 0,
    ) -> UsageQuota:
        """Create a usage quota record."""
        now = datetime.now()
        quota = UsageQuota(
            organisation_id=organisation_id,
            month=month or now.month,
            year=year or now.year,
            invoices_count=invoices_count,
            users_count=users_count,
            products_count=products_count,
        )
        db.add(quota)
        await db.flush()
        await db.refresh(quota)
        return quota


# ─── Authentication Helpers ───────────────────────────────────────────────────

class AuthHelper:
    """Helper class for authentication in tests."""

    @staticmethod
    def create_access_token(user: User, expires_delta: timedelta | None = None) -> str:
        """Create a JWT access token for a user."""
        from jose import jwt
        settings = get_settings()

        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        expire = datetime.now(timezone.utc) + expires_delta
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "type": "access",
            "exp": expire,
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    @staticmethod
    def create_refresh_token(user: User, expires_delta: timedelta | None = None) -> str:
        """Create a JWT refresh token for a user."""
        from jose import jwt
        settings = get_settings()

        if expires_delta is None:
            expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        expire = datetime.now(timezone.utc) + expires_delta
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "type": "refresh",
            "exp": expire,
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    @staticmethod
    def auth_headers(user: User) -> dict[str, str]:
        """Create authorization headers for a user."""
        token = AuthHelper.create_access_token(user)
        return {"Authorization": f"Bearer {token}"}

    @staticmethod
    def refresh_headers(user: User) -> dict[str, str]:
        """Create headers with refresh token."""
        token = AuthHelper.create_refresh_token(user)
        return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_user(db: AsyncSession, test_organisation: Organisation) -> User:
    """Create an authenticated user with organisation."""
    user = await UserFactory.create(
        db,
        email="auth@example.com",
        password="AuthPassword123!",
        role="user",
        organisation_id=test_organisation.id,
    )
    return user


@pytest_asyncio.fixture
def auth_headers(auth_user: User) -> dict[str, str]:
    """Create authentication headers for the auth_user."""
    return AuthHelper.auth_headers(auth_user)


# ─── Sample Data Fixtures ─────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def sample_customers(
    db: AsyncSession,
    test_organisation: Organisation,
) -> list[Customer]:
    """Create multiple sample customers."""
    customers = []
    for i in range(5):
        customer = await CustomerFactory.create(
            db,
            organisation_id=test_organisation.id,
            name=f"Customer {i + 1}",
            email=f"customer{i + 1}@example.com",
        )
        customers.append(customer)
    return customers


@pytest_asyncio.fixture
async def sample_products(
    db: AsyncSession,
    test_organisation: Organisation,
) -> list[Product]:
    """Create multiple sample products."""
    products = []
    for i in range(5):
        product = await ProductFactory.create(
            db,
            organisation_id=test_organisation.id,
            name=f"Product {i + 1}",
            unit_price=10000.0 * (i + 1),
        )
        products.append(product)
    return products


@pytest_asyncio.fixture
async def full_setup(
    db: AsyncSession,
) -> dict[str, Any]:
    """Create a full test setup with organisation, users, customers, and products."""
    # Create plan
    plan = await PlanFactory.create(
        db,
        name="Business",
        code="business",
        max_invoices_month=100,
        max_users=5,
    )

    # Create organisation
    org = await OrganisationFactory.create(db, name="Test Company", plan="business")

    # Create subscription
    subscription = await SubscriptionFactory.create(db, organisation=org, plan=plan)

    # Create users
    admin = await UserFactory.create_admin(
        db,
        email="admin@testcompany.com",
        organisation_id=org.id,
    )
    manager = await UserFactory.create_manager(
        db,
        email="manager@testcompany.com",
        organisation_id=org.id,
    )
    user = await UserFactory.create_regular_user(
        db,
        email="user@testcompany.com",
        organisation_id=org.id,
    )

    # Create customers
    customers = []
    for i in range(3):
        customer = await CustomerFactory.create(
            db,
            organisation_id=org.id,
            name=f"Client {i + 1}",
        )
        customers.append(customer)

    # Create products
    products = []
    for i in range(3):
        product = await ProductFactory.create(
            db,
            organisation_id=org.id,
            name=f"Service {i + 1}",
            unit_price=25000.0 * (i + 1),
        )
        products.append(product)

    # Create usage quota
    quota = await UsageQuotaFactory.create(
        db,
        organisation_id=org.id,
        invoices_count=10,
    )

    return {
        "organisation": org,
        "plan": plan,
        "subscription": subscription,
        "users": {
            "admin": admin,
            "manager": manager,
            "user": user,
        },
        "customers": customers,
        "products": products,
        "quota": quota,
    }


# ─── Cleanup Fixtures ─────────────────────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def cleanup_db(db_session: AsyncSession):
    """Automatically cleanup database after each test."""
    yield
    # Rollback any uncommitted changes
    await db_session.rollback()
