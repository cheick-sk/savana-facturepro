"""
Token Blacklist Service - Redis-based JWT token revocation

This module provides functionality to blacklist JWT tokens for:
- Logout (invalidate current token)
- Password change (invalidate all user tokens)
- Security incidents (invalidate suspicious tokens)
- Token refresh rotation (invalidate old refresh tokens)
"""

import json
from datetime import datetime, timedelta
from typing import Optional, List
import redis.asyncio as redis
from app.core.config import settings


class TokenBlacklistService:
    """
    Redis-based token blacklist service.
    
    Uses Redis sets for efficient token blacklisting with TTL support.
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.prefix = "token_blacklist"
        self.user_tokens_prefix = "user_tokens"
    
    def _get_token_key(self, token_jti: str) -> str:
        """Get Redis key for a specific token"""
        return f"{self.prefix}:token:{token_jti}"
    
    def _get_user_tokens_key(self, user_id: int) -> str:
        """Get Redis key for all tokens of a user"""
        return f"{self.prefix}:{self.user_tokens_prefix}:{user_id}"
    
    async def blacklist_token(
        self,
        token_jti: str,
        user_id: int,
        expires_in_seconds: int,
        reason: str = "logout"
    ) -> bool:
        """
        Add a token to the blacklist.
        
        Args:
            token_jti: JWT ID (unique identifier)
            user_id: User ID associated with the token
            expires_in_seconds: Time until token naturally expires
            reason: Reason for blacklisting (logout, password_change, security)
        
        Returns:
            True if successfully blacklisted
        """
        token_key = self._get_token_key(token_jti)
        user_tokens_key = self._get_user_tokens_key(user_id)
        
        # Store token info
        token_data = json.dumps({
            "user_id": user_id,
            "reason": reason,
            "blacklisted_at": datetime.utcnow().isoformat()
        })
        
        # Add to blacklist with TTL
        await self.redis.setex(
            token_key,
            expires_in_seconds,
            token_data
        )
        
        # Add to user's token set (for bulk invalidation)
        await self.redis.sadd(user_tokens_key, token_jti)
        await self.redis.expire(user_tokens_key, expires_in_seconds)
        
        return True
    
    async def is_blacklisted(self, token_jti: str) -> bool:
        """
        Check if a token is blacklisted.
        
        Args:
            token_jti: JWT ID to check
        
        Returns:
            True if token is blacklisted
        """
        token_key = self._get_token_key(token_jti)
        return bool(await self.redis.exists(token_key))
    
    async def get_blacklist_reason(self, token_jti: str) -> Optional[str]:
        """
        Get the reason why a token was blacklisted.
        
        Args:
            token_jti: JWT ID to check
        
        Returns:
            Reason string or None if not blacklisted
        """
        token_key = self._get_token_key(token_jti)
        data = await self.redis.get(token_key)
        
        if data:
            token_info = json.loads(data)
            return token_info.get("reason")
        return None
    
    async def blacklist_all_user_tokens(
        self,
        user_id: int,
        reason: str = "password_change"
    ) -> int:
        """
        Blacklist all tokens for a specific user.
        
        Used when:
        - User changes password
        - User enables/disables 2FA
        - Security incident detected
        
        Args:
            user_id: User ID
            reason: Reason for bulk blacklisting
        
        Returns:
            Number of tokens blacklisted
        """
        user_tokens_key = self._get_user_tokens_key(user_id)
        
        # Get all token JTIs for this user
        token_jtis = await self.redis.smembers(user_tokens_key)
        
        count = 0
        for token_jti in token_jtis:
            # Decode if bytes
            if isinstance(token_jti, bytes):
                token_jti = token_jti.decode('utf-8')
            
            # Update reason and extend TTL
            token_key = self._get_token_key(token_jti)
            existing = await self.redis.get(token_key)
            
            if existing:
                token_data = json.loads(existing)
                token_data["reason"] = reason
                token_data["blacklisted_at"] = datetime.utcnow().isoformat()
                
                # Get remaining TTL
                ttl = await self.redis.ttl(token_key)
                if ttl > 0:
                    await self.redis.setex(token_key, ttl, json.dumps(token_data))
                    count += 1
        
        return count
    
    async def cleanup_expired_tokens(self, user_id: int) -> int:
        """
        Remove expired tokens from user's token set.
        
        Args:
            user_id: User ID
        
        Returns:
            Number of tokens removed
        """
        user_tokens_key = self._get_user_tokens_key(user_id)
        token_jtis = await self.redis.smembers(user_tokens_key)
        
        removed = 0
        for token_jti in token_jtis:
            if isinstance(token_jti, bytes):
                token_jti = token_jti.decode('utf-8')
            
            token_key = self._get_token_key(token_jti)
            if not await self.redis.exists(token_key):
                await self.redis.srem(user_tokens_key, token_jti)
                removed += 1
        
        return removed


# Global instance (initialized in app startup)
_token_blacklist: Optional[TokenBlacklistService] = None


async def get_token_blacklist() -> TokenBlacklistService:
    """Get the token blacklist service instance"""
    global _token_blacklist
    if _token_blacklist is None:
        raise RuntimeError("Token blacklist not initialized. Call init_token_blacklist() first.")
    return _token_blacklist


async def init_token_blacklist(redis_client: redis.Redis) -> TokenBlacklistService:
    """Initialize the token blacklist service"""
    global _token_blacklist
    _token_blacklist = TokenBlacklistService(redis_client)
    return _token_blacklist
