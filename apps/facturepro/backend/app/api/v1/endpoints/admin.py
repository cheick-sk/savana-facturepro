"""Admin Dashboard API endpoints for SaaS management.
Provides endpoints for managing organisations, subscriptions, and system health.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class OrganisationSummary(BaseModel):
    id: int
    name: str
    slug: str
    plan: str
    status: str
    users_count: int
    created_at: datetime
    subscription_status: Optional[str] = None
    monthly_revenue: Optional[float] = None


class SubscriptionStats(BaseModel):
    total_organisations: int
    active_subscriptions: int
    trial_subscriptions: int
    churned_subscriptions: int
    monthly_recurring_revenue: float
    revenue_by_plan: dict
    revenue_by_country: dict


class SystemHealth(BaseModel):
    database: str
    redis: str
    celery_workers: int
    pending_tasks: int
    failed_tasks_24h: int


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN DEPENDENCY
# ─────────────────────────────────────────────────────────────────────────────

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify current user is an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=dict)
async def get_admin_dashboard(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard overview.
    
    Returns key metrics for SaaS management:
    - Total organisations
    - Active subscriptions
    - MRR (Monthly Recurring Revenue)
    - Recent signups
    """
    from shared.libs.models.tenant import Organisation, Subscription, Plan
    
    # Total organisations
    total_orgs = await db.scalar(select(func.count(Organisation.id)))
    
    # Active subscriptions
    active_subs = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    )
    
    # Trial subscriptions
    trial_subs = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == "trial")
    )
    
    # Calculate MRR
    result = await db.execute(
        select(Plan.price_monthly, func.count(Subscription.id))
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(Subscription.status == "active")
        .group_by(Plan.id)
    )
    
    mrr = 0
    revenue_by_plan = {}
    for row in result:
        mrr += row[0] * row[1]
        revenue_by_plan[row[0]] = row[1]
    
    # Recent signups (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_signups = await db.scalar(
        select(func.count(Organisation.id))
        .where(Organisation.created_at >= week_ago)
    )
    
    # Organisations by country
    result = await db.execute(
        select(Organisation.country, func.count(Organisation.id))
        .group_by(Organisation.country)
    )
    orgs_by_country = {row[0]: row[1] for row in result}
    
    return {
        "total_organisations": total_orgs or 0,
        "active_subscriptions": active_subs or 0,
        "trial_subscriptions": trial_subs or 0,
        "monthly_recurring_revenue": mrr,
        "recent_signups_7d": recent_signups or 0,
        "organisations_by_country": orgs_by_country,
        "revenue_by_plan": revenue_by_plan,
    }


@router.get("/organisations", response_model=List[dict])
async def list_organisations(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    plan: Optional[str] = None,
    search: Optional[str] = None
):
    """List all organisations with filtering and pagination.
    
    Supports filtering by:
    - Status (active, trial, churned, suspended)
    - Plan (starter, pro, business, enterprise)
    - Search (name, email)
    """
    from shared.libs.models.tenant import Organisation, Subscription, Plan
    
    query = select(Organisation)
    
    # Apply filters
    if status:
        query = query.where(Organisation.status == status)
    
    if search:
        query = query.where(
            or_(
                Organisation.name.ilike(f"%{search}%"),
                Organisation.email.ilike(f"%{search}%")
            )
        )
    
    query = query.offset(skip).limit(limit).order_by(Organisation.created_at.desc())
    
    result = await db.execute(query)
    organisations = result.scalars().all()
    
    org_list = []
    for org in organisations:
        # Get subscription info
        sub_query = select(Subscription, Plan).join(Plan).where(
            Subscription.organisation_id == org.id
        )
        sub_result = await db.execute(sub_query)
        sub = sub_result.first()
        
        org_data = {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "email": org.email,
            "country": org.country,
            "currency": org.currency,
            "status": org.status,
            "created_at": org.created_at.isoformat() if org.created_at else None,
            "plan": sub[1].name if sub else None,
            "subscription_status": sub[0].status if sub else None,
        }
        org_list.append(org_data)
    
    return org_list


@router.get("/organisations/{org_id}", response_model=dict)
async def get_organisation_details(
    org_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about an organisation."""
    from shared.libs.models.tenant import Organisation, Subscription, Plan, UsageQuota
    
    org = await db.get(Organisation, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    
    # Get subscription
    sub_result = await db.execute(
        select(Subscription, Plan)
        .join(Plan)
        .where(Subscription.organisation_id == org_id)
    )
    sub = sub_result.first()
    
    # Get usage
    usage_result = await db.execute(
        select(UsageQuota).where(UsageQuota.organisation_id == org_id)
    )
    usage = usage_result.scalars().all()
    
    # Get users count
    users_count = await db.scalar(
        select(func.count(User.id)).where(User.organisation_id == org_id)
    )
    
    return {
        "organisation": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "email": org.email,
            "phone": org.phone,
            "country": org.country,
            "city": org.city,
            "currency": org.currency,
            "status": org.status,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        },
        "subscription": {
            "plan": sub[1].name if sub else None,
            "plan_price": sub[1].price_monthly if sub else None,
            "status": sub[0].status if sub else None,
            "current_period_start": sub[0].current_period_start.isoformat() if sub and sub[0].current_period_start else None,
            "current_period_end": sub[0].current_period_end.isoformat() if sub and sub[0].current_period_end else None,
        },
        "usage": {u.feature: {"used": u.used, "limit": u.limit} for u in usage},
        "users_count": users_count or 0,
    }


@router.post("/organisations/{org_id}/upgrade")
async def upgrade_organisation_plan(
    org_id: int,
    plan_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually upgrade an organisation's plan."""
    from shared.libs.models.tenant import Organisation, Subscription, Plan
    
    org = await db.get(Organisation, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Update or create subscription
    sub_result = await db.execute(
        select(Subscription).where(Subscription.organisation_id == org_id)
    )
    subscription = sub_result.scalar_one_or_none()
    
    if subscription:
        subscription.plan_id = plan_id
        subscription.status = "active"
    else:
        subscription = Subscription(
            organisation_id=org_id,
            plan_id=plan_id,
            status="active",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(subscription)
    
    await db.commit()
    
    return {"message": f"Organisation upgraded to {plan.name}"}


@router.post("/organisations/{org_id}/suspend")
async def suspend_organisation(
    org_id: int,
    reason: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Suspend an organisation."""
    from shared.libs.models.tenant import Organisation
    
    org = await db.get(Organisation, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    
    org.status = "suspended"
    org.suspended_at = datetime.now(timezone.utc)
    org.suspension_reason = reason
    
    await db.commit()
    
    return {"message": "Organisation suspended", "reason": reason}


@router.get("/revenue", response_model=dict)
async def get_revenue_report(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get revenue report for a period."""
    from shared.libs.models.tenant import Organisation, Subscription, Plan
    
    # Default to current month
    if not start_date:
        start_date = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    if not end_date:
        end_date = datetime.now(timezone.utc)
    
    # Calculate MRR by plan
    result = await db.execute(
        select(Plan.name, Plan.price_monthly, func.count(Subscription.id))
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(Subscription.status == "active")
        .group_by(Plan.id)
    )
    
    mrr_by_plan = {}
    total_mrr = 0
    
    for row in result:
        plan_name, price, count = row
        revenue = price * count
        mrr_by_plan[plan_name] = {
            "subscribers": count,
            "price_per_month": price,
            "monthly_revenue": revenue
        }
        total_mrr += revenue
    
    # Calculate ARR (Annual Recurring Revenue)
    arr = total_mrr * 12
    
    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "monthly_recurring_revenue": total_mrr,
        "annual_recurring_revenue": arr,
        "mrr_by_plan": mrr_by_plan,
        "currency": "XOF",
    }


@router.get("/system/health", response_model=SystemHealth)
async def get_system_health(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system health status."""
    import redis.asyncio as redis
    from app.core.config import get_settings
    
    settings = get_settings()
    
    # Check database
    try:
        await db.execute(select(1))
        db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Check Redis
    redis_status = "not_configured"
    pending_tasks = 0
    
    if settings.REDIS_URL:
        try:
            r = redis.from_url(settings.REDIS_URL)
            await r.ping()
            redis_status = "healthy"
            
            # Get pending Celery tasks
            pending_tasks = await r.llen("celery")
            await r.close()
        except Exception as e:
            redis_status = f"error: {str(e)}"
    
    return SystemHealth(
        database=db_status,
        redis=redis_status,
        celery_workers=0,  # Would need Celery inspect
        pending_tasks=pending_tasks,
        failed_tasks_24h=0  # Would need to query Celery results
    )


@router.get("/users", response_model=List[dict])
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """List all users across all organisations."""
    
    result = await db.execute(
        select(User)
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "role": u.role,
            "is_active": u.is_active,
            "two_factor_enabled": getattr(u, 'two_factor_enabled', False),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if hasattr(u, 'last_login') and u.last_login else None,
        }
        for u in users
    ]
