"""OHADA Accounting Service — FacturePro Africa.

This service handles all accounting operations following OHADA PCG standards.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, date, timedelta
from typing import TYPE_CHECKING, Optional

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.accounting import (
    FiscalYear, Account, Journal, JournalEntry, JournalEntryLine,
    TaxRate, AccountReconciliation, DefaultAccount
)
from app.models.all_models import Invoice, Payment, Expense, Customer, Supplier
from app.schemas.accounting import (
    FiscalYearCreate, FiscalYearUpdate,
    AccountCreate, AccountUpdate,
    JournalCreate, JournalUpdate,
    JournalEntryCreate, JournalEntryUpdate,
    TaxRateCreate, TaxRateUpdate,
    ReconciliationCreate,
)

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


# ── Fiscal Year Management ───────────────────────────────────────────
async def create_fiscal_year(
    db: AsyncSession,
    organisation_id: int,
    data: FiscalYearCreate
) -> FiscalYear:
    """Create a new fiscal year."""
    # Check for overlapping fiscal years
    existing = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == organisation_id,
            FiscalYear.is_closed == False,
            or_(
                and_(FiscalYear.start_date <= data.start_date, FiscalYear.end_date >= data.start_date),
                and_(FiscalYear.start_date <= data.end_date, FiscalYear.end_date >= data.end_date),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Overlapping fiscal year exists")
    
    fiscal_year = FiscalYear(
        organisation_id=organisation_id,
        name=data.name,
        start_date=data.start_date,
        end_date=data.end_date,
        opening_balance=data.opening_balance,
    )
    db.add(fiscal_year)
    await db.flush()
    await db.refresh(fiscal_year)
    return fiscal_year


async def get_active_fiscal_year(
    db: AsyncSession,
    organisation_id: int
) -> FiscalYear | None:
    """Get the active (unclosed) fiscal year for an organisation."""
    today = date.today()
    result = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == organisation_id,
            FiscalYear.is_closed == False,
            FiscalYear.start_date <= today,
            FiscalYear.end_date >= today,
        )
    )
    return result.scalar_one_or_none()


async def close_fiscal_year(
    db: AsyncSession,
    organisation_id: int,
    fiscal_year_id: int,
    user_id: int
) -> FiscalYear:
    """Close a fiscal year and generate closing entries."""
    fiscal_year = await db.get(FiscalYear, fiscal_year_id)
    if not fiscal_year or fiscal_year.organisation_id != organisation_id:
        raise ValueError("Fiscal year not found")
    
    if fiscal_year.is_closed:
        raise ValueError("Fiscal year is already closed")
    
    # Check for unposted entries
    unposted = await db.execute(
        select(func.count()).select_from(JournalEntry).where(
            JournalEntry.fiscal_year_id == fiscal_year_id,
            JournalEntry.status == "draft"
        )
    )
    if unposted.scalar() > 0:
        raise ValueError("Cannot close fiscal year with unposted entries")
    
    # Close the fiscal year
    fiscal_year.is_closed = True
    fiscal_year.closed_at = datetime.now(timezone.utc)
    fiscal_year.closed_by = user_id
    
    await db.flush()
    await db.refresh(fiscal_year)
    return fiscal_year


# ── Account Management ───────────────────────────────────────────────
async def create_account(
    db: AsyncSession,
    organisation_id: int,
    data: AccountCreate
) -> Account:
    """Create a new account in the chart of accounts."""
    # Check for duplicate number
    existing = await db.execute(
        select(Account).where(
            Account.organisation_id == organisation_id,
            Account.number == data.number
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Account number {data.number} already exists")
    
    # Validate parent if specified
    parent = None
    if data.parent_id:
        parent = await db.get(Account, data.parent_id)
        if not parent or parent.organisation_id != organisation_id:
            raise ValueError("Parent account not found")
    
    account = Account(
        organisation_id=organisation_id,
        number=data.number,
        name=data.name,
        account_type=data.account_type,
        category=data.category,
        parent_id=data.parent_id,
        allow_manual_entry=data.allow_manual_entry,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


async def get_account_tree(
    db: AsyncSession,
    organisation_id: int,
    category: str | None = None
) -> list[dict]:
    """Get the chart of accounts as a tree structure."""
    query = select(Account).where(
        Account.organisation_id == organisation_id,
        Account.is_active == True
    ).order_by(Account.number)
    
    if category:
        query = query.where(Account.category == category)
    
    result = await db.execute(query)
    accounts = result.scalars().all()
    
    # Build tree structure
    account_map = {acc.id: acc for acc in accounts}
    root_accounts = []
    
    for acc in accounts:
        if acc.parent_id is None:
            root_accounts.append(_build_account_tree(acc, account_map))
    
    return root_accounts


def _build_account_tree(account: Account, account_map: dict) -> dict:
    """Recursively build account tree."""
    # Calculate balance based on account type
    if account.account_type in ("asset", "expense"):
        balance = float(account.debit_balance) - float(account.credit_balance)
    else:
        balance = float(account.credit_balance) - float(account.debit_balance)
    
    return {
        "id": account.id,
        "number": account.number,
        "name": account.name,
        "account_type": account.account_type,
        "category": account.category,
        "parent_id": account.parent_id,
        "is_active": account.is_active,
        "allow_manual_entry": account.allow_manual_entry,
        "is_system": account.is_system,
        "debit_balance": float(account.debit_balance),
        "credit_balance": float(account.credit_balance),
        "balance": balance,
        "children": [
            _build_account_tree(child, account_map)
            for child in account_map.values()
            if child.parent_id == account.id
        ],
        "created_at": account.created_at.isoformat(),
    }


async def get_account_balance(
    db: AsyncSession,
    organisation_id: int,
    account_id: int,
    start_date: date | None = None,
    end_date: date | None = None
) -> dict:
    """Calculate account balance for a period."""
    account = await db.get(Account, account_id)
    if not account or account.organisation_id != organisation_id:
        raise ValueError("Account not found")
    
    # Query lines for the period
    query = select(
        func.sum(JournalEntryLine.debit).label("total_debit"),
        func.sum(JournalEntryLine.credit).label("total_credit"),
    ).join(JournalEntry).where(
        JournalEntryLine.account_id == account_id,
        JournalEntry.organisation_id == organisation_id,
        JournalEntry.status == "posted",
    )
    
    if start_date:
        query = query.where(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.where(JournalEntry.entry_date <= end_date)
    
    result = await db.execute(query)
    row = result.one()
    
    total_debit = float(row.total_debit or 0)
    total_credit = float(row.total_credit or 0)
    
    # Determine balance direction
    if account.account_type in ("asset", "expense"):
        balance = total_debit - total_credit
        direction = "debit" if balance >= 0 else "credit"
    else:
        balance = total_credit - total_debit
        direction = "credit" if balance >= 0 else "debit"
    
    return {
        "account_id": account_id,
        "account_number": account.number,
        "account_name": account.name,
        "account_type": account.account_type,
        "opening_balance": 0.0,  # TODO: Calculate from previous period
        "debit_total": total_debit,
        "credit_total": total_credit,
        "closing_balance": abs(balance),
        "balance_direction": direction,
    }


async def delete_account(
    db: AsyncSession,
    organisation_id: int,
    account_id: int
) -> bool:
    """Delete an account if it has no entries."""
    account = await db.get(Account, account_id)
    if not account or account.organisation_id != organisation_id:
        raise ValueError("Account not found")
    
    if account.is_system:
        raise ValueError("Cannot delete system account")
    
    # Check for entries
    entries = await db.execute(
        select(func.count()).select_from(JournalEntryLine).where(
            JournalEntryLine.account_id == account_id
        )
    )
    if entries.scalar() > 0:
        raise ValueError("Cannot delete account with journal entries")
    
    # Check for children
    children = await db.execute(
        select(func.count()).select_from(Account).where(
            Account.parent_id == account_id
        )
    )
    if children.scalar() > 0:
        raise ValueError("Cannot delete account with child accounts")
    
    await db.delete(account)
    await db.flush()
    return True


# ── Journal Management ───────────────────────────────────────────────
async def create_journal(
    db: AsyncSession,
    organisation_id: int,
    data: JournalCreate
) -> Journal:
    """Create a new journal."""
    existing = await db.execute(
        select(Journal).where(
            Journal.organisation_id == organisation_id,
            Journal.code == data.code
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Journal code {data.code} already exists")
    
    journal = Journal(
        organisation_id=organisation_id,
        code=data.code,
        name=data.name,
        journal_type=data.journal_type,
    )
    db.add(journal)
    await db.flush()
    await db.refresh(journal)
    return journal


async def get_journals(
    db: AsyncSession,
    organisation_id: int,
    journal_type: str | None = None
) -> list[Journal]:
    """Get all journals for an organisation."""
    query = select(Journal).where(
        Journal.organisation_id == organisation_id,
        Journal.is_active == True
    )
    
    if journal_type:
        query = query.where(Journal.journal_type == journal_type)
    
    result = await db.execute(query)
    return list(result.scalars().all())


# ── Journal Entry Management ─────────────────────────────────────────
async def create_journal_entry(
    db: AsyncSession,
    organisation_id: int,
    user_id: int,
    data: JournalEntryCreate
) -> JournalEntry:
    """Create a new journal entry."""
    # Validate journal
    journal = await db.get(Journal, data.journal_id)
    if not journal or journal.organisation_id != organisation_id:
        raise ValueError("Journal not found")
    
    # Validate fiscal year
    fiscal_year = await db.get(FiscalYear, data.fiscal_year_id)
    if not fiscal_year or fiscal_year.organisation_id != organisation_id:
        raise ValueError("Fiscal year not found")
    
    if fiscal_year.is_closed:
        raise ValueError("Fiscal year is closed")
    
    # Validate accounts in lines
    for line in data.lines:
        account = await db.get(Account, line.account_id)
        if not account or account.organisation_id != organisation_id:
            raise ValueError(f"Account {line.account_id} not found")
        if not account.is_active:
            raise ValueError(f"Account {account.number} is not active")
    
    # Check if entry is balanced
    total_debit = sum(float(line.debit) for line in data.lines)
    total_credit = sum(float(line.credit) for line in data.lines)
    
    if abs(total_debit - total_credit) > 0.01:
        raise ValueError(f"Entry is not balanced. Debit: {total_debit}, Credit: {total_credit}")
    
    # Generate entry number
    journal.last_entry_number += 1
    entry_number = f"{journal.code}-{fiscal_year.start_date.year}-{journal.last_entry_number:05d}"
    
    # Create entry
    entry = JournalEntry(
        organisation_id=organisation_id,
        journal_id=data.journal_id,
        fiscal_year_id=data.fiscal_year_id,
        entry_number=entry_number,
        entry_date=data.entry_date,
        document_date=data.document_date,
        document_ref=data.document_ref,
        description=data.description,
        status="draft",
        total_debit=total_debit,
        total_credit=total_credit,
        created_by=user_id,
    )
    db.add(entry)
    await db.flush()
    
    # Create lines
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
    
    await db.flush()
    await db.refresh(entry)
    return entry


async def post_journal_entry(
    db: AsyncSession,
    organisation_id: int,
    entry_id: int,
    user_id: int
) -> JournalEntry:
    """Post (validate) a journal entry."""
    entry = await db.get(JournalEntry, entry_id, options=[selectinload(JournalEntry.lines)])
    if not entry or entry.organisation_id != organisation_id:
        raise ValueError("Journal entry not found")
    
    if entry.status != "draft":
        raise ValueError("Only draft entries can be posted")
    
    # Update account balances
    for line in entry.lines:
        account = await db.get(Account, line.account_id)
        if account:
            account.debit_balance = float(account.debit_balance) + float(line.debit)
            account.credit_balance = float(account.credit_balance) + float(line.credit)
    
    entry.status = "posted"
    entry.posted_by = user_id
    entry.posted_at = datetime.now(timezone.utc)
    
    await db.flush()
    await db.refresh(entry)
    return entry


async def cancel_journal_entry(
    db: AsyncSession,
    organisation_id: int,
    entry_id: int,
    user_id: int,
    reason: str
) -> JournalEntry:
    """Cancel a posted journal entry."""
    entry = await db.get(JournalEntry, entry_id, options=[selectinload(JournalEntry.lines)])
    if not entry or entry.organisation_id != organisation_id:
        raise ValueError("Journal entry not found")
    
    if entry.status != "posted":
        raise ValueError("Only posted entries can be cancelled")
    
    # Reverse account balances
    for line in entry.lines:
        account = await db.get(Account, line.account_id)
        if account:
            account.debit_balance = float(account.debit_balance) - float(line.debit)
            account.credit_balance = float(account.credit_balance) - float(line.credit)
    
    entry.status = "cancelled"
    entry.cancelled_by = user_id
    entry.cancelled_at = datetime.now(timezone.utc)
    entry.cancel_reason = reason
    
    await db.flush()
    await db.refresh(entry)
    return entry


async def get_journal_entries(
    db: AsyncSession,
    organisation_id: int,
    journal_id: int | None = None,
    fiscal_year_id: int | None = None,
    account_id: int | None = None,
    status: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    page: int = 1,
    size: int = 20
) -> tuple[list[JournalEntry], int]:
    """Get journal entries with filters and pagination."""
    query = select(JournalEntry).where(
        JournalEntry.organisation_id == organisation_id
    ).options(selectinload(JournalEntry.journal))
    
    # Apply filters
    if journal_id:
        query = query.where(JournalEntry.journal_id == journal_id)
    if fiscal_year_id:
        query = query.where(JournalEntry.fiscal_year_id == fiscal_year_id)
    if status:
        query = query.where(JournalEntry.status == status)
    if start_date:
        query = query.where(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.where(JournalEntry.entry_date <= end_date)
    if search:
        query = query.where(
            or_(
                JournalEntry.entry_number.ilike(f"%{search}%"),
                JournalEntry.description.ilike(f"%{search}%"),
                JournalEntry.document_ref.ilike(f"%{search}%"),
            )
        )
    
    # Filter by account (requires join)
    if account_id:
        query = query.join(JournalEntryLine).where(
            JournalEntryLine.account_id == account_id
        ).distinct()
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Apply pagination
    query = query.order_by(JournalEntry.entry_date.desc(), JournalEntry.entry_number)
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    entries = list(result.scalars().all())
    
    return entries, total


# ── Automatic Journal Entries ────────────────────────────────────────
async def create_entry_from_invoice(
    db: AsyncSession,
    organisation_id: int,
    user_id: int,
    invoice_id: int
) -> JournalEntry:
    """Create journal entry from an invoice."""
    # Get invoice
    invoice = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id).options(
            selectinload(Invoice.customer),
            selectinload(Invoice.items)
        )
    )
    invoice = invoice.scalar_one_or_none()
    
    if not invoice or invoice.organisation_id != organisation_id:
        raise ValueError("Invoice not found")
    
    # Get sales journal
    journal = await db.execute(
        select(Journal).where(
            Journal.organisation_id == organisation_id,
            Journal.journal_type == "sales"
        )
    )
    journal = journal.scalar_one_or_none()
    if not journal:
        raise ValueError("Sales journal not found")
    
    # Get active fiscal year
    fiscal_year = await get_active_fiscal_year(db, organisation_id)
    if not fiscal_year:
        raise ValueError("No active fiscal year")
    
    # Get default accounts
    customer_account = await _get_default_account(db, organisation_id, "customers")
    sales_account = await _get_default_account(db, organisation_id, "sales")
    vat_account = await _get_default_account(db, organisation_id, "sales_vat")
    
    if not customer_account or not sales_account:
        raise ValueError("Default accounts not configured")
    
    # Prepare lines
    lines = []
    
    # Customer debit (Accounts Receivable)
    lines.append({
        "account_id": customer_account.id,
        "description": f"Facture {invoice.invoice_number} - {invoice.customer.name}",
        "debit": float(invoice.total_amount),
        "credit": 0,
        "third_party_type": "customer",
        "third_party_id": invoice.customer_id,
    })
    
    # Sales credit
    lines.append({
        "account_id": sales_account.id,
        "description": f"Ventes - Facture {invoice.invoice_number}",
        "debit": 0,
        "credit": float(invoice.subtotal),
    })
    
    # VAT credit (if applicable)
    if float(invoice.tax_amount) > 0 and vat_account:
        lines.append({
            "account_id": vat_account.id,
            "description": f"TVA collectée - Facture {invoice.invoice_number}",
            "debit": 0,
            "credit": float(invoice.tax_amount),
        })
    
    # Create entry
    entry_data = JournalEntryCreate(
        journal_id=journal.id,
        fiscal_year_id=fiscal_year.id,
        entry_date=invoice.issue_date.date() if isinstance(invoice.issue_date, datetime) else invoice.issue_date,
        document_date=invoice.issue_date.date() if isinstance(invoice.issue_date, datetime) else invoice.issue_date,
        document_ref=invoice.invoice_number,
        description=f"Facture client {invoice.invoice_number}",
        lines=[JournalEntryLineCreate(**line) for line in lines],
    )
    
    entry = await create_journal_entry(db, organisation_id, user_id, entry_data)
    entry.source_type = "invoice"
    entry.source_id = invoice_id
    
    # Auto-post
    await post_journal_entry(db, organisation_id, entry.id, user_id)
    
    return entry


async def create_entry_from_payment(
    db: AsyncSession,
    organisation_id: int,
    user_id: int,
    payment_id: int
) -> JournalEntry:
    """Create journal entry from a payment."""
    # Get payment with invoice
    payment = await db.execute(
        select(Payment).where(Payment.id == payment_id).options(
            selectinload(Payment.invoice).selectinload(Invoice.customer)
        )
    )
    payment = payment.scalar_one_or_none()
    
    if not payment:
        raise ValueError("Payment not found")
    
    invoice = payment.invoice
    if not invoice or invoice.organisation_id != organisation_id:
        raise ValueError("Invoice not found")
    
    # Get cash/bank journal based on payment method
    if payment.method == "CASH":
        journal_type = "cash"
        default_key = "cash"
    else:
        journal_type = "bank"
        default_key = "bank"
    
    journal = await db.execute(
        select(Journal).where(
            Journal.organisation_id == organisation_id,
            Journal.journal_type == journal_type
        )
    )
    journal = journal.scalar_one_or_none()
    if not journal:
        raise ValueError(f"{journal_type.capitalize()} journal not found")
    
    # Get active fiscal year
    fiscal_year = await get_active_fiscal_year(db, organisation_id)
    if not fiscal_year:
        raise ValueError("No active fiscal year")
    
    # Get default accounts
    customer_account = await _get_default_account(db, organisation_id, "customers")
    cash_account = await _get_default_account(db, organisation_id, default_key)
    
    if not customer_account or not cash_account:
        raise ValueError("Default accounts not configured")
    
    # Prepare lines
    lines = [
        {
            "account_id": cash_account.id,
            "description": f"Encaissement - Facture {invoice.invoice_number}",
            "debit": float(payment.amount),
            "credit": 0,
        },
        {
            "account_id": customer_account.id,
            "description": f"Client {invoice.customer.name} - Règlement",
            "debit": 0,
            "credit": float(payment.amount),
            "third_party_type": "customer",
            "third_party_id": invoice.customer_id,
        },
    ]
    
    # Create entry
    entry_data = JournalEntryCreate(
        journal_id=journal.id,
        fiscal_year_id=fiscal_year.id,
        entry_date=payment.paid_at.date() if isinstance(payment.paid_at, datetime) else payment.paid_at,
        document_date=payment.paid_at.date() if isinstance(payment.paid_at, datetime) else payment.paid_at,
        document_ref=invoice.invoice_number,
        description=f"Règlement facture {invoice.invoice_number} - {payment.method}",
        lines=[JournalEntryLineCreate(**line) for line in lines],
    )
    
    entry = await create_journal_entry(db, organisation_id, user_id, entry_data)
    entry.source_type = "payment"
    entry.source_id = payment_id
    
    # Auto-post
    await post_journal_entry(db, organisation_id, entry.id, user_id)
    
    return entry


async def create_entry_from_expense(
    db: AsyncSession,
    organisation_id: int,
    user_id: int,
    expense_id: int
) -> JournalEntry:
    """Create journal entry from an expense."""
    # Get expense
    expense = await db.execute(
        select(Expense).where(Expense.id == expense_id)
    )
    expense = expense.scalar_one_or_none()
    
    if not expense or expense.organisation_id != organisation_id:
        raise ValueError("Expense not found")
    
    # Get purchases journal
    journal = await db.execute(
        select(Journal).where(
            Journal.organisation_id == organisation_id,
            Journal.journal_type == "purchases"
        )
    )
    journal = journal.scalar_one_or_none()
    if not journal:
        # Fall back to general journal
        journal = await db.execute(
            select(Journal).where(
                Journal.organisation_id == organisation_id,
                Journal.journal_type == "general"
            )
        )
        journal = journal.scalar_one_or_none()
    
    if not journal:
        raise ValueError("Journal not found")
    
    # Get active fiscal year
    fiscal_year = await get_active_fiscal_year(db, organisation_id)
    if not fiscal_year:
        raise ValueError("No active fiscal year")
    
    # Get default accounts
    expense_account = await _get_default_account(db, organisation_id, "expenses")
    
    # Determine cash/bank account based on payment method
    if expense.payment_method == "CASH":
        cash_account = await _get_default_account(db, organisation_id, "cash")
    else:
        cash_account = await _get_default_account(db, organisation_id, "bank")
    
    if not expense_account or not cash_account:
        raise ValueError("Default accounts not configured")
    
    # Prepare lines
    lines = [
        {
            "account_id": expense_account.id,
            "description": expense.description,
            "debit": float(expense.amount),
            "credit": 0,
        },
        {
            "account_id": cash_account.id,
            "description": f"Dépense: {expense.description}",
            "debit": 0,
            "credit": float(expense.amount),
        },
    ]
    
    # Create entry
    entry_data = JournalEntryCreate(
        journal_id=journal.id,
        fiscal_year_id=fiscal_year.id,
        entry_date=expense.expense_date.date() if isinstance(expense.expense_date, datetime) else expense.expense_date,
        document_date=expense.expense_date.date() if isinstance(expense.expense_date, datetime) else expense.expense_date,
        document_ref=expense.reference,
        description=f"Dépense: {expense.description}",
        lines=[JournalEntryLineCreate(**line) for line in lines],
    )
    
    entry = await create_journal_entry(db, organisation_id, user_id, entry_data)
    entry.source_type = "expense"
    entry.source_id = expense_id
    
    # Auto-post
    await post_journal_entry(db, organisation_id, entry.id, user_id)
    
    return entry


async def _get_default_account(
    db: AsyncSession,
    organisation_id: int,
    account_key: str
) -> Account | None:
    """Get the default account for a given key."""
    result = await db.execute(
        select(DefaultAccount).where(
            DefaultAccount.organisation_id == organisation_id,
            DefaultAccount.account_key == account_key
        ).options(selectinload(DefaultAccount.account))
    )
    default = result.scalar_one_or_none()
    return default.account if default else None


# ── Reconciliation ───────────────────────────────────────────────────
async def get_unreconciled_items(
    db: AsyncSession,
    organisation_id: int,
    account_id: int,
    third_party_type: str | None = None
) -> list[dict]:
    """Get unreconciled items for an account."""
    query = select(JournalEntryLine).join(JournalEntry).where(
        JournalEntry.organisation_id == organisation_id,
        JournalEntryLine.account_id == account_id,
        JournalEntry.status == "posted",
        JournalEntryLine.letter_code == None,
    ).options(
        selectinload(JournalEntryLine.entry)
    )
    
    if third_party_type:
        query = query.where(JournalEntryLine.third_party_type == third_party_type)
    
    result = await db.execute(query)
    lines = result.scalars().all()
    
    items = []
    for line in lines:
        third_party_name = None
        if line.third_party_type == "customer" and line.third_party_id:
            customer = await db.get(Customer, line.third_party_id)
            third_party_name = customer.name if customer else None
        elif line.third_party_type == "supplier" and line.third_party_id:
            supplier = await db.get(Supplier, line.third_party_id)
            third_party_name = supplier.name if supplier else None
        
        items.append({
            "line_id": line.id,
            "entry_number": line.entry.entry_number,
            "entry_date": line.entry.entry_date,
            "description": line.description,
            "debit": float(line.debit),
            "credit": float(line.credit),
            "third_party_name": third_party_name,
            "document_ref": line.entry.document_ref,
        })
    
    return items


async def reconcile_items(
    db: AsyncSession,
    organisation_id: int,
    user_id: int,
    data: ReconciliationCreate
) -> AccountReconciliation:
    """Reconcile (letter) multiple journal entry lines."""
    # Validate account
    account = await db.get(Account, data.account_id)
    if not account or account.organisation_id != organisation_id:
        raise ValueError("Account not found")
    
    # Get existing letter codes
    existing = await db.execute(
        select(AccountReconciliation.letter_code).where(
            AccountReconciliation.organisation_id == organisation_id,
            AccountReconciliation.account_id == data.account_id
        ).order_by(AccountReconciliation.letter_code.desc())
    )
    existing_codes = [row[0] for row in existing.fetchall()]
    
    # Generate next letter code
    if not existing_codes:
        letter_code = "A"
    else:
        last_code = existing_codes[0]
        # Simple increment logic: A -> B -> ... -> Z -> AA -> AB
        if len(last_code) == 1:
            if last_code < "Z":
                letter_code = chr(ord(last_code) + 1)
            else:
                letter_code = "AA"
        else:
            prefix = last_code[:-1]
            suffix = last_code[-1]
            if suffix < "Z":
                letter_code = prefix + chr(ord(suffix) + 1)
            else:
                letter_code = prefix + "A" + "A"  # Simplified
    
    # Create reconciliation
    reconciliation = AccountReconciliation(
        organisation_id=organisation_id,
        account_id=data.account_id,
        letter_code=letter_code,
        reconciled_by=user_id,
    )
    db.add(reconciliation)
    await db.flush()
    
    # Update lines
    for item in data.lines:
        line = await db.get(JournalEntryLine, item.line_id)
        if line:
            line.letter_code = letter_code
    
    await db.flush()
    await db.refresh(reconciliation)
    return reconciliation


async def undo_reconciliation(
    db: AsyncSession,
    organisation_id: int,
    reconciliation_id: int
) -> bool:
    """Undo a reconciliation."""
    reconciliation = await db.get(AccountReconciliation, reconciliation_id)
    if not reconciliation or reconciliation.organisation_id != organisation_id:
        raise ValueError("Reconciliation not found")
    
    # Remove letter code from lines
    letter_code = reconciliation.letter_code
    lines = await db.execute(
        select(JournalEntryLine).where(
            JournalEntryLine.letter_code == letter_code
        )
    )
    for line in lines.scalars().all():
        line.letter_code = None
    
    await db.delete(reconciliation)
    await db.flush()
    return True


# ── Tax Rate Management ──────────────────────────────────────────────
async def create_tax_rate(
    db: AsyncSession,
    organisation_id: int,
    data: TaxRateCreate
) -> TaxRate:
    """Create a new tax rate."""
    tax_rate = TaxRate(
        organisation_id=organisation_id,
        name=data.name,
        rate=data.rate,
        account_id=data.account_id,
        is_default=data.is_default,
    )
    
    # If this is set as default, unset other defaults
    if data.is_default:
        existing_defaults = await db.execute(
            select(TaxRate).where(
                TaxRate.organisation_id == organisation_id,
                TaxRate.is_default == True
            )
        )
        for existing in existing_defaults.scalars().all():
            existing.is_default = False
    
    db.add(tax_rate)
    await db.flush()
    await db.refresh(tax_rate)
    return tax_rate


async def get_tax_rates(
    db: AsyncSession,
    organisation_id: int
) -> list[TaxRate]:
    """Get all tax rates for an organisation."""
    result = await db.execute(
        select(TaxRate).where(
            TaxRate.organisation_id == organisation_id,
            TaxRate.is_active == True
        ).order_by(TaxRate.rate)
    )
    return list(result.scalars().all())
