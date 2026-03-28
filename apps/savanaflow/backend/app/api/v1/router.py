"""API v1 router — SavanaFlow POS."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, categories, customers, promotions,
    purchase_orders, products, refunds, reports,
    sales, shifts, stores, suppliers, transfers,
    employees,
)
from app.api.v1.endpoints import loyalty
from app.api.v1.endpoints import ecommerce
from app.api.v1.endpoints import storefront
from app.api.v1.endpoints import predictions

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(stores.router)
api_router.include_router(categories.router)
api_router.include_router(suppliers.router)
api_router.include_router(products.router)
api_router.include_router(customers.router)
api_router.include_router(promotions.router)
api_router.include_router(shifts.router)
api_router.include_router(sales.router)
api_router.include_router(refunds.router)
api_router.include_router(transfers.router)
api_router.include_router(purchase_orders.router)
api_router.include_router(reports.router)
api_router.include_router(reports.dashboard_router)
# Employee management
api_router.include_router(employees.router)
api_router.include_router(employees.shift_router)
api_router.include_router(employees.commission_router)
# Loyalty program
api_router.include_router(loyalty.router)
# E-commerce module
api_router.include_router(ecommerce.router)
api_router.include_router(storefront.router)

# AI Predictions and Insights
api_router.include_router(predictions.router)
api_router.include_router(predictions.insights_router)
