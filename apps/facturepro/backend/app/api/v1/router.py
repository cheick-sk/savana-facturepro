"""API v1 router — FacturePro Africa."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, categories, credit_notes, customers,
    dashboard, expenses, invoices, payments,
    products, purchase_orders, quotes, recurring,
    reports, suppliers, users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(customers.router)
api_router.include_router(suppliers.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(invoices.router)
api_router.include_router(quotes.router)
api_router.include_router(credit_notes.router)
api_router.include_router(expenses.router)
api_router.include_router(purchase_orders.router)
api_router.include_router(recurring.router)
api_router.include_router(payments.router)
api_router.include_router(payments.payment_links_router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)

# Admin endpoints
try:
    from app.api.v1.endpoints import admin, backups, password_reset
    api_router.include_router(admin.router)
    api_router.include_router(backups.router)
    api_router.include_router(password_reset.router)
except ImportError as e:
    pass  # Admin endpoints not available
