"""API Key Service Layer.

Provides business logic for:
- API Key CRUD operations
- Usage statistics
- Webhook management
- Webhook delivery
"""
from __future__ import annotations

import hashlib
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.api_key import APIKey, APIKeyUsage, WebhookEndpoint, WebhookDelivery
from app.schemas.api_key import (
    APIKeyCreate, APIKeyUpdate,
    WebhookEndpointCreate, WebhookEndpointUpdate,
)


class APIKeyService:
    """Service for API key management."""
    
    @staticmethod
    def generate_key() -> tuple[str, str, str]:
        """Generate a new API key.
        
        Returns:
            Tuple of (full_key, key_prefix, secret)
        """
        # Generate 32 bytes of random data
        key_bytes = secrets.token_bytes(32)
        key = "fp_" + hashlib.sha256(key_bytes).hexdigest()[:48]  # fp_ prefix for FacturePro
        key_prefix = key[:8]  # fp_xxxxxx
        
        # Generate secret for HMAC signatures
        secret = secrets.token_hex(32)
        
        return key, key_prefix, secret
    
    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        user_id: int,
        data: APIKeyCreate,
    ) -> APIKey:
        """Create a new API key.
        
        Args:
            db: Database session
            organisation_id: Organisation ID
            user_id: User ID creating the key
            data: API key creation data
            
        Returns:
            Created APIKey with full key (only time key is visible)
        """
        key, key_prefix, secret = APIKeyService.generate_key()
        
        api_key = APIKey(
            organisation_id=organisation_id,
            name=data.name,
            description=data.description,
            key=key,
            key_prefix=key_prefix,
            secret=secret,
            scopes=data.scopes,
            rate_limit=data.rate_limit,
            expires_at=data.expires_at,
            created_by=user_id,
        )
        
        db.add(api_key)
        await db.flush()
        await db.refresh(api_key)
        
        return api_key
    
    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        key_id: int,
        organisation_id: int,
    ) -> Optional[APIKey]:
        """Get API key by ID within organisation."""
        result = await db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.organisation_id == organisation_id,
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_by_organisation(
        db: AsyncSession,
        organisation_id: int,
        include_inactive: bool = False,
    ) -> list[APIKey]:
        """List all API keys for an organisation."""
        query = select(APIKey).where(APIKey.organisation_id == organisation_id)
        
        if not include_inactive:
            query = query.where(APIKey.is_active == True)
        
        query = query.order_by(APIKey.created_at.desc())
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def update(
        db: AsyncSession,
        key_id: int,
        organisation_id: int,
        data: APIKeyUpdate,
    ) -> Optional[APIKey]:
        """Update an API key."""
        api_key = await APIKeyService.get_by_id(db, key_id, organisation_id)
        
        if not api_key:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(api_key, field, value)
        
        await db.flush()
        await db.refresh(api_key)
        
        return api_key
    
    @staticmethod
    async def delete(
        db: AsyncSession,
        key_id: int,
        organisation_id: int,
    ) -> bool:
        """Delete an API key (soft delete by setting is_active=False)."""
        api_key = await APIKeyService.get_by_id(db, key_id, organisation_id)
        
        if not api_key:
            return False
        
        api_key.is_active = False
        await db.flush()
        
        return True
    
    @staticmethod
    async def regenerate(
        db: AsyncSession,
        key_id: int,
        organisation_id: int,
    ) -> Optional[APIKey]:
        """Regenerate an API key (generates new key and secret)."""
        api_key = await APIKeyService.get_by_id(db, key_id, organisation_id)
        
        if not api_key:
            return None
        
        key, key_prefix, secret = APIKeyService.generate_key()
        
        api_key.key = key
        api_key.key_prefix = key_prefix
        api_key.secret = secret
        
        await db.flush()
        await db.refresh(api_key)
        
        return api_key
    
    @staticmethod
    async def get_usage_stats(
        db: AsyncSession,
        key_id: int,
        organisation_id: int,
        days: int = 30,
    ) -> dict:
        """Get usage statistics for an API key."""
        api_key = await APIKeyService.get_by_id(db, key_id, organisation_id)
        
        if not api_key:
            return None
        
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        # Total requests
        total_result = await db.execute(
            select(func.count(APIKeyUsage.id)).where(
                APIKeyUsage.api_key_id == key_id,
                APIKeyUsage.created_at >= start_date,
            )
        )
        total_requests = total_result.scalar() or 0
        
        # Successful requests
        success_result = await db.execute(
            select(func.count(APIKeyUsage.id)).where(
                APIKeyUsage.api_key_id == key_id,
                APIKeyUsage.created_at >= start_date,
                APIKeyUsage.status_code >= 200,
                APIKeyUsage.status_code < 400,
            )
        )
        successful_requests = success_result.scalar() or 0
        
        # Average response time
        avg_result = await db.execute(
            select(func.avg(APIKeyUsage.response_time_ms)).where(
                APIKeyUsage.api_key_id == key_id,
                APIKeyUsage.created_at >= start_date,
            )
        )
        avg_response_time = avg_result.scalar() or 0
        
        # Requests by endpoint
        endpoints_result = await db.execute(
            select(
                APIKeyUsage.endpoint,
                func.count(APIKeyUsage.id).label("count"),
            ).where(
                APIKeyUsage.api_key_id == key_id,
                APIKeyUsage.created_at >= start_date,
            ).group_by(APIKeyUsage.endpoint)
        )
        requests_by_endpoint = {row.endpoint: row.count for row in endpoints_result}
        
        # Requests by status code
        status_result = await db.execute(
            select(
                APIKeyUsage.status_code,
                func.count(APIKeyUsage.id).label("count"),
            ).where(
                APIKeyUsage.api_key_id == key_id,
                APIKeyUsage.created_at >= start_date,
            ).group_by(APIKeyUsage.status_code)
        )
        requests_by_status = {row.status_code: row.count for row in status_result}
        
        # Requests in last 24h
        last_24h = now - timedelta(hours=24)
        result_24h = await db.execute(
            select(func.count(APIKeyUsage.id)).where(
                APIKeyUsage.api_key_id == key_id,
                APIKeyUsage.created_at >= last_24h,
            )
        )
        requests_last_24h = result_24h.scalar() or 0
        
        # Requests in last 7 days
        last_7d = now - timedelta(days=7)
        result_7d = await db.execute(
            select(func.count(APIKeyUsage.id)).where(
                APIKeyUsage.api_key_id == key_id,
                APIKeyUsage.created_at >= last_7d,
            )
        )
        requests_last_7d = result_7d.scalar() or 0
        
        return {
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "failed_requests": total_requests - successful_requests,
            "avg_response_time_ms": float(avg_response_time),
            "requests_by_endpoint": requests_by_endpoint,
            "requests_by_status": requests_by_status,
            "requests_last_24h": requests_last_24h,
            "requests_last_7d": requests_last_7d,
            "requests_last_30d": total_requests,
        }
    
    @staticmethod
    async def list_usage(
        db: AsyncSession,
        key_id: int,
        organisation_id: int,
        page: int = 1,
        per_page: int = 50,
    ) -> tuple[list[APIKeyUsage], int]:
        """List usage logs for an API key."""
        # Verify key belongs to organisation
        api_key = await APIKeyService.get_by_id(db, key_id, organisation_id)
        if not api_key:
            return [], 0
        
        # Count total
        count_result = await db.execute(
            select(func.count(APIKeyUsage.id)).where(
                APIKeyUsage.api_key_id == key_id,
            )
        )
        total = count_result.scalar() or 0
        
        # Get paginated results
        offset = (page - 1) * per_page
        result = await db.execute(
            select(APIKeyUsage).where(
                APIKeyUsage.api_key_id == key_id,
            ).order_by(
                APIKeyUsage.created_at.desc()
            ).offset(offset).limit(per_page)
        )
        items = list(result.scalars().all())
        
        return items, total


class WebhookService:
    """Service for webhook management."""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate a webhook secret for signature verification."""
        return secrets.token_hex(32)
    
    @staticmethod
    async def create(
        db: AsyncSession,
        organisation_id: int,
        user_id: int,
        data: WebhookEndpointCreate,
    ) -> WebhookEndpoint:
        """Create a new webhook endpoint."""
        secret = WebhookService.generate_secret()
        
        webhook = WebhookEndpoint(
            organisation_id=organisation_id,
            name=data.name,
            url=data.url,
            secret=secret,
            events=data.events,
            created_by=user_id,
        )
        
        db.add(webhook)
        await db.flush()
        await db.refresh(webhook)
        
        return webhook
    
    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        webhook_id: int,
        organisation_id: int,
    ) -> Optional[WebhookEndpoint]:
        """Get webhook by ID within organisation."""
        result = await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.id == webhook_id,
                WebhookEndpoint.organisation_id == organisation_id,
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_by_organisation(
        db: AsyncSession,
        organisation_id: int,
        include_inactive: bool = False,
    ) -> list[WebhookEndpoint]:
        """List all webhooks for an organisation."""
        query = select(WebhookEndpoint).where(
            WebhookEndpoint.organisation_id == organisation_id
        )
        
        if not include_inactive:
            query = query.where(WebhookEndpoint.is_active == True)
        
        query = query.order_by(WebhookEndpoint.created_at.desc())
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def update(
        db: AsyncSession,
        webhook_id: int,
        organisation_id: int,
        data: WebhookEndpointUpdate,
    ) -> Optional[WebhookEndpoint]:
        """Update a webhook endpoint."""
        webhook = await WebhookService.get_by_id(db, webhook_id, organisation_id)
        
        if not webhook:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(webhook, field, value)
        
        await db.flush()
        await db.refresh(webhook)
        
        return webhook
    
    @staticmethod
    async def delete(
        db: AsyncSession,
        webhook_id: int,
        organisation_id: int,
    ) -> bool:
        """Delete a webhook endpoint."""
        webhook = await WebhookService.get_by_id(db, webhook_id, organisation_id)
        
        if not webhook:
            return False
        
        await db.delete(webhook)
        await db.flush()
        
        return True
    
    @staticmethod
    async def get_endpoints_for_event(
        db: AsyncSession,
        organisation_id: int,
        event_type: str,
    ) -> list[WebhookEndpoint]:
        """Get all active webhook endpoints that subscribe to an event."""
        result = await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.organisation_id == organisation_id,
                WebhookEndpoint.is_active == True,
                WebhookEndpoint.events.contains([event_type]),
            )
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def record_delivery(
        db: AsyncSession,
        webhook_id: int,
        event_type: str,
        payload: dict,
        status_code: int,
        response_body: str,
        response_time_ms: int,
        success: bool,
        error_message: str = None,
        attempt_number: int = 1,
    ) -> WebhookDelivery:
        """Record a webhook delivery attempt."""
        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            event_type=event_type,
            payload=payload,
            status_code=status_code,
            response_body=response_body[:10000] if response_body else None,  # Truncate
            response_time_ms=response_time_ms,
            success=success,
            error_message=error_message,
            attempt_number=attempt_number,
        )
        
        db.add(delivery)
        
        # Update webhook status
        webhook_result = await db.execute(
            select(WebhookEndpoint).where(WebhookEndpoint.id == webhook_id)
        )
        webhook = webhook_result.scalar_one_or_none()
        
        if webhook:
            webhook.last_triggered_at = datetime.now(timezone.utc)
            
            if success:
                webhook.consecutive_failures = 0
            else:
                webhook.consecutive_failures += 1
                webhook.last_failure_at = datetime.now(timezone.utc)
                
                # Disable after 5 consecutive failures
                if webhook.consecutive_failures >= 5:
                    webhook.is_active = False
        
        await db.flush()
        return delivery
    
    @staticmethod
    async def list_deliveries(
        db: AsyncSession,
        webhook_id: int,
        organisation_id: int,
        page: int = 1,
        per_page: int = 50,
    ) -> tuple[list[WebhookDelivery], int]:
        """List delivery logs for a webhook."""
        # Verify webhook belongs to organisation
        webhook = await WebhookService.get_by_id(db, webhook_id, organisation_id)
        if not webhook:
            return [], 0
        
        # Count total
        count_result = await db.execute(
            select(func.count(WebhookDelivery.id)).where(
                WebhookDelivery.webhook_id == webhook_id,
            )
        )
        total = count_result.scalar() or 0
        
        # Get paginated results
        offset = (page - 1) * per_page
        result = await db.execute(
            select(WebhookDelivery).where(
                WebhookDelivery.webhook_id == webhook_id,
            ).order_by(
                WebhookDelivery.created_at.desc()
            ).offset(offset).limit(per_page)
        )
        items = list(result.scalars().all())
        
        return items, total
    
    @staticmethod
    def compute_signature(secret: str, payload: str) -> str:
        """Compute HMAC signature for webhook payload."""
        return hashlib.sha256(
            f"{secret}.{payload}".encode()
        ).hexdigest()
