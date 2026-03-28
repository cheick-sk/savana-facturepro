"""Integration tests for authentication flow.

Tests cover:
- User registration
- Login
- Token refresh
- Logout
- Protected endpoints access
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.all_models import User
from tests.conftest import (
    UserFactory,
    OrganisationFactory,
    AuthHelper,
)


pytestmark = pytest.mark.integration


class TestRegistrationFlow:
    """Tests for user registration."""

    @pytest.mark.asyncio
    async def test_register_new_user(self, client: AsyncClient, db: AsyncSession):
        """Test registering a new user."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePassword123!",
                "first_name": "New",
                "last_name": "User",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "New"
        assert data["last_name"] == "User"
        assert data["role"] == "user"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, db: AsyncSession):
        """Test registering with duplicate email fails."""
        # Register first user
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "Password123!",
                "first_name": "First",
                "last_name": "User",
            },
        )

        # Try to register with same email
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "Password456!",
                "first_name": "Second",
                "last_name": "User",
            },
        )

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_with_invalid_email(self, client: AsyncClient, db: AsyncSession):
        """Test registration with invalid email format."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "Password123!",
                "first_name": "Test",
                "last_name": "User",
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_weak_password(self, client: AsyncClient, db: AsyncSession):
        """Test registration with password below minimum length."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weakpass@example.com",
                "password": "short",
                "first_name": "Test",
                "last_name": "User",
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_specific_role(self, client: AsyncClient, db: AsyncSession):
        """Test registration with specific role."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "manager@example.com",
                "password": "Password123!",
                "first_name": "Manager",
                "last_name": "User",
                "role": "manager",
            },
        )

        assert response.status_code == 201
        assert response.json()["role"] == "manager"


class TestLoginFlow:
    """Tests for user login."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, db: AsyncSession):
        """Test successful login."""
        # Create user first
        user = await UserFactory.create(
            db,
            email="login@example.com",
            password="LoginPassword123!",
        )

        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "login@example.com",
                "password": "LoginPassword123!",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "login@example.com"

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, client: AsyncClient, db: AsyncSession):
        """Test login with wrong password."""
        user = await UserFactory.create(
            db,
            email="wrongpass@example.com",
            password="CorrectPassword123!",
        )

        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "wrongpass@example.com",
                "password": "WrongPassword123!",
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient, db: AsyncSession):
        """Test login with non-existent user."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!",
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, db: AsyncSession):
        """Test login with inactive user account."""
        user = await UserFactory.create(
            db,
            email="inactive@example.com",
            password="Password123!",
            is_active=False,
        )

        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "Password123!",
            },
        )

        assert response.status_code == 401


class TestTokenRefresh:
    """Tests for token refresh."""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient, db: AsyncSession):
        """Test successful token refresh."""
        user = await UserFactory.create(
            db,
            email="refresh@example.com",
            password="Password123!",
        )

        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "refresh@example.com",
                "password": "Password123!",
            },
        )
        refresh_token = login_response.json()["refresh_token"]

        # Refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # New tokens should be different
        assert data["access_token"] != login_response.json()["access_token"]

    @pytest.mark.asyncio
    async def test_refresh_with_access_token_fails(self, client: AsyncClient, db: AsyncSession):
        """Test that using access token for refresh fails."""
        user = await UserFactory.create(
            db,
            email="wrongtoken@example.com",
            password="Password123!",
        )

        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "wrongtoken@example.com",
                "password": "Password123!",
            },
        )
        access_token = login_response.json()["access_token"]

        # Try to refresh with access token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_with_invalid_token(self, client: AsyncClient, db: AsyncSession):
        """Test refresh with invalid token."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )

        assert response.status_code == 401


class TestProtectedEndpoints:
    """Tests for accessing protected endpoints."""

    @pytest.mark.asyncio
    async def test_access_protected_endpoint_with_valid_token(
        self,
        client: AsyncClient,
        db: AsyncSession,
    ):
        """Test accessing protected endpoint with valid token."""
        user = await UserFactory.create(
            db,
            email="protected@example.com",
            password="Password123!",
        )
        headers = AuthHelper.auth_headers(user)

        response = await client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "protected@example.com"

    @pytest.mark.asyncio
    async def test_access_protected_endpoint_without_token(
        self,
        client: AsyncClient,
        db: AsyncSession,
    ):
        """Test accessing protected endpoint without token."""
        response = await client.get("/api/v1/customers")

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_access_protected_endpoint_with_invalid_token(
        self,
        client: AsyncClient,
        db: AsyncSession,
    ):
        """Test accessing protected endpoint with invalid token."""
        response = await client.get(
            "/api/v1/customers",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_access_protected_endpoint_with_expired_token(
        self,
        client: AsyncClient,
        db: AsyncSession,
    ):
        """Test accessing protected endpoint with expired token."""
        user = await UserFactory.create(
            db,
            email="expired@example.com",
            password="Password123!",
        )
        # Create expired token
        expired_token = AuthHelper.create_access_token(
            user,
            expires_delta=timedelta(seconds=-1),
        )

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401


class TestRoleBasedAccess:
    """Tests for role-based access control."""

    @pytest.mark.asyncio
    async def test_admin_access_to_all_endpoints(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_organisation,
    ):
        """Test admin has access to all endpoints."""
        org = test_organisation
        admin = await UserFactory.create_admin(
            db,
            email="admin@test.com",
            organisation_id=org.id,
        )
        headers = AuthHelper.auth_headers(admin)

        # Admin should be able to access customers
        response = await client.get("/api/v1/customers", headers=headers)
        assert response.status_code == 200

        # Admin should be able to access invoices
        response = await client.get("/api/v1/invoices", headers=headers)
        assert response.status_code == 200

        # Admin should be able to access users
        response = await client.get("/api/v1/users", headers=headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_manager_access(self, client: AsyncClient, db: AsyncSession, test_organisation):
        """Test manager has appropriate access."""
        org = test_organisation
        manager = await UserFactory.create_manager(
            db,
            email="manager@test.com",
            organisation_id=org.id,
        )
        headers = AuthHelper.auth_headers(manager)

        # Manager should be able to access customers
        response = await client.get("/api/v1/customers", headers=headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_regular_user_access(self, client: AsyncClient, db: AsyncSession, test_organisation):
        """Test regular user has basic access."""
        org = test_organisation
        user = await UserFactory.create_regular_user(
            db,
            email="user@test.com",
            organisation_id=org.id,
        )
        headers = AuthHelper.auth_headers(user)

        # Regular user should be able to access customers
        response = await client.get("/api/v1/customers", headers=headers)
        assert response.status_code == 200


class TestAuthFlowEndToEnd:
    """End-to-end authentication flow tests."""

    @pytest.mark.asyncio
    async def test_complete_auth_flow(self, client: AsyncClient, db: AsyncSession):
        """Test complete authentication flow: register -> login -> access -> refresh."""
        # 1. Register
        register_response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "flow@example.com",
                "password": "FlowPassword123!",
                "first_name": "Flow",
                "last_name": "Test",
            },
        )
        assert register_response.status_code == 201

        # 2. Login
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "flow@example.com",
                "password": "FlowPassword123!",
            },
        )
        assert login_response.status_code == 200
        tokens = login_response.json()
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        # 3. Access protected endpoint
        me_response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["email"] == "flow@example.com"

        # 4. Refresh token
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()

        # 5. Access with new token
        me_response2 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
        )
        assert me_response2.status_code == 200
