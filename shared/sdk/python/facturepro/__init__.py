"""FacturePro Africa Python SDK.

Official Python SDK for the FacturePro Africa API.

Usage:
    from facturepro import FactureProClient
    
    client = FactureProClient(api_key="fp_your_api_key")
    
    # List invoices
    invoices = client.invoices.list()
    
    # Create a customer
    customer = client.customers.create(
        name="John Doe",
        email="john@example.com",
        phone="+2250700000000"
    )
    
    # Create an invoice
    invoice = client.invoices.create(
        customer_id=customer["id"],
        items=[
            {"description": "Service A", "quantity": 1, "unit_price": 50000}
        ]
    )
"""
from facturepro.client import FactureProClient
from facturepro.resources import (
    InvoicesResource,
    CustomersResource,
    ProductsResource,
    WebhooksResource,
    APIKeysResource,
)
from facturepro.exceptions import (
    FactureProError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    NotFoundError,
)

__version__ = "1.0.0"
__author__ = "SaaS Africa"
__email__ = "support@saasafrica.com"

__all__ = [
    "FactureProClient",
    "InvoicesResource",
    "CustomersResource",
    "ProductsResource",
    "WebhooksResource",
    "APIKeysResource",
    "FactureProError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    "NotFoundError",
]
