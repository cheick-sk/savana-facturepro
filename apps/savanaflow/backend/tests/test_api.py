"""Basic API tests for SavanaFlow POS."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_login_invalid(client):
    resp = await client.post("/api/v1/auth/login", json={"email": "bad@bad.com", "password": "wrong"})
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_protected_without_token(client):
    resp = await client.get("/api/v1/products")
    assert resp.status_code == 401
