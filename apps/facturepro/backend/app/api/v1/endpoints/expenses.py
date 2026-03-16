"""Expenses (Dépenses) endpoints — FacturePro Africa."""
from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Expense, ExpenseCategory, User
from app.schemas.schemas import (
    ExpenseCategoryCreate, ExpenseCategoryOut, ExpenseCreate,
    ExpenseOut, ExpenseUpdate, Paginated,
)

router = APIRouter(prefix="/expenses", tags=["Expenses — Dépenses"])


# ── Categories ─────────────────────────────────────────────────
@router.get("/categories", response_model=list[ExpenseCategoryOut])
async def list_expense_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.is_active == True).order_by(ExpenseCategory.name))
    return [ExpenseCategoryOut.model_validate(c) for c in result.scalars().all()]


@router.post("/categories", response_model=ExpenseCategoryOut, status_code=201)
async def create_expense_category(data: ExpenseCategoryCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    cat = ExpenseCategory(**data.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return ExpenseCategoryOut.model_validate(cat)


# ── Expenses ───────────────────────────────────────────────────
@router.get("", response_model=Paginated)
async def list_expenses(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    category_id: int | None = None, status: str | None = None,
    is_billable: bool | None = None,
    date_from: datetime | None = None, date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Expense)
    if category_id:
        q = q.where(Expense.category_id == category_id)
    if status:
        q = q.where(Expense.status == status)
    if is_billable is not None:
        q = q.where(Expense.is_billable == is_billable)
    if date_from:
        q = q.where(Expense.expense_date >= date_from)
    if date_to:
        q = q.where(Expense.expense_date <= date_to)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Expense.expense_date.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[ExpenseOut.model_validate(e) for e in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/summary", response_model=dict)
async def expense_summary(
    month: int | None = None, year: int | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    """Monthly expense summary by category."""
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month
    from sqlalchemy import extract
    q = select(
        ExpenseCategory.name.label("category"),
        func.sum(Expense.amount).label("total"),
        func.count(Expense.id).label("count"),
    ).join(Expense, Expense.category_id == ExpenseCategory.id, isouter=True).where(
        extract("year", Expense.expense_date) == y,
        extract("month", Expense.expense_date) == m,
    ).group_by(ExpenseCategory.name)
    result = await db.execute(q)
    rows = result.all()
    grand_total = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            extract("year", Expense.expense_date) == y,
            extract("month", Expense.expense_date) == m,
        )
    )).scalar() or 0
    return {
        "year": y, "month": m,
        "grand_total": float(grand_total),
        "by_category": [{"category": r.category, "total": float(r.total or 0), "count": r.count} for r in rows],
    }


@router.get("/{expense_id}", response_model=ExpenseOut)
async def get_expense(expense_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    e = (await db.execute(select(Expense).where(Expense.id == expense_id))).scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Expense not found")
    return ExpenseOut.model_validate(e)


@router.post("", response_model=ExpenseOut, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    e = Expense(
        **data.model_dump(exclude={"expense_date"}),
        user_id=current_user.id,
        expense_date=data.expense_date or datetime.now(timezone.utc),
    )
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return ExpenseOut.model_validate(e)


@router.put("/{expense_id}", response_model=ExpenseOut)
async def update_expense(expense_id: int, data: ExpenseUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    e = (await db.execute(select(Expense).where(Expense.id == expense_id))).scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Expense not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(e, k, v)
    await db.commit()
    await db.refresh(e)
    return ExpenseOut.model_validate(e)


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(expense_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    e = (await db.execute(select(Expense).where(Expense.id == expense_id))).scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Expense not found")
    await db.delete(e)
    await db.commit()
