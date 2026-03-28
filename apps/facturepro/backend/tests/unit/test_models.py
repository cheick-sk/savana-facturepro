"""Unit tests for SQLAlchemy models.

Tests cover:
- Model instantiation and attributes
- Relationships between models
- Constraints and validations
- Computed properties
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

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

from tests.conftest import (
    UserFactory,
    OrganisationFactory,
    PlanFactory,
    SubscriptionFactory,
    CustomerFactory,
    ProductFactory,
    SupplierFactory,
    InvoiceFactory,
    PaymentFactory,
    UsageQuotaFactory,
)


pytestmark = pytest.mark.unit


# ─── User Model Tests ─────────────────────────────────────────────────────────

class TestUserModel:
    """Tests for the User model."""

    @pytest.mark.asyncio
    async def test_create_user(self, db: AsyncSession):
        """Test creating a user with required fields."""
        user = await UserFactory.create(
            db,
            email="newuser@example.com",
            first_name="John",
            last_name="Doe",
        )
        assert user.id is not None
        assert user.email == "newuser@example.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.role == "user"
        assert user.is_active is True
        assert user.created_at is not None

    @pytest.mark.asyncio
    async def test_user_full_name_property(self, db: AsyncSession):
        """Test the full_name computed property."""
        user = await UserFactory.create(
            db,
            first_name="John",
            last_name="Doe",
        )
        assert user.full_name == "John Doe"

    @pytest.mark.asyncio
    async def test_user_default_role(self, db: AsyncSession):
        """Test that default role is 'user'."""
        user = await UserFactory.create(db)
        assert user.role == "user"

    @pytest.mark.asyncio
    async def test_user_unique_email(self, db: AsyncSession):
        """Test that email must be unique."""
        await UserFactory.create(db, email="same@example.com")
        with pytest.raises(IntegrityError):
            await UserFactory.create(db, email="same@example.com")
            await db.flush()

    @pytest.mark.asyncio
    async def test_user_roles(self, db: AsyncSession):
        """Test different user roles."""
        admin = await UserFactory.create_admin(db, email="admin@test.com")
        manager = await UserFactory.create_manager(db, email="manager@test.com")
        user = await UserFactory.create_regular_user(db, email="user@test.com")

        assert admin.role == "admin"
        assert manager.role == "manager"
        assert user.role == "user"


# ─── Organisation Model Tests ─────────────────────────────────────────────────

class TestOrganisationModel:
    """Tests for the Organisation model."""

    @pytest.mark.asyncio
    async def test_create_organisation(self, db: AsyncSession):
        """Test creating an organisation."""
        org = await OrganisationFactory.create(
            db,
            name="Test Company",
            slug="test-company",
        )
        assert org.id is not None
        assert org.name == "Test Company"
        assert org.slug == "test-company"
        assert org.plan == "starter"
        assert org.currency == "XOF"
        assert org.is_active is True

    @pytest.mark.asyncio
    async def test_organisation_unique_slug(self, db: AsyncSession):
        """Test that slug must be unique."""
        await OrganisationFactory.create(db, slug="unique-slug")
        with pytest.raises(IntegrityError):
            await OrganisationFactory.create(db, slug="unique-slug")
            await db.flush()

    @pytest.mark.asyncio
    async def test_organisation_defaults(self, db: AsyncSession):
        """Test default values for organisation."""
        org = Organisation(
            name="Default Org",
            slug="default-org",
        )
        db.add(org)
        await db.flush()
        await db.refresh(org)

        assert org.currency == "XOF"
        assert org.country == "Côte d'Ivoire"
        assert org.plan == "starter"
        assert org.is_active is True


# ─── Plan & Subscription Model Tests ──────────────────────────────────────────

class TestPlanModel:
    """Tests for the Plan model."""

    @pytest.mark.asyncio
    async def test_create_plan(self, db: AsyncSession):
        """Test creating a subscription plan."""
        plan = await PlanFactory.create(
            db,
            name="Premium",
            code="premium",
            price_monthly=50000.0,
            max_invoices_month=500,
        )
        assert plan.id is not None
        assert plan.name == "Premium"
        assert plan.code == "premium"
        assert float(plan.price_monthly) == 50000.0
        assert plan.max_invoices_month == 500

    @pytest.mark.asyncio
    async def test_plan_unique_code(self, db: AsyncSession):
        """Test that plan code must be unique."""
        await PlanFactory.create(db, code="unique-plan")
        with pytest.raises(IntegrityError):
            await PlanFactory.create(db, code="unique-plan")
            await db.flush()


class TestSubscriptionModel:
    """Tests for the Subscription model."""

    @pytest.mark.asyncio
    async def test_create_subscription(self, db: AsyncSession):
        """Test creating a subscription."""
        plan = await PlanFactory.create(db)
        org = await OrganisationFactory.create(db)

        subscription = await SubscriptionFactory.create(
            db,
            organisation=org,
            plan=plan,
        )
        assert subscription.id is not None
        assert subscription.organisation_id == org.id
        assert subscription.plan_id == plan.id
        assert subscription.status == "active"

    @pytest.mark.asyncio
    async def test_subscription_dates(self, db: AsyncSession):
        """Test subscription period dates."""
        plan = await PlanFactory.create(db)
        org = await OrganisationFactory.create(db)
        now = datetime.now(timezone.utc)

        subscription = await SubscriptionFactory.create(
            db,
            organisation=org,
            plan=plan,
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
        )
        assert subscription.current_period_start is not None
        assert subscription.current_period_end > subscription.current_period_start


# ─── Customer Model Tests ─────────────────────────────────────────────────────

class TestCustomerModel:
    """Tests for the Customer model."""

    @pytest.mark.asyncio
    async def test_create_customer(self, db: AsyncSession):
        """Test creating a customer."""
        org = await OrganisationFactory.create(db)
        customer = await CustomerFactory.create(
            db,
            organisation_id=org.id,
            name="Test Customer",
            email="customer@example.com",
        )
        assert customer.id is not None
        assert customer.name == "Test Customer"
        assert customer.email == "customer@example.com"
        assert customer.organisation_id == org.id
        assert customer.is_active is True

    @pytest.mark.asyncio
    async def test_customer_defaults(self, db: AsyncSession):
        """Test default values for customer."""
        org = await OrganisationFactory.create(db)
        customer = Customer(
            organisation_id=org.id,
            name="Default Customer",
        )
        db.add(customer)
        await db.flush()
        await db.refresh(customer)

        assert customer.country == "Côte d'Ivoire"
        assert float(customer.credit_limit) == 0.0
        assert customer.is_active is True

    @pytest.mark.asyncio
    async def test_customer_credit_limit(self, db: AsyncSession):
        """Test customer credit limit."""
        org = await OrganisationFactory.create(db)
        customer = await CustomerFactory.create(
            db,
            organisation_id=org.id,
            credit_limit=100000.0,
        )
        assert float(customer.credit_limit) == 100000.0


# ─── Product Model Tests ──────────────────────────────────────────────────────

class TestProductModel:
    """Tests for the Product model."""

    @pytest.mark.asyncio
    async def test_create_product(self, db: AsyncSession):
        """Test creating a product."""
        org = await OrganisationFactory.create(db)
        product = await ProductFactory.create(
            db,
            organisation_id=org.id,
            name="Test Product",
            unit_price=15000.0,
            tax_rate=18.0,
        )
        assert product.id is not None
        assert product.name == "Test Product"
        assert float(product.unit_price) == 15000.0
        assert float(product.tax_rate) == 18.0
        assert product.is_active is True

    @pytest.mark.asyncio
    async def test_product_unique_sku(self, db: AsyncSession):
        """Test that SKU must be unique."""
        org = await OrganisationFactory.create(db)
        await ProductFactory.create(db, organisation_id=org.id, sku="UNIQUE-SKU")

        with pytest.raises(IntegrityError):
            await ProductFactory.create(db, organisation_id=org.id, sku="UNIQUE-SKU")
            await db.flush()

    @pytest.mark.asyncio
    async def test_product_unique_barcode(self, db: AsyncSession):
        """Test that barcode must be unique."""
        org = await OrganisationFactory.create(db)
        await ProductFactory.create(
            db,
            organisation_id=org.id,
            barcode="1234567890128",
        )

        with pytest.raises(IntegrityError):
            await ProductFactory.create(
                db,
                organisation_id=org.id,
                barcode="1234567890128",
            )
            await db.flush()


# ─── Supplier Model Tests ─────────────────────────────────────────────────────

class TestSupplierModel:
    """Tests for the Supplier model."""

    @pytest.mark.asyncio
    async def test_create_supplier(self, db: AsyncSession):
        """Test creating a supplier."""
        org = await OrganisationFactory.create(db)
        supplier = await SupplierFactory.create(
            db,
            organisation_id=org.id,
            name="Test Supplier",
            payment_terms=45,
        )
        assert supplier.id is not None
        assert supplier.name == "Test Supplier"
        assert supplier.payment_terms == 45
        assert supplier.is_active is True

    @pytest.mark.asyncio
    async def test_supplier_default_payment_terms(self, db: AsyncSession):
        """Test default payment terms."""
        org = await OrganisationFactory.create(db)
        supplier = Supplier(
            organisation_id=org.id,
            name="New Supplier",
        )
        db.add(supplier)
        await db.flush()
        await db.refresh(supplier)

        assert supplier.payment_terms == 30


# ─── Invoice Model Tests ──────────────────────────────────────────────────────

class TestInvoiceModel:
    """Tests for the Invoice model."""

    @pytest.mark.asyncio
    async def test_create_invoice(self, db: AsyncSession):
        """Test creating an invoice."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )
        assert invoice.id is not None
        assert invoice.invoice_number is not None
        assert invoice.status == "DRAFT"
        assert invoice.currency == "XOF"

    @pytest.mark.asyncio
    async def test_invoice_balance_due_property(self, db: AsyncSession):
        """Test the balance_due computed property."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=100000.0,
        )
        invoice.amount_paid = 30000.0
        await db.flush()

        assert invoice.balance_due == 70000.0

    @pytest.mark.asyncio
    async def test_invoice_unique_number(self, db: AsyncSession):
        """Test that invoice number must be unique."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)

        await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            invoice_number="FP-2024-00001",
        )

        with pytest.raises(IntegrityError):
            await InvoiceFactory.create(
                db,
                organisation_id=org.id,
                customer_id=customer.id,
                created_by=user.id,
                invoice_number="FP-2024-00001",
            )
            await db.flush()


class TestInvoiceItemModel:
    """Tests for the InvoiceItem model."""

    @pytest.mark.asyncio
    async def test_create_invoice_item(self, db: AsyncSession):
        """Test creating an invoice item."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)
        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        item = await InvoiceFactory.add_item(
            db,
            invoice,
            description="Test Service",
            quantity=2,
            unit_price=25000.0,
        )
        assert item.id is not None
        assert item.description == "Test Service"
        assert float(item.quantity) == 2.0
        assert float(item.unit_price) == 25000.0

    @pytest.mark.asyncio
    async def test_invoice_item_line_total_calculation(self, db: AsyncSession):
        """Test that line_total is calculated correctly."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)
        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        # quantity * unit_price = 2 * 10000 = 20000
        # tax = 20000 * 0.18 = 3600
        # line_total = 20000 + 3600 = 23600
        item = await InvoiceFactory.add_item(
            db,
            invoice,
            quantity=2,
            unit_price=10000.0,
            tax_rate=18.0,
        )
        assert float(item.line_total) == 23600.0


# ─── Payment Model Tests ──────────────────────────────────────────────────────

class TestPaymentModel:
    """Tests for the Payment model."""

    @pytest.mark.asyncio
    async def test_create_payment(self, db: AsyncSession):
        """Test creating a payment."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)
        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        payment = await PaymentFactory.create(
            db,
            invoice_id=invoice.id,
            amount=50000.0,
            method="MOBILE_MONEY",
            operator="Orange Money",
        )
        assert payment.id is not None
        assert float(payment.amount) == 50000.0
        assert payment.method == "MOBILE_MONEY"
        assert payment.operator == "Orange Money"

    @pytest.mark.asyncio
    async def test_payment_methods(self, db: AsyncSession):
        """Test different payment methods."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)
        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        methods = ["MOBILE_MONEY", "CASH", "BANK_TRANSFER", "CARD", "CHEQUE"]
        for method in methods:
            payment = await PaymentFactory.create(
                db,
                invoice_id=invoice.id,
                amount=10000.0,
                method=method,
            )
            assert payment.method == method


# ─── Quote Model Tests ────────────────────────────────────────────────────────

class TestQuoteModel:
    """Tests for the Quote model."""

    @pytest.mark.asyncio
    async def test_create_quote(self, db: AsyncSession):
        """Test creating a quote."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)

        quote = Quote(
            organisation_id=org.id,
            quote_number="DEV-2024-00001",
            customer_id=customer.id,
            created_by=user.id,
            status="DRAFT",
            total_amount=75000.0,
        )
        db.add(quote)
        await db.flush()
        await db.refresh(quote)

        assert quote.id is not None
        assert quote.status == "DRAFT"
        assert float(quote.total_amount) == 75000.0


# ─── RecurringInvoice Model Tests ─────────────────────────────────────────────

class TestRecurringInvoiceModel:
    """Tests for the RecurringInvoice model."""

    @pytest.mark.asyncio
    async def test_create_recurring_invoice(self, db: AsyncSession):
        """Test creating a recurring invoice."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)

        now = datetime.now(timezone.utc)
        recurring = RecurringInvoice(
            organisation_id=org.id,
            name="Monthly Service",
            customer_id=customer.id,
            created_by=user.id,
            frequency="MONTHLY",
            start_date=now,
            next_run=now + timedelta(days=30),
            template_data={"items": []},
        )
        db.add(recurring)
        await db.flush()
        await db.refresh(recurring)

        assert recurring.id is not None
        assert recurring.frequency == "MONTHLY"
        assert recurring.is_active is True
        assert recurring.invoices_generated == 0


# ─── UsageQuota Model Tests ───────────────────────────────────────────────────

class TestUsageQuotaModel:
    """Tests for the UsageQuota model."""

    @pytest.mark.asyncio
    async def test_create_usage_quota(self, db: AsyncSession):
        """Test creating a usage quota record."""
        org = await OrganisationFactory.create(db)
        now = datetime.now()

        quota = await UsageQuotaFactory.create(
            db,
            organisation_id=org.id,
            month=now.month,
            year=now.year,
            invoices_count=15,
        )
        assert quota.id is not None
        assert quota.invoices_count == 15
        assert quota.users_count == 1


# ─── Model Relationship Tests ─────────────────────────────────────────────────

class TestModelRelationships:
    """Tests for model relationships."""

    @pytest.mark.asyncio
    async def test_user_organisation_relationship(self, db: AsyncSession):
        """Test user-organisation relationship."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db, organisation_id=org.id)

        result = await db.execute(
            select(User).where(User.id == user.id)
        )
        fetched_user = result.scalar_one()

        assert fetched_user.organisation_id == org.id

    @pytest.mark.asyncio
    async def test_organisation_customers_relationship(self, db: AsyncSession):
        """Test organisation-customers relationship."""
        org = await OrganisationFactory.create(db)
        customer1 = await CustomerFactory.create(db, organisation_id=org.id)
        customer2 = await CustomerFactory.create(db, organisation_id=org.id)

        result = await db.execute(
            select(Customer).where(Customer.organisation_id == org.id)
        )
        customers = result.scalars().all()

        assert len(customers) == 2

    @pytest.mark.asyncio
    async def test_invoice_items_relationship(self, db: AsyncSession):
        """Test invoice-items relationship."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)
        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        await InvoiceFactory.add_item(db, invoice, description="Item 1")
        await InvoiceFactory.add_item(db, invoice, description="Item 2")

        result = await db.execute(
            select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)
        )
        items = result.scalars().all()

        assert len(items) == 2

    @pytest.mark.asyncio
    async def test_invoice_payments_relationship(self, db: AsyncSession):
        """Test invoice-payments relationship."""
        org = await OrganisationFactory.create(db)
        user = await UserFactory.create(db)
        customer = await CustomerFactory.create(db, organisation_id=org.id)
        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=100000.0,
        )

        await PaymentFactory.create(db, invoice_id=invoice.id, amount=50000.0)
        await PaymentFactory.create(db, invoice_id=invoice.id, amount=30000.0)

        result = await db.execute(
            select(Payment).where(Payment.invoice_id == invoice.id)
        )
        payments = result.scalars().all()

        assert len(payments) == 2
        total_paid = sum(float(p.amount) for p in payments)
        assert total_paid == 80000.0
