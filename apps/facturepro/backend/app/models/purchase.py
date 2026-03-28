"""Purchase/Supplier Management models — FacturePro Africa.

Includes:
- PurchaseOrder: Commande fournisseur
- PurchaseOrderItem: Ligne de commande
- PurchaseReception: Réception de commande
- PurchaseReceptionItem: Ligne de réception
- SupplierInvoice: Facture fournisseur
- SupplierPayment: Paiement fournisseur
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class PurchaseReception(Base):
    """Réception de commande fournisseur."""
    __tablename__ = "purchase_receptions"
    __table_args__ = (
        Index("ix_purchase_receptions_org_id", "organisation_id"),
        Index("ix_purchase_receptions_po_id", "purchase_order_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"), nullable=False)

    reception_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    reception_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    received_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="partial")  # partial, complete

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="receptions", lazy="selectin")
    items: Mapped[list["PurchaseReceptionItem"]] = relationship(
        back_populates="reception", lazy="selectin", cascade="all, delete-orphan"
    )
    received_by_user: Mapped["User"] = relationship(lazy="selectin")


class PurchaseReceptionItem(Base):
    """Ligne de réception."""
    __tablename__ = "purchase_reception_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    reception_id: Mapped[int] = mapped_column(ForeignKey("purchase_receptions.id", ondelete="CASCADE"), nullable=False)
    order_item_id: Mapped[int] = mapped_column(ForeignKey("purchase_order_items.id"), nullable=False)

    quantity_received: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    reception: Mapped["PurchaseReception"] = relationship(back_populates="items")
    order_item: Mapped["PurchaseOrderItem"] = relationship(lazy="selectin")


class SupplierInvoice(Base):
    """Facture fournisseur."""
    __tablename__ = "supplier_invoices"
    __table_args__ = (
        Index("ix_supplier_invoices_org_id", "organisation_id"),
        Index("ix_supplier_invoices_supplier_id", "supplier_id"),
        Index("ix_supplier_invoices_po_id", "purchase_order_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    purchase_order_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_orders.id"), nullable=True)

    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    supplier_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    invoice_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending, partially_paid, paid, overdue, cancelled

    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    amount_paid: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(5), default="XOF")

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    supplier: Mapped["Supplier"] = relationship(lazy="selectin")
    purchase_order: Mapped["PurchaseOrder | None"] = relationship(back_populates="supplier_invoices", lazy="selectin")
    payments: Mapped[list["SupplierPayment"]] = relationship(
        back_populates="supplier_invoice", lazy="selectin", cascade="all, delete-orphan"
    )
    created_by_user: Mapped["User"] = relationship(lazy="selectin")

    @property
    def balance_due(self) -> float:
        return round(float(self.total_amount) - float(self.amount_paid), 2)


class SupplierPayment(Base):
    """Paiement fournisseur."""
    __tablename__ = "supplier_payments"
    __table_args__ = (
        Index("ix_supplier_payments_org_id", "organisation_id"),
        Index("ix_supplier_payments_invoice_id", "supplier_invoice_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    supplier_invoice_id: Mapped[int] = mapped_column(ForeignKey("supplier_invoices.id"), nullable=False)

    payment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="BANK_TRANSFER")
    # cash, bank_transfer, check, mobile_money
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    supplier_invoice: Mapped["SupplierInvoice"] = relationship(back_populates="payments")
    created_by_user: Mapped["User"] = relationship(lazy="selectin")


# Import forward references
from app.models.all_models import PurchaseOrder, PurchaseOrderItem, Supplier, User  # noqa: E402
