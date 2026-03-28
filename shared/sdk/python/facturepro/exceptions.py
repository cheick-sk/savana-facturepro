"""FacturePro API Exceptions.

Custom exceptions for the FacturePro SDK.
"""
from typing import Optional, Any


class FactureProError(Exception):
    """Base exception for FacturePro API errors.
    
    Attributes:
        message: Error message
        status_code: HTTP status code (if applicable)
        details: Additional error details
    """
    
    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        details: Optional[Any] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)
    
    def __str__(self):
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(FactureProError):
    """Raised when API authentication fails.
    
    This typically means:
    - Invalid API key
    - Expired API key
    - Missing API key header
    """
    
    def __init__(self, message: str = "Invalid or expired API key"):
        super().__init__(message, status_code=401)


class RateLimitError(FactureProError):
    """Raised when rate limit is exceeded.
    
    Attributes:
        retry_after: Seconds until rate limit resets
        limit: Rate limit value
        remaining: Remaining requests
    """
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int = 60,
        limit: Optional[int] = None,
        remaining: int = 0,
    ):
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining
        super().__init__(
            f"{message}. Retry after {retry_after} seconds.",
            status_code=429,
        )


class ValidationError(FactureProError):
    """Raised when request validation fails.
    
    Attributes:
        errors: Validation error details
    """
    
    def __init__(
        self,
        message: str = "Validation error",
        errors: Optional[dict] = None,
    ):
        self.errors = errors or {}
        super().__init__(message, status_code=400, details=errors)


class NotFoundError(FactureProError):
    """Raised when a requested resource is not found."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ScopeError(FactureProError):
    """Raised when API key lacks required scope.
    
    Attributes:
        required_scopes: Scopes required for the operation
        available_scopes: Scopes available to the API key
    """
    
    def __init__(
        self,
        message: str = "Insufficient scope",
        required_scopes: Optional[list] = None,
        available_scopes: Optional[list] = None,
    ):
        self.required_scopes = required_scopes or []
        self.available_scopes = available_scopes or []
        super().__init__(message, status_code=403)
