"""Rate limiting middleware for Africa SaaS.
Uses Redis for distributed rate limiting across multiple workers.
Supports per-IP, per-user, and per-organisation limits.
"""
import time
import hashlib
from typing import Optional, Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import redis.asyncio as redis
import json

from app.core.config import settings


class RateLimiter:
    """Redis-based rate limiter with sliding window algorithm.
    
    Features:
    - Multiple rate limit tiers (IP, User, Organisation)
    - Sliding window for accurate rate limiting
    - Configurable limits per subscription plan
    - Redis-based for distributed environments
    """
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self.redis: Optional[redis.Redis] = None
        
        # Default rate limits
        self.default_limits = {
            "ip": {
                "requests": settings.RATE_LIMIT_REQUESTS,
                "window": settings.RATE_LIMIT_WINDOW_SECONDS,
            },
            "user": {
                "requests": 200,
                "window": 60,
            },
            "organisation": {
                "requests": 500,
                "window": 60,
            },
        }
        
        # Enhanced limits for paid plans
        self.plan_limits = {
            "starter": {
                "ip": {"requests": 100, "window": 60},
                "user": {"requests": 200, "window": 60},
                "organisation": {"requests": 500, "window": 60},
            },
            "pro": {
                "ip": {"requests": 200, "window": 60},
                "user": {"requests": 500, "window": 60},
                "organisation": {"requests": 1500, "window": 60},
            },
            "business": {
                "ip": {"requests": 500, "window": 60},
                "user": {"requests": 1000, "window": 60},
                "organisation": {"requests": 5000, "window": 60},
            },
            "enterprise": {
                "ip": {"requests": 1000, "window": 60},
                "user": {"requests": 2000, "window": 60},
                "organisation": {"requests": -1, "window": 60},  # Unlimited
            },
        }
    
    async def init_redis(self):
        """Initialize Redis connection."""
        if self.redis is None:
            self.redis = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
    
    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
    
    def _get_key(self, prefix: str, identifier: str) -> str:
        """Generate Redis key for rate limiting."""
        return f"ratelimit:{prefix}:{identifier}"
    
    async def is_rate_limited(
        self,
        identifier: str,
        prefix: str = "ip",
        max_requests: int = None,
        window_seconds: int = None
    ) -> tuple[bool, dict]:
        """Check if identifier is rate limited using sliding window.
        
        Args:
            identifier: IP, user ID, or organisation ID
            prefix: Key prefix (ip, user, organisation)
            max_requests: Maximum requests in window (uses default if None)
            window_seconds: Window in seconds (uses default if None)
            
        Returns:
            Tuple of (is_limited, info_dict)
        """
        await self.init_redis()
        
        limits = self.default_limits[prefix]
        max_requests = max_requests or limits["requests"]
        window_seconds = window_seconds or limits["window"]
        
        # Unlimited
        if max_requests < 0:
            return False, {"limited": False, "remaining": -1}
        
        key = self._get_key(prefix, identifier)
        now = time.time()
        window_start = now - window_seconds
        
        # Use Redis pipeline for atomic operations
        pipe = self.redis.pipeline()
        
        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current entries
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiry
        pipe.expire(key, window_seconds)
        
        results = await pipe.execute()
        current_count = results[1]
        
        is_limited = current_count >= max_requests
        remaining = max(0, max_requests - current_count - 1)
        retry_after = int(window_seconds) if is_limited else 0
        
        return is_limited, {
            "limited": is_limited,
            "current": current_count + 1,
            "limit": max_requests,
            "remaining": remaining,
            "reset": int(now + window_seconds),
            "retry_after": retry_after,
        }
    
    async def check_limits(
        self,
        ip: str,
        user_id: int = None,
        organisation_id: int = None,
        plan: str = None
    ) -> tuple[bool, dict]:
        """Check all applicable rate limits.
        
        Args:
            ip: Client IP address
            user_id: Authenticated user ID
            organisation_id: Organisation ID
            plan: Subscription plan for limit adjustment
            
        Returns:
            Tuple of (is_limited, info_dict)
        """
        # Get plan-specific limits
        limits = self.plan_limits.get(plan, self.default_limits)
        
        results = {}
        
        # Check IP limit
        ip_limited, ip_info = await self.is_rate_limited(
            identifier=ip,
            prefix="ip",
            max_requests=limits["ip"]["requests"],
            window_seconds=limits["ip"]["window"]
        )
        results["ip"] = ip_info
        
        if ip_limited:
            return True, {"type": "ip", **ip_info}
        
        # Check user limit (if authenticated)
        if user_id:
            user_limited, user_info = await self.is_rate_limited(
                identifier=str(user_id),
                prefix="user",
                max_requests=limits["user"]["requests"],
                window_seconds=limits["user"]["window"]
            )
            results["user"] = user_info
            
            if user_limited:
                return True, {"type": "user", **user_info}
        
        # Check organisation limit
        if organisation_id:
            org_limits = limits["organisation"]
            if org_limits["requests"] > 0:  # Not unlimited
                org_limited, org_info = await self.is_rate_limited(
                    identifier=str(organisation_id),
                    prefix="organisation",
                    max_requests=org_limits["requests"],
                    window_seconds=org_limits["window"]
                )
                results["organisation"] = org_info
                
                if org_limited:
                    return True, {"type": "organisation", **org_info}
        
        return False, results
    
    async def reset_limits(self, identifier: str, prefix: str = "ip"):
        """Reset rate limits for an identifier."""
        await self.init_redis()
        key = self._get_key(prefix, identifier)
        await self.redis.delete(key)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting.
    
    Adds rate limit headers to all responses:
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
    - X-RateLimit-Reset
    """
    
    def __init__(
        self,
        app: ASGIApp,
        redis_url: str = None,
        exclude_paths: list[str] = None,
    ):
        super().__init__(app)
        self.limiter = RateLimiter(redis_url)
        self.exclude_paths = exclude_paths or [
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/favicon.ico",
            "/static",
        ]
    
    def _should_skip(self, path: str) -> bool:
        """Check if path should skip rate limiting."""
        return any(path.startswith(exclude) for exclude in self.exclude_paths)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP from request."""
        # Check X-Forwarded-For header (from reverse proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to client host
        if request.client:
            return request.client.host
        
        return "unknown"
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through rate limiter."""
        
        # Skip excluded paths
        if self._should_skip(request.url.path):
            return await call_next(request)
        
        # Get identifiers
        ip = self._get_client_ip(request)
        user = getattr(request.state, "user", None)
        organisation = getattr(request.state, "organisation", None)
        
        user_id = user.id if user else None
        organisation_id = organisation.id if organisation else None
        plan = organisation.plan if organisation else None
        
        # Check rate limits
        is_limited, info = await self.limiter.check_limits(
            ip=ip,
            user_id=user_id,
            organisation_id=organisation_id,
            plan=plan
        )
        
        if is_limited:
            # Return rate limit error
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "error": "rate_limit_exceeded",
                    "retry_after": info.get("retry_after", 60),
                },
                headers={
                    "Retry-After": str(info.get("retry_after", 60)),
                    "X-RateLimit-Limit": str(info.get("limit", 100)),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(info.get("reset", int(time.time() + 60))),
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        if "ip" in info:
            response.headers["X-RateLimit-Limit"] = str(info["ip"].get("limit", 100))
            response.headers["X-RateLimit-Remaining"] = str(info["ip"].get("remaining", 0))
            response.headers["X-RateLimit-Reset"] = str(info["ip"].get("reset", 0))
        
        return response


# Dependency for route-specific rate limiting
async def rate_limit_dependency(
    request: Request,
    max_requests: int = 100,
    window_seconds: int = 60,
    prefix: str = "ip"
):
    """FastAPI dependency for route-specific rate limiting.
    
    Usage:
        @router.get("/sensitive", dependencies=[Depends(rate_limit_dependency)])
        async def sensitive_endpoint():
            ...
    """
    limiter = RateLimiter()
    
    # Get identifier
    if prefix == "ip":
        identifier = request.client.host if request.client else "unknown"
    elif prefix == "user":
        user = getattr(request.state, "user", None)
        identifier = str(user.id) if user else None
    else:
        identifier = None
    
    if not identifier:
        return  # Skip if no identifier
    
    is_limited, info = await limiter.is_rate_limited(
        identifier=identifier,
        prefix=prefix,
        max_requests=max_requests,
        window_seconds=window_seconds
    )
    
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Rate limit exceeded",
                "retry_after": info.get("retry_after", 60),
            }
        )


# Specialized rate limiters for sensitive operations
class LoginRateLimiter:
    """Rate limiter specifically for login attempts.
    
    Features:
    - Tracks failed attempts per IP and email
    - Progressive delays after failures
    - Lockout after too many failures
    """
    
    MAX_ATTEMPTS = 5
    LOCKOUT_DURATION = 15 * 60  # 15 minutes
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self.redis: Optional[redis.Redis] = None
    
    async def init_redis(self):
        if self.redis is None:
            self.redis = redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
    
    async def record_attempt(self, ip: str, email: str, success: bool) -> dict:
        """Record a login attempt.
        
        Returns:
            Dict with attempts remaining and lockout status
        """
        await self.init_redis()
        
        ip_key = f"login_attempts:ip:{ip}"
        email_key = f"login_attempts:email:{email}"
        lockout_key = f"login_lockout:{ip}"
        
        # Check if currently locked out
        is_locked = await self.redis.exists(lockout_key)
        if is_locked:
            ttl = await self.redis.ttl(lockout_key)
            return {
                "locked": True,
                "remaining_seconds": ttl,
                "attempts_remaining": 0,
            }
        
        if success:
            # Clear attempts on success
            await self.redis.delete(ip_key)
            await self.redis.delete(email_key)
            return {"locked": False, "attempts_remaining": self.MAX_ATTEMPTS}
        
        # Increment failures
        ip_attempts = await self.redis.incr(ip_key)
        await self.redis.expire(ip_key, 3600)  # 1 hour window
        
        # Check for lockout
        if ip_attempts >= self.MAX_ATTEMPTS:
            await self.redis.setex(lockout_key, self.LOCKOUT_DURATION, "1")
            return {
                "locked": True,
                "remaining_seconds": self.LOCKOUT_DURATION,
                "attempts_remaining": 0,
            }
        
        return {
            "locked": False,
            "attempts_remaining": self.MAX_ATTEMPTS - ip_attempts,
        }
