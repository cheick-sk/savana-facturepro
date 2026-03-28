"""OHADA Accounting models — FacturePro Africa.

OHADA (Organization for the Harmonization of Business Law in Africa)
PCG (Plan Comptable Général) compliant accounting system.

Includes:
- FiscalYear: Exercice fiscal
- Account: Compte du plan comptable OHADA
- Journal: Journal comptable
- JournalEntry: Écriture comptable
- JournalEntryLine: Ligne d'écriture comptable
- TaxRate: Taux de TVA
- AccountReconciliation: Lettrage/Rapprochement comptable
"""
from __future__ import annotations

from datetime import datetime, timezone, date
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Integer,
    Numeric, String, Text, Date, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.all_models import Organisation, User, Customer, Supplier


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── Fiscal Year ───────────────────────────────────────────────────
class FiscalYear(Base):
    """Exercice fiscal."""
    __tablename__ = "fiscal_years"
    __table_args__ = (
        Index("ix_fiscal_years_org_id", "organisation_id"),
        UniqueConstraint("organisation_id", "name", name="uq_fiscal_years_org_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "Exercice 2024"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Opening balance carried forward (Report à nouveau)
    opening_balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    entries: Mapped[list["JournalEntry"]] = relationship(back_populates="fiscal_year", lazy="noload")
    closed_by_user: Mapped["User | None"] = relationship(lazy="selectin")
    periods: Mapped[list["AccountingPeriod"]] = relationship(back_populates="fiscal_year", lazy="noload")


# ── Accounting Period ──────────────────────────────────────────────
class AccountingPeriod(Base):
    """Période comptable (mois)."""
    __tablename__ = "accounting_periods"
    __table_args__ = (
        Index("ix_accounting_periods_org_id", "organisation_id"),
        Index("ix_accounting_periods_fiscal_year_id", "fiscal_year_id"),
        UniqueConstraint("organisation_id", "fiscal_year_id", "month", "year", name="uq_accounting_periods_period"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    fiscal_year_id: Mapped[int] = mapped_column(ForeignKey("fiscal_years.id"), nullable=False)

    month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Period totals
    total_debit: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)
    total_credit: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    fiscal_year: Mapped["FiscalYear"] = relationship(back_populates="periods", lazy="selectin")
    closed_by_user: Mapped["User | None"] = relationship(lazy="selectin")


# ── Account (OHADA PCG) ───────────────────────────────────────────
class Account(Base):
    """Compte du plan comptable OHADA."""
    __tablename__ = "accounts"
    __table_args__ = (
        Index("ix_accounts_org_id", "organisation_id"),
        Index("ix_accounts_number", "number"),
        Index("ix_accounts_category", "category"),
        UniqueConstraint("organisation_id", "number", name="uq_accounts_org_number"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)

    # OHADA account number (ex: "101", "401", "701")
    number: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Account type according to OHADA classification
    # asset (actif), liability (passif), equity (capitaux), income (produits), expense (charges)
    account_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # OHADA class: classe_1 through classe_8
    category: Mapped[str] = mapped_column(String(20), nullable=False)

    # Parent account for hierarchical structure
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_manual_entry: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # System accounts cannot be deleted

    # Balance tracking (cumulative)
    debit_balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)
    credit_balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    parent: Mapped["Account | None"] = relationship(
        back_populates="children", remote_side="Account.id", lazy="selectin"
    )
    children: Mapped[list["Account"]] = relationship(back_populates="parent", lazy="noload")
    entry_lines: Mapped[list["JournalEntryLine"]] = relationship(back_populates="account", lazy="noload")


# ── Journal ───────────────────────────────────────────────────────
class Journal(Base):
    """Journal comptable."""
    __tablename__ = "journals"
    __table_args__ = (
        Index("ix_journals_org_id", "organisation_id"),
        UniqueConstraint("organisation_id", "code", name="uq_journals_org_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)

    code: Mapped[str] = mapped_column(String(10), nullable=False)  # "VT", "AC", "TRES", "OD"
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "Journal des Ventes", "Journal des Achats"

    # Journal type: sales, purchases, cash, bank, general
    journal_type: Mapped[str] = mapped_column(String(20), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Counter for automatic entry numbering
    last_entry_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    entries: Mapped[list["JournalEntry"]] = relationship(back_populates="journal", lazy="noload")


# ── Journal Entry ─────────────────────────────────────────────────
class JournalEntry(Base):
    """Écriture comptable."""
    __tablename__ = "journal_entries"
    __table_args__ = (
        Index("ix_journal_entries_org_id", "organisation_id"),
        Index("ix_journal_entries_journal_id", "journal_id"),
        Index("ix_journal_entries_fiscal_year_id", "fiscal_year_id"),
        Index("ix_journal_entries_date", "entry_date"),
        Index("ix_journal_entries_status", "status"),
        UniqueConstraint("organisation_id", "entry_number", name="uq_journal_entries_org_number"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    journal_id: Mapped[int] = mapped_column(ForeignKey("journals.id"), nullable=False)
    fiscal_year_id: Mapped[int] = mapped_column(ForeignKey("fiscal_years.id"), nullable=False)

    # Unique entry number (ex: "VT-2024-0001")
    entry_number: Mapped[str] = mapped_column(String(50), nullable=False)

    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    document_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    document_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Invoice number, etc.

    # Source of the entry (automatic or manual)
    source_type: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "invoice", "payment", "expense", "manual"
    source_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    description: Mapped[str] = mapped_column(String(500), nullable=False)

    # Status: draft, posted, cancelled
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)

    # Totals (must balance - double-entry bookkeeping)
    total_debit: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)
    total_credit: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    posted_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    cancelled_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    journal: Mapped["Journal"] = relationship(back_populates="entries", lazy="selectin")
    fiscal_year: Mapped["FiscalYear"] = relationship(back_populates="entries", lazy="selectin")
    lines: Mapped[list["JournalEntryLine"]] = relationship(
        back_populates="entry", lazy="selectin", cascade="all, delete-orphan"
    )
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by], lazy="selectin")
    posted_by_user: Mapped["User | None"] = relationship(foreign_keys=[posted_by], lazy="selectin")

    @property
    def is_balanced(self) -> bool:
        """Check if entry is balanced (debits = credits)."""
        return abs(float(self.total_debit) - float(self.total_credit)) < 0.01


# ── Journal Entry Line ────────────────────────────────────────────
class JournalEntryLine(Base):
    """Ligne d'écriture comptable."""
    __tablename__ = "journal_entry_lines"
    __table_args__ = (
        Index("ix_journal_entry_lines_entry_id", "entry_id"),
        Index("ix_journal_entry_lines_account_id", "account_id"),
        Index("ix_journal_entry_lines_third_party", "third_party_type", "third_party_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False)

    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    debit: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)
    credit: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0, nullable=False)

    # Third party (customer, supplier)
    third_party_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "customer", "supplier"
    third_party_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Analytic tracking (optional)
    cost_center: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Reconciliation letter
    letter_code: Mapped[str | None] = mapped_column(String(10), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    entry: Mapped["JournalEntry"] = relationship(back_populates="lines")
    account: Mapped["Account"] = relationship(back_populates="entry_lines")
    reconciliation: Mapped["AccountReconciliation | None"] = relationship(
        back_populates="lines", lazy="selectin"
    )


# ── Tax Rate ──────────────────────────────────────────────────────
class TaxRate(Base):
    """Taux de TVA."""
    __tablename__ = "tax_rates"
    __table_args__ = (
        Index("ix_tax_rates_org_id", "organisation_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "TVA 18%", "TVA 0%", "Exonéré"
    rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)  # 18.0, 0.0

    # Linked account for TVA collectée/déductible
    account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"), nullable=True)

    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    account: Mapped["Account | None"] = relationship(lazy="selectin")


# ── Account Reconciliation ────────────────────────────────────────
class AccountReconciliation(Base):
    """Lettrage/Rapprochement comptable."""
    __tablename__ = "account_reconciliations"
    __table_args__ = (
        Index("ix_account_reconciliations_org_id", "organisation_id"),
        Index("ix_account_reconciliations_account_id", "account_id"),
        UniqueConstraint("organisation_id", "letter_code", "account_id", name="uq_reconciliation_letter"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)

    letter_code: Mapped[str] = mapped_column(String(10), nullable=False)  # "A", "B", "AA", "AB"

    reconciled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    reconciled_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    account: Mapped["Account"] = relationship(lazy="selectin")
    lines: Mapped[list["JournalEntryLine"]] = relationship(back_populates="reconciliation", lazy="noload")
    reconciled_by_user: Mapped["User"] = relationship(lazy="selectin")


# ── Default OHADA Account Configuration ───────────────────────────
class DefaultAccount(Base):
    """Configuration des comptes par défaut pour les écritures automatiques."""
    __tablename__ = "default_accounts"
    __table_args__ = (
        Index("ix_default_accounts_org_id", "organisation_id"),
        UniqueConstraint("organisation_id", "account_key", name="uq_default_accounts_org_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)

    # Account key identifies the purpose
    # sales, sales_vat, purchases, purchase_vat, bank, cash, customer, supplier, etc.
    account_key: Mapped[str] = mapped_column(String(50), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)

    description: Mapped[str | None] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    organisation: Mapped["Organisation"] = relationship(lazy="selectin")
    account: Mapped["Account"] = relationship(lazy="selectin")
