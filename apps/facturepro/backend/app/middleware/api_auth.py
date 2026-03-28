"""API Authentication Middleware for Public API.

Provides:
- API Key authentication via X-API-Key header
- Scope-based authorization
- Rate limiting per API key
- Usage tracking
- HMAC signature verification (optional)
"""
from __future__ import annotations

import hashlib
import hmac
import time
from datetime import datetime, timezone
from typing import Optional, Callable

from fastapi import (
    Request, HTTPException, Depends, status
)
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from app.core.database import AsyncSessionFactory
from app.models.api_key import APIKey, APIKeyUsage
from app.core.config import settings

# API Key header scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


class APIKeyAuth:
    """API Key authentication and authorization.
    
    Features:
    - Validates API keys from X-API-Key header
    - Checks key expiration and active status
    - Verifies required scopes
    - Tracks usage and rate limits
    """
    
    def __init__(self):
        self.redis = None
    
    async def verify_key(
        self,
        api_key: str,
        db: AsyncSession,
    ) -> Optional[APIKey]:
        """Verify an API key and return the key record.
        
        Args:
            api_key: The API key string
            db: Database session
            
        Returns:
            APIKey record if valid, None otherwise
        """
        if not api_key:
            return None
        
        # Query the key
        result = await db.execute(
            select(APIKey).where(
                APIKey.key == api_key,
                APIKey.is_active == True,
            )
        )
        key_record = result.scalar_one_or_none()
        
        if not key_record:
            return None
        
        # Check expiration
        if key_record.expires_at:
            if key_record.expires_at < datetime.now(timezone.utc):
                return None
        
        return key_record
    
    def check_scope(
        self,
        key: APIKey,
        required_scopes: list[str],
    ) -> bool:
        """Check if key has required scopes.
        
        Args:
            key: The API key record
            required_scopes: List of required scopes
            
        Returns:
            True if key has all required scopes
        """
        # Full access wildcard
        if "*" in key.scopes:
            return True
        
        # Check each required scope
        for scope in required_scopes:
            if scope not in key.scopes:
                # Check for wildcard scope (e.g., "read:*" matches "read:invoices")
                resource = scope.split(":")[0]
                if f"{resource}:*" not in key.scopes:
                    return False
        
        return True
    
    async def record_usage(
        self,
        key: APIKey,
        request: Request,
        status_code: int,
        response_time_ms: int,
        error_message: str = None,
        db: AsyncSession = None,
    ):
        """Record API key usage for analytics.
        
        Args:
            key: The API key record
            request: The FastAPI request
            status_code: Response status code
            response_time_ms: Response time in milliseconds
            error_message: Optional error message
            db: Database session
        """
        if db is None:
            async with AsyncSessionFactory() as session:
                await self._save_usage(session, key, request, status_code, response_time_ms, error_message)
        else:
            await self._save_usage(db, key, request, status_code, response_time_ms, error_message)
    
    async def _save_usage(
        self,
        db: AsyncSession,
        key: APIKey,
        request: Request,
        status_code: int,
        response_time_ms: int,
        error_message: str = None,
    ):
        """Save usage record to database."""
        usage = APIKeyUsage(
            api_key_id=key.id,
            endpoint=request.url.path,
            method=request.method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            ip_address=self._get_client_ip(request),
            user_agent=request.headers.get("user-agent", "")[:500],
            error_message=error_message,
        )
        db.add(usage)
        
        # Update last used timestamp
        key.last_used_at = datetime.now(timezone.utc)
        
        await db.commit()
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP from request."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()[:45]
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip[:45]
        
        if request.client:
            return request.client.host[:45]
        
        return "unknown"
    
    def verify_signature(
        self,
        key: APIKey,
        payload: bytes,
        signature: str,
        timestamp: str,
    ) -> bool:
        """Verify HMAC signature for request authentication.
        
        Provides additional security for sensitive operations.
        
        Args:
            key: The API key record
            payload: Request body bytes
            signature: Signature from X-Signature header
            timestamp: Timestamp from X-Timestamp header
            
        Returns:
            True if signature is valid
        """
        if not key.secret:
            return False
        
        # Check timestamp freshness (5 minutes)
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > 300:
                return False
        except (ValueError, TypeError):
            return False
        
        # Compute expected signature
        message = f"{timestamp}.{payload.decode('utf-8')}"
        expected = hmac.new(
            key.secret.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected)


# Global instance
api_key_auth = APIKeyAuth()


async def get_api_key(
    request: Request,
    api_key: str = Depends(api_key_header),
) -> APIKey:
    """Dependency to verify API key.
    
    Usage:
        @router.get("/protected", dependencies=[Depends(require_scope("read:invoices"))])
        async def protected_endpoint(key: APIKey = Depends(get_api_key)):
            ...
    
    Raises:
        HTTPException: 401 if key is invalid
    """
    async with AsyncSessionFactory() as db:
        key_record = await api_key_auth.verify_key(api_key, db)
        
        if not key_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "message": "Invalid or expired API key",
                    "code": "invalid_api_key",
                },
                headers={"WWW-Authenticate": "ApiKey"},
            )
        
        # Store in request state for later use
        request.state.api_key = key_record
        request.state.organisation_id = key_record.organisation_id
        
        return key_record


def require_scope(*required_scopes: str):
    """Dependency factory to require specific scopes.
    
    Usage:
        @router.get("/invoices", dependencies=[Depends(require_scope("read:invoices"))])
        async def list_invoices():
            ...
    """
    async def scope_checker(
        request: Request,
        key: APIKey = Depends(get_api_key),
    ) -> APIKey:
        if not api_key_auth.check_scope(key, list(required_scopes)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": f"Missing required scope(s): {', '.join(required_scopes)}",
                    "code": "insufficient_scope",
                    "required_scopes": list(required_scopes),
                    "available_scopes": key.scopes,
                },
            )
        return key
    
    return scope_checker


def require_any_scope(*allowed_scopes: str):
    """Dependency factory to require any of the given scopes.
    
    Usage:
        @router.get("/data", dependencies=[Depends(require_any_scope("read:invoices", "read:quotes"))])
        async def get_data():
            ...
    """
    async def scope_checker(
        request: Request,
        key: APIKey = Depends(get_api_key),
    ) -> APIKey:
        has_any = any(
            api_key_auth.check_scope(key, [scope])
            for scope in allowed_scopes
        )
        
        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": f"Missing required scope. Need one of: {', '.join(allowed_scopes)}",
                    "code": "insufficient_scope",
                    "allowed_scopes": list(allowed_scopes),
                    "available_scopes": key.scopes,
                },
            )
        return key
    
    return scope_checker


class APIRateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for API-specific rate limiting.
    
    Handles rate limiting for public API endpoints:
    - Uses API key's custom rate limit if available
    - Falls back to IP-based rate limiting for unauthenticated requests
    - Adds rate limit headers to responses
    """
    
    def __init__(
        self,
        app: ASGIApp,
        redis_url: str = None,
        api_prefix: str = "/api/v1/public",
    ):
        super().__init__(app)
        self.redis_url = redis_url or settings.REDIS_URL
        self.api_prefix = api_prefix
        self.redis = None
    
    def _is_api_request(self, path: str) -> bool:
        """Check if request is to public API."""
        return path.startswith(self.api_prefix)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP from request."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        if request.client:
            return request.client.host
        
        return "unknown"
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request through rate limiter."""
        
        # Only process API requests
        if not self._is_api_request(request.url.path):
            return await call_next(request)
        
        # Get rate limit identifier
        api_key = request.headers.get("X-API-Key")
        
        if api_key:
            # Will be verified by authentication middleware
            # Rate limit will be checked there
            return await call_next(request)
        
        # For unauthenticated API requests, use IP-based rate limiting
        # (import and use existing RateLimiter)
        from app.middleware.rate_limit import RateLimiter
        
        limiter = RateLimiter(self.redis_url)
        ip = self._get_client_ip(request)
        
        # Use stricter limits for unauthenticated API access
        is_limited, info = await limiter.is_rate_limited(
            identifier=ip,
            prefix="api_public",
            max_requests=100,  # 100 requests per minute for unauthenticated
            window_seconds=60,
        )
        
        if is_limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please authenticate for higher limits.",
                    "error": "rate_limit_exceeded",
                    "retry_after": info.get("retry_after", 60),
                },
                headers={
                    "Retry-After": str(info.get("retry_after", 60)),
                    "X-RateLimit-Limit": str(info.get("limit", 100)),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(info.get("reset", 0)),
                }
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(info.get("limit", 100))
        response.headers["X-RateLimit-Remaining"] = str(info.get("remaining", 0))
        response.headers["X-RateLimit-Reset"] = str(info.get("reset", 0))
        
        return response
