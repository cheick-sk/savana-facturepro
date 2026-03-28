"""Financial Reports Service — FacturePro Africa.

Generates OHADA-compliant financial reports:
- Balance Générale (Trial Balance)
- Grand Livre (General Ledger)
- Journal Centralisateur (Centralizing Journal)
- Compte de Résultat (Income Statement)
- Bilan Simplifié (Simplified Balance Sheet)
- Balance Âgée (Aged Balance)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.accounting import (
    FiscalYear, Account, Journal, JournalEntry, JournalEntryLine,
    AccountReconciliation
)
from app.models.all_models import Organisation, Customer, Supplier
from app.schemas.accounting import (
    TrialBalance, TrialBalanceLine,
    GeneralLedger, GeneralLedgerAccount, GeneralLedgerLine,
    JournalReport, JournalReportLine,
    IncomeStatement, IncomeStatementSection, IncomeStatementLine,
    BalanceSheet, BalanceSheetSection, BalanceSheetLine,
    AgedBalance, AgedBalanceLine,
)

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


# ── Trial Balance (Balance Générale) ─────────────────────────────────
async def generate_trial_balance(
    db: AsyncSession,
    organisation_id: int,
    period_start: date,
    period_end: date,
    include_zero_balances: bool = False
) -> TrialBalance:
    """
    Generate the Trial Balance (Balance Générale).
    
    This report shows all accounts with their opening balances, 
    movements during the period, and closing balances.
    """
    # Get organisation info
    org = await db.get(Organisation, organisation_id)
    if not org:
        raise ValueError("Organisation not found")
    
    # Get fiscal year
    fiscal_year = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == organisation_id,
            FiscalYear.start_date <= period_start,
            FiscalYear.end_date >= period_end
        )
    )
    fiscal_year = fiscal_year.scalar_one_or_none()
    
    # Get all active accounts
    accounts = await db.execute(
        select(Account).where(
            Account.organisation_id == organisation_id,
            Account.is_active == True
        ).order_by(Account.number)
    )
    accounts = list(accounts.scalars().all())
    
    lines = []
    total_opening_debit = 0.0
    total_opening_credit = 0.0
    total_movement_debit = 0.0
    total_movement_credit = 0.0
    total_closing_debit = 0.0
    total_closing_credit = 0.0
    
    for account in accounts:
        # Get opening balance (before period_start)
        opening_query = select(
            func.coalesce(func.sum(JournalEntryLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalEntryLine.credit), 0).label("credit"),
        ).join(JournalEntry).where(
            JournalEntryLine.account_id == account.id,
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.status == "posted",
            JournalEntry.entry_date < period_start,
        )
        opening = (await db.execute(opening_query)).one()
        
        # Get movements during period
        movement_query = select(
            func.coalesce(func.sum(JournalEntryLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalEntryLine.credit), 0).label("credit"),
        ).join(JournalEntry).where(
            JournalEntryLine.account_id == account.id,
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.status == "posted",
            JournalEntry.entry_date >= period_start,
            JournalEntry.entry_date <= period_end,
        )
        movement = (await db.execute(movement_query)).one()
        
        # Calculate balances
        opening_debit = float(opening.debit or 0)
        opening_credit = float(opening.credit or 0)
        movement_debit = float(movement.debit or 0)
        movement_credit = float(movement.credit or 0)
        
        # Calculate closing based on account type
        if account.account_type in ("asset", "expense"):
            closing_debit = opening_debit + movement_debit - opening_credit - movement_credit
            closing_credit = 0.0
            if closing_debit < 0:
                closing_credit = abs(closing_debit)
                closing_debit = 0.0
        else:
            closing_credit = opening_credit + movement_credit - opening_debit - movement_debit
            closing_debit = 0.0
            if closing_credit < 0:
                closing_debit = abs(closing_credit)
                closing_credit = 0.0
        
        # Skip zero balances if requested
        if not include_zero_balances:
            if all(v == 0 for v in [opening_debit, opening_credit, movement_debit, movement_credit, closing_debit, closing_credit]):
                continue
        
        line = TrialBalanceLine(
            account_number=account.number,
            account_name=account.name,
            category=account.category,
            account_type=account.account_type,
            opening_debit=opening_debit,
            opening_credit=opening_credit,
            movement_debit=movement_debit,
            movement_credit=movement_credit,
            closing_debit=closing_debit,
            closing_credit=closing_credit,
        )
        lines.append(line)
        
        # Add to totals
        total_opening_debit += opening_debit
        total_opening_credit += opening_credit
        total_movement_debit += movement_debit
        total_movement_credit += movement_credit
        total_closing_debit += closing_debit
        total_closing_credit += closing_credit
    
    return TrialBalance(
        organisation_id=organisation_id,
        organisation_name=org.name,
        fiscal_year=fiscal_year.name if fiscal_year else f"Exercice {period_start.year}",
        period_start=period_start,
        period_end=period_end,
        currency=org.currency or "XOF",
        lines=lines,
        total_opening_debit=round(total_opening_debit, 2),
        total_opening_credit=round(total_opening_credit, 2),
        total_movement_debit=round(total_movement_debit, 2),
        total_movement_credit=round(total_movement_credit, 2),
        total_closing_debit=round(total_closing_debit, 2),
        total_closing_credit=round(total_closing_credit, 2),
        is_balanced=abs(total_closing_debit - total_closing_credit) < 0.01,
        generated_at=datetime.now(timezone.utc),
    )


# ── General Ledger (Grand Livre) ─────────────────────────────────────
async def generate_general_ledger(
    db: AsyncSession,
    organisation_id: int,
    period_start: date,
    period_end: date,
    account_id: int | None = None
) -> GeneralLedger:
    """
    Generate the General Ledger (Grand Livre).
    
    Shows detailed transactions for each account.
    """
    # Get organisation info
    org = await db.get(Organisation, organisation_id)
    if not org:
        raise ValueError("Organisation not found")
    
    # Get fiscal year
    fiscal_year = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == organisation_id,
            FiscalYear.start_date <= period_start,
            FiscalYear.end_date >= period_end
        )
    )
    fiscal_year = fiscal_year.scalar_one_or_none()
    
    # Get accounts to include
    query = select(Account).where(
        Account.organisation_id == organisation_id,
        Account.is_active == True
    )
    if account_id:
        query = query.where(Account.id == account_id)
    
    accounts = await db.execute(query.order_by(Account.number))
    accounts = list(accounts.scalars().all())
    
    ledger_accounts = []
    
    for account in accounts:
        # Get opening balance
        opening_query = select(
            func.coalesce(func.sum(JournalEntryLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalEntryLine.credit), 0).label("credit"),
        ).join(JournalEntry).where(
            JournalEntryLine.account_id == account.id,
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.status == "posted",
            JournalEntry.entry_date < period_start,
        )
        opening = (await db.execute(opening_query)).one()
        
        opening_debit = float(opening.debit or 0)
        opening_credit = float(opening.credit or 0)
        
        if account.account_type in ("asset", "expense"):
            opening_balance = opening_debit - opening_credit
            opening_direction = "debit" if opening_balance >= 0 else "credit"
        else:
            opening_balance = opening_credit - opening_debit
            opening_direction = "credit" if opening_balance >= 0 else "debit"
        
        # Get lines for period
        lines_query = select(JournalEntryLine).join(JournalEntry).where(
            JournalEntryLine.account_id == account.id,
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.status == "posted",
            JournalEntry.entry_date >= period_start,
            JournalEntry.entry_date <= period_end,
        ).options(selectinload(JournalEntryLine.entry)).order_by(
            JournalEntry.entry_date,
            JournalEntry.entry_number
        )
        
        lines_result = await db.execute(lines_query)
        lines = lines_result.scalars().all()
        
        if not lines and opening_balance == 0:
            continue
        
        # Build line details
        running_balance = abs(opening_balance)
        ledger_lines = []
        total_debit = 0.0
        total_credit = 0.0
        
        for line in lines:
            running_balance += float(line.debit) - float(line.credit)
            total_debit += float(line.debit)
            total_credit += float(line.credit)
            
            ledger_lines.append(GeneralLedgerLine(
                entry_number=line.entry.entry_number,
                entry_date=line.entry.entry_date,
                document_ref=line.entry.document_ref,
                description=line.description or line.entry.description,
                debit=float(line.debit),
                credit=float(line.credit),
                balance=abs(running_balance),
                letter_code=line.letter_code,
            ))
        
        # Calculate closing
        if account.account_type in ("asset", "expense"):
            closing_balance = opening_balance + total_debit - total_credit
            closing_direction = "debit" if closing_balance >= 0 else "credit"
        else:
            closing_balance = opening_balance + total_credit - total_debit
            closing_direction = "credit" if closing_balance >= 0 else "debit"
        
        ledger_accounts.append(GeneralLedgerAccount(
            account_id=account.id,
            account_number=account.number,
            account_name=account.name,
            account_type=account.account_type,
            opening_balance=abs(opening_balance),
            opening_direction=opening_direction,
            lines=ledger_lines,
            closing_balance=abs(closing_balance),
            closing_direction=closing_direction,
            total_debit=round(total_debit, 2),
            total_credit=round(total_credit, 2),
        ))
    
    return GeneralLedger(
        organisation_id=organisation_id,
        organisation_name=org.name,
        fiscal_year=fiscal_year.name if fiscal_year else f"Exercice {period_start.year}",
        period_start=period_start,
        period_end=period_end,
        currency=org.currency or "XOF",
        accounts=ledger_accounts,
        generated_at=datetime.now(timezone.utc),
    )


# ── Journal Report (Journal Centralisateur) ──────────────────────────
async def generate_journal_report(
    db: AsyncSession,
    organisation_id: int,
    journal_id: int,
    period_start: date,
    period_end: date
) -> JournalReport:
    """
    Generate the Journal Centralisateur for a specific journal.
    """
    # Get organisation info
    org = await db.get(Organisation, organisation_id)
    if not org:
        raise ValueError("Organisation not found")
    
    # Get journal
    journal = await db.get(Journal, journal_id)
    if not journal or journal.organisation_id != organisation_id:
        raise ValueError("Journal not found")
    
    # Get entries
    entries = await db.execute(
        select(JournalEntry).where(
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.journal_id == journal_id,
            JournalEntry.status == "posted",
            JournalEntry.entry_date >= period_start,
            JournalEntry.entry_date <= period_end,
        ).options(
            selectinload(JournalEntry.lines).selectinload(JournalEntryLine.account)
        ).order_by(JournalEntry.entry_date, JournalEntry.entry_number)
    )
    entries = list(entries.scalars().all())
    
    lines = []
    total_debit = 0.0
    total_credit = 0.0
    
    for entry in entries:
        for line in entry.lines:
            # Get third party name
            third_party = None
            if line.third_party_type == "customer" and line.third_party_id:
                customer = await db.get(Customer, line.third_party_id)
                third_party = customer.name if customer else None
            elif line.third_party_type == "supplier" and line.third_party_id:
                supplier = await db.get(Supplier, line.third_party_id)
                third_party = supplier.name if supplier else None
            
            lines.append(JournalReportLine(
                entry_number=entry.entry_number,
                entry_date=entry.entry_date,
                document_ref=entry.document_ref,
                description=line.description or entry.description,
                account_number=line.account.number,
                account_name=line.account.name,
                debit=float(line.debit),
                credit=float(line.credit),
                third_party=third_party,
            ))
            total_debit += float(line.debit)
            total_credit += float(line.credit)
    
    return JournalReport(
        organisation_id=organisation_id,
        organisation_name=org.name,
        journal_code=journal.code,
        journal_name=journal.name,
        period_start=period_start,
        period_end=period_end,
        currency=org.currency or "XOF",
        lines=lines,
        total_debit=round(total_debit, 2),
        total_credit=round(total_credit, 2),
        generated_at=datetime.now(timezone.utc),
    )


# ── Income Statement (Compte de Résultat) ────────────────────────────
async def generate_income_statement(
    db: AsyncSession,
    organisation_id: int,
    period_start: date,
    period_end: date
) -> IncomeStatement:
    """
    Generate the Income Statement (Compte de Résultat).
    
    Follows OHADA structure with:
    - Operating income/expenses
    - Financial income/expenses
    - Extraordinary income/expenses
    """
    # Get organisation info
    org = await db.get(Organisation, organisation_id)
    if not org:
        raise ValueError("Organisation not found")
    
    # Get fiscal year
    fiscal_year = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == organisation_id,
            FiscalYear.start_date <= period_start,
            FiscalYear.end_date >= period_end
        )
    )
    fiscal_year = fiscal_year.scalar_one_or_none()
    
    async def get_account_totals(category_prefix: str) -> list[tuple[str, str, float]]:
        """Get totals for accounts matching a category prefix."""
        query = select(
            Account.number,
            Account.name,
            func.coalesce(func.sum(JournalEntryLine.credit), 0).label("credit"),
            func.coalesce(func.sum(JournalEntryLine.debit), 0).label("debit"),
        ).join(JournalEntryLine).join(JournalEntry).where(
            Account.organisation_id == organisation_id,
            Account.number.like(f"{category_prefix}%"),
            JournalEntry.status == "posted",
            JournalEntry.entry_date >= period_start,
            JournalEntry.entry_date <= period_end,
        ).group_by(Account.id, Account.number, Account.name).order_by(Account.number)
        
        result = await db.execute(query)
        return [(row.number, row.name, float(row.credit), float(row.debit)) for row in result.fetchall()]
    
    async def build_section(account_prefix: str, is_credit: bool = True) -> tuple[IncomeStatementSection, float]:
        """Build an income statement section."""
        accounts = await get_account_totals(account_prefix)
        lines = []
        total = 0.0
        
        for number, name, credit, debit in accounts:
            amount = credit if is_credit else debit
            if amount > 0:
                lines.append(IncomeStatementLine(
                    account_number=number,
                    account_name=name,
                    category=f"classe_{account_prefix}",
                    amount=amount,
                    percentage=0,  # Will calculate after
                ))
                total += amount
        
        return IncomeStatementSection(
            title=_get_section_title(account_prefix),
            lines=lines,
            total=round(total, 2),
        ), total
    
    # Build sections
    # Operating income (Classe 7: 70-75)
    operating_income, total_op_income = await build_section("70", True)
    # Add other operating income accounts
    for prefix in ["71", "72", "74", "75"]:
        section, total = await build_section(prefix, True)
        operating_income.lines.extend(section.lines)
        operating_income.total += total
        total_op_income += total
    
    # Operating expenses (Classe 6: 60-65)
    operating_expenses, total_op_expenses = await build_section("60", False)
    for prefix in ["61", "62", "63", "64", "65"]:
        section, total = await build_section(prefix, False)
        operating_expenses.lines.extend(section.lines)
        operating_expenses.total += total
        total_op_expenses += total
    
    # Calculate percentages
    revenue_base = total_op_income if total_op_income > 0 else 1
    for line in operating_income.lines:
        line.percentage = round((line.amount / revenue_base) * 100, 1)
    for line in operating_expenses.lines:
        line.percentage = round((line.amount / revenue_base) * 100, 1)
    
    operating_result = total_op_income - total_op_expenses
    
    # Financial income (Classe 7: 76)
    financial_income, total_fin_income = await build_section("76", True)
    
    # Financial expenses (Classe 6: 66)
    financial_expenses, total_fin_expenses = await build_section("66", False)
    
    financial_result = total_fin_income - total_fin_expenses
    
    # Ordinary result
    ordinary_result = operating_result + financial_result
    
    # Extraordinary income (Classe 7: 77)
    extraordinary_income, total_extra_income = await build_section("77", True)
    extra_income_84, total_84 = await build_section("84", True)
    extraordinary_income.lines.extend(extra_income_84.lines)
    extraordinary_income.total += total_84
    total_extra_income += total_84
    
    # Extraordinary expenses (Classe 6: 67, 83)
    extraordinary_expenses, total_extra_expenses = await build_section("67", False)
    extra_exp_83, total_83 = await build_section("83", False)
    extraordinary_expenses.lines.extend(extra_exp_83.lines)
    extraordinary_expenses.total += total_83
    total_extra_expenses += total_83
    
    extraordinary_result = total_extra_income - total_extra_expenses
    
    # Net result before tax
    net_result_before_tax = ordinary_result + extraordinary_result
    
    # Income tax (Classe 6: 69)
    income_tax_accounts = await get_account_totals("69")
    income_tax = sum(debit for _, _, _, debit in income_tax_accounts)
    
    # Net result
    net_result = net_result_before_tax - income_tax
    
    return IncomeStatement(
        organisation_id=organisation_id,
        organisation_name=org.name,
        fiscal_year=fiscal_year.name if fiscal_year else f"Exercice {period_start.year}",
        period_start=period_start,
        period_end=period_end,
        currency=org.currency or "XOF",
        operating_income=operating_income,
        operating_expenses=operating_expenses,
        operating_result=round(operating_result, 2),
        financial_income=financial_income,
        financial_expenses=financial_expenses,
        financial_result=round(financial_result, 2),
        ordinary_result=round(ordinary_result, 2),
        extraordinary_income=extraordinary_income,
        extraordinary_expenses=extraordinary_expenses,
        extraordinary_result=round(extraordinary_result, 2),
        net_result_before_tax=round(net_result_before_tax, 2),
        income_tax=round(income_tax, 2),
        net_result=round(net_result, 2),
        generated_at=datetime.now(timezone.utc),
    )


def _get_section_title(prefix: str) -> str:
    """Get the title for an account prefix."""
    titles = {
        "60": "Achats consommés",
        "61": "Services extérieurs",
        "62": "Autres services extérieurs",
        "63": "Charges de personnel",
        "64": "Impôts et taxes",
        "65": "Autres charges",
        "66": "Charges financières",
        "67": "Charges extraordinaires",
        "69": "Impôts sur les bénéfices",
        "70": "Ventes et produits annexes",
        "71": "Production stockée",
        "72": "Production immobilisée",
        "74": "Subventions d'exploitation",
        "75": "Autres produits de gestion",
        "76": "Produits financiers",
        "77": "Produits extraordinaires",
        "83": "Charges hors activités ordinaires",
        "84": "Produits hors activités ordinaires",
    }
    return titles.get(prefix, f"Comptes {prefix}x")


# ── Balance Sheet (Bilan) ────────────────────────────────────────────
async def generate_balance_sheet(
    db: AsyncSession,
    organisation_id: int,
    as_of_date: date
) -> BalanceSheet:
    """
    Generate the Simplified Balance Sheet (Bilan Simplifié).
    
    Follows OHADA structure with:
    - Assets (Actif): Fixed assets, Current assets, Cash
    - Liabilities & Equity (Passif): Capital, Long-term debt, Current liabilities
    """
    # Get organisation info
    org = await db.get(Organisation, organisation_id)
    if not org:
        raise ValueError("Organisation not found")
    
    # Get fiscal year
    fiscal_year = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == organisation_id,
            FiscalYear.start_date <= as_of_date,
            FiscalYear.end_date >= as_of_date
        )
    )
    fiscal_year = fiscal_year.scalar_one_or_none()
    
    async def get_account_balances(account_prefixes: list[str]) -> list[tuple[str, str, float, float]]:
        """Get balances for accounts matching prefixes."""
        from sqlalchemy import or_
        
        conditions = [Account.number.like(f"{p}%") for p in account_prefixes]
        
        query = select(
            Account.number,
            Account.name,
            func.coalesce(func.sum(JournalEntryLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalEntryLine.credit), 0).label("credit"),
        ).join(JournalEntryLine).join(JournalEntry).where(
            Account.organisation_id == organisation_id,
            or_(*conditions),
            JournalEntry.status == "posted",
            JournalEntry.entry_date <= as_of_date,
        ).group_by(Account.id, Account.number, Account.name).order_by(Account.number)
        
        result = await db.execute(query)
        return [(row.number, row.name, float(row.debit), float(row.credit)) for row in result.fetchall()]
    
    async def build_asset_section(prefixes: list[str], include_depreciation: bool = False) -> tuple[BalanceSheetSection, float]:
        """Build an asset section (debit balance accounts)."""
        accounts = await get_account_balances(prefixes)
        lines = []
        total_gross = 0.0
        total_depreciation = 0.0
        
        for number, name, debit, credit in accounts:
            if number.startswith("28") or number.startswith("29"):
                # Depreciation accounts
                if include_depreciation:
                    depreciation = credit
                    total_depreciation += depreciation
                    lines.append(BalanceSheetLine(
                        account_number=number,
                        account_name=name,
                        gross_amount=0,
                        depreciation=depreciation,
                        net_amount=-depreciation,
                    ))
            else:
                gross = debit - credit
                if gross > 0:
                    total_gross += gross
                    lines.append(BalanceSheetLine(
                        account_number=number,
                        account_name=name,
                        gross_amount=gross,
                        depreciation=0,
                        net_amount=gross,
                    ))
        
        total_net = total_gross - total_depreciation
        
        return BalanceSheetSection(
            title=_get_asset_section_title(prefixes[0]),
            lines=lines,
            total_gross=round(total_gross, 2),
            total_depreciation=round(total_depreciation, 2),
            total_net=round(total_net, 2),
        ), total_net
    
    async def build_liability_section(prefixes: list[str]) -> tuple[BalanceSheetSection, float]:
        """Build a liability/equity section (credit balance accounts)."""
        accounts = await get_account_balances(prefixes)
        lines = []
        total_gross = 0.0
        
        for number, name, debit, credit in accounts:
            balance = credit - debit
            if balance > 0:
                total_gross += balance
                lines.append(BalanceSheetLine(
                    account_number=number,
                    account_name=name,
                    gross_amount=balance,
                    depreciation=0,
                    net_amount=balance,
                ))
        
        return BalanceSheetSection(
            title=_get_liability_section_title(prefixes[0]),
            lines=lines,
            total_gross=round(total_gross, 2),
            total_depreciation=0,
            total_net=round(total_gross, 2),
        ), total_gross
    
    # Build Asset sections
    fixed_assets, total_fixed = await build_asset_section(["20", "21", "22", "23", "24", "25", "26", "27"], True)
    current_assets, total_current = await build_asset_section(["30", "31", "32", "33", "34", "35", "36", "37", "38"])
    cash_and_equivalents, total_cash = await build_asset_section(["50", "51", "52", "53", "54", "55", "57", "58"])
    
    total_assets = total_fixed + total_current + total_cash
    
    # Build Liability sections
    equity, total_equity = await build_liability_section(["10", "11", "12", "13", "14"])
    long_term_liabilities, total_lt = await build_liability_section(["15", "16", "17"])
    current_liabilities, total_cl = await build_liability_section(["40", "42", "43", "44", "45", "46", "47", "48"])
    
    total_liabilities_and_equity = total_equity + total_lt + total_cl
    
    return BalanceSheet(
        organisation_id=organisation_id,
        organisation_name=org.name,
        fiscal_year=fiscal_year.name if fiscal_year else f"Exercice {as_of_date.year}",
        as_of_date=as_of_date,
        currency=org.currency or "XOF",
        fixed_assets=fixed_assets,
        current_assets=current_assets,
        cash_and_equivalents=cash_and_equivalents,
        total_assets=round(total_assets, 2),
        equity=equity,
        long_term_liabilities=long_term_liabilities,
        current_liabilities=current_liabilities,
        total_liabilities_and_equity=round(total_liabilities_and_equity, 2),
        is_balanced=abs(total_assets - total_liabilities_and_equity) < 0.01,
        generated_at=datetime.now(timezone.utc),
    )


def _get_asset_section_title(prefix: str) -> str:
    """Get the title for an asset section."""
    titles = {
        "20": "Immobilisations incorporelles",
        "21": "Immobilisations incorporelles",
        "22": "Terrains",
        "23": "Constructions",
        "24": "Matériel",
        "30": "Stocks de marchandises",
        "31": "Matières premières",
        "32": "Autres approvisionnements",
        "50": "Valeurs mobilières de placement",
        "51": "Banques",
        "53": "Caisse",
    }
    return titles.get(prefix, f"Comptes {prefix}x")


def _get_liability_section_title(prefix: str) -> str:
    """Get the title for a liability section."""
    titles = {
        "10": "Capital et réserves",
        "11": "Report à nouveau",
        "12": "Résultat de l'exercice",
        "15": "Provisions pour risques et charges",
        "16": "Emprunts et dettes assimilées",
        "40": "Fournisseurs et comptes rattachés",
        "42": "Personnel et comptes rattachés",
        "43": "Sécurité sociale et autres organismes sociaux",
        "44": "État et autres collectivités publiques",
    }
    return titles.get(prefix, f"Comptes {prefix}x")


# ── Aged Balance (Balance Âgée) ──────────────────────────────────────
async def generate_aged_balance(
    db: AsyncSession,
    organisation_id: int,
    as_of_date: date,
    balance_type: str = "customer"  # "customer" or "supplier"
) -> AgedBalance:
    """
    Generate the Aged Balance (Balance Âgée).
    
    Shows receivables/payables broken down by age.
    """
    # Get organisation info
    org = await db.get(Organisation, organisation_id)
    if not org:
        raise ValueError("Organisation not found")
    
    # Determine account prefix
    if balance_type == "customer":
        account_prefix = "411"
    else:
        account_prefix = "401"
    
    # Get relevant accounts
    accounts = await db.execute(
        select(Account).where(
            Account.organisation_id == organisation_id,
            Account.number.like(f"{account_prefix}%"),
            Account.is_active == True
        )
    )
    accounts = list(accounts.scalars().all())
    
    lines = []
    total_current = 0.0
    total_1_30 = 0.0
    total_31_60 = 0.0
    total_61_90 = 0.0
    total_over_90 = 0.0
    
    for account in accounts:
        # Get unreconciled lines for this account
        lines_query = select(JournalEntryLine).join(JournalEntry).where(
            JournalEntryLine.account_id == account.id,
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.status == "posted",
            JournalEntry.entry_date <= as_of_date,
        ).options(selectinload(JournalEntryLine.entry))
        
        result = await db.execute(lines_query)
        entry_lines = result.scalars().all()
        
        # Get third party info
        third_party_name = None
        if entry_lines:
            first_line = entry_lines[0]
            if first_line.third_party_id:
                if balance_type == "customer":
                    third_party = await db.get(Customer, first_line.third_party_id)
                    third_party_name = third_party.name if third_party else None
                else:
                    third_party = await db.get(Supplier, first_line.third_party_id)
                    third_party_name = third_party.name if third_party else None
        
        # Calculate aging
        line_total = 0.0
        line_current = 0.0
        line_1_30 = 0.0
        line_31_60 = 0.0
        line_61_90 = 0.0
        line_over_90 = 0.0
        
        for line in entry_lines:
            # Determine amount (debit for customers, credit for suppliers)
            if balance_type == "customer":
                amount = float(line.debit) - float(line.credit)
            else:
                amount = float(line.credit) - float(line.debit)
            
            if amount <= 0:
                continue
            
            line_total += amount
            
            # Calculate days overdue (assuming due date is 30 days after entry date)
            # In a real system, you'd use the actual due date from the document
            due_date = line.entry.entry_date + timedelta(days=30)
            days_overdue = (as_of_date - due_date).days
            
            if days_overdue <= 0:
                line_current += amount
            elif days_overdue <= 30:
                line_1_30 += amount
            elif days_overdue <= 60:
                line_31_60 += amount
            elif days_overdue <= 90:
                line_61_90 += amount
            else:
                line_over_90 += amount
        
        if line_total > 0:
            third_party_id = entry_lines[0].third_party_id if entry_lines else None
            
            lines.append(AgedBalanceLine(
                third_party_id=third_party_id or 0,
                third_party_name=third_party_name or account.name,
                third_party_type=balance_type,
                account_number=account.number,
                total=round(line_total, 2),
                current=round(line_current, 2),
                days_1_30=round(line_1_30, 2),
                days_31_60=round(line_31_60, 2),
                days_61_90=round(line_61_90, 2),
                days_over_90=round(line_over_90, 2),
            ))
            
            total_current += line_current
            total_1_30 += line_1_30
            total_31_60 += line_31_60
            total_61_90 += line_61_90
            total_over_90 += line_over_90
    
    grand_total = total_current + total_1_30 + total_31_60 + total_61_90 + total_over_90
    
    return AgedBalance(
        organisation_id=organisation_id,
        organisation_name=org.name,
        as_of_date=as_of_date,
        balance_type=balance_type,
        currency=org.currency or "XOF",
        lines=sorted(lines, key=lambda x: x.total, reverse=True),
        total_current=round(total_current, 2),
        total_1_30=round(total_1_30, 2),
        total_31_60=round(total_31_60, 2),
        total_61_90=round(total_61_90, 2),
        total_over_90=round(total_over_90, 2),
        grand_total=round(grand_total, 2),
        generated_at=datetime.now(timezone.utc),
    )


# ── Dashboard Stats ──────────────────────────────────────────────────
async def get_accounting_dashboard_stats(
    db: AsyncSession,
    organisation_id: int
) -> dict:
    """Get accounting dashboard statistics."""
    today = date.today()
    year_start = date(today.year, 1, 1)
    
    # Get fiscal year
    fiscal_year = await db.execute(
        select(FiscalYear).where(
            FiscalYear.organisation_id == organisation_id,
            FiscalYear.start_date <= today,
            FiscalYear.end_date >= today
        )
    )
    fiscal_year = fiscal_year.scalar_one_or_none()
    
    # Get revenue (Classe 7)
    revenue_query = select(
        func.coalesce(func.sum(JournalEntryLine.credit), 0).label("total")
    ).join(JournalEntry).join(Account).where(
        JournalEntry.organisation_id == organisation_id,
        JournalEntry.status == "posted",
        Account.category == "classe_7",
        JournalEntry.entry_date >= year_start,
        JournalEntry.entry_date <= today,
    )
    revenue = (await db.execute(revenue_query)).scalar() or 0
    
    # Get expenses (Classe 6)
    expenses_query = select(
        func.coalesce(func.sum(JournalEntryLine.debit), 0).label("total")
    ).join(JournalEntry).join(Account).where(
        JournalEntry.organisation_id == organisation_id,
        JournalEntry.status == "posted",
        Account.category == "classe_6",
        JournalEntry.entry_date >= year_start,
        JournalEntry.entry_date <= today,
    )
    expenses = (await db.execute(expenses_query)).scalar() or 0
    
    # Get accounts receivable (411)
    ar_query = select(
        func.coalesce(func.sum(JournalEntryLine.debit - JournalEntryLine.credit), 0).label("total")
    ).join(JournalEntry).join(Account).where(
        JournalEntry.organisation_id == organisation_id,
        JournalEntry.status == "posted",
        Account.number.like("411%"),
    )
    accounts_receivable = (await db.execute(ar_query)).scalar() or 0
    
    # Get accounts payable (401)
    ap_query = select(
        func.coalesce(func.sum(JournalEntryLine.credit - JournalEntryLine.debit), 0).label("total")
    ).join(JournalEntry).join(Account).where(
        JournalEntry.organisation_id == organisation_id,
        JournalEntry.status == "posted",
        Account.number.like("401%"),
    )
    accounts_payable = (await db.execute(ap_query)).scalar() or 0
    
    # Get cash balance (53)
    cash_query = select(
        func.coalesce(func.sum(JournalEntryLine.debit - JournalEntryLine.credit), 0).label("total")
    ).join(JournalEntry).join(Account).where(
        JournalEntry.organisation_id == organisation_id,
        JournalEntry.status == "posted",
        Account.number.like("53%"),
    )
    cash_balance = (await db.execute(cash_query)).scalar() or 0
    
    # Get bank balance (512)
    bank_query = select(
        func.coalesce(func.sum(JournalEntryLine.debit - JournalEntryLine.credit), 0).label("total")
    ).join(JournalEntry).join(Account).where(
        JournalEntry.organisation_id == organisation_id,
        JournalEntry.status == "posted",
        Account.number.like("512%"),
    )
    bank_balance = (await db.execute(bank_query)).scalar() or 0
    
    # Get entry counts
    total_entries = await db.execute(
        select(func.count()).select_from(JournalEntry).where(
            JournalEntry.organisation_id == organisation_id
        )
    )
    posted_entries = await db.execute(
        select(func.count()).select_from(JournalEntry).where(
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.status == "posted"
        )
    )
    draft_entries = await db.execute(
        select(func.count()).select_from(JournalEntry).where(
            JournalEntry.organisation_id == organisation_id,
            JournalEntry.status == "draft"
        )
    )
    
    return {
        "fiscal_year": fiscal_year.name if fiscal_year else f"Exercice {today.year}",
        "period_start": fiscal_year.start_date if fiscal_year else year_start,
        "period_end": fiscal_year.end_date if fiscal_year else date(today.year, 12, 31),
        "total_revenue": float(revenue),
        "total_expenses": float(expenses),
        "net_result": float(revenue) - float(expenses),
        "accounts_receivable": float(accounts_receivable),
        "accounts_payable": float(accounts_payable),
        "cash_balance": float(cash_balance),
        "bank_balance": float(bank_balance),
        "total_entries": total_entries.scalar() or 0,
        "posted_entries": posted_entries.scalar() or 0,
        "draft_entries": draft_entries.scalar() or 0,
    }
