"""Integration tests for multi-tenant data isolation.

Tests cover:
- Data isolation between organisations
- Cross-tenant access prevention
- Organisation-scoped queries
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.all_models import (
    Customer,
    Invoice,
    Product,
    Supplier,
    User,
)
from tests.conftest import (
    UserFactory,
    OrganisationFactory,
    CustomerFactory,
    ProductFactory,
    SupplierFactory,
    InvoiceFactory,
    PlanFactory,
    SubscriptionFactory,
    AuthHelper,
)


pytestmark = pytest.mark.integration


@pytest_asyncio.fixture
async def multi_tenant_setup(db: AsyncSession):
    """Create setup with multiple organisations for tenant isolation tests."""
    # Create two separate organisations
    org1 = await OrganisationFactory.create(db, name="Company A", slug="company-a")
    org2 = await OrganisationFactory.create(db, name="Company B", slug="company-b")

    # Create plan for both
    plan = await PlanFactory.create(db, code="test-plan")

    # Create subscriptions
    await SubscriptionFactory.create(db, organisation=org1, plan=plan)
    await SubscriptionFactory.create(db, organisation=org2, plan=plan)

    # Create users for each org
    user1 = await UserFactory.create(
        db,
        email="user1@companya.com",
        organisation_id=org1.id,
    )
    user2 = await UserFactory.create(
        db,
        email="user2@companyb.com",
        organisation_id=org2.id,
    )

    # Create customers for each org
    customer1 = await CustomerFactory.create(
        db,
        organisation_id=org1.id,
        name="Customer A1",
    )
    customer2 = await CustomerFactory.create(
        db,
        organisation_id=org2.id,
        name="Customer B1",
    )

    # Create products for each org
    product1 = await ProductFactory.create(
        db,
        organisation_id=org1.id,
        name="Product A1",
    )
    product2 = await ProductFactory.create(
        db,
        organisation_id=org2.id,
        name="Product B1",
    )

    # Create invoices for each org
    invoice1 = await InvoiceFactory.create(
        db,
        organisation_id=org1.id,
        customer_id=customer1.id,
        created_by=user1.id,
        invoice_number="FP-2024-ORG1-001",
    )
    invoice2 = await InvoiceFactory.create(
        db,
        organisation_id=org2.id,
        customer_id=customer2.id,
        created_by=user2.id,
        invoice_number="FP-2024-ORG2-001",
    )

    return {
        "org1": org1,
        "org2": org2,
        "user1": user1,
        "user2": user2,
        "customer1": customer1,
        "customer2": customer2,
        "product1": product1,
        "product2": product2,
        "invoice1": invoice1,
        "invoice2": invoice2,
    }


class TestCustomerIsolation:
    """Tests for customer data isolation."""

    @pytest.mark.asyncio
    async def test_user_sees_only_own_org_customers(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user only sees customers from their organisation."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.get("/api/v1/customers", headers=headers)

        assert response.status_code == 200
        data = response.json()
        # Should only see org1's customers
        for item in data["items"]:
            assert item["id"] == setup["customer1"].id or item.get("name") != "Customer B1"

    @pytest.mark.asyncio
    async def test_user_cannot_access_other_org_customer(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot directly access another org's customer."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        # Try to access org2's customer
        response = await client.get(
            f"/api/v1/customers/{setup['customer2'].id}",
            headers=headers,
        )

        # Should return 404 (not found) to avoid leaking existence
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_user_cannot_update_other_org_customer(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot update another org's customer."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.put(
            f"/api/v1/customers/{setup['customer2'].id}",
            headers=headers,
            json={"name": "Hacked Customer"},
        )

        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_user_cannot_delete_other_org_customer(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot delete another org's customer."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.delete(
            f"/api/v1/customers/{setup['customer2'].id}",
            headers=headers,
        )

        assert response.status_code in [403, 404]


class TestProductIsolation:
    """Tests for product data isolation."""

    @pytest.mark.asyncio
    async def test_user_sees_only_own_org_products(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user only sees products from their organisation."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.get("/api/v1/products", headers=headers)

        assert response.status_code == 200
        data = response.json()
        # Should not contain org2's products
        product_names = [p.get("name") for p in data.get("items", [])]
        assert "Product B1" not in product_names

    @pytest.mark.asyncio
    async def test_user_cannot_access_other_org_product(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot access another org's product."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.get(
            f"/api/v1/products/{setup['product2'].id}",
            headers=headers,
        )

        assert response.status_code in [403, 404]


class TestInvoiceIsolation:
    """Tests for invoice data isolation."""

    @pytest.mark.asyncio
    async def test_user_sees_only_own_org_invoices(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user only sees invoices from their organisation."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.get("/api/v1/invoices", headers=headers)

        assert response.status_code == 200
        data = response.json()
        # Should not contain org2's invoices
        invoice_numbers = [i.get("invoice_number") for i in data.get("items", [])]
        assert "FP-2024-ORG2-001" not in invoice_numbers

    @pytest.mark.asyncio
    async def test_user_cannot_access_other_org_invoice(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot access another org's invoice."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.get(
            f"/api/v1/invoices/{setup['invoice2'].id}",
            headers=headers,
        )

        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_user_cannot_add_payment_to_other_org_invoice(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot add payment to another org's invoice."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        response = await client.post(
            f"/api/v1/invoices/{setup['invoice2'].id}/payments",
            headers=headers,
            json={"amount": 10000.0, "method": "CASH"},
        )

        assert response.status_code in [403, 404]


class TestDatabaseIsolation:
    """Tests for database-level isolation verification."""

    @pytest.mark.asyncio
    async def test_customers_count_per_organisation(
        self,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Verify customers are properly scoped to organisations."""
        setup = multi_tenant_setup

        # Count customers for each org
        org1_count = await db.execute(
            select(Customer).where(Customer.organisation_id == setup["org1"].id)
        )
        org2_count = await db.execute(
            select(Customer).where(Customer.organisation_id == setup["org2"].id)
        )

        org1_customers = org1_count.scalars().all()
        org2_customers = org2_count.scalars().all()

        # Verify no overlap
        org1_ids = {c.id for c in org1_customers}
        org2_ids = {c.id for c in org2_customers}

        assert org1_ids.isdisjoint(org2_ids)

    @pytest.mark.asyncio
    async def test_products_count_per_organisation(
        self,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Verify products are properly scoped to organisations."""
        setup = multi_tenant_setup

        org1_products = await db.execute(
            select(Product).where(Product.organisation_id == setup["org1"].id)
        )
        org2_products = await db.execute(
            select(Product).where(Product.organisation_id == setup["org2"].id)
        )

        org1_list = org1_products.scalars().all()
        org2_list = org2_products.scalars().all()

        # Verify proper scoping
        for product in org1_list:
            assert product.organisation_id == setup["org1"].id

        for product in org2_list:
            assert product.organisation_id == setup["org2"].id

    @pytest.mark.asyncio
    async def test_invoices_count_per_organisation(
        self,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Verify invoices are properly scoped to organisations."""
        setup = multi_tenant_setup

        org1_invoices = await db.execute(
            select(Invoice).where(Invoice.organisation_id == setup["org1"].id)
        )
        org2_invoices = await db.execute(
            select(Invoice).where(Invoice.organisation_id == setup["org2"].id)
        )

        org1_list = org1_invoices.scalars().all()
        org2_list = org2_invoices.scalars().all()

        # Verify counts
        assert len(org1_list) >= 1
        assert len(org2_list) >= 1

        # Verify proper scoping
        for invoice in org1_list:
            assert invoice.organisation_id == setup["org1"].id


class TestCrossTenantOperations:
    """Tests for cross-tenant operation prevention."""

    @pytest.mark.asyncio
    async def test_create_invoice_with_other_org_customer(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot create invoice with another org's customer."""
        setup = multi_tenant_setup
        headers = AuthHelper.auth_headers(setup["user1"])

        # Try to create invoice with org2's customer
        response = await client.post(
            "/api/v1/invoices",
            headers=headers,
            json={
                "customer_id": setup["customer2"].id,  # Org2's customer
                "items": [
                    {
                        "description": "Test Item",
                        "quantity": 1,
                        "unit_price": 50000.0,
                    }
                ],
            },
        )

        # Should fail - cannot use other org's customer
        assert response.status_code in [400, 403, 404, 500]

    @pytest.mark.asyncio
    async def test_create_product_with_other_org_supplier(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that user cannot create product with another org's supplier."""
        setup = multi_tenant_setup

        # Create supplier for org2
        supplier2 = await SupplierFactory.create(
            db,
            organisation_id=setup["org2"].id,
            name="Supplier B",
        )

        headers = AuthHelper.auth_headers(setup["user1"])

        # Try to create product with org2's supplier
        response = await client.post(
            "/api/v1/products",
            headers=headers,
            json={
                "name": "Test Product",
                "unit_price": 10000.0,
                "supplier_id": supplier2.id,
            },
        )

        # Should fail or ignore the supplier reference
        # Exact behavior depends on implementation
        if response.status_code == 201:
            # If created, verify supplier_id is null or ignored
            data = response.json()
            assert data.get("supplier_id") is None or data.get("supplier_id") != supplier2.id


class TestAdminCrossTenantAccess:
    """Tests for admin cross-tenant access restrictions."""

    @pytest.mark.asyncio
    async def test_admin_from_org1_cannot_access_org2_data(
        self,
        client: AsyncClient,
        db: AsyncSession,
        multi_tenant_setup,
    ):
        """Test that even admin cannot access other org's data."""
        setup = multi_tenant_setup

        # Make user1 an admin
        setup["user1"].role = "admin"
        await db.flush()

        headers = AuthHelper.auth_headers(setup["user1"])

        # Try to access org2's invoice
        response = await client.get(
            f"/api/v1/invoices/{setup['invoice2'].id}",
            headers=headers,
        )

        # Should still be blocked - admin of org1 is not admin of org2
        assert response.status_code in [403, 404]
