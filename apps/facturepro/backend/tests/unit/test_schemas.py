"""Unit tests for Pydantic schemas.

Tests cover:
- Schema validation
- Required fields
- Optional fields
- Field constraints (min, max, patterns)
- Model configuration (from_attributes)
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError

from app.schemas.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerOut,
    InvoiceCreate,
    InvoiceItemCreate,
    InvoiceItemOut,
    InvoiceUpdate,
    InvoiceOut,
    LoginRequest,
    PaymentCreate,
    PaymentOut,
    ProductCreate,
    ProductUpdate,
    ProductOut,
    QuoteCreate,
    QuoteItemCreate,
    QuoteUpdate,
    RecurringCreate,
    RecurringItemTemplate,
    SupplierCreate,
    SupplierUpdate,
    SupplierOut,
    UserCreate,
    UserUpdate,
    UserOut,
    TokenResponse,
    RefreshRequest,
)


pytestmark = pytest.mark.unit


# ─── Auth Schema Tests ────────────────────────────────────────────────────────

class TestLoginRequest:
    """Tests for LoginRequest schema."""

    def test_valid_login_request(self):
        """Test valid login request."""
        data = LoginRequest(email="user@example.com", password="password123")
        assert data.email == "user@example.com"
        assert data.password == "password123"

    def test_invalid_email(self):
        """Test invalid email format."""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(email="not-an-email", password="password123")
        assert "email" in str(exc_info.value)

    def test_password_too_short(self):
        """Test password below minimum length."""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(email="user@example.com", password="12345")
        assert "password" in str(exc_info.value)


class TestUserCreate:
    """Tests for UserCreate schema."""

    def test_valid_user_create(self):
        """Test valid user creation."""
        data = UserCreate(
            email="newuser@example.com",
            password="SecurePass123!",
            first_name="John",
            last_name="Doe",
        )
        assert data.email == "newuser@example.com"
        assert data.first_name == "John"
        assert data.last_name == "Doe"
        assert data.role == "user"

    def test_user_create_with_role(self):
        """Test user creation with specific role."""
        data = UserCreate(
            email="admin@example.com",
            password="SecurePass123!",
            first_name="Admin",
            last_name="User",
            role="admin",
        )
        assert data.role == "admin"

    def test_invalid_role(self):
        """Test invalid role value."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="user@example.com",
                password="SecurePass123!",
                first_name="Test",
                last_name="User",
                role="superadmin",  # Invalid role
            )
        assert "role" in str(exc_info.value)

    def test_password_too_short(self):
        """Test password below minimum length."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="user@example.com",
                password="short",  # Less than 8 chars
                first_name="Test",
                last_name="User",
            )
        assert "password" in str(exc_info.value)

    def test_empty_first_name(self):
        """Test empty first name."""
        with pytest.raises(ValidationError):
            UserCreate(
                email="user@example.com",
                password="SecurePass123!",
                first_name="",
                last_name="User",
            )


class TestUserUpdate:
    """Tests for UserUpdate schema."""

    def test_partial_update(self):
        """Test partial user update."""
        data = UserUpdate(first_name="NewName")
        assert data.first_name == "NewName"
        assert data.last_name is None
        assert data.role is None

    def test_full_update(self):
        """Test full user update."""
        data = UserUpdate(
            first_name="New",
            last_name="Name",
            role="manager",
            is_active=False,
        )
        assert data.first_name == "New"
        assert data.last_name == "Name"
        assert data.role == "manager"
        assert data.is_active is False

    def test_invalid_role(self):
        """Test invalid role in update."""
        with pytest.raises(ValidationError):
            UserUpdate(role="invalid_role")


class TestUserOut:
    """Tests for UserOut schema."""

    def test_from_attributes(self):
        """Test creating UserOut from model attributes."""
        class MockUser:
            id = 1
            email = "user@example.com"
            first_name = "John"
            last_name = "Doe"
            role = "user"
            is_active = True
            created_at = datetime.now(timezone.utc)

        user_out = UserOut.model_validate(MockUser())
        assert user_out.id == 1
        assert user_out.email == "user@example.com"
        assert user_out.full_name == "John Doe"


# ─── Customer Schema Tests ────────────────────────────────────────────────────

class TestCustomerCreate:
    """Tests for CustomerCreate schema."""

    def test_valid_customer_create(self):
        """Test valid customer creation."""
        data = CustomerCreate(
            name="Test Company",
            email="contact@testcompany.com",
            phone="+2250707070707",
        )
        assert data.name == "Test Company"
        assert data.email == "contact@testcompany.com"
        assert data.country == "Côte d'Ivoire"

    def test_customer_create_minimal(self):
        """Test customer creation with minimal fields."""
        data = CustomerCreate(name="Minimal Customer")
        assert data.name == "Minimal Customer"
        assert data.email is None
        assert data.credit_limit == 0.0

    def test_invalid_email(self):
        """Test invalid email format."""
        with pytest.raises(ValidationError):
            CustomerCreate(name="Test", email="not-an-email")

    def test_negative_credit_limit(self):
        """Test negative credit limit."""
        with pytest.raises(ValidationError):
            CustomerCreate(name="Test", credit_limit=-1000)


class TestCustomerUpdate:
    """Tests for CustomerUpdate schema."""

    def test_partial_update(self):
        """Test partial customer update."""
        data = CustomerUpdate(name="Updated Name")
        assert data.name == "Updated Name"
        assert data.email is None

    def test_update_is_active(self):
        """Test updating is_active field."""
        data = CustomerUpdate(is_active=False)
        assert data.is_active is False


# ─── Product Schema Tests ─────────────────────────────────────────────────────

class TestProductCreate:
    """Tests for ProductCreate schema."""

    def test_valid_product_create(self):
        """Test valid product creation."""
        data = ProductCreate(
            name="Test Product",
            unit_price=15000.0,
            sku="PROD-001",
        )
        assert data.name == "Test Product"
        assert data.unit_price == 15000.0
        assert data.sku == "PROD-001"

    def test_product_create_defaults(self):
        """Test product creation with default values."""
        data = ProductCreate(name="Test", unit_price=10000.0)
        assert data.unit == "unit"
        assert data.tax_rate == 0.0
        assert data.purchase_price == 0.0

    def test_zero_unit_price(self):
        """Test zero unit price (should fail)."""
        with pytest.raises(ValidationError):
            ProductCreate(name="Test", unit_price=0)

    def test_negative_unit_price(self):
        """Test negative unit price (should fail)."""
        with pytest.raises(ValidationError):
            ProductCreate(name="Test", unit_price=-100)

    def test_tax_rate_out_of_range(self):
        """Test tax rate above 100%."""
        with pytest.raises(ValidationError):
            ProductCreate(name="Test", unit_price=100, tax_rate=150)


class TestProductUpdate:
    """Tests for ProductUpdate schema."""

    def test_partial_update(self):
        """Test partial product update."""
        data = ProductUpdate(name="Updated Product")
        assert data.name == "Updated Product"
        assert data.unit_price is None

    def test_update_is_active(self):
        """Test updating is_active field."""
        data = ProductUpdate(is_active=False)
        assert data.is_active is False


# ─── Invoice Schema Tests ─────────────────────────────────────────────────────

class TestInvoiceItemCreate:
    """Tests for InvoiceItemCreate schema."""

    def test_valid_invoice_item(self):
        """Test valid invoice item."""
        data = InvoiceItemCreate(
            description="Consulting Service",
            quantity=2.0,
            unit_price=50000.0,
        )
        assert data.description == "Consulting Service"
        assert data.quantity == 2.0
        assert data.unit_price == 50000.0

    def test_invoice_item_defaults(self):
        """Test invoice item default values."""
        data = InvoiceItemCreate(
            description="Test Item",
            unit_price=10000.0,
        )
        assert data.quantity == 1.0
        assert data.tax_rate == 0.0
        assert data.discount_percent == 0.0

    def test_zero_quantity(self):
        """Test zero quantity (should fail)."""
        with pytest.raises(ValidationError):
            InvoiceItemCreate(description="Test", quantity=0, unit_price=100)

    def test_negative_quantity(self):
        """Test negative quantity (should fail)."""
        with pytest.raises(ValidationError):
            InvoiceItemCreate(description="Test", quantity=-1, unit_price=100)


class TestInvoiceCreate:
    """Tests for InvoiceCreate schema."""

    def test_valid_invoice_create(self):
        """Test valid invoice creation."""
        data = InvoiceCreate(
            customer_id=1,
            items=[
                InvoiceItemCreate(description="Item 1", unit_price=10000.0),
            ],
        )
        assert data.customer_id == 1
        assert len(data.items) == 1
        assert data.currency == "XOF"

    def test_invoice_create_min_items(self):
        """Test invoice creation without items (should fail)."""
        with pytest.raises(ValidationError):
            InvoiceCreate(customer_id=1, items=[])

    def test_invoice_create_with_discount(self):
        """Test invoice creation with discount."""
        data = InvoiceCreate(
            customer_id=1,
            items=[
                InvoiceItemCreate(description="Item", unit_price=10000.0),
            ],
            discount_percent=10.0,
        )
        assert data.discount_percent == 10.0

    def test_discount_out_of_range(self):
        """Test discount above 100%."""
        with pytest.raises(ValidationError):
            InvoiceCreate(
                customer_id=1,
                items=[InvoiceItemCreate(description="Item", unit_price=100)],
                discount_percent=150,
            )


class TestInvoiceUpdate:
    """Tests for InvoiceUpdate schema."""

    def test_partial_update(self):
        """Test partial invoice update."""
        data = InvoiceUpdate(notes="Updated notes")
        assert data.notes == "Updated notes"
        assert data.items is None

    def test_status_update(self):
        """Test updating status."""
        data = InvoiceUpdate(status="SENT")
        assert data.status == "SENT"

    def test_invalid_status(self):
        """Test invalid status value."""
        with pytest.raises(ValidationError):
            InvoiceUpdate(status="INVALID_STATUS")


# ─── Payment Schema Tests ─────────────────────────────────────────────────────

class TestPaymentCreate:
    """Tests for PaymentCreate schema."""

    def test_valid_payment_create(self):
        """Test valid payment creation."""
        data = PaymentCreate(
            amount=50000.0,
            method="MOBILE_MONEY",
            phone_number="+2250707070707",
            operator="Orange Money",
        )
        assert data.amount == 50000.0
        assert data.method == "MOBILE_MONEY"

    def test_payment_create_defaults(self):
        """Test payment creation with default method."""
        data = PaymentCreate(amount=10000.0)
        assert data.method == "MOBILE_MONEY"
        assert data.reference is None

    def test_zero_amount(self):
        """Test zero amount (should fail)."""
        with pytest.raises(ValidationError):
            PaymentCreate(amount=0)

    def test_negative_amount(self):
        """Test negative amount (should fail)."""
        with pytest.raises(ValidationError):
            PaymentCreate(amount=-1000)

    def test_invalid_payment_method(self):
        """Test invalid payment method."""
        with pytest.raises(ValidationError):
            PaymentCreate(amount=100, method="BITCOIN")


# ─── Quote Schema Tests ───────────────────────────────────────────────────────

class TestQuoteCreate:
    """Tests for QuoteCreate schema."""

    def test_valid_quote_create(self):
        """Test valid quote creation."""
        data = QuoteCreate(
            customer_id=1,
            items=[
                QuoteItemCreate(description="Service", unit_price=50000.0),
            ],
        )
        assert data.customer_id == 1
        assert len(data.items) == 1

    def test_quote_create_with_expiry(self):
        """Test quote creation with expiry date."""
        expiry = datetime.now(timezone.utc) + timedelta(days=30)
        data = QuoteCreate(
            customer_id=1,
            items=[QuoteItemCreate(description="Item", unit_price=100)],
            expiry_date=expiry,
        )
        assert data.expiry_date == expiry


class TestQuoteUpdate:
    """Tests for QuoteUpdate schema."""

    def test_status_update(self):
        """Test updating quote status."""
        data = QuoteUpdate(status="ACCEPTED")
        assert data.status == "ACCEPTED"

    def test_invalid_status(self):
        """Test invalid quote status."""
        with pytest.raises(ValidationError):
            QuoteUpdate(status="INVALID")


# ─── Supplier Schema Tests ────────────────────────────────────────────────────

class TestSupplierCreate:
    """Tests for SupplierCreate schema."""

    def test_valid_supplier_create(self):
        """Test valid supplier creation."""
        data = SupplierCreate(
            name="Test Supplier",
            email="supplier@example.com",
            phone="+2250707070707",
        )
        assert data.name == "Test Supplier"
        assert data.payment_terms == 30

    def test_payment_terms_range(self):
        """Test payment terms range."""
        data = SupplierCreate(name="Test", payment_terms=60)
        assert data.payment_terms == 60

    def test_payment_terms_too_high(self):
        """Test payment terms above maximum."""
        with pytest.raises(ValidationError):
            SupplierCreate(name="Test", payment_terms=400)

    def test_payment_terms_negative(self):
        """Test negative payment terms."""
        with pytest.raises(ValidationError):
            SupplierCreate(name="Test", payment_terms=-1)


# ─── Recurring Invoice Schema Tests ───────────────────────────────────────────

class TestRecurringCreate:
    """Tests for RecurringCreate schema."""

    def test_valid_recurring_create(self):
        """Test valid recurring invoice creation."""
        data = RecurringCreate(
            name="Monthly Service",
            customer_id=1,
            frequency="MONTHLY",
            start_date=datetime.now(timezone.utc),
            items=[
                RecurringItemTemplate(description="Service", unit_price=50000.0),
            ],
        )
        assert data.name == "Monthly Service"
        assert data.frequency == "MONTHLY"
        assert data.auto_send is False

    def test_invalid_frequency(self):
        """Test invalid frequency."""
        with pytest.raises(ValidationError):
            RecurringCreate(
                name="Test",
                customer_id=1,
                frequency="BIWEEKLY",  # Invalid
                start_date=datetime.now(timezone.utc),
                items=[RecurringItemTemplate(description="Item", unit_price=100)],
            )


# ─── Token Schema Tests ───────────────────────────────────────────────────────

class TestTokenResponse:
    """Tests for TokenResponse schema."""

    def test_valid_token_response(self):
        """Test valid token response."""
        data = TokenResponse(
            access_token="access_token_value",
            refresh_token="refresh_token_value",
            user=UserOut(
                id=1,
                email="user@example.com",
                first_name="John",
                last_name="Doe",
                role="user",
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
        )
        assert data.access_token == "access_token_value"
        assert data.token_type == "bearer"


class TestRefreshRequest:
    """Tests for RefreshRequest schema."""

    def test_valid_refresh_request(self):
        """Test valid refresh request."""
        data = RefreshRequest(refresh_token="refresh_token_value")
        assert data.refresh_token == "refresh_token_value"


# ─── Edge Cases and Validation Tests ──────────────────────────────────────────

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_empty_string_fields(self):
        """Test that empty strings are handled correctly."""
        # Empty name should fail (min_length=1)
        with pytest.raises(ValidationError):
            CustomerCreate(name="")

    def test_max_length_fields(self):
        """Test max length constraints."""
        # Should work with max length
        long_name = "x" * 200
        data = CustomerCreate(name=long_name)
        assert data.name == long_name

        # Should fail over max length
        with pytest.raises(ValidationError):
            CustomerCreate(name="x" * 201)

    def test_unicode_characters(self):
        """Test unicode characters in fields."""
        data = CustomerCreate(
            name="Amadou Diallo",
            address="Rue 12, Abidjan, Côte d'Ivoire",
        )
        assert "Côte d'Ivoire" in data.address

    def test_special_characters_in_description(self):
        """Test special characters in description fields."""
        data = InvoiceItemCreate(
            description="Service: Development & Integration (5%)",
            unit_price=100000.0,
        )
        assert "&" in data.description
        assert "%" in data.description

    def test_decimal_quantities(self):
        """Test decimal quantities."""
        data = InvoiceItemCreate(
            description="Half day service",
            quantity=0.5,
            unit_price=50000.0,
        )
        assert data.quantity == 0.5

    def test_large_amounts(self):
        """Test large monetary amounts."""
        data = PaymentCreate(amount=999999999.99)
        assert data.amount == 999999999.99
