"""Tenant middleware for multi-tenant SaaS architecture.
Extracts organisation context from request and adds to request.state.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionFactory
from shared.libs.models.tenant import Organisation, Subscription, Plan


class TenantMiddleware(BaseHTTPMiddleware):
    """Middleware to extract and validate tenant context.
    
    Supports:
    - Subdomain-based tenant resolution (tenant.app.domain.com)
    - Header-based tenant resolution (X-Tenant-ID)
    - JWT-based tenant resolution (organisation_id in token)
    """
    
    # Paths that don't require tenant context
    EXEMPT_PATHS = [
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/favicon.ico",
        "/static",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
        "/api/v1/payments/webhook",  # Payment webhooks
        "/api/v1/webhooks",  # All webhooks
    ]
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    def _is_exempt(self, path: str) -> bool:
        """Check if path is exempt from tenant resolution."""
        return any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS)
    
    def _extract_tenant_id(self, request: Request) -> Optional[str]:
        """Extract tenant ID from various sources.
        
        Priority:
        1. X-Tenant-ID header (for API clients)
        2. Subdomain (for web clients)
        3. JWT organisation_id (if authenticated)
        """
        # Check header first
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            return tenant_id
        
        # Check subdomain
        host = request.headers.get("host", "")
        if "." in host:
            subdomain = host.split(".")[0]
            if subdomain and subdomain not in ["www", "api", "app", "admin"]:
                return subdomain
        
        # Check user context (if authenticated)
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "organisation_id"):
            return str(user.organisation_id)
        
        return None
    
    async def dispatch(self, request: Request, call_next):
        """Process request and resolve tenant context."""
        
        # Skip tenant resolution for exempt paths
        if self._is_exempt(request.url.path):
            return await call_next(request)
        
        # Extract tenant ID
        tenant_id = self._extract_tenant_id(request)
        
        if tenant_id:
            try:
                # Resolve organisation
                async with AsyncSessionFactory() as db:
                    result = await db.execute(
                        select(Organisation).where(
                            (Organisation.id == int(tenant_id)) | 
                            (Organisation.slug == tenant_id)
                        )
                    )
                    organisation = result.scalar_one_or_none()
                    
                    if organisation:
                        # Get subscription and plan
                        sub_result = await db.execute(
                            select(Subscription, Plan)
                            .join(Plan, Plan.id == Subscription.plan_id)
                            .where(Subscription.organisation_id == organisation.id)
                            .where(Subscription.status == "active")
                        )
                        subscription = sub_result.first()
                        
                        # Add to request state
                        request.state.organisation = organisation
                        request.state.subscription = subscription[0] if subscription else None
                        request.state.plan = subscription[1] if subscription else None
                        
                        # Check if organisation is active
                        if organisation.status != "active":
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail={
                                    "error": "organisation_suspended",
                                    "message": "This organisation account is suspended. Please contact support."
                                }
                            )
                    else:
                        # Organisation not found - only error for non-public endpoints
                        if not request.url.path.startswith("/api/v1/public"):
                            raise HTTPException(
                                status_code=status.HTTP_404_NOT_FOUND,
                                detail={
                                    "error": "organisation_not_found",
                                    "message": "Organisation not found"
                                }
                            )
            except HTTPException:
                raise
            except Exception as e:
                # Log error but don't fail request
                print(f"Tenant resolution error: {e}")
        
        # Continue with request
        return await call_next(request)


class TenantContext:
    """Helper class to access tenant context from request."""
    
    @staticmethod
    def get_organisation(request: Request) -> Optional[Organisation]:
        """Get current organisation from request state."""
        return getattr(request.state, "organisation", None)
    
    @staticmethod
    def get_subscription(request: Request) -> Optional[dict]:
        """Get current subscription from request state."""
        return getattr(request.state, "subscription", None)
    
    @staticmethod
    def get_plan(request: Request) -> Optional[dict]:
        """Get current plan from request state."""
        return getattr(request.state, "plan", None)
    
    @staticmethod
    def get_organisation_id(request: Request) -> Optional[int]:
        """Get current organisation ID from request state."""
        org = TenantContext.get_organisation(request)
        return org.id if org else None
    
    @staticmethod
    def require_organisation(request: Request) -> Organisation:
        """Get organisation or raise 404 if not found."""
        org = TenantContext.get_organisation(request)
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organisation not found"
            )
        return org


# Dependency for FastAPI routes
async def get_tenant(request: Request) -> Organisation:
    """FastAPI dependency to get current tenant organisation."""
    return TenantContext.require_organisation(request)


async def get_tenant_id(request: Request) -> int:
    """FastAPI dependency to get current tenant organisation ID."""
    return TenantContext.require_organisation(request).id


async def get_optional_tenant(request: Request) -> Optional[Organisation]:
    """FastAPI dependency to get optional tenant (may be None)."""
    return TenantContext.get_organisation(request)
