"""Caching Service using Redis.

Provides:
- Key-value caching with TTL
- Cache invalidation patterns
- Distributed caching for multi-instance deployments
- Cache hit/miss statistics
"""
from __future__ import annotations

import json
import logging
import pickle
from datetime import timedelta
from functools import wraps
from typing import Any, Callable, Dict, Generic, Optional, TypeVar, Union

import redis.asyncio as redis
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheStats:
    """Cache statistics tracker."""

    def __init__(self):
        self.hits = 0
        self.misses = 0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    def record_hit(self):
        self.hits += 1

    def record_miss(self):
        self.misses += 1


class CacheService:
    """Redis-based caching service."""

    # Default TTL for different cache types (in seconds)
    DEFAULT_TTLS = {
        "dashboard": 300,  # 5 minutes
        "reports": 600,  # 10 minutes
        "customer": 3600,  # 1 hour
        "product": 3600,  # 1 hour
        "invoice": 300,  # 5 minutes (shorter for real-time updates)
        "user": 1800,  # 30 minutes
        "settings": 3600,  # 1 hour
        "quota": 60,  # 1 minute
    }

    def __init__(
        self,
        redis_url: str,
        prefix: str = "savana:cache",
        default_ttl: int = 300,
    ):
        """Initialize cache service.

        Args:
            redis_url: Redis connection URL
            prefix: Key prefix for namespacing
            default_ttl: Default TTL in seconds
        """
        self.redis_url = redis_url
        self.prefix = prefix
        self.default_ttl = default_ttl
        self._client: Optional[redis.Redis] = None
        self._stats = CacheStats()

    @property
    async def client(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._client is None:
            self._client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=False,  # We handle encoding ourselves
            )
        return self._client

    def _make_key(self, key: str, namespace: Optional[str] = None) -> str:
        """Create a namespaced cache key.

        Args:
            key: Original key
            namespace: Optional namespace (e.g., 'org:123')

        Returns:
            Full cache key
        """
        parts = [self.prefix]
        if namespace:
            parts.append(namespace)
        parts.append(key)
        return ":".join(parts)

    async def get(
        self,
        key: str,
        namespace: Optional[str] = None,
    ) -> Optional[Any]:
        """Get a value from cache.

        Args:
            key: Cache key
            namespace: Optional namespace

        Returns:
            Cached value or None if not found
        """
        full_key = self._make_key(key, namespace)
        client = await self.client

        try:
            data = await client.get(full_key)
            if data is not None:
                self._stats.record_hit()
                return pickle.loads(data)
            self._stats.record_miss()
            return None
        except Exception as e:
            logger.warning(f"Cache get error for {full_key}: {e}")
            self._stats.record_miss()
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        namespace: Optional[str] = None,
        cache_type: Optional[str] = None,
    ) -> bool:
        """Set a value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: TTL in seconds (optional)
            namespace: Optional namespace
            cache_type: Type of cache for default TTL

        Returns:
            True if successful
        """
        full_key = self._make_key(key, namespace)
        client = await self.client

        # Determine TTL
        if ttl is None:
            if cache_type and cache_type in self.DEFAULT_TTLS:
                ttl = self.DEFAULT_TTLS[cache_type]
            else:
                ttl = self.default_ttl

        try:
            data = pickle.dumps(value)
            await client.setex(full_key, ttl, data)
            return True
        except Exception as e:
            logger.warning(f"Cache set error for {full_key}: {e}")
            return False

    async def delete(
        self,
        key: str,
        namespace: Optional[str] = None,
    ) -> bool:
        """Delete a key from cache.

        Args:
            key: Cache key
            namespace: Optional namespace

        Returns:
            True if key was deleted
        """
        full_key = self._make_key(key, namespace)
        client = await self.client

        try:
            result = await client.delete(full_key)
            return result > 0
        except Exception as e:
            logger.warning(f"Cache delete error for {full_key}: {e}")
            return False

    async def delete_pattern(
        self,
        pattern: str,
        namespace: Optional[str] = None,
    ) -> int:
        """Delete all keys matching a pattern.

        Args:
            pattern: Key pattern (supports wildcards)
            namespace: Optional namespace

        Returns:
            Number of keys deleted
        """
        full_pattern = self._make_key(pattern, namespace)
        client = await self.client

        try:
            keys = []
            async for key in client.scan_iter(match=full_pattern):
                keys.append(key)

            if keys:
                return await client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern error for {full_pattern}: {e}")
            return 0

    async def invalidate_org(self, organisation_id: int) -> int:
        """Invalidate all cache for an organisation.

        Args:
            organisation_id: Organisation ID

        Returns:
            Number of keys invalidated
        """
        namespace = f"org:{organisation_id}"
        return await self.delete_pattern("*", namespace)

    async def invalidate_resource(
        self,
        resource_type: str,
        resource_id: int,
        organisation_id: Optional[int] = None,
    ) -> int:
        """Invalidate cache for a specific resource.

        Args:
            resource_type: Type of resource (e.g., 'invoice', 'customer')
            resource_id: Resource ID
            organisation_id: Optional organisation ID

        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"{resource_type}:{resource_id}:*",
            f"{resource_type}:list:*",  # Invalidate list caches
        ]

        total_deleted = 0
        for pattern in patterns:
            namespace = f"org:{organisation_id}" if organisation_id else None
            total_deleted += await self.delete_pattern(pattern, namespace)

        return total_deleted

    async def get_or_set(
        self,
        key: str,
        factory: Callable[[], Any],
        ttl: Optional[int] = None,
        namespace: Optional[str] = None,
        cache_type: Optional[str] = None,
    ) -> Any:
        """Get from cache or compute and cache.

        Args:
            key: Cache key
            factory: Async function to compute value if not cached
            ttl: TTL in seconds
            namespace: Optional namespace
            cache_type: Type of cache for default TTL

        Returns:
            Cached or computed value
        """
        # Try to get from cache
        value = await self.get(key, namespace)
        if value is not None:
            return value

        # Compute value
        if callable(factory):
            value = await factory() if hasattr(factory, '__call__') else factory()
        else:
            value = factory

        # Cache the value
        await self.set(key, value, ttl, namespace, cache_type)

        return value

    async def increment(
        self,
        key: str,
        amount: int = 1,
        namespace: Optional[str] = None,
    ) -> int:
        """Increment a counter in cache.

        Args:
            key: Cache key
            amount: Amount to increment
            namespace: Optional namespace

        Returns:
            New value after increment
        """
        full_key = self._make_key(key, namespace)
        client = await self.client

        try:
            return await client.incrby(full_key, amount)
        except Exception as e:
            logger.warning(f"Cache increment error for {full_key}: {e}")
            return 0

    @property
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dict with cache stats
        """
        return {
            "hits": self._stats.hits,
            "misses": self._stats.misses,
            "hit_rate": f"{self._stats.hit_rate:.2%}",
        }

    async def close(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None


def cached(
    key_pattern: str,
    ttl: Optional[int] = None,
    cache_type: Optional[str] = None,
    namespace_from: Optional[str] = None,
):
    """Decorator for caching function results.

    Args:
        key_pattern: Key pattern with placeholders (e.g., 'user:{user_id}')
        ttl: TTL in seconds
        cache_type: Type of cache for default TTL
        namespace_from: Argument name to use for namespace

    Example:
        @cached('user:{user_id}', cache_type='user')
        async def get_user(user_id: int):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get cache service
            cache = get_cache_service()

            # Build cache key
            key = key_pattern.format(**kwargs)

            # Determine namespace
            namespace = None
            if namespace_from and namespace_from in kwargs:
                namespace = f"org:{kwargs[namespace_from]}"

            # Try cache
            value = await cache.get(key, namespace)
            if value is not None:
                return value

            # Call function
            result = await func(*args, **kwargs)

            # Cache result
            await cache.set(key, result, ttl, namespace, cache_type)

            return result

        return wrapper
    return decorator


# Singleton instance
_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """Get the global cache service instance.

    Returns:
        CacheService singleton
    """
    global _cache_service
    if _cache_service is None:
        settings = get_settings()
        _cache_service = CacheService(
            redis_url=settings.REDIS_URL,
            prefix="savana:facturepro",
        )
    return _cache_service
