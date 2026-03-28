"""Pydantic schemas for OHADA Accounting — FacturePro Africa."""
from __future__ import annotations

from datetime import datetime, date
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Fiscal Year Schemas ────────────────────────────────────────────
class FiscalYearCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    start_date: date
    end_date: date
    opening_balance: float = Field(default=0.0, ge=0)


class FiscalYearUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    start_date: date | None = None
    end_date: date | None = None


class FiscalYearClose(BaseModel):
    closing_notes: str | None = Field(None, max_length=500)


class FiscalYearOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    start_date: date
    end_date: date
    is_closed: bool
    closed_at: datetime | None
    closed_by: int | None
    opening_balance: float
    created_at: datetime


# ── Account Schemas ─────────────────────────────────────────────────
class AccountCreate(BaseModel):
    number: str = Field(min_length=1, max_length=10)
    name: str = Field(min_length=1, max_length=200)
    account_type: str = Field(pattern="^(asset|liability|equity|income|expense)$")
    category: str = Field(pattern="^classe_[1-8]$")
    parent_id: int | None = None
    allow_manual_entry: bool = True


class AccountUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    is_active: bool | None = None
    allow_manual_entry: bool | None = None


class AccountOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    number: str
    name: str
    account_type: str
    category: str
    parent_id: int | None
    is_active: bool
    allow_manual_entry: bool
    is_system: bool
    debit_balance: float
    credit_balance: float
    created_at: datetime


class AccountTreeOut(AccountOut):
    """Account with children for tree view."""
    children: list["AccountTreeOut"] = []
    balance: float = 0.0  # Calculated balance (debit - credit or credit - debit based on type)


class AccountBalanceOut(BaseModel):
    """Account balance details."""
    account_id: int
    account_number: str
    account_name: str
    account_type: str
    opening_balance: float
    debit_total: float
    credit_total: float
    closing_balance: float
    balance_direction: str  # "debit" or "credit"


# ── Journal Schemas ─────────────────────────────────────────────────
class JournalCreate(BaseModel):
    code: str = Field(min_length=1, max_length=10)
    name: str = Field(min_length=1, max_length=100)
    journal_type: str = Field(pattern="^(sales|purchases|cash|bank|general)$")


class JournalUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    is_active: bool | None = None


class JournalOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    code: str
    name: str
    journal_type: str
    is_active: bool
    last_entry_number: int
    created_at: datetime


# ── Journal Entry Line Schemas ──────────────────────────────────────
class JournalEntryLineCreate(BaseModel):
    account_id: int
    description: str | None = Field(None, max_length=500)
    debit: float = Field(default=0.0, ge=0)
    credit: float = Field(default=0.0, ge=0)
    third_party_type: str | None = Field(None, pattern="^(customer|supplier)$")
    third_party_id: int | None = None
    cost_center: str | None = Field(None, max_length=50)


class JournalEntryLineOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    account_id: int
    account: AccountOut
    description: str | None
    debit: float
    credit: float
    third_party_type: str | None
    third_party_id: int | None
    cost_center: str | None
    letter_code: str | None
    created_at: datetime


# ── Journal Entry Schemas ───────────────────────────────────────────
class JournalEntryCreate(BaseModel):
    journal_id: int
    fiscal_year_id: int
    entry_date: date
    document_date: date | None = None
    document_ref: str | None = Field(None, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    lines: list[JournalEntryLineCreate] = Field(min_length=2)


class JournalEntryUpdate(BaseModel):
    entry_date: date | None = None
    document_date: date | None = None
    document_ref: str | None = None
    description: str | None = Field(None, max_length=500)
    lines: list[JournalEntryLineCreate] | None = None


class JournalEntryOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    journal_id: int
    journal: JournalOut
    fiscal_year_id: int
    fiscal_year: FiscalYearOut
    entry_number: str
    entry_date: date
    document_date: date | None
    document_ref: str | None
    source_type: str | None
    source_id: int | None
    description: str
    status: str
    total_debit: float
    total_credit: float
    is_balanced: bool
    lines: list[JournalEntryLineOut]
    created_by: int
    posted_by: int | None
    posted_at: datetime | None
    cancelled_by: int | None
    cancelled_at: datetime | None
    cancel_reason: str | None
    created_at: datetime


class JournalEntryListOut(BaseModel):
    """Simplified journal entry for list views."""
    model_config = {"from_attributes": True}
    id: int
    entry_number: str
    entry_date: date
    journal_code: str
    description: str
    status: str
    total_debit: float
    total_credit: float
    created_at: datetime


# ── Tax Rate Schemas ────────────────────────────────────────────────
class TaxRateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    rate: float = Field(ge=0, le=100)
    account_id: int | None = None
    is_default: bool = False


class TaxRateUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    rate: float | None = Field(None, ge=0, le=100)
    account_id: int | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class TaxRateOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    rate: float
    account_id: int | None
    is_default: bool
    is_active: bool
    created_at: datetime


# ── Reconciliation Schemas ──────────────────────────────────────────
class ReconciliationItem(BaseModel):
    line_id: int
    amount: float  # Amount to reconcile


class ReconciliationCreate(BaseModel):
    account_id: int
    lines: list[ReconciliationItem]


class ReconciliationOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    account_id: int
    letter_code: str
    reconciled_at: datetime
    reconciled_by: int
    lines: list[JournalEntryLineOut]


class UnreconciledItemOut(BaseModel):
    """Unreconciled line for reconciliation view."""
    line_id: int
    entry_number: str
    entry_date: date
    description: str | None
    debit: float
    credit: float
    third_party_name: str | None
    document_ref: str | None


# ── Financial Report Schemas ────────────────────────────────────────
class TrialBalanceLine(BaseModel):
    """Line in trial balance (Balance Générale)."""
    account_number: str
    account_name: str
    category: str
    account_type: str
    opening_debit: float
    opening_credit: float
    movement_debit: float
    movement_credit: float
    closing_debit: float
    closing_credit: float


class TrialBalance(BaseModel):
    """Balance Générale (Trial Balance)."""
    organisation_id: int
    organisation_name: str
    fiscal_year: str
    period_start: date
    period_end: date
    currency: str
    lines: list[TrialBalanceLine]
    total_opening_debit: float
    total_opening_credit: float
    total_movement_debit: float
    total_movement_credit: float
    total_closing_debit: float
    total_closing_credit: float
    is_balanced: bool
    generated_at: datetime


class GeneralLedgerLine(BaseModel):
    """Line in general ledger (Grand Livre)."""
    entry_number: str
    entry_date: date
    document_ref: str | None
    description: str
    debit: float
    credit: float
    balance: float
    letter_code: str | None


class GeneralLedgerAccount(BaseModel):
    """General ledger for a single account."""
    account_id: int
    account_number: str
    account_name: str
    account_type: str
    opening_balance: float
    opening_direction: str  # "debit" or "credit"
    lines: list[GeneralLedgerLine]
    closing_balance: float
    closing_direction: str
    total_debit: float
    total_credit: float


class GeneralLedger(BaseModel):
    """Grand Livre (General Ledger)."""
    organisation_id: int
    organisation_name: str
    fiscal_year: str
    period_start: date
    period_end: date
    currency: str
    accounts: list[GeneralLedgerAccount]
    generated_at: datetime


class JournalReportLine(BaseModel):
    """Line in journal report."""
    entry_number: str
    entry_date: date
    document_ref: str | None
    description: str
    account_number: str
    account_name: str
    debit: float
    credit: float
    third_party: str | None


class JournalReport(BaseModel):
    """Journal Centralisateur (Centralizing Journal)."""
    organisation_id: int
    organisation_name: str
    journal_code: str
    journal_name: str
    period_start: date
    period_end: date
    currency: str
    lines: list[JournalReportLine]
    total_debit: float
    total_credit: float
    generated_at: datetime


# ── Income Statement Schemas ────────────────────────────────────────
class IncomeStatementLine(BaseModel):
    """Line in income statement (Compte de Résultat)."""
    account_number: str
    account_name: str
    category: str
    amount: float
    percentage: float  # Percentage of total revenue


class IncomeStatementSection(BaseModel):
    """Section in income statement."""
    title: str
    lines: list[IncomeStatementLine]
    total: float


class IncomeStatement(BaseModel):
    """Compte de Résultat (Income Statement)."""
    organisation_id: int
    organisation_name: str
    fiscal_year: str
    period_start: date
    period_end: date
    currency: str
    
    # Operating income
    operating_income: IncomeStatementSection
    # Operating expenses
    operating_expenses: IncomeStatementSection
    # Operating result
    operating_result: float
    
    # Financial income
    financial_income: IncomeStatementSection
    # Financial expenses
    financial_expenses: IncomeStatementSection
    # Financial result
    financial_result: float
    
    # Ordinary result
    ordinary_result: float
    
    # Extraordinary income
    extraordinary_income: IncomeStatementSection
    # Extraordinary expenses
    extraordinary_expenses: IncomeStatementSection
    # Extraordinary result
    extraordinary_result: float
    
    # Net result before tax
    net_result_before_tax: float
    # Income tax
    income_tax: float
    # Net result
    net_result: float
    
    generated_at: datetime


# ── Balance Sheet Schemas ───────────────────────────────────────────
class BalanceSheetLine(BaseModel):
    """Line in balance sheet (Bilan)."""
    account_number: str
    account_name: str
    gross_amount: float
    depreciation: float
    net_amount: float
    previous_year: float | None = None


class BalanceSheetSection(BaseModel):
    """Section in balance sheet."""
    title: str
    lines: list[BalanceSheetLine]
    total_gross: float
    total_depreciation: float
    total_net: float


class BalanceSheet(BaseModel):
    """Bilan Simplifié (Simplified Balance Sheet)."""
    organisation_id: int
    organisation_name: str
    fiscal_year: str
    as_of_date: date
    currency: str
    
    # ASSETS (Actif)
    # Fixed assets (Immobilisations)
    fixed_assets: BalanceSheetSection
    # Current assets (Actif circulant)
    current_assets: BalanceSheetSection
    # Cash and equivalents (Trésorerie)
    cash_and_equivalents: BalanceSheetSection
    # Total assets
    total_assets: float
    
    # LIABILITIES & EQUITY (Passif)
    # Capital and reserves (Capitaux et réserves)
    equity: BalanceSheetSection
    # Long-term liabilities (Dettes à long terme)
    long_term_liabilities: BalanceSheetSection
    # Current liabilities (Dettes à court terme)
    current_liabilities: BalanceSheetSection
    # Total liabilities and equity
    total_liabilities_and_equity: float
    
    # Check balance
    is_balanced: bool
    
    generated_at: datetime


# ── Aged Balance Schemas ────────────────────────────────────────────
class AgedBalanceLine(BaseModel):
    """Line in aged balance (Balance Âgée)."""
    third_party_id: int
    third_party_name: str
    third_party_type: str  # "customer" or "supplier"
    account_number: str
    total: float
    current: float  # Not due yet
    days_1_30: float  # 1-30 days overdue
    days_31_60: float  # 31-60 days overdue
    days_61_90: float  # 61-90 days overdue
    days_over_90: float  # Over 90 days overdue


class AgedBalance(BaseModel):
    """Balance Âgée (Aged Balance)."""
    organisation_id: int
    organisation_name: str
    as_of_date: date
    balance_type: str  # "customer" or "supplier"
    currency: str
    lines: list[AgedBalanceLine]
    total_current: float
    total_1_30: float
    total_31_60: float
    total_61_90: float
    total_over_90: float
    grand_total: float
    generated_at: datetime


# ── PDF Export Request ──────────────────────────────────────────────
class PDFExportRequest(BaseModel):
    report_type: str = Field(pattern="^(trial_balance|general_ledger|journal|income_statement|balance_sheet|aged_balance)$")
    format: str = Field(default="pdf", pattern="^(pdf|excel)$")
    period_start: date
    period_end: date
    journal_id: int | None = None  # For journal report
    account_id: int | None = None  # For general ledger
    balance_type: str | None = None  # For aged balance: "customer" or "supplier"


# ── Pagination ──────────────────────────────────────────────────────
class PaginatedJournalEntries(BaseModel):
    items: list[JournalEntryListOut]
    total: int
    page: int
    size: int
    pages: int


# ── Dashboard Stats ─────────────────────────────────────────────────
class AccountingDashboardStats(BaseModel):
    """Statistics for accounting dashboard."""
    fiscal_year: str
    period_start: date
    period_end: date
    
    # Revenue and expenses
    total_revenue: float
    total_expenses: float
    net_result: float
    
    # Key metrics
    accounts_receivable: float
    accounts_payable: float
    cash_balance: float
    bank_balance: float
    
    # Entry counts
    total_entries: int
    posted_entries: int
    draft_entries: int
    
    # Reconciliation status
    unreconciled_customer_items: int
    unreconciled_supplier_items: int
    
    # Chart breakdown
    revenue_by_account: list[dict[str, Any]]
    expenses_by_account: list[dict[str, Any]]
