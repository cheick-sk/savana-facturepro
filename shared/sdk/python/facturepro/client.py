"""FacturePro Africa API Client.

Main client class for interacting with the FacturePro API.
"""
from __future__ import annotations

import time
from typing import Optional
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

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


class FactureProClient:
    """FacturePro Africa API Client.
    
    The main client for interacting with the FacturePro API.
    
    Args:
        api_key: Your FacturePro API key (starts with 'fp_')
        base_url: API base URL (default: production)
        timeout: Request timeout in seconds (default: 30)
        max_retries: Maximum number of retries for failed requests (default: 3)
        
    Example:
        client = FactureProClient(
            api_key="fp_your_api_key",
            base_url="https://api.saasafrica.com"
        )
    """
    
    DEFAULT_BASE_URL = "https://api.saasafrica.com"
    SANDBOX_BASE_URL = "https://sandbox-api.saasafrica.com"
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        if not api_key or not api_key.startswith("fp_"):
            raise ValueError("Invalid API key. API keys must start with 'fp_'")
        
        self.api_key = api_key
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.timeout = timeout
        
        # Setup session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        self.session.headers.update({
            "X-API-Key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": f"FacturePro-Python/{__import__('facturepro').__version__}",
        })
        
        # Initialize resources
        self._invoices = None
        self._customers = None
        self._products = None
        self._webhooks = None
        self._api_keys = None
    
    @property
    def invoices(self) -> InvoicesResource:
        """Access invoice operations."""
        if self._invoices is None:
            self._invoices = InvoicesResource(self)
        return self._invoices
    
    @property
    def customers(self) -> CustomersResource:
        """Access customer operations."""
        if self._customers is None:
            self._customers = CustomersResource(self)
        return self._customers
    
    @property
    def products(self) -> ProductsResource:
        """Access product operations."""
        if self._products is None:
            self._products = ProductsResource(self)
        return self._products
    
    @property
    def webhooks(self) -> WebhooksResource:
        """Access webhook operations."""
        if self._webhooks is None:
            self._webhooks = WebhooksResource(self)
        return self._webhooks
    
    @property
    def api_keys(self) -> APIKeysResource:
        """Access API key operations."""
        if self._api_keys is None:
            self._api_keys = APIKeysResource(self)
        return self._api_keys
    
    def request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        data: Optional[dict] = None,
    ) -> dict:
        """Make an API request.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            path: API endpoint path
            params: Query parameters
            data: Request body data
            
        Returns:
            Response data as dict
            
        Raises:
            AuthenticationError: Invalid API key
            RateLimitError: Rate limit exceeded
            ValidationError: Invalid request data
            NotFoundError: Resource not found
            FactureProError: Other API errors
        """
        url = urljoin(self.base_url, f"/api/v1/public{path}")
        
        start_time = time.time()
        response = self.session.request(
            method=method,
            url=url,
            params=params,
            json=data,
            timeout=self.timeout,
        )
        
        # Handle response
        if response.status_code == 200 or response.status_code == 201:
            return response.json()
        
        # Handle errors
        error_data = response.json() if response.content else {}
        error_message = error_data.get("detail", {}).get("message", str(error_data))
        
        if response.status_code == 401:
            raise AuthenticationError(error_message)
        elif response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "60")
            raise RateLimitError(error_message, retry_after=int(retry_after))
        elif response.status_code == 400:
            raise ValidationError(error_message, errors=error_data.get("detail", {}))
        elif response.status_code == 404:
            raise NotFoundError(error_message)
        else:
            raise FactureProError(
                f"API error: {response.status_code} - {error_message}",
                status_code=response.status_code,
            )
    
    def get(self, path: str, params: Optional[dict] = None) -> dict:
        """Make a GET request."""
        return self.request("GET", path, params=params)
    
    def post(self, path: str, data: dict) -> dict:
        """Make a POST request."""
        return self.request("POST", path, data=data)
    
    def put(self, path: str, data: dict) -> dict:
        """Make a PUT request."""
        return self.request("PUT", path, data=data)
    
    def delete(self, path: str) -> None:
        """Make a DELETE request."""
        self.request("DELETE", path)
    
    @classmethod
    def sandbox(cls, api_key: str, **kwargs) -> "FactureProClient":
        """Create a client for the sandbox environment.
        
        Args:
            api_key: Your sandbox API key
            **kwargs: Additional client options
            
        Returns:
            FactureProClient configured for sandbox
        """
        return cls(api_key=api_key, base_url=cls.SANDBOX_BASE_URL, **kwargs)
    
    def close(self):
        """Close the client session."""
        self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
