"""Dashboard stats endpoint — FacturePro Africa."""
from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Customer, Expense, Invoice, InvoiceItem, User
from app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month
    last_month = m - 1 if m > 1 else 12
    last_month_year = y if m > 1 else y - 1

    async def revenue_for(year, month):
        res = await db.execute(
            select(func.coalesce(func.sum(Invoice.amount_paid), 0)).where(
                Invoice.status.in_(["PAID", "PARTIAL"]),
                extract("year", Invoice.issue_date) == year,
                extract("month", Invoice.issue_date) == month,
            )
        )
        return float(res.scalar() or 0)

    async def count_status(status):
        res = await db.execute(select(func.count()).select_from(Invoice).where(Invoice.status == status))
        return int(res.scalar() or 0)

    rev_this = await revenue_for(y, m)
    rev_last = await revenue_for(last_month_year, last_month)
    total_rev = float((await db.execute(
        select(func.coalesce(func.sum(Invoice.amount_paid), 0)).where(Invoice.status.in_(["PAID", "PARTIAL"]))
    )).scalar() or 0)

    growth = round((rev_this - rev_last) / rev_last * 100, 1) if rev_last > 0 else 0.0

    outstanding = float((await db.execute(
        select(func.coalesce(func.sum(Invoice.total_amount - Invoice.amount_paid), 0))
        .where(Invoice.status.in_(["SENT", "PARTIAL", "OVERDUE"]))
    )).scalar() or 0)

    exp_month = float((await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            extract("year", Expense.expense_date) == y,
            extract("month", Expense.expense_date) == m,
        )
    )).scalar() or 0)

    total_customers = int((await db.execute(
        select(func.count()).select_from(Customer).where(Customer.is_active == True)
    )).scalar() or 0)

    # Top customers by revenue
    top_custs_res = await db.execute(
        select(
            Customer.id, Customer.name,
            func.coalesce(func.sum(Invoice.amount_paid), 0).label("revenue"),
        )
        .join(Invoice, Invoice.customer_id == Customer.id)
        .where(Invoice.status.in_(["PAID", "PARTIAL"]))
        .group_by(Customer.id, Customer.name)
        .order_by(func.sum(Invoice.amount_paid).desc())
        .limit(5)
    )
    top_customers = [
        {"id": r.id, "name": r.name, "revenue": round(float(r.revenue), 2)}
        for r in top_custs_res.all()
    ]

    # Monthly revenue last 12 months
    rev_by_month_res = await db.execute(
        select(
            extract("year", Invoice.issue_date).label("year"),
            extract("month", Invoice.issue_date).label("month"),
            func.coalesce(func.sum(Invoice.amount_paid), 0).label("revenue"),
        )
        .where(Invoice.status.in_(["PAID", "PARTIAL"]))
        .group_by(extract("year", Invoice.issue_date), extract("month", Invoice.issue_date))
        .order_by(extract("year", Invoice.issue_date), extract("month", Invoice.issue_date))
        .limit(12)
    )
    rev_by_month = [
        {"year": int(r.year), "month": int(r.month), "revenue": round(float(r.revenue), 2)}
        for r in rev_by_month_res.all()
    ]

    return DashboardStats(
        total_revenue=round(total_rev, 2),
        revenue_this_month=round(rev_this, 2),
        revenue_last_month=round(rev_last, 2),
        growth_rate=growth,
        invoices_overdue=await count_status("OVERDUE"),
        invoices_paid=await count_status("PAID"),
        invoices_sent=await count_status("SENT"),
        invoices_draft=await count_status("DRAFT"),
        invoices_partial=await count_status("PARTIAL"),
        outstanding_balance=round(outstanding, 2),
        total_customers=total_customers,
        top_customers=top_customers,
        revenue_by_month=rev_by_month,
        expense_total_month=round(exp_month, 2),
    )
