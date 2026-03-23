"""Reports + Dashboard endpoints — SavanaFlow."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import (
    Category, POSCustomer, Product, Sale, SaleItem, Shift, StoreTransfer, User,
)
from app.schemas.schemas import POSDashboard, SalesReport

router = APIRouter(prefix="/reports", tags=["Reports — Rapports"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ── Dashboard ──────────────────────────────────────────────────
@dashboard_router.get("/stats", response_model=POSDashboard)
async def get_stats(
    store_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def sales_filter(q):
        q = q.where(Sale.status == "COMPLETED")
        if store_id:
            q = q.where(Sale.store_id == store_id)
        return q

    sales_today = int((await db.execute(
        sales_filter(select(func.count()).select_from(Sale).where(Sale.created_at >= today))
    )).scalar() or 0)

    revenue_today = float((await db.execute(
        sales_filter(select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.created_at >= today))
    )).scalar() or 0)

    sales_month = int((await db.execute(
        sales_filter(select(func.count()).select_from(Sale).where(Sale.created_at >= month_start))
    )).scalar() or 0)

    revenue_month = float((await db.execute(
        sales_filter(select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.created_at >= month_start))
    )).scalar() or 0)

    low_stock = int((await db.execute(
        select(func.count()).select_from(Product).where(
            Product.is_active == True,
            Product.stock_quantity <= Product.low_stock_threshold,
            *([Product.store_id == store_id] if store_id else []),
        )
    )).scalar() or 0)

    # Active shift for current user
    active_shift_result = await db.execute(
        select(Shift).where(Shift.status == "OPEN", Shift.user_id == current_user.id,
                            *([Shift.store_id == store_id] if store_id else []))
    )
    active_shift_obj = active_shift_result.scalar_one_or_none()
    from app.schemas.schemas import ShiftOut
    active_shift = ShiftOut.model_validate(active_shift_obj) if active_shift_obj else None

    # Top products today
    top_q = (
        select(Product.name, func.sum(SaleItem.quantity).label("qty"), func.sum(SaleItem.line_total).label("revenue"))
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.created_at >= today, Sale.status == "COMPLETED",
               *([Sale.store_id == store_id] if store_id else []))
        .group_by(Product.id, Product.name)
        .order_by(func.sum(SaleItem.line_total).desc())
        .limit(5)
    )
    top_products = [
        {"name": r.name, "qty": float(r.qty), "revenue": round(float(r.revenue), 2)}
        for r in (await db.execute(top_q)).all()
    ]

    loyalty_count = int((await db.execute(
        select(func.count()).select_from(POSCustomer).where(POSCustomer.is_active == True)
    )).scalar() or 0)

    pending_transfers = int((await db.execute(
        select(func.count()).select_from(StoreTransfer).where(StoreTransfer.status.in_(["PENDING", "IN_TRANSIT"]))
    )).scalar() or 0)

    from app.models.all_models import PurchaseOrder
    pending_pos = int((await db.execute(
        select(func.count()).select_from(PurchaseOrder).where(PurchaseOrder.status.in_(["DRAFT", "SENT"]))
    )).scalar() or 0)

    return POSDashboard(
        sales_today=sales_today,
        revenue_today=round(revenue_today, 2),
        sales_this_month=sales_month,
        revenue_this_month=round(revenue_month, 2),
        low_stock_count=low_stock,
        active_shift=active_shift,
        top_products_today=top_products,
        loyalty_customers_count=loyalty_count,
        pending_transfers=pending_transfers,
        pending_pos=pending_pos,
    )


# ── Sales Report ────────────────────────────────────────────────
@router.get("/sales", response_model=SalesReport)
async def sales_report(
    period: str = Query("today", pattern="^(today|week|month|year|custom)$"),
    store_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = now - timedelta(days=7)
        end = now
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:  # custom
        start = date_from or now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = date_to or now

    q = select(Sale).where(Sale.created_at >= start, Sale.created_at <= end, Sale.status == "COMPLETED")
    if store_id:
        q = q.where(Sale.store_id == store_id)

    sales = (await db.execute(q)).scalars().all()

    total_revenue = sum(float(s.total_amount) for s in sales)
    total_cost = sum(
        sum(float(item.cost_price) * float(item.quantity) for item in s.items)
        for s in sales
    )
    gross_margin = round(total_revenue - total_cost, 2)
    gross_margin_pct = round(gross_margin / total_revenue * 100, 2) if total_revenue > 0 else 0

    # By payment method
    pm_map: dict = {}
    for s in sales:
        pm_map[s.payment_method] = pm_map.get(s.payment_method, 0) + float(s.total_amount)
    by_pm = [{"method": k, "revenue": round(v, 2)} for k, v in sorted(pm_map.items(), key=lambda x: -x[1])]

    # Top products
    prod_map: dict = {}
    for s in sales:
        for item in s.items:
            pid = item.product_id
            if pid not in prod_map:
                prod_map[pid] = {"product_id": pid, "name": item.product.name, "qty": 0.0, "revenue": 0.0, "cost": 0.0}
            prod_map[pid]["qty"] += float(item.quantity)
            prod_map[pid]["revenue"] += float(item.line_total)
            prod_map[pid]["cost"] += float(item.cost_price) * float(item.quantity)
    top_products = sorted(prod_map.values(), key=lambda x: x["revenue"], reverse=True)[:10]

    # By category
    cat_map: dict = {}
    for s in sales:
        for item in s.items:
            cat = item.product.category.name if item.product.category else "Sans catégorie"
            cat_map[cat] = cat_map.get(cat, 0) + float(item.line_total)
    by_category = [{"category": k, "revenue": round(v, 2)} for k, v in sorted(cat_map.items(), key=lambda x: -x[1])]

    # By hour (only meaningful for today/week)
    hour_map: dict = {h: 0.0 for h in range(24)}
    for s in sales:
        h = s.created_at.hour
        hour_map[h] += float(s.total_amount)
    by_hour = [{"hour": h, "revenue": round(v, 2)} for h, v in hour_map.items()]

    return SalesReport(
        period=period,
        total_sales=len(sales),
        total_revenue=round(total_revenue, 2),
        total_cost=round(total_cost, 2),
        gross_margin=gross_margin,
        gross_margin_pct=gross_margin_pct,
        by_payment_method=by_pm,
        top_products=top_products,
        by_category=by_category,
        by_hour=by_hour,
    )


@router.get("/sales/monthly", response_model=list[dict])
async def monthly_sales(
    year: int | None = None, store_id: int | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    y = year or datetime.now(timezone.utc).year
    q = (
        select(
            extract("month", Sale.created_at).label("month"),
            func.count(Sale.id).label("count"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("revenue"),
        )
        .where(extract("year", Sale.created_at) == y, Sale.status == "COMPLETED")
        .group_by(extract("month", Sale.created_at))
        .order_by(extract("month", Sale.created_at))
    )
    if store_id:
        q = q.where(Sale.store_id == store_id)
    result = await db.execute(q)
    months = {int(r.month): {"count": r.count, "revenue": round(float(r.revenue), 2)} for r in result.all()}
    return [{"month": m, "count": months.get(m, {}).get("count", 0), "revenue": months.get(m, {}).get("revenue", 0.0)} for m in range(1, 13)]


@router.get("/stock/valuation", response_model=dict)
async def stock_valuation(
    store_id: int | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    """Stock valuation by cost price."""
    q = select(
        Product.name,
        Product.stock_quantity,
        Product.cost_price,
        (Product.stock_quantity * Product.cost_price).label("value"),
    ).where(Product.is_active == True, Product.stock_quantity > 0)
    if store_id:
        q = q.where(Product.store_id == store_id)

    result = await db.execute(q)
    rows = result.all()
    total_value = sum(float(r.value or 0) for r in rows)
    items = [
        {"name": r.name, "qty": float(r.stock_quantity), "cost": float(r.cost_price), "value": round(float(r.value or 0), 2)}
        for r in sorted(rows, key=lambda x: float(x.value or 0), reverse=True)
    ]
    return {"total_value": round(total_value, 2), "item_count": len(items), "items": items[:50]}


@router.get("/loyalty/summary", response_model=dict)
async def loyalty_summary(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Loyalty program analytics."""
    tier_counts = await db.execute(
        select(POSCustomer.loyalty_tier, func.count(POSCustomer.id).label("count"),
               func.sum(POSCustomer.total_spent).label("spent"))
        .where(POSCustomer.is_active == True)
        .group_by(POSCustomer.loyalty_tier)
    )
    by_tier = [{"tier": r.loyalty_tier, "count": r.count, "total_spent": round(float(r.spent or 0), 2)}
               for r in tier_counts.all()]

    total_points = int((await db.execute(
        select(func.coalesce(func.sum(POSCustomer.loyalty_points), 0)).where(POSCustomer.is_active == True)
    )).scalar() or 0)

    top_customers = await db.execute(
        select(POSCustomer.name, POSCustomer.loyalty_points, POSCustomer.total_spent, POSCustomer.loyalty_tier)
        .where(POSCustomer.is_active == True)
        .order_by(POSCustomer.total_spent.desc())
        .limit(10)
    )
    return {
        "by_tier": by_tier,
        "total_points_outstanding": total_points,
        "top_customers": [
            {"name": r.name, "points": r.loyalty_points, "spent": round(float(r.total_spent), 2), "tier": r.loyalty_tier}
            for r in top_customers.all()
        ],
    }
