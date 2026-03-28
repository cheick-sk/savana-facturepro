"""API v1 router — FacturePro Africa."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, categories, credit_notes, customers,
    dashboard, expenses, invoices, payments,
    products, purchase_orders, quotes, recurring,
    reports, suppliers, users,
)
from app.api.v1.endpoints import ai
from app.api.v1.endpoints.client_portal import (
    public_router as portal_public_router,
    auth_router as portal_auth_router,
    portal_router,
)
from app.api.v1.endpoints.accounting import (
    router as accounting_router,
    auto_router as accounting_auto_router,
    reconciliation_router as accounting_reconciliation_router,
    tax_router as accounting_tax_router,
    reports_router as accounting_reports_router,
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
api_router.include_router(purchase_orders.receptions_router)
api_router.include_router(purchase_orders.invoices_router)
api_router.include_router(purchase_orders.supplier_router)
api_router.include_router(recurring.router)
api_router.include_router(payments.router)
api_router.include_router(payments.payment_links_router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)

# Client Portal routes
api_router.include_router(portal_public_router)
api_router.include_router(portal_auth_router)
api_router.include_router(portal_router)

# Accounting routes (OHADA)
api_router.include_router(accounting_router)
api_router.include_router(accounting_auto_router)
api_router.include_router(accounting_reconciliation_router)
api_router.include_router(accounting_tax_router)
api_router.include_router(accounting_reports_router)

# AI Services routes
api_router.include_router(ai.router)
