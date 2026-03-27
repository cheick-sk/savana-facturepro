"""Invoice-related Celery tasks for FacturePro.
- Process recurring invoices
- Send payment reminders
- Generate invoice PDFs
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.all_models import Invoice, RecurringInvoice, Organisation, User
from app.services.invoice_service import InvoiceService
from app.services.pdf_service import PDFService


@celery_app.task(bind=True, name="app.tasks.invoices.process_recurring_invoices")
def process_recurring_invoices(self):
    """Process all active recurring invoices that are due.
    Runs daily at 6 AM UTC.
    """
    return asyncio.run(_process_recurring_invoices_async())


async def _process_recurring_invoices_async():
    """Async implementation of recurring invoice processing."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        
        # Find all active recurring invoices due for processing
        stmt = select(RecurringInvoice).where(
            and_(
                RecurringInvoice.is_active == True,
                RecurringInvoice.next_run <= now,
                (RecurringInvoice.end_date == None) | (RecurringInvoice.end_run > now)
            )
        )
        
        result = await db.execute(stmt)
        recurring_invoices = result.scalars().all()
        
        processed = 0
        errors = 0
        
        for recurring in recurring_invoices:
            try:
                # Generate new invoice from template
                invoice = await _generate_invoice_from_recurring(db, recurring)
                
                # Update recurring invoice
                recurring.last_run = now
                recurring.invoices_generated += 1
                
                # Calculate next run date
                next_run = _calculate_next_run(recurring.frequency, now)
                recurring.next_run = next_run
                
                processed += 1
                
            except Exception as e:
                errors += 1
                print(f"Error processing recurring invoice {recurring.id}: {e}")
        
        await db.commit()
        
        return {
            "processed": processed,
            "errors": errors,
            "timestamp": now.isoformat()
        }


async def _generate_invoice_from_recurring(db: AsyncSession, recurring: RecurringInvoice) -> Invoice:
    """Generate a new invoice from a recurring invoice template."""
    
    # Get organisation
    org_stmt = select(Organisation).where(Organisation.id == recurring.organisation_id)
    org_result = await db.execute(org_stmt)
    organisation = org_result.scalar_one()
    
    # Create invoice from template data
    template = recurring.template_data
    
    invoice = Invoice(
        organisation_id=recurring.organisation_id,
        customer_id=recurring.customer_id,
        created_by=recurring.created_by,
        recurring_id=recurring.id,
        status="DRAFT",
        currency=organisation.currency or "XOF",
        **template.get("invoice_data", {})
    )
    
    db.add(invoice)
    await db.flush()
    
    # Add line items from template
    for item_data in template.get("items", []):
        item = InvoiceItem(
            invoice_id=invoice.id,
            **item_data
        )
        db.add(item)
    
    # Calculate totals
    await _calculate_invoice_totals(db, invoice)
    
    return invoice


def _calculate_next_run(frequency: str, current_run: datetime) -> datetime:
    """Calculate the next run date based on frequency."""
    if frequency == "WEEKLY":
        return current_run + timedelta(weeks=1)
    elif frequency == "MONTHLY":
        # Same day next month
        next_month = current_run.month + 1 if current_run.month < 12 else 1
        next_year = current_run.year if current_run.month < 12 else current_run.year + 1
        try:
            return current_run.replace(year=next_year, month=next_month)
        except ValueError:
            # Handle end-of-month edge cases
            return current_run.replace(year=next_year, month=next_month, day=28)
    elif frequency == "QUARTERLY":
        # 3 months ahead
        next_month = current_run.month + 3
        next_year = current_run.year + (next_month - 1) // 12
        next_month = ((next_month - 1) % 12) + 1
        return current_run.replace(year=next_year, month=next_month)
    elif frequency == "YEARLY":
        return current_run.replace(year=current_run.year + 1)
    else:
        return current_run + timedelta(days=30)  # Default to monthly


@celery_app.task(bind=True, name="app.tasks.invoices.send_payment_reminders")
def send_payment_reminders(self, days_overdue: List[int] = [1, 3, 7, 14]):
    """Send payment reminders for overdue invoices.
    Runs daily at 9 AM UTC.
    
    Args:
        days_overdue: List of days after due date to send reminders
    """
    return asyncio.run(_send_payment_reminders_async(days_overdue))


async def _send_payment_reminders_async(days_overdue: List[int]):
    """Async implementation of payment reminder sending."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        reminders_sent = 0
        errors = 0
        
        for days in days_overdue:
            # Find invoices overdue by exactly this many days
            target_date = now - timedelta(days=days)
            
            stmt = select(Invoice).where(
                and_(
                    Invoice.status.in_(["SENT", "PARTIAL"]),
                    Invoice.due_date <= target_date,
                    Invoice.due_date > target_date - timedelta(days=1)
                )
            )
            
            result = await db.execute(stmt)
            invoices = result.scalars().all()
            
            for invoice in invoices:
                try:
                    # Send reminder notification
                    await _send_invoice_reminder(db, invoice, days)
                    reminders_sent += 1
                except Exception as e:
                    errors += 1
                    print(f"Error sending reminder for invoice {invoice.id}: {e}")
        
        return {
            "reminders_sent": reminders_sent,
            "errors": errors,
            "timestamp": now.isoformat()
        }


async def _send_invoice_reminder(db: AsyncSession, invoice: Invoice, days_overdue: int):
    """Send a payment reminder for an invoice."""
    from shared.libs.notifications.notification_service import get_notification_service
    
    # Get customer
    customer = invoice.customer
    
    notification_service = get_notification_service()
    
    await notification_service.send_payment_reminder(
        customer_phone=customer.phone,
        invoice_number=invoice.invoice_number,
        amount=float(invoice.balance_due),
        currency=invoice.currency,
        days_overdue=days_overdue,
        customer_name=customer.name
    )


@celery_app.task(bind=True, name="app.tasks.invoices.generate_invoice_pdf")
def generate_invoice_pdf(self, invoice_id: int):
    """Generate PDF for an invoice asynchronously."""
    return asyncio.run(_generate_invoice_pdf_async(invoice_id))


async def _generate_invoice_pdf_async(invoice_id: int):
    """Async implementation of PDF generation."""
    async with AsyncSessionLocal() as db:
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await db.execute(stmt)
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            return {"error": "Invoice not found"}
        
        # Generate PDF
        pdf_service = PDFService()
        pdf_path = await pdf_service.generate_invoice_pdf(invoice)
        
        # Update invoice with PDF path
        invoice.pdf_path = pdf_path
        await db.commit()
        
        return {
            "invoice_id": invoice_id,
            "pdf_path": pdf_path
        }


@celery_app.task(bind=True, name="app.tasks.invoices.send_invoice_notification")
def send_invoice_notification(self, invoice_id: int, channels: List[str] = None):
    """Send invoice notification to customer via specified channels."""
    return asyncio.run(_send_invoice_notification_async(invoice_id, channels))


async def _send_invoice_notification_async(invoice_id: int, channels: List[str] = None):
    """Async implementation of invoice notification."""
    async with AsyncSessionLocal() as db:
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await db.execute(stmt)
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            return {"error": "Invoice not found"}
        
        customer = invoice.customer
        
        from shared.libs.notifications.notification_service import get_notification_service
        notification_service = get_notification_service()
        
        results = await notification_service.send_invoice_notification(
            customer_phone=customer.phone,
            customer_email=customer.email,
            invoice_number=invoice.invoice_number,
            amount=float(invoice.total_amount),
            currency=invoice.currency,
            customer_name=customer.name,
            pdf_url=invoice.pdf_path
        )
        
        return {
            "invoice_id": invoice_id,
            "results": [r.model_dump() for r in results]
        }


async def _calculate_invoice_totals(db: AsyncSession, invoice: Invoice):
    """Calculate invoice subtotal, tax, and total."""
    stmt = select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    subtotal = sum(float(item.line_total) for item in items)
    tax_amount = sum(
        float(item.line_total) * float(item.tax_rate) / 100 
        for item in items
    )
    
    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.total_amount = subtotal + tax_amount - float(invoice.discount_amount or 0)


# Import InvoiceItem for type hints
from app.models.all_models import InvoiceItem
