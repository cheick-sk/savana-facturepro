"""Tenant management Celery tasks for FacturePro.
- Reset monthly quotas
- Check subscription expiry
- Cleanup audit logs
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_app import celery_app
from app.core.database import AsyncSessionLocal


@celery_app.task(bind=True, name="app.tasks.tenant.reset_monthly_quotas")
def reset_monthly_quotas(self):
    """Reset monthly usage quotas for all organisations.
    Runs on 1st of each month at midnight UTC.
    """
    return asyncio.run(_reset_monthly_quotas_async())


async def _reset_monthly_quotas_async():
    """Async implementation of quota reset."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year
        
        # Reset usage quotas for all organisations
        # This creates new quota records for the current month
        
        from app.models.all_models import Organisation, UsageQuota
        
        stmt = select(Organisation).where(Organisation.is_active == True)
        result = await db.execute(stmt)
        organisations = result.scalars().all()
        
        reset_count = 0
        
        for org in organisations:
            # Check if quota record exists for current month
            quota_stmt = select(UsageQuota).where(
                and_(
                    UsageQuota.organisation_id == org.id,
                    UsageQuota.year == current_year,
                    UsageQuota.month == current_month
                )
            )
            quota_result = await db.execute(quota_stmt)
            existing_quota = quota_result.scalar_one_or_none()
            
            if not existing_quota:
                # Create new quota record
                new_quota = UsageQuota(
                    organisation_id=org.id,
                    year=current_year,
                    month=current_month,
                    invoices_count=0,
                    quotes_count=0,
                    users_count=0,
                    products_count=0,
                    stores_count=0,
                    customers_count=0,
                    storage_used_mb=0.0
                )
                db.add(new_quota)
                reset_count += 1
        
        await db.commit()
        
        return {
            "reset_count": reset_count,
            "month": current_month,
            "year": current_year,
            "timestamp": now.isoformat()
        }


@celery_app.task(bind=True, name="app.tasks.tenant.check_subscription_expiry")
def check_subscription_expiry(self):
    """Check for expiring/expired subscriptions and handle accordingly.
    Runs daily at 00:30 UTC.
    """
    return asyncio.run(_check_subscription_expiry_async())


async def _check_subscription_expiry_async():
    """Async implementation of subscription expiry check."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        
        from app.models.all_models import Organisation, Subscription, Plan
        
        # Find subscriptions expiring in the next 7 days
        warning_date = now + timedelta(days=7)
        
        expiring_stmt = select(Subscription).where(
            and_(
                Subscription.status == "active",
                Subscription.current_period_end <= warning_date,
                Subscription.current_period_end > now
            )
        )
        expiring_result = await db.execute(expiring_stmt)
        expiring_subscriptions = expiring_result.scalars().all()
        
        # Send expiry warnings
        warnings_sent = 0
        for subscription in expiring_subscriptions:
            try:
                await _send_expiry_warning(db, subscription)
                warnings_sent += 1
            except Exception as e:
                print(f"Error sending expiry warning for subscription {subscription.id}: {e}")
        
        # Find expired subscriptions
        expired_stmt = select(Subscription).where(
            and_(
                Subscription.status == "active",
                Subscription.current_period_end <= now
            )
        )
        expired_result = await db.execute(expired_stmt)
        expired_subscriptions = expired_result.scalars().all()
        
        # Handle expired subscriptions
        expired_count = 0
        for subscription in expired_subscriptions:
            try:
                # Downgrade to starter plan
                subscription.status = "expired"
                
                # Get organisation
                org_stmt = select(Organisation).where(
                    Organisation.id == subscription.organisation_id
                )
                org_result = await db.execute(org_stmt)
                organisation = org_result.scalar_one()
                
                # Downgrade to starter
                organisation.plan = "starter"
                
                expired_count += 1
                
            except Exception as e:
                print(f"Error handling expired subscription {subscription.id}: {e}")
        
        await db.commit()
        
        return {
            "warnings_sent": warnings_sent,
            "expired_count": expired_count,
            "timestamp": now.isoformat()
        }


async def _send_expiry_warning(db: AsyncSession, subscription):
    """Send subscription expiry warning to organisation admin."""
    from app.models.all_models import Organisation, User
    from shared.libs.notifications.notification_service import get_notification_service
    
    # Get organisation
    org_stmt = select(Organisation).where(Organisation.id == subscription.organisation_id)
    org_result = await db.execute(org_stmt)
    organisation = org_result.scalar_one()
    
    # Get admin user
    user_stmt = select(User).where(
        and_(
            User.organisation_id == organisation.id,
            User.role == "admin"
        )
    ).limit(1)
    user_result = await db.execute(user_stmt)
    admin = user_result.scalar_one_or_none()
    
    if not admin:
        return
    
    notification_service = get_notification_service()
    
    days_remaining = (subscription.current_period_end - datetime.now(timezone.utc)).days
    
    body = f"Votre abonnement {organisation.plan} expire dans {days_remaining} jour(s).\n\n"
    body += f"Renouvelez maintenant pour continuer à profiter de toutes les fonctionnalités."
    
    await notification_service.send(
        notification_service.NotificationMessage(
            to=admin.email,
            subject=f"Votre abonnement expire dans {days_remaining} jour(s)",
            body=body,
            notification_type=notification_service.NotificationType.SUBSCRIPTION_EXPIRED
        )
    )


@celery_app.task(bind=True, name="app.tasks.tenant.cleanup_audit_logs")
def cleanup_audit_logs(self, days_to_keep: int = 90):
    """Cleanup old audit logs.
    Runs weekly on Sundays at 2 AM UTC.
    
    Args:
        days_to_keep: Number of days to keep logs (default 90)
    """
    return asyncio.run(_cleanup_audit_logs_async(days_to_keep))


async def _cleanup_audit_logs_async(days_to_keep: int):
    """Async implementation of audit log cleanup."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        cutoff_date = now - timedelta(days=days_to_keep)
        
        from app.models.all_models import AuditLog
        
        # Delete old audit logs
        stmt = delete(AuditLog).where(AuditLog.created_at < cutoff_date)
        result = await db.execute(stmt)
        deleted_count = result.rowcount
        
        await db.commit()
        
        return {
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
            "timestamp": now.isoformat()
        }


@celery_app.task(bind=True, name="app.tasks.tenant.update_usage_quota")
def update_usage_quota(self, organisation_id: int, quota_type: str, increment: int = 1):
    """Update usage quota for an organisation.
    
    Args:
        organisation_id: Organisation ID
        quota_type: Type of quota to update (invoices_count, users_count, etc.)
        increment: Amount to increment (default 1)
    """
    return asyncio.run(_update_usage_quota_async(organisation_id, quota_type, increment))


async def _update_usage_quota_async(organisation_id: int, quota_type: str, increment: int):
    """Async implementation of quota update."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year
        
        from app.models.all_models import UsageQuota
        
        # Get or create quota record
        stmt = select(UsageQuota).where(
            and_(
                UsageQuota.organisation_id == organisation_id,
                UsageQuota.year == current_year,
                UsageQuota.month == current_month
            )
        )
        result = await db.execute(stmt)
        quota = result.scalar_one_or_none()
        
        if not quota:
            quota = UsageQuota(
                organisation_id=organisation_id,
                year=current_year,
                month=current_month
            )
            db.add(quota)
            await db.flush()
        
        # Update the specific quota
        current_value = getattr(quota, quota_type, 0) or 0
        setattr(quota, quota_type, current_value + increment)
        
        await db.commit()
        
        return {
            "organisation_id": organisation_id,
            "quota_type": quota_type,
            "new_value": getattr(quota, quota_type),
            "timestamp": now.isoformat()
        }


@celery_app.task(bind=True, name="app.tasks.tenant.check_quota_limits")
def check_quota_limits(self, organisation_id: int, quota_type: str, requested_value: int = 1):
    """Check if organisation has exceeded quota limits.
    
    Args:
        organisation_id: Organisation ID
        quota_type: Type of quota to check
        requested_value: Value being requested
        
    Returns:
        Dict with is_within_limit boolean and current usage info
    """
    return asyncio.run(_check_quota_limits_async(organisation_id, quota_type, requested_value))


async def _check_quota_limits_async(organisation_id: int, quota_type: str, requested_value: int):
    """Async implementation of quota limit check."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year
        
        from app.models.all_models import Organisation, Plan, UsageQuota
        
        # Get organisation
        org_stmt = select(Organisation).where(Organisation.id == organisation_id)
        org_result = await db.execute(org_stmt)
        organisation = org_result.scalar_one()
        
        # Get plan limits
        plan_stmt = select(Plan).where(Plan.code == organisation.plan)
        plan_result = await db.execute(plan_stmt)
        plan = plan_result.scalar_one_or_none()
        
        if not plan:
            return {"error": "Plan not found"}
        
        # Get current usage
        quota_stmt = select(UsageQuota).where(
            and_(
                UsageQuota.organisation_id == organisation_id,
                UsageQuota.year == current_year,
                UsageQuota.month == current_month
            )
        )
        quota_result = await db.execute(quota_stmt)
        quota = quota_result.scalar_one_or_none()
        
        current_usage = getattr(quota, quota_type, 0) if quota else 0
        
        # Get plan limit
        limit_mapping = {
            "invoices_count": plan.max_invoices_month,
            "users_count": plan.max_users,
            "products_count": plan.max_products,
            "stores_count": plan.max_stores,
            "customers_count": plan.max_customers,
        }
        
        limit = limit_mapping.get(quota_type, -1)  # -1 means unlimited
        
        # Check if within limit
        is_within_limit = limit == -1 or (current_usage + requested_value) <= limit
        
        return {
            "organisation_id": organisation_id,
            "quota_type": quota_type,
            "current_usage": current_usage,
            "requested_value": requested_value,
            "limit": limit,
            "is_within_limit": is_within_limit,
            "percentage_used": round((current_usage / limit) * 100, 1) if limit > 0 else 0
        }
