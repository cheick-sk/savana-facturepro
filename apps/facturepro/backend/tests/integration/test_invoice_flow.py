"""Integration tests for invoice lifecycle.

Tests cover:
- Invoice creation
- Invoice updates
- Invoice status transitions
- Invoice deletion
- PDF generation
- Email sending
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.all_models import Invoice, Customer, Product
from tests.conftest import (
    UserFactory,
    OrganisationFactory,
    CustomerFactory,
    ProductFactory,
    InvoiceFactory,
    AuthHelper,
)


pytestmark = pytest.mark.integration


class TestInvoiceCreation:
    """Tests for invoice creation."""

    @pytest.mark.asyncio
    async def test_create_invoice_success(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test successful invoice creation."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(
            db,
            email="invoice@example.com",
            organisation_id=org.id,
        )
        headers = AuthHelper.auth_headers(user)

        response = await client.post(
            "/api/v1/invoices",
            headers=headers,
            json={
                "customer_id": customer.id,
                "items": [
                    {
                        "description": "Consulting Service",
                        "quantity": 2,
                        "unit_price": 50000.0,
                        "tax_rate": 18.0,
                    }
                ],
                "notes": "Test invoice",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["customer_id"] == customer.id
        assert data["status"] == "DRAFT"
        assert float(data["total_amount"]) > 0
        assert len(data["items"]) == 1

    @pytest.mark.asyncio
    async def test_create_invoice_with_multiple_items(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test creating invoice with multiple items."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="multi@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        response = await client.post(
            "/api/v1/invoices",
            headers=headers,
            json={
                "customer_id": customer.id,
                "items": [
                    {
                        "description": "Service A",
                        "quantity": 1,
                        "unit_price": 25000.0,
                        "tax_rate": 18.0,
                    },
                    {
                        "description": "Service B",
                        "quantity": 2,
                        "unit_price": 15000.0,
                        "tax_rate": 18.0,
                    },
                ],
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_create_invoice_with_discount(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test creating invoice with global discount."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="discount@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        response = await client.post(
            "/api/v1/invoices",
            headers=headers,
            json={
                "customer_id": customer.id,
                "items": [
                    {
                        "description": "Service",
                        "quantity": 1,
                        "unit_price": 100000.0,
                        "tax_rate": 18.0,
                    }
                ],
                "discount_percent": 10.0,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert float(data["discount_percent"]) == 10.0

    @pytest.mark.asyncio
    async def test_create_invoice_without_items_fails(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test that creating invoice without items fails."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="noitems@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        response = await client.post(
            "/api/v1/invoices",
            headers=headers,
            json={
                "customer_id": customer.id,
                "items": [],
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_invoice_with_invalid_customer(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
    ):
        """Test creating invoice with non-existent customer."""
        org = test_organisation
        user = await UserFactory.create(db, email="invalidcust@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        response = await client.post(
            "/api/v1/invoices",
            headers=headers,
            json={
                "customer_id": 99999,  # Non-existent
                "items": [
                    {
                        "description": "Service",
                        "quantity": 1,
                        "unit_price": 50000.0,
                    }
                ],
            },
        )

        # Should fail with foreign key violation or 404
        assert response.status_code in [400, 404, 500]


class TestInvoiceListing:
    """Tests for invoice listing."""

    @pytest.mark.asyncio
    async def test_list_invoices(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test listing invoices."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="list@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        # Create some invoices
        for i in range(3):
            await InvoiceFactory.create(
                db,
                organisation_id=org.id,
                customer_id=customer.id,
                created_by=user.id,
            )

        response = await client.get("/api/v1/invoices", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 3

    @pytest.mark.asyncio
    async def test_list_invoices_pagination(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test invoice listing pagination."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="page@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        # Create multiple invoices
        for i in range(25):
            await InvoiceFactory.create(
                db,
                organisation_id=org.id,
                customer_id=customer.id,
                created_by=user.id,
            )

        # Get first page
        response = await client.get(
            "/api/v1/invoices?page=1&size=10",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["pages"] >= 3

    @pytest.mark.asyncio
    async def test_list_invoices_filter_by_status(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test filtering invoices by status."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="filter@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        # Create invoices with different statuses
        await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            status="DRAFT",
        )
        await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            status="SENT",
        )

        response = await client.get(
            "/api/v1/invoices?status=DRAFT",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "DRAFT"


class TestInvoiceRetrieval:
    """Tests for retrieving individual invoices."""

    @pytest.mark.asyncio
    async def test_get_invoice_by_id(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test getting invoice by ID."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="get@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        response = await client.get(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == invoice.id
        assert data["invoice_number"] == invoice.invoice_number

    @pytest.mark.asyncio
    async def test_get_nonexistent_invoice(self, client: AsyncClient, db: AsyncSession):
        """Test getting non-existent invoice."""
        user = await UserFactory.create(db, email="nonexist@example.com")
        headers = AuthHelper.auth_headers(user)

        response = await client.get(
            "/api/v1/invoices/99999",
            headers=headers,
        )

        assert response.status_code == 404


class TestInvoiceUpdate:
    """Tests for updating invoices."""

    @pytest.mark.asyncio
    async def test_update_invoice_notes(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test updating invoice notes."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="updatenotes@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        response = await client.put(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
            json={"notes": "Updated notes"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Updated notes"

    @pytest.mark.asyncio
    async def test_update_invoice_status(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test updating invoice status."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="updatestatus@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            status="DRAFT",
        )

        response = await client.put(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
            json={"status": "SENT"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SENT"

    @pytest.mark.asyncio
    async def test_update_paid_invoice_fails(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test that updating paid invoice fails."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="paidinv@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
            status="PAID",
        )

        response = await client.put(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
            json={"notes": "Try to update paid invoice"},
        )

        assert response.status_code == 400


class TestInvoiceDeletion:
    """Tests for deleting invoices."""

    @pytest.mark.asyncio
    async def test_delete_draft_invoice(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test deleting a draft invoice."""
        org = test_organisation
        customer = test_customer
        admin = await UserFactory.create_admin(db, email="delete@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(admin)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=admin.id,
            status="DRAFT",
        )

        response = await client.delete(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_paid_invoice_fails(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test that deleting paid invoice fails."""
        org = test_organisation
        customer = test_customer
        admin = await UserFactory.create_admin(db, email="delpaid@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(admin)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=admin.id,
            status="PAID",
        )

        response = await client.delete(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_delete_by_non_admin_fails(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test that regular user cannot delete invoice."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create_regular_user(db, email="regdel@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        response = await client.delete(
            f"/api/v1/invoices/{invoice.id}",
            headers=headers,
        )

        assert response.status_code == 403


class TestInvoicePdf:
    """Tests for invoice PDF generation."""

    @pytest.mark.asyncio
    async def test_download_invoice_pdf(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test downloading invoice PDF."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="pdf@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )
        await InvoiceFactory.add_item(db, invoice, description="Test Item")

        response = await client.get(
            f"/api/v1/invoices/{invoice.id}/pdf",
            headers=headers,
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"


class TestInvoiceSend:
    """Tests for sending invoices."""

    @pytest.mark.asyncio
    async def test_send_invoice(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
    ):
        """Test sending invoice by email."""
        org = test_organisation
        # Create customer with email
        customer = await CustomerFactory.create(
            db,
            organisation_id=org.id,
            email="sendtest@example.com",
        )
        user = await UserFactory.create(db, email="send@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )
        await InvoiceFactory.add_item(db, invoice, description="Service")

        with pytest.MonkeyPatch.context() as m:
            # Mock email sending
            async def mock_send(*args, **kwargs):
                return True

            m.setattr("app.services.email_service.send_invoice_email", mock_send)

            response = await client.post(
                f"/api/v1/invoices/{invoice.id}/send",
                headers=headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SENT"

    @pytest.mark.asyncio
    async def test_send_invoice_without_customer_email(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
    ):
        """Test sending invoice fails when customer has no email."""
        org = test_organisation
        # Create customer without email
        customer = await CustomerFactory.create(
            db,
            organisation_id=org.id,
            email=None,
        )
        user = await UserFactory.create(db, email="noemail@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        invoice = await InvoiceFactory.create(
            db,
            organisation_id=org.id,
            customer_id=customer.id,
            created_by=user.id,
        )

        response = await client.post(
            f"/api/v1/invoices/{invoice.id}/send",
            headers=headers,
        )

        assert response.status_code == 400


class TestInvoiceLifecycle:
    """End-to-end invoice lifecycle tests."""

    @pytest.mark.asyncio
    async def test_complete_invoice_lifecycle(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
        test_customer,
    ):
        """Test complete invoice lifecycle: create -> update -> send -> pay."""
        org = test_organisation
        customer = test_customer
        user = await UserFactory.create(db, email="lifecycle@example.com", organisation_id=org.id)
        headers = AuthHelper.auth_headers(user)

        # 1. Create invoice
        create_response = await client.post(
            "/api/v1/invoices",
            headers=headers,
            json={
                "customer_id": customer.id,
                "items": [
                    {
                        "description": "Service",
                        "quantity": 1,
                        "unit_price": 50000.0,
                        "tax_rate": 18.0,
                    }
                ],
            },
        )
        assert create_response.status_code == 201
        invoice_id = create_response.json()["id"]

        # 2. Update invoice
        update_response = await client.put(
            f"/api/v1/invoices/{invoice_id}",
            headers=headers,
            json={"notes": "Added notes"},
        )
        assert update_response.status_code == 200

        # 3. Change status to SENT
        status_response = await client.put(
            f"/api/v1/invoices/{invoice_id}",
            headers=headers,
            json={"status": "SENT"},
        )
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "SENT"

        # 4. Add payment
        payment_response = await client.post(
            f"/api/v1/invoices/{invoice_id}/payments",
            headers=headers,
            json={
                "amount": 59000.0,
                "method": "MOBILE_MONEY",
            },
        )
        assert payment_response.status_code == 201

        # 5. Verify invoice is paid
        final_response = await client.get(
            f"/api/v1/invoices/{invoice_id}",
            headers=headers,
        )
        assert final_response.status_code == 200
        assert final_response.json()["status"] == "PAID"
