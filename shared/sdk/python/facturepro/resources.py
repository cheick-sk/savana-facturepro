"""FacturePro API Resources.

Resource classes for different API endpoints.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from datetime import date


class BaseResource:
    """Base class for API resources."""
    
    def __init__(self, client):
        self._client = client


class InvoicesResource(BaseResource):
    """Invoice operations.
    
    Methods:
        list: List invoices with optional filters
        get: Get a single invoice by ID
        create: Create a new invoice
    """
    
    def list(
        self,
        status: Optional[str] = None,
        customer_id: Optional[int] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """List invoices with optional filters.
        
        Args:
            status: Filter by status (DRAFT, SENT, PAID, PARTIAL, OVERDUE, CANCELLED)
            customer_id: Filter by customer ID
            from_date: Filter from date
            to_date: Filter to date
            page: Page number (default: 1)
            limit: Items per page (default: 20, max: 100)
            
        Returns:
            Paginated invoice list
            
        Example:
            invoices = client.invoices.list(status="PAID", limit=10)
        """
        params = {"page": page, "limit": limit}
        if status:
            params["status"] = status
        if customer_id:
            params["customer_id"] = customer_id
        if from_date:
            params["from_date"] = from_date.isoformat()
        if to_date:
            params["to_date"] = to_date.isoformat()
        
        return self._client.get("/invoices", params=params)
    
    def get(self, invoice_id: int) -> Dict[str, Any]:
        """Get a single invoice by ID.
        
        Args:
            invoice_id: Invoice ID
            
        Returns:
            Invoice details
            
        Example:
            invoice = client.invoices.get(123)
        """
        return self._client.get(f"/invoices/{invoice_id}")
    
    def create(
        self,
        customer_id: int,
        items: List[Dict[str, Any]],
        due_date: Optional[date] = None,
        notes: Optional[str] = None,
        discount_percent: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Create a new invoice.
        
        Args:
            customer_id: Customer ID
            items: List of invoice items, each with:
                - description: Item description
                - quantity: Quantity (default: 1)
                - unit_price: Unit price
                - tax_rate: Tax rate percentage (default: 0)
                - product_id: Product ID (optional)
            due_date: Due date
            notes: Invoice notes
            discount_percent: Discount percentage
            
        Returns:
            Created invoice
            
        Example:
            invoice = client.invoices.create(
                customer_id=1,
                items=[
                    {"description": "Consulting", "quantity": 1, "unit_price": 50000}
                ],
                due_date=date(2024, 2, 15)
            )
        """
        data = {
            "customer_id": customer_id,
            "items": items,
        }
        if due_date:
            data["due_date"] = due_date.isoformat()
        if notes:
            data["notes"] = notes
        if discount_percent is not None:
            data["discount_percent"] = discount_percent
        
        return self._client.post("/invoices", data=data)


class CustomersResource(BaseResource):
    """Customer operations.
    
    Methods:
        list: List customers with optional search
        get: Get a single customer by ID
        create: Create a new customer
    """
    
    def list(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """List customers with optional search.
        
        Args:
            search: Search by name, email, or phone
            is_active: Filter by active status
            page: Page number
            limit: Items per page
            
        Returns:
            Paginated customer list
        """
        params = {"page": page, "limit": limit}
        if search:
            params["search"] = search
        if is_active is not None:
            params["is_active"] = str(is_active).lower()
        
        return self._client.get("/customers", params=params)
    
    def get(self, customer_id: int) -> Dict[str, Any]:
        """Get a single customer by ID.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Customer details
        """
        return self._client.get(f"/customers/{customer_id}")
    
    def create(
        self,
        name: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        city: Optional[str] = None,
        country: str = "Côte d'Ivoire",
        tax_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new customer.
        
        Args:
            name: Customer name (required)
            email: Email address
            phone: Phone number
            address: Street address
            city: City
            country: Country (default: Côte d'Ivoire)
            tax_id: Tax identification number
            
        Returns:
            Created customer
            
        Example:
            customer = client.customers.create(
                name="ACME Corp",
                email="contact@acme.com",
                phone="+2250700000000"
            )
        """
        data = {"name": name, "country": country}
        if email:
            data["email"] = email
        if phone:
            data["phone"] = phone
        if address:
            data["address"] = address
        if city:
            data["city"] = city
        if tax_id:
            data["tax_id"] = tax_id
        
        return self._client.post("/customers", data=data)


class ProductsResource(BaseResource):
    """Product operations.
    
    Methods:
        list: List products with optional filters
        get: Get a single product by ID
    """
    
    def list(
        self,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """List products with optional filters.
        
        Args:
            search: Search by name, SKU, or barcode
            category_id: Filter by category ID
            is_active: Filter by active status
            page: Page number
            limit: Items per page
            
        Returns:
            Paginated product list
        """
        params = {"page": page, "limit": limit}
        if search:
            params["search"] = search
        if category_id:
            params["category_id"] = category_id
        if is_active is not None:
            params["is_active"] = str(is_active).lower()
        
        return self._client.get("/products", params=params)
    
    def get(self, product_id: int) -> Dict[str, Any]:
        """Get a single product by ID.
        
        Args:
            product_id: Product ID
            
        Returns:
            Product details
        """
        return self._client.get(f"/products/{product_id}")


class WebhooksResource(BaseResource):
    """Webhook operations.
    
    Methods:
        list: List webhooks
        get: Get a webhook by ID
        create: Create a new webhook
        update: Update a webhook
        delete: Delete a webhook
        deliveries: List webhook delivery logs
    """
    
    def list(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """List all webhooks.
        
        Args:
            include_inactive: Include inactive webhooks
            
        Returns:
            List of webhooks
        """
        params = {"include_inactive": str(include_inactive).lower()}
        return self._client.get("/webhooks", params=params)
    
    def get(self, webhook_id: int) -> Dict[str, Any]:
        """Get a webhook by ID.
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Webhook details
        """
        return self._client.get(f"/webhooks/{webhook_id}")
    
    def create(
        self,
        name: str,
        url: str,
        events: List[str],
    ) -> Dict[str, Any]:
        """Create a new webhook.
        
        Args:
            name: Webhook name
            url: Webhook URL
            events: List of events to subscribe to
            
        Returns:
            Created webhook with secret (save this!)
            
        Example:
            webhook = client.webhooks.create(
                name="CRM Integration",
                url="https://myapp.com/webhooks",
                events=["invoice.paid", "payment.received"]
            )
            # Save the secret!
            secret = webhook["secret"]
        """
        data = {"name": name, "url": url, "events": events}
        return self._client.post("/webhooks", data=data)
    
    def update(
        self,
        webhook_id: int,
        name: Optional[str] = None,
        url: Optional[str] = None,
        events: Optional[List[str]] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Update a webhook.
        
        Args:
            webhook_id: Webhook ID
            name: New name
            url: New URL
            events: New events list
            is_active: Active status
            
        Returns:
            Updated webhook
        """
        data = {}
        if name is not None:
            data["name"] = name
        if url is not None:
            data["url"] = url
        if events is not None:
            data["events"] = events
        if is_active is not None:
            data["is_active"] = is_active
        
        return self._client.put(f"/webhooks/{webhook_id}", data=data)
    
    def delete(self, webhook_id: int) -> None:
        """Delete a webhook.
        
        Args:
            webhook_id: Webhook ID
        """
        self._client.delete(f"/webhooks/{webhook_id}")
    
    def deliveries(
        self,
        webhook_id: int,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """List webhook delivery logs.
        
        Args:
            webhook_id: Webhook ID
            page: Page number
            limit: Items per page
            
        Returns:
            Paginated delivery logs
        """
        params = {"page": page, "limit": limit}
        return self._client.get(f"/webhooks/{webhook_id}/deliveries", params=params)


class APIKeysResource(BaseResource):
    """API Key management operations.
    
    Methods:
        list: List API keys
        get: Get an API key by ID
        create: Create a new API key
        update: Update an API key
        delete: Delete an API key
        regenerate: Regenerate an API key
        usage: Get API key usage statistics
    """
    
    def list(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """List all API keys.
        
        Args:
            include_inactive: Include inactive keys
            
        Returns:
            List of API keys
        """
        params = {"include_inactive": str(include_inactive).lower()}
        return self._client.get("/api-keys", params=params)
    
    def get(self, key_id: int) -> Dict[str, Any]:
        """Get an API key by ID.
        
        Args:
            key_id: API key ID
            
        Returns:
            API key details
        """
        return self._client.get(f"/api-keys/{key_id}")
    
    def create(
        self,
        name: str,
        scopes: List[str],
        rate_limit: int = 1000,
        description: Optional[str] = None,
        expires_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new API key.
        
        Args:
            name: Key name
            scopes: Permission scopes
            rate_limit: Requests per hour (default: 1000)
            description: Key description
            expires_at: Expiration date (ISO format)
            
        Returns:
            Created API key with full key (save this!)
            
        Example:
            key = client.api_keys.create(
                name="Integration CRM",
                scopes=["read:invoices", "write:invoices"],
                rate_limit=5000
            )
            # Save the key!
            api_key = key["key"]
        """
        data = {"name": name, "scopes": scopes, "rate_limit": rate_limit}
        if description:
            data["description"] = description
        if expires_at:
            data["expires_at"] = expires_at
        
        return self._client.post("/api-keys", data=data)
    
    def update(
        self,
        key_id: int,
        name: Optional[str] = None,
        scopes: Optional[List[str]] = None,
        rate_limit: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Update an API key.
        
        Args:
            key_id: API key ID
            name: New name
            scopes: New scopes
            rate_limit: New rate limit
            is_active: Active status
            
        Returns:
            Updated API key
        """
        data = {}
        if name is not None:
            data["name"] = name
        if scopes is not None:
            data["scopes"] = scopes
        if rate_limit is not None:
            data["rate_limit"] = rate_limit
        if is_active is not None:
            data["is_active"] = is_active
        
        return self._client.put(f"/api-keys/{key_id}", data=data)
    
    def delete(self, key_id: int) -> None:
        """Delete (deactivate) an API key.
        
        Args:
            key_id: API key ID
        """
        self._client.delete(f"/api-keys/{key_id}")
    
    def regenerate(self, key_id: int) -> Dict[str, Any]:
        """Regenerate an API key.
        
        Args:
            key_id: API key ID
            
        Returns:
            New API key (save this!)
        """
        return self._client.post(f"/api-keys/{key_id}/regenerate", data={})
    
    def usage(
        self,
        key_id: int,
        days: int = 30,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Get API key usage statistics.
        
        Args:
            key_id: API key ID
            days: Number of days to include (default: 30)
            page: Page number
            limit: Items per page
            
        Returns:
            Usage statistics and logs
        """
        params = {"days": days, "page": page, "limit": limit}
        return self._client.get(f"/api-keys/{key_id}/usage", params=params)
