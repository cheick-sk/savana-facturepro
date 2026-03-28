"""Purchase/Supplier Management business logic service — FacturePro Africa."""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.all_models import (
    AuditLog, Product, PurchaseOrder, PurchaseOrderItem, Supplier, User,
)
from app.models.purchase import (
    PurchaseReception, PurchaseReceptionItem,
    SupplierInvoice, SupplierPayment,
)
from app.schemas.purchase import (
    POCreate, POItemCreate, POUpdate,
    ReceptionCreate, SupplierInvoiceCreate, SupplierPaymentCreate,
)

logger = logging.getLogger(__name__)
UPLOAD_DIR = "/app/uploads/purchase_orders"


# ── Number generators ───────────────────────────────────────────
def _next_po_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"BC-{year}-{count + 1:05d}"


def _next_reception_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"REC-{year}-{count + 1:05d}"


def _next_supplier_invoice_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"FS-{year}-{count + 1:05d}"


# ── Calculations ────────────────────────────────────────────────
def _calc_item_total(quantity: float, unit_price: float, tax_rate: float) -> tuple[float, float, float]:
    """Returns (subtotal_ht, tax_amount, line_total_ttc)."""
    base = round(quantity * unit_price, 2)
    tax = round(base * tax_rate / 100, 2)
    return base, tax, round(base + tax, 2)


def _calc_po_totals(items: list[POItemCreate]) -> tuple[float, float, float]:
    """Returns (subtotal, tax_total, total)."""
    subtotal, tax_total = 0.0, 0.0
    for item in items:
        base, tax, _ = _calc_item_total(item.quantity, item.unit_price, item.tax_rate)
        subtotal += base
        tax_total += tax
    return round(subtotal, 2), round(tax_total, 2), round(subtotal + tax_total, 2)


# ── Purchase Order CRUD ─────────────────────────────────────────
async def create_purchase_order(
    db: AsyncSession,
    data: POCreate,
    user_id: int,
    organisation_id: int
) -> PurchaseOrder:
    """Create a new purchase order."""
    # Verify supplier exists
    supplier = await db.execute(
        select(Supplier).where(Supplier.id == data.supplier_id)
    )
    if not supplier.scalar_one_or_none():
        raise ValueError("Supplier not found")

    # Get count for number generation
    count = (await db.execute(
        select(func.count()).select_from(PurchaseOrder)
    )).scalar() or 0

    subtotal, tax_total, total = _calc_po_totals(data.items)

    po = PurchaseOrder(
        organisation_id=organisation_id,
        po_number=_next_po_number(count),
        supplier_id=data.supplier_id,
        created_by=user_id,
        expected_date=data.expected_date,
        supplier_reference=data.supplier_reference,
        currency=data.currency,
        notes=data.notes,
        terms=data.terms,
        subtotal=subtotal,
        tax_amount=tax_total,
        total_amount=total,
        total_items=len(data.items),
    )
    db.add(po)
    await db.flush()

    # Add items
    for item in data.items:
        _, _, line_total = _calc_item_total(item.quantity, item.unit_price, item.tax_rate)
        db.add(PurchaseOrderItem(
            po_id=po.id,
            product_id=item.product_id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            line_total=line_total,
        ))

    await db.flush()
    await db.refresh(po)
    return po


async def update_purchase_order(
    db: AsyncSession,
    po: PurchaseOrder,
    data: POUpdate
) -> PurchaseOrder:
    """Update an existing purchase order."""
    if po.status in ("RECEIVED", "CANCELLED"):
        raise ValueError(f"Cannot update PO in status {po.status}")

    if data.expected_date is not None:
        po.expected_date = data.expected_date
    if data.supplier_reference is not None:
        po.supplier_reference = data.supplier_reference
    if data.notes is not None:
        po.notes = data.notes
    if data.terms is not None:
        po.terms = data.terms
    if data.status is not None:
        po.status = data.status

    # Update items if provided
    if data.items is not None:
        # Delete existing items
        for old_item in list(po.items):
            await db.delete(old_item)
        await db.flush()

        # Add new items
        subtotal, tax_total, total = _calc_po_totals(data.items)
        for item in data.items:
            _, _, line_total = _calc_item_total(item.quantity, item.unit_price, item.tax_rate)
            db.add(PurchaseOrderItem(
                po_id=po.id,
                product_id=item.product_id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                line_total=line_total,
            ))

        po.subtotal = subtotal
        po.tax_amount = tax_total
        po.total_amount = total
        po.total_items = len(data.items)

    await db.flush()
    await db.refresh(po)
    return po


async def send_purchase_order(
    db: AsyncSession,
    po: PurchaseOrder,
    current_user: User
) -> PurchaseOrder:
    """Mark PO as sent to supplier."""
    if po.status != "DRAFT":
        raise ValueError("Only DRAFT orders can be sent")

    po.status = "SENT"

    # Log audit
    db.add(AuditLog(
        organisation_id=po.organisation_id,
        user_id=current_user.id,
        action="SEND_PURCHASE_ORDER",
        resource="purchase_order",
        resource_id=str(po.id),
        details=f"Sent PO {po.po_number} to supplier {po.supplier.name}"
    ))

    await db.flush()
    await db.refresh(po)
    return po


# ── Reception Processing ────────────────────────────────────────
async def create_reception(
    db: AsyncSession,
    data: ReceptionCreate,
    user_id: int,
    organisation_id: int
) -> PurchaseReception:
    """Create a reception for a purchase order."""
    # Get the purchase order
    po = await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == data.purchase_order_id)
    )
    po = po.scalar_one_or_none()
    if not po:
        raise ValueError("Purchase order not found")
    if po.status == "CANCELLED":
        raise ValueError("Cannot receive a cancelled order")

    # Get count for number generation
    count = (await db.execute(
        select(func.count()).select_from(PurchaseReception)
    )).scalar() or 0

    # Determine if complete or partial
    item_map = {item.id: item for item in po.items}
    all_complete = True
    any_received = False

    for recv_item in data.items:
        order_item = item_map.get(recv_item.order_item_id)
        if not order_item:
            raise ValueError(f"Order item {recv_item.order_item_id} not found")

        new_qty = float(order_item.quantity_received) + recv_item.quantity_received
        if new_qty < float(order_item.quantity):
            all_complete = False
        if new_qty > 0:
            any_received = True

    status = "complete" if all_complete else "partial"

    reception = PurchaseReception(
        organisation_id=organisation_id,
        purchase_order_id=data.purchase_order_id,
        reception_number=_next_reception_number(count),
        reception_date=data.reception_date or datetime.now(timezone.utc),
        received_by=user_id,
        notes=data.notes,
        status=status,
    )
    db.add(reception)
    await db.flush()

    # Add reception items and update order items
    for recv_item in data.items:
        order_item = item_map[recv_item.order_item_id]

        db.add(PurchaseReceptionItem(
            reception_id=reception.id,
            order_item_id=recv_item.order_item_id,
            quantity_received=recv_item.quantity_received,
            notes=recv_item.notes,
        ))

        # Update order item received quantity
        order_item.quantity_received = float(order_item.quantity_received) + recv_item.quantity_received

        # Update product stock if linked
        if order_item.product_id:
            product = await db.execute(
                select(Product).where(Product.id == order_item.product_id)
            )
            product = product.scalar_one_or_none()
            if product:
                # For now, just log - actual stock tracking would need inventory module
                logger.info(f"Stock update: Product {product.id} +{recv_item.quantity_received}")

    # Update PO status
    total_received = sum(
        1 for item in po.items if float(item.quantity_received) >= float(item.quantity)
    )
    po.received_items = total_received

    if all_complete:
        po.status = "RECEIVED"
        po.received_date = reception.reception_date
    elif any_received:
        po.status = "PARTIAL"

    # Log audit
    db.add(AuditLog(
        organisation_id=organisation_id,
        user_id=user_id,
        action="CREATE_RECEPTION",
        resource="purchase_reception",
        resource_id=str(reception.id),
        details=f"Created reception {reception.reception_number} for PO {po.po_number}"
    ))

    await db.flush()
    await db.refresh(reception)
    return reception


# ── Supplier Invoice Management ─────────────────────────────────
async def create_supplier_invoice(
    db: AsyncSession,
    data: SupplierInvoiceCreate,
    user_id: int,
    organisation_id: int
) -> SupplierInvoice:
    """Create a supplier invoice."""
    # Verify supplier
    supplier = await db.execute(
        select(Supplier).where(Supplier.id == data.supplier_id)
    )
    if not supplier.scalar_one_or_none():
        raise ValueError("Supplier not found")

    # Verify PO if linked
    if data.purchase_order_id:
        po = await db.execute(
            select(PurchaseOrder).where(PurchaseOrder.id == data.purchase_order_id)
        )
        if not po.scalar_one_or_none():
            raise ValueError("Purchase order not found")

    invoice = SupplierInvoice(
        organisation_id=organisation_id,
        supplier_id=data.supplier_id,
        purchase_order_id=data.purchase_order_id,
        invoice_number=data.invoice_number,
        supplier_reference=data.supplier_reference,
        invoice_date=data.invoice_date,
        due_date=data.due_date,
        subtotal=data.subtotal,
        tax_amount=data.tax_amount,
        total_amount=data.total_amount,
        currency=data.currency,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(invoice)

    # Log audit
    db.add(AuditLog(
        organisation_id=organisation_id,
        user_id=user_id,
        action="CREATE_SUPPLIER_INVOICE",
        resource="supplier_invoice",
        resource_id=str(invoice.id),
        details=f"Created supplier invoice {invoice.invoice_number}"
    ))

    await db.flush()
    await db.refresh(invoice)
    return invoice


async def record_supplier_payment(
    db: AsyncSession,
    invoice: SupplierInvoice,
    data: SupplierPaymentCreate,
    user_id: int,
    organisation_id: int
) -> SupplierPayment:
    """Record a payment for a supplier invoice."""
    if invoice.status == "cancelled":
        raise ValueError("Cannot pay a cancelled invoice")
    if invoice.status == "paid":
        raise ValueError("Invoice is already fully paid")

    payment = SupplierPayment(
        organisation_id=organisation_id,
        supplier_invoice_id=invoice.id,
        amount=data.amount,
        payment_method=data.payment_method,
        payment_date=data.payment_date or datetime.now(timezone.utc),
        reference=data.reference,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(payment)

    # Update invoice paid amount
    invoice.amount_paid = float(invoice.amount_paid) + data.amount

    # Update status
    if float(invoice.amount_paid) >= float(invoice.total_amount):
        invoice.status = "paid"
    elif float(invoice.amount_paid) > 0:
        invoice.status = "partially_paid"

    # Log audit
    db.add(AuditLog(
        organisation_id=organisation_id,
        user_id=user_id,
        action="RECORD_SUPPLIER_PAYMENT",
        resource="supplier_payment",
        resource_id=str(payment.id),
        details=f"Recorded payment of {data.amount} for invoice {invoice.invoice_number}"
    ))

    await db.flush()
    await db.refresh(payment)
    return payment


# ── Supplier Statement ──────────────────────────────────────────
async def get_supplier_statement(
    db: AsyncSession,
    supplier_id: int,
    start_date: datetime,
    end_date: datetime,
    organisation_id: int
) -> dict:
    """Get supplier statement for a period."""
    # Get supplier
    supplier = await db.execute(
        select(Supplier).where(Supplier.id == supplier_id)
    )
    supplier = supplier.scalar_one_or_none()
    if not supplier:
        raise ValueError("Supplier not found")

    # Get invoices in period
    invoices = await db.execute(
        select(SupplierInvoice).where(
            SupplierInvoice.supplier_id == supplier_id,
            SupplierInvoice.organisation_id == organisation_id,
            SupplierInvoice.invoice_date >= start_date,
            SupplierInvoice.invoice_date <= end_date,
            SupplierInvoice.status != "cancelled",
        ).order_by(SupplierInvoice.invoice_date)
    )
    invoices = invoices.scalars().all()

    # Get payments in period
    payments = await db.execute(
        select(SupplierPayment).join(SupplierInvoice).where(
            SupplierInvoice.supplier_id == supplier_id,
            SupplierPayment.organisation_id == organisation_id,
            SupplierPayment.payment_date >= start_date,
            SupplierPayment.payment_date <= end_date,
        ).order_by(SupplierPayment.payment_date)
    )
    payments = payments.scalars().all()

    # Build lines
    lines = []
    balance = 0.0
    total_invoiced = 0.0
    total_paid = 0.0

    for inv in invoices:
        balance += float(inv.total_amount)
        total_invoiced += float(inv.total_amount)
        lines.append({
            "date": inv.invoice_date,
            "type": "invoice",
            "reference": inv.invoice_number,
            "description": f"Facture fournisseur",
            "debit": float(inv.total_amount),
            "credit": 0.0,
            "balance": balance,
        })

    for pay in payments:
        balance -= pay.amount
        total_paid += float(pay.amount)
        lines.append({
            "date": pay.payment_date,
            "type": "payment",
            "reference": pay.reference or f"Payment #{pay.id}",
            "description": f"Paiement - {pay.payment_method}",
            "debit": 0.0,
            "credit": float(pay.amount),
            "balance": balance,
        })

    # Sort by date
    lines.sort(key=lambda x: x["date"])

    # Recalculate running balance
    balance = 0.0
    for line in lines:
        balance += line["debit"] - line["credit"]
        line["balance"] = balance

    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier.name,
        "period_start": start_date,
        "period_end": end_date,
        "opening_balance": 0.0,  # Would need to calculate from prior period
        "closing_balance": balance,
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "lines": lines,
    }


# ── PDF Generation ──────────────────────────────────────────────
async def generate_po_pdf(db: AsyncSession, po: PurchaseOrder) -> bytes:
    """Generate PDF for purchase order."""
    from app.services.pdf_service import generate_invoice_pdf

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    pdf_data = {
        "invoice_number": po.po_number,
        "issue_date": po.order_date,
        "due_date": po.expected_date,
        "status": po.status,
        "currency": po.currency,
        "notes": po.notes,
        "terms": po.terms,
        "subtotal": po.subtotal,
        "tax_amount": po.tax_amount,
        "total_amount": po.total_amount,
        "customer_name": po.supplier.name,
        "customer_email": po.supplier.email,
        "customer_phone": po.supplier.phone,
        "customer_address": po.supplier.address,
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "tax_rate": item.tax_rate,
                "line_total": item.line_total,
            }
            for item in po.items
        ],
    }

    pdf_bytes = generate_invoice_pdf(pdf_data)

    # Save to file
    filename = f"{po.po_number}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    po.pdf_path = filepath
    await db.flush()

    logger.info(f"PO PDF saved: {filepath}")
    return pdf_bytes
