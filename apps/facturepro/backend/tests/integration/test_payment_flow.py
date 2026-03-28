"""Integration tests for payment flow.

Tests cover:
- Payment creation
- Payment processing
- Invoice status updates based on payments
- Payment link generation
- Mobile money simulation
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.all_models import Invoice, Payment, PaymentLink
from tests.conftest import (
    UserFactory,
    OrganisationFactory,
    CustomerFactory,
    InvoiceFactory,
    PaymentFactory,
    AuthHelper,
)


pytestmark = pytest.mark.integration


class TestPaymentCreation:
    """Tests for creating payments."""

    @pytest.mark.asyncio
    async def test_create_full_payment(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test creating a full payment for an invoice."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="fullpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=59000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={
                "amount": 59000.0,
                "method": "MOBILE_MONEY",
                "phone_number": "+2250707070707",
                "operator": "Orange Money",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert float(data["amount"]) == 59000.0
        assert data["method"] == "MOBILE_MONEY"

    @pytest.mark.asyncio
    async def test_create_partial_payment(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test creating a partial payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="partialpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=100000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={
                "amount": 50000.0,
                "method": "CASH",
            },
        )

        assert response.status_code == 201
        assert float(response.json()["amount"]) == 50000.0

        # Check invoice status is PARTIAL
        invoice_response = await client.get(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
        )
        assert invoice_response.json()["status"] == "PARTIAL"

    @pytest.mark.asyncio
    async def test_create_payment_exceeds_balance(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test that payment exceeding balance fails."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="overpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=50000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={
                "amount": 60000.0,  # Exceeds total
                "method": "CASH",
            },
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_payment_for_cancelled_invoice(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test that payment for cancelled invoice fails."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="cancelpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=50000.0,
            status="CANCELLED",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={
                "amount": 50000.0,
                "method": "CASH",
            },
        )

        assert response.status_code == 409


class TestPaymentMethods:
    """Tests for different payment methods."""

    @pytest.mark.asyncio
    async def test_mobile_money_payment(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test mobile money payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="mmpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=25000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={
                "amount": 25000.0,
                "method": "MOBILE_MONEY",
                "phone_number": "+2250707070707",
                "operator": "Orange Money",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["method"] == "MOBILE_MONEY"
        assert data["operator"] == "Orange Money"

    @pytest.mark.asyncio
    async def test_bank_transfer_payment(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test bank transfer payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="bankpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=100000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={
                "amount": 100000.0,
                "method": "BANK_TRANSFER",
                "reference": "TRF-12345",
            },
        )

        assert response.status_code == 201
        assert response.json()["method"] == "BANK_TRANSFER"

    @pytest.mark.asyncio
    async def test_cash_payment(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test cash payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="cashpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=15000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={
                "amount": 15000.0,
                "method": "CASH",
            },
        )

        assert response.status_code == 201


class TestMobileMoneySimulation:
    """Tests for mobile money payment simulation."""

    @pytest.mark.asyncio
    async def test_simulate_mobile_money(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test mobile money payment simulation."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="simmm@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=50000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/simulate-mobile-money",
            headers=headers,
            json={
                "phone_number": "+2250707070707",
                "operator": "Orange Money",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["method"] == "MOBILE_MONEY"
        assert data["operator"] == "Orange Money"

    @pytest.mark.asyncio
    async def test_simulate_mobile_money_partial(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test mobile money simulation with partial amount."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="simpartial@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=100000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/simulate-mobile-money",
            headers=headers,
            json={
                "phone_number": "+2250707070707",
                "operator": "MTN Money",
                "amount": 30000.0,
            },
        )

        assert response.status_code == 201
        assert float(response.json()["amount"]) == 30000.0

    @pytest.mark.asyncio
    async def test_simulate_for_paid_invoice_fails(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test simulation fails for already paid invoice."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="simpaid@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=50000.0,
            status="PAID",
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/simulate-mobile-money",
            headers=headers,
            json={
                "phone_number": "+2250707070707",
                "operator": "Orange Money",
            },
        )

        assert response.status_code == 409


class TestPaymentLinks:
    """Tests for payment links."""

    @pytest.mark.asyncio
    async def test_create_payment_link(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test creating a payment link."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="paylink@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=50000.0,
            status="SENT",
        )

        response = await client.post(
            f"/api/v1/payment-links/invoices/{invoice.id}/payment-link",
            headers=headers,
            params={"expires_days": 7},
        )

        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["is_active"] is True
        assert "url" in data

    @pytest.mark.asyncio
    async def test_access_payment_link(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test accessing a payment link."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="accesslink@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=50000.0,
            status="SENT",
        )

        # Create payment link
        create_response = await client.post(
            f"/api/v1/payment-links/invoices/{invoice.id}/payment-link",
            headers=headers,
        )
        token = create_response.json()["token"]

        # Access payment link (public endpoint)
        response = await client.get(f"/api/v1/payment-links/pay/{token}")

        assert response.status_code == 200
        data = response.json()
        assert data["invoice_number"] == invoice.invoice_number
        assert float(data["total_amount"]) == 50000.0

    @pytest.mark.asyncio
    async def test_access_invalid_payment_link(self, client: AsyncClient, db: AsyncSession):
        """Test accessing invalid payment link."""
        response = await client.get("/api/v1/payment-links/pay/invalidtoken123")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_payment_link_for_paid_invoice_fails(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test creating payment link for paid invoice fails."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="paidlink@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=50000.0,
            status="PAID",
        )

        response = await client.post(
            f"/api/v1/payment-links/invoices/{invoice.id}/payment-link",
            headers=headers,
        )

        assert response.status_code == 409


class TestPaymentListing:
    """Tests for listing payments."""

    @pytest.mark.asyncio
    async def test_list_invoice_payments(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test listing payments for an invoice."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="listpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=150000.0,
            status="PARTIAL",
        )

        # Create multiple payments
        await PaymentFactory.create(db, invoice_id=invoice.id, amount=50000.0)
        await PaymentFactory.create(db, invoice_id=invoice.id, amount=30000.0)

        response = await client.get(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2


class TestPaymentDeletion:
    """Tests for deleting payments."""

    @pytest.mark.asyncio
    async def test_delete_payment(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test deleting a payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="delpay@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=100000.0,
            status="PARTIAL",
            amount_paid=50000.0,
        )
        payment = await PaymentFactory.create(db, invoice_id=invoice.id, amount=50000.0)

        response = await client.delete(
            f"/api/v1/invoices/{invoice.id}/payments/{payment.id}",
            headers=headers,
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_nonexistent_payment(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test deleting non-existent payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="delnonexist@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        response = await client.delete(
            f"/api/v1/invoices/{invoice.id}/payments/99999",
            headers=headers,
        )

        assert response.status_code == 404


class TestInvoiceStatusUpdates:
    """Tests for invoice status updates based on payments."""

    @pytest.mark.asyncio
    async def test_status_changes_to_partial(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test invoice status changes to PARTIAL on partial payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="statuspart@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=100000.0,
            status="SENT",
        )

        await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={"amount": 50000.0, "method": "CASH"},
        )

        response = await client.get(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
        )
        assert response.json()["status"] == "PARTIAL"

    @pytest.mark.asyncio
    async def test_status_changes_to_paid(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test invoice status changes to PAID on full payment."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="statuspaid@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            total_amount=59000.0,
            status="SENT",
        )

        await client.post(
            f"/api/v1/invoices/{invoice.id}/payments",
            headers=headers,
            json={"amount": 59000.0, "method": "MOBILE_MONEY"},
        )

        response = await client.get(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
        )
        assert response.json()["status"] == "PAID"
