"""OHADA Accounting API Endpoints — FacturePro Africa."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.schemas.accounting import (
    FiscalYearCreate, FiscalYearUpdate, FiscalYearClose, FiscalYearOut,
    AccountCreate, AccountUpdate, AccountOut, AccountTreeOut, AccountBalanceOut,
    JournalCreate, JournalUpdate, JournalOut,
    JournalEntryCreate, JournalEntryUpdate, JournalEntryOut, JournalEntryListOut,
    PaginatedJournalEntries,
    TaxRateCreate, TaxRateUpdate, TaxRateOut,
    ReconciliationCreate, ReconciliationOut, UnreconciledItemOut,
    TrialBalance, GeneralLedger, JournalReport, IncomeStatement, BalanceSheet, AgedBalance,
    PDFExportRequest, AccountingDashboardStats,
)
from app.services import accounting_service as acc_svc
from app.services import financial_reports_service as rpt_svc
from app.seeders.accounting_seeder import (
    seed_ohada_chart_of_accounts,
    setup_default_accounts_config,
)

router = APIRouter(prefix="/accounting", tags=["accounting"])


# ── Helper to get organisation_id ─────────────────────────────────────
def _get_org_id(user: User) -> int:
    if not user.organisation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not belong to an organisation"
        )
    return user.organisation_id


# ═══════════════════════════════════════════════════════════════════
# FISCAL YEARS
# ═══════════════════════════════════════════════════════════════════

@router.post("/fiscal-years", response_model=FiscalYearOut, status_code=status.HTTP_201_CREATED)
async def create_fiscal_year(
    data: FiscalYearCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new fiscal year."""
    try:
        fiscal_year = await acc_svc.create_fiscal_year(
            db, _get_org_id(user), data
        )
        return fiscal_year
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/fiscal-years", response_model=list[FiscalYearOut])
async def list_fiscal_years(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all fiscal years for the organisation."""
    from sqlalchemy import select
    from app.models.accounting import FiscalYear
    
    result = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == _get_org_id(user)
        ).order_by(FiscalYear.start_date.desc())
    )
    return list(result.scalars().all())


@router.get("/fiscal-years/active", response_model=FiscalYearOut)
async def get_active_fiscal_year(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the active fiscal year."""
    fiscal_year = await acc_svc.get_active_fiscal_year(db, _get_org_id(user))
    if not fiscal_year:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No active fiscal year")
    return fiscal_year


@router.put("/fiscal-years/{fiscal_year_id}", response_model=FiscalYearOut)
async def update_fiscal_year(
    fiscal_year_id: int,
    data: FiscalYearUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a fiscal year."""
    from app.models.accounting import FiscalYear
    
    fiscal_year = await db.get(FiscalYear, fiscal_year_id)
    if not fiscal_year or fiscal_year.organisation_id != _get_org_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fiscal year not found")
    
    if fiscal_year.is_closed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot update closed fiscal year")
    
    if data.name is not None:
        fiscal_year.name = data.name
    if data.start_date is not None:
        fiscal_year.start_date = data.start_date
    if data.end_date is not None:
        fiscal_year.end_date = data.end_date
    
    await db.commit()
    await db.refresh(fiscal_year)
    return fiscal_year


@router.post("/fiscal-years/{fiscal_year_id}/close", response_model=FiscalYearOut)
async def close_fiscal_year(
    fiscal_year_id: int,
    data: FiscalYearClose,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Close a fiscal year."""
    try:
        fiscal_year = await acc_svc.close_fiscal_year(
            db, _get_org_id(user), fiscal_year_id, user.id
        )
        return fiscal_year
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# CHART OF ACCOUNTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new account."""
    try:
        account = await acc_svc.create_account(db, _get_org_id(user), data)
        return account
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/accounts", response_model=list[dict])
async def list_accounts(
    category: Optional[str] = Query(None, description="Filter by category (classe_1 to classe_8)"),
    include_tree: bool = Query(True, description="Return as tree structure"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List accounts (optionally as tree structure)."""
    if include_tree:
        return await acc_svc.get_account_tree(db, _get_org_id(user), category)
    else:
        from sqlalchemy import select
        from app.models.accounting import Account
        
        query = select(Account).where(
            Account.organisation_id == _get_org_id(user),
            Account.is_active == True
        ).order_by(Account.number)
        
        if category:
            query = query.where(Account.category == category)
        
        result = await db.execute(query)
        return [
            {
                "id": acc.id,
                "number": acc.number,
                "name": acc.name,
                "account_type": acc.account_type,
                "category": acc.category,
                "parent_id": acc.parent_id,
                "is_active": acc.is_active,
                "allow_manual_entry": acc.allow_manual_entry,
                "is_system": acc.is_system,
                "debit_balance": float(acc.debit_balance),
                "credit_balance": float(acc.credit_balance),
                "created_at": acc.created_at,
            }
            for acc in result.scalars().all()
        ]


@router.get("/accounts/{account_id}", response_model=AccountOut)
async def get_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get account details."""
    from app.models.accounting import Account
    
    account = await db.get(Account, account_id)
    if not account or account.organisation_id != _get_org_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


@router.put("/accounts/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: int,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update an account."""
    from app.models.accounting import Account
    
    account = await db.get(Account, account_id)
    if not account or account.organisation_id != _get_org_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    if account.is_system:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot modify system account")
    
    if data.name is not None:
        account.name = data.name
    if data.is_active is not None:
        account.is_active = data.is_active
    if data.allow_manual_entry is not None:
        account.allow_manual_entry = data.allow_manual_entry
    
    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete an account."""
    try:
        await acc_svc.delete_account(db, _get_org_id(user), account_id)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/accounts/{account_id}/balance", response_model=AccountBalanceOut)
async def get_account_balance(
    account_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get account balance for a period."""
    try:
        return await acc_svc.get_account_balance(
            db, _get_org_id(user), account_id, start_date, end_date
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/accounts/import-ohada", status_code=status.HTTP_201_CREATED)
async def import_ohada_accounts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Import the complete OHADA chart of accounts."""
    try:
        result = await seed_ohada_chart_of_accounts(db, _get_org_id(user))
        # Also set up default account configurations
        await setup_default_accounts_config(db, _get_org_id(user))
        await db.commit()
        return {
            "message": "OHADA chart of accounts imported successfully",
            **result
        }
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# JOURNALS
# ═══════════════════════════════════════════════════════════════════

@router.post("/journals", response_model=JournalOut, status_code=status.HTTP_201_CREATED)
async def create_journal(
    data: JournalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new journal."""
    try:
        journal = await acc_svc.create_journal(db, _get_org_id(user), data)
        await db.commit()
        return journal
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/journals", response_model=list[JournalOut])
async def list_journals(
    journal_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all journals."""
    journals = await acc_svc.get_journals(db, _get_org_id(user), journal_type)
    return journals


@router.put("/journals/{journal_id}", response_model=JournalOut)
async def update_journal(
    journal_id: int,
    data: JournalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a journal."""
    from app.models.accounting import Journal
    
    journal = await db.get(Journal, journal_id)
    if not journal or journal.organisation_id != _get_org_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Journal not found")
    
    if data.name is not None:
        journal.name = data.name
    if data.is_active is not None:
        journal.is_active = data.is_active
    
    await db.commit()
    await db.refresh(journal)
    return journal


# ═══════════════════════════════════════════════════════════════════
# JOURNAL ENTRIES
# ═══════════════════════════════════════════════════════════════════

@router.post("/entries", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    data: JournalEntryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new journal entry."""
    try:
        entry = await acc_svc.create_journal_entry(db, _get_org_id(user), user.id, data)
        await db.commit()
        await db.refresh(entry)
        return entry
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/entries", response_model=PaginatedJournalEntries)
async def list_journal_entries(
    journal_id: Optional[int] = Query(None),
    fiscal_year_id: Optional[int] = Query(None),
    account_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List journal entries with filters and pagination."""
    entries, total = await acc_svc.get_journal_entries(
        db, _get_org_id(user),
        journal_id=journal_id,
        fiscal_year_id=fiscal_year_id,
        account_id=account_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        size=size,
    )
    
    return PaginatedJournalEntries(
        items=[
            JournalEntryListOut(
                id=e.id,
                entry_number=e.entry_number,
                entry_date=e.entry_date,
                journal_code=e.journal.code,
                description=e.description,
                status=e.status,
                total_debit=float(e.total_debit),
                total_credit=float(e.total_credit),
                created_at=e.created_at,
            )
            for e in entries
        ],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/entries/{entry_id}", response_model=JournalEntryOut)
async def get_journal_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get journal entry details."""
    from sqlalchemy.orm import selectinload
    from app.models.accounting import JournalEntry
    
    entry = await db.execute(
        select(JournalEntry).where(
            JournalEntry.id == entry_id,
            JournalEntry.organisation_id == _get_org_id(user)
        ).options(
            selectinload(JournalEntry.lines).selectinload(JournalEntryLine.account),
            selectinload(JournalEntry.journal),
            selectinload(JournalEntry.fiscal_year),
        )
    )
    entry = entry.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    return entry


@router.put("/entries/{entry_id}", response_model=JournalEntryOut)
async def update_journal_entry(
    entry_id: int,
    data: JournalEntryUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a draft journal entry."""
    from app.models.accounting import JournalEntry
    
    entry = await db.get(JournalEntry, entry_id)
    if not entry or entry.organisation_id != _get_org_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    if entry.status != "draft":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Only draft entries can be modified")
    
    # Update fields
    if data.entry_date is not None:
        entry.entry_date = data.entry_date
    if data.document_date is not None:
        entry.document_date = data.document_date
    if data.document_ref is not None:
        entry.document_ref = data.document_ref
    if data.description is not None:
        entry.description = data.description
    
    # Update lines if provided
    if data.lines is not None:
        # Delete existing lines
        for line in list(entry.lines):
            await db.delete(line)
        
        # Create new lines
        total_debit = 0
        total_credit = 0
        for line_data in data.lines:
            line = JournalEntryLine(
                entry_id=entry.id,
                account_id=line_data.account_id,
                description=line_data.description,
                debit=float(line_data.debit),
                credit=float(line_data.credit),
                third_party_type=line_data.third_party_type,
                third_party_id=line_data.third_party_id,
                cost_center=line_data.cost_center,
            )
            db.add(line)
            total_debit += float(line_data.debit)
            total_credit += float(line_data.credit)
        
        entry.total_debit = total_debit
        entry.total_credit = total_credit
    
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a draft journal entry."""
    from app.models.accounting import JournalEntry
    
    entry = await db.get(JournalEntry, entry_id)
    if not entry or entry.organisation_id != _get_org_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    if entry.status != "draft":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Only draft entries can be deleted")
    
    await db.delete(entry)
    await db.commit()


@router.post("/entries/{entry_id}/post", response_model=JournalEntryOut)
async def post_journal_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Post (validate) a journal entry."""
    try:
        entry = await acc_svc.post_journal_entry(db, _get_org_id(user), entry_id, user.id)
        await db.commit()
        await db.refresh(entry)
        return entry
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/entries/{entry_id}/cancel", response_model=JournalEntryOut)
async def cancel_journal_entry(
    entry_id: int,
    reason: str = Query(..., description="Reason for cancellation"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Cancel a posted journal entry."""
    try:
        entry = await acc_svc.cancel_journal_entry(
            db, _get_org_id(user), entry_id, user.id, reason
        )
        await db.commit()
        await db.refresh(entry)
        return entry
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# AUTOMATIC ENTRIES
# ═══════════════════════════════════════════════════════════════════

auto_router = APIRouter(prefix="/auto", tags=["accounting-auto"])


@auto_router.post("/invoice/{invoice_id}", response_model=JournalEntryOut)
async def create_entry_from_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create journal entry from an invoice."""
    try:
        entry = await acc_svc.create_entry_from_invoice(
            db, _get_org_id(user), user.id, invoice_id
        )
        await db.commit()
        return entry
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@auto_router.post("/payment/{payment_id}", response_model=JournalEntryOut)
async def create_entry_from_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create journal entry from a payment."""
    try:
        entry = await acc_svc.create_entry_from_payment(
            db, _get_org_id(user), user.id, payment_id
        )
        await db.commit()
        return entry
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@auto_router.post("/expense/{expense_id}", response_model=JournalEntryOut)
async def create_entry_from_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create journal entry from an expense."""
    try:
        entry = await acc_svc.create_entry_from_expense(
            db, _get_org_id(user), user.id, expense_id
        )
        await db.commit()
        return entry
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# RECONCILIATION
# ═══════════════════════════════════════════════════════════════════

reconciliation_router = APIRouter(prefix="/reconciliation", tags=["accounting-reconciliation"])


@reconciliation_router.get("/{account_id}", response_model=list[UnreconciledItemOut])
async def get_unreconciled_items(
    account_id: int,
    third_party_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get unreconciled items for an account."""
    try:
        items = await acc_svc.get_unreconciled_items(
            db, _get_org_id(user), account_id, third_party_type
        )
        return [UnreconciledItemOut(**item) for item in items]
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reconciliation_router.post("", response_model=ReconciliationOut, status_code=status.HTTP_201_CREATED)
async def reconcile_items(
    data: ReconciliationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Reconcile (letter) multiple journal entry lines."""
    try:
        reconciliation = await acc_svc.reconcile_items(
            db, _get_org_id(user), user.id, data
        )
        await db.commit()
        await db.refresh(reconciliation)
        return reconciliation
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reconciliation_router.delete("/{reconciliation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def undo_reconciliation(
    reconciliation_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Undo a reconciliation."""
    try:
        await acc_svc.undo_reconciliation(db, _get_org_id(user), reconciliation_id)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# TAX RATES
# ═══════════════════════════════════════════════════════════════════

tax_router = APIRouter(prefix="/tax-rates", tags=["accounting-tax"])


@tax_router.post("", response_model=TaxRateOut, status_code=status.HTTP_201_CREATED)
async def create_tax_rate(
    data: TaxRateCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new tax rate."""
    try:
        tax_rate = await acc_svc.create_tax_rate(db, _get_org_id(user), data)
        await db.commit()
        return tax_rate
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@tax_router.get("", response_model=list[TaxRateOut])
async def list_tax_rates(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all tax rates."""
    return await acc_svc.get_tax_rates(db, _get_org_id(user))


@tax_router.put("/{tax_rate_id}", response_model=TaxRateOut)
async def update_tax_rate(
    tax_rate_id: int,
    data: TaxRateUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a tax rate."""
    from app.models.accounting import TaxRate
    
    tax_rate = await db.get(TaxRate, tax_rate_id)
    if not tax_rate or tax_rate.organisation_id != _get_org_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tax rate not found")
    
    if data.name is not None:
        tax_rate.name = data.name
    if data.rate is not None:
        tax_rate.rate = data.rate
    if data.account_id is not None:
        tax_rate.account_id = data.account_id
    if data.is_default is not None:
        # Unset other defaults
        if data.is_default:
            existing = await acc_svc.get_tax_rates(db, _get_org_id(user))
            for t in existing:
                if t.id != tax_rate_id and t.is_default:
                    t.is_default = False
        tax_rate.is_default = data.is_default
    if data.is_active is not None:
        tax_rate.is_active = data.is_active
    
    await db.commit()
    await db.refresh(tax_rate)
    return tax_rate


# ═══════════════════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════════════════

reports_router = APIRouter(prefix="/reports", tags=["accounting-reports"])


@reports_router.get("/trial-balance", response_model=TrialBalance)
async def get_trial_balance(
    period_start: date = Query(...),
    period_end: date = Query(...),
    include_zero_balances: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate Trial Balance (Balance Générale)."""
    try:
        return await rpt_svc.generate_trial_balance(
            db, _get_org_id(user), period_start, period_end, include_zero_balances
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/general-ledger", response_model=GeneralLedger)
async def get_general_ledger(
    period_start: date = Query(...),
    period_end: date = Query(...),
    account_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate General Ledger (Grand Livre)."""
    try:
        return await rpt_svc.generate_general_ledger(
            db, _get_org_id(user), period_start, period_end, account_id
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/journal", response_model=JournalReport)
async def get_journal_report(
    journal_id: int = Query(...),
    period_start: date = Query(...),
    period_end: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate Journal Centralisateur."""
    try:
        return await rpt_svc.generate_journal_report(
            db, _get_org_id(user), journal_id, period_start, period_end
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/income-statement", response_model=IncomeStatement)
async def get_income_statement(
    period_start: date = Query(...),
    period_end: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate Income Statement (Compte de Résultat)."""
    try:
        return await rpt_svc.generate_income_statement(
            db, _get_org_id(user), period_start, period_end
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/balance-sheet", response_model=BalanceSheet)
async def get_balance_sheet(
    as_of_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate Balance Sheet (Bilan)."""
    try:
        return await rpt_svc.generate_balance_sheet(
            db, _get_org_id(user), as_of_date
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/aged-balance", response_model=AgedBalance)
async def get_aged_balance(
    as_of_date: date = Query(...),
    balance_type: str = Query("customer", pattern="^(customer|supplier)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate Aged Balance (Balance Âgée)."""
    try:
        return await rpt_svc.generate_aged_balance(
            db, _get_org_id(user), as_of_date, balance_type
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/dashboard", response_model=dict)
async def get_accounting_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get accounting dashboard statistics."""
    try:
        return await rpt_svc.get_accounting_dashboard_stats(db, _get_org_id(user))
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# Import for the entry endpoint
from sqlalchemy import select
from app.models.accounting import JournalEntryLine

# PDF Export endpoints
from fastapi import Response
from app.services.pdf_report_service import AccountingPDFGenerator
from app.models.all_models import Organisation


@reports_router.get("/trial-balance/pdf")
async def export_trial_balance_pdf(
    period_start: date = Query(...),
    period_end: date = Query(...),
    include_zero_balances: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export Trial Balance as PDF."""
    try:
        # Get organisation info
        org = await db.get(Organisation, _get_org_id(user))
        
        # Generate report data
        report = await rpt_svc.generate_trial_balance(
            db, _get_org_id(user), period_start, period_end, include_zero_balances
        )
        
        # Convert to dict
        report_dict = report.model_dump()
        report_dict['period_start'] = str(report_dict['period_start'])
        report_dict['period_end'] = str(report_dict['period_end'])
        report_dict['generated_at'] = report_dict['generated_at'].isoformat()
        
        # Generate PDF
        generator = AccountingPDFGenerator(org.name, org.currency or "XOF")
        pdf_bytes = generator.generate_trial_balance_pdf(report_dict)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="balance_generale_{period_start}_{period_end}.pdf"'
            }
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/income-statement/pdf")
async def export_income_statement_pdf(
    period_start: date = Query(...),
    period_end: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export Income Statement as PDF."""
    try:
        org = await db.get(Organisation, _get_org_id(user))
        
        report = await rpt_svc.generate_income_statement(
            db, _get_org_id(user), period_start, period_end
        )
        
        report_dict = report.model_dump()
        report_dict['period_start'] = str(report_dict['period_start'])
        report_dict['period_end'] = str(report_dict['period_end'])
        report_dict['generated_at'] = report_dict['generated_at'].isoformat()
        
        generator = AccountingPDFGenerator(org.name, org.currency or "XOF")
        pdf_bytes = generator.generate_income_statement_pdf(report_dict)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="compte_resultat_{period_start}_{period_end}.pdf"'
            }
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/balance-sheet/pdf")
async def export_balance_sheet_pdf(
    as_of_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export Balance Sheet as PDF."""
    try:
        org = await db.get(Organisation, _get_org_id(user))
        
        report = await rpt_svc.generate_balance_sheet(
            db, _get_org_id(user), as_of_date
        )
        
        report_dict = report.model_dump()
        report_dict['as_of_date'] = str(report_dict['as_of_date'])
        report_dict['generated_at'] = report_dict['generated_at'].isoformat()
        
        generator = AccountingPDFGenerator(org.name, org.currency or "XOF")
        pdf_bytes = generator.generate_balance_sheet_pdf(report_dict)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="bilan_{as_of_date}.pdf"'
            }
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@reports_router.get("/general-ledger/pdf")
async def export_general_ledger_pdf(
    period_start: date = Query(...),
    period_end: date = Query(...),
    account_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export General Ledger as PDF."""
    try:
        org = await db.get(Organisation, _get_org_id(user))
        
        report = await rpt_svc.generate_general_ledger(
            db, _get_org_id(user), period_start, period_end, account_id
        )
        
        report_dict = report.model_dump()
        report_dict['period_start'] = str(report_dict['period_start'])
        report_dict['period_end'] = str(report_dict['period_end'])
        report_dict['generated_at'] = report_dict['generated_at'].isoformat()
        
        generator = AccountingPDFGenerator(org.name, org.currency or "XOF")
        pdf_bytes = generator.generate_general_ledger_pdf(report_dict)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="grand_livre_{period_start}_{period_end}.pdf"'
            }
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))
