"""Reports endpoints — TVA, Revenue, Accounting Export — FacturePro Africa."""
from __future__ import annotations
import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Customer, Expense, Invoice, InvoiceItem, User
from app.schemas.schemas import AccountingExportRow, RevenueReport, VATReport, VATReportLine

router = APIRouter(prefix="/reports", tags=["Reports — Rapports"])


def _period_bounds(year: int, month: int | None):
    if month:
        from calendar import monthrange
        _, last_day = monthrange(year, month)
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    else:
        start = datetime(year, 1, 1, tzinfo=timezone.utc)
        end = datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    return start, end


@router.get("/vat", response_model=VATReport)
async def vat_report(
    year: int = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Rapport TVA collectée — décomposée par taux."""
    y = year or datetime.now(timezone.utc).year
    start, end = _period_bounds(y, month)

    # Join invoice_items → invoices (only PAID/SENT)
    q = select(
        InvoiceItem.tax_rate,
        func.sum(InvoiceItem.line_total / (1 + InvoiceItem.tax_rate / 100)).label("taxable"),
        func.sum(InvoiceItem.line_total * InvoiceItem.tax_rate / 100 / (1 + InvoiceItem.tax_rate / 100)).label("tax"),
        func.count(func.distinct(Invoice.id)).label("inv_count"),
    ).join(Invoice, Invoice.id == InvoiceItem.invoice_id).where(
        Invoice.status.in_(["PAID", "SENT", "PARTIAL"]),
        Invoice.issue_date >= start,
        Invoice.issue_date <= end,
    ).group_by(InvoiceItem.tax_rate).order_by(InvoiceItem.tax_rate)

    result = await db.execute(q)
    lines = []
    total_taxable = 0.0
    total_tax = 0.0
    for row in result.all():
        taxable = round(float(row.taxable or 0), 2)
        tax = round(float(row.tax or 0), 2)
        total_taxable += taxable
        total_tax += tax
        lines.append(VATReportLine(
            tax_rate=float(row.tax_rate),
            taxable_amount=taxable,
            tax_amount=tax,
            invoice_count=row.inv_count,
        ))

    return VATReport(
        period_start=start, period_end=end, lines=lines,
        total_taxable=round(total_taxable, 2), total_tax=round(total_tax, 2),
    )


@router.get("/revenue", response_model=RevenueReport)
async def revenue_report(
    year: int = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Rapport de chiffre d'affaires avec détail par client et produit."""
    y = year or datetime.now(timezone.utc).year
    start, end = _period_bounds(y, month)
    period = f"{y}-{month:02d}" if month else str(y)

    inv_q = select(Invoice).where(
        Invoice.issue_date >= start, Invoice.issue_date <= end
    )
    invoices = (await db.execute(inv_q)).scalars().all()
    paid = [i for i in invoices if i.status in ("PAID", "PARTIAL")]

    total_revenue = sum(float(i.amount_paid) for i in paid)
    invoice_count = len(invoices)
    paid_count = len([i for i in invoices if i.status == "PAID"])
    overdue_count = len([i for i in invoices if i.status == "OVERDUE"])

    # Expense total
    exp_total = float((await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= start, Expense.expense_date <= end,
            Expense.status.in_(["APPROVED", "REIMBURSED", "PENDING"]),
        )
    )).scalar() or 0)

    gross_profit = round(total_revenue - exp_total, 2)
    gross_margin_pct = round(gross_profit / total_revenue * 100, 2) if total_revenue > 0 else 0.0

    # By customer
    cust_map: dict[int, dict] = {}
    for inv in paid:
        cid = inv.customer_id
        if cid not in cust_map:
            cust_map[cid] = {"customer_id": cid, "name": inv.customer.name, "revenue": 0.0, "invoice_count": 0}
        cust_map[cid]["revenue"] += float(inv.amount_paid)
        cust_map[cid]["invoice_count"] += 1
    by_customer = sorted(cust_map.values(), key=lambda x: x["revenue"], reverse=True)[:10]

    # By product/service
    prod_map: dict = {}
    for inv in paid:
        for item in inv.items:
            key = item.description
            if item.product_id:
                key = f"prod_{item.product_id}"
            if key not in prod_map:
                prod_map[key] = {"description": item.description, "revenue": 0.0, "quantity": 0.0}
            prod_map[key]["revenue"] += float(item.line_total)
            prod_map[key]["quantity"] += float(item.quantity)
    by_product = sorted(prod_map.values(), key=lambda x: x["revenue"], reverse=True)[:10]

    return RevenueReport(
        period=period,
        total_revenue=round(total_revenue, 2),
        total_expenses=round(exp_total, 2),
        gross_profit=gross_profit,
        gross_margin_pct=gross_margin_pct,
        invoice_count=invoice_count,
        paid_count=paid_count,
        overdue_count=overdue_count,
        by_customer=by_customer,
        by_product=by_product,
    )


@router.get("/revenue/monthly", response_model=list[dict])
async def monthly_revenue(
    year: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Monthly revenue chart data for the given year."""
    y = year or datetime.now(timezone.utc).year
    q = select(
        extract("month", Invoice.issue_date).label("month"),
        func.coalesce(func.sum(Invoice.amount_paid), 0).label("revenue"),
        func.count(Invoice.id).label("count"),
    ).where(
        extract("year", Invoice.issue_date) == y,
        Invoice.status.in_(["PAID", "PARTIAL"]),
    ).group_by(extract("month", Invoice.issue_date)).order_by(extract("month", Invoice.issue_date))
    result = await db.execute(q)
    months = {r.month: {"revenue": float(r.revenue), "count": r.count} for r in result.all()}
    return [
        {"month": m, "revenue": months.get(m, {}).get("revenue", 0.0), "count": months.get(m, {}).get("count", 0)}
        for m in range(1, 13)
    ]


@router.get("/accounting-export")
async def accounting_export(
    year: int = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Export invoices in accounting format (CSV or JSON)."""
    y = year or datetime.now(timezone.utc).year
    start, end = _period_bounds(y, month)

    invoices = (await db.execute(
        select(Invoice).where(Invoice.issue_date >= start, Invoice.issue_date <= end).order_by(Invoice.issue_date)
    )).scalars().all()

    rows = []
    for inv in invoices:
        rows.append(AccountingExportRow(
            date=inv.issue_date.strftime("%Y-%m-%d"),
            type="FACTURE",
            reference=inv.invoice_number,
            customer=inv.customer.name,
            description=f"Facture {inv.invoice_number}",
            ht_amount=float(inv.subtotal) - float(inv.discount_amount),
            tax_amount=float(inv.tax_amount),
            ttc_amount=float(inv.total_amount),
            status=inv.status,
            currency=inv.currency,
        ))

    if format == "json":
        return [r.model_dump() for r in rows]

    # CSV export
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "type", "reference", "customer",
                                                 "description", "ht_amount", "tax_amount",
                                                 "ttc_amount", "status", "currency"])
    writer.writeheader()
    for r in rows:
        writer.writerow(r.model_dump())

    output.seek(0)
    filename = f"export_comptable_{y}"
    if month:
        filename += f"_{month:02d}"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),  # utf-8-sig for Excel compatibility
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
    )


@router.get("/overdue-summary", response_model=dict)
async def overdue_summary(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Outstanding + overdue invoices summary."""
    now = datetime.now(timezone.utc)

    # Update overdue status
    overdue_res = await db.execute(
        select(Invoice).where(
            Invoice.status == "SENT",
            Invoice.due_date < now,
        )
    )
    for inv in overdue_res.scalars().all():
        inv.status = "OVERDUE"
    await db.commit()

    total_outstanding = float((await db.execute(
        select(func.coalesce(func.sum(Invoice.total_amount - Invoice.amount_paid), 0))
        .where(Invoice.status.in_(["SENT", "PARTIAL", "OVERDUE"]))
    )).scalar() or 0)

    overdue_amount = float((await db.execute(
        select(func.coalesce(func.sum(Invoice.total_amount - Invoice.amount_paid), 0))
        .where(Invoice.status == "OVERDUE")
    )).scalar() or 0)

    overdue_count = int((await db.execute(
        select(func.count()).select_from(Invoice).where(Invoice.status == "OVERDUE")
    )).scalar() or 0)

    # Top overdue customers
    top_overdue = await db.execute(
        select(
            Customer.name,
            func.sum(Invoice.total_amount - Invoice.amount_paid).label("balance"),
            func.count(Invoice.id).label("count"),
        ).join(Invoice, Invoice.customer_id == Customer.id)
        .where(Invoice.status == "OVERDUE")
        .group_by(Customer.id, Customer.name)
        .order_by(func.sum(Invoice.total_amount - Invoice.amount_paid).desc())
        .limit(5)
    )
    return {
        "total_outstanding": round(total_outstanding, 2),
        "overdue_amount": round(overdue_amount, 2),
        "overdue_count": overdue_count,
        "top_overdue_customers": [
            {"name": r.name, "balance": round(float(r.balance), 2), "invoice_count": r.count}
            for r in top_overdue.all()
        ],
    }
