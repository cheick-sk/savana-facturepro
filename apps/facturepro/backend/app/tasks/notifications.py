"""Notification Celery tasks for FacturePro.
- Send notifications via WhatsApp, SMS, Email
- Batch notifications
- Retry failed notifications
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select

from app.celery_app import celery_app
from app.core.database import AsyncSessionLocal


@celery_app.task(
    bind=True, 
    name="app.tasks.notifications.send_notification",
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 60}
)
def send_notification(
    self,
    to: str,
    body: str,
    subject: str = None,
    channels: List[str] = None,
    notification_type: str = "custom",
    attachments: List[str] = None
):
    """Send a notification via specified channels.
    
    Args:
        to: Recipient (phone/email)
        body: Message body
        subject: Message subject (for email)
        channels: List of channels to try ["whatsapp", "sms", "email"]
        notification_type: Type of notification
        attachments: List of attachment URLs
    """
    return asyncio.run(_send_notification_async(
        to, body, subject, channels, notification_type, attachments
    ))


async def _send_notification_async(
    to: str,
    body: str,
    subject: str = None,
    channels: List[str] = None,
    notification_type: str = "custom",
    attachments: List[str] = None
):
    """Async implementation of notification sending."""
    from shared.libs.notifications.notification_service import (
        get_notification_service, NotificationMessage, NotificationType
    )
    
    notification_service = get_notification_service()
    
    # Map notification type
    type_mapping = {
        "invoice_sent": NotificationType.INVOICE_SENT,
        "invoice_paid": NotificationType.INVOICE_PAID,
        "payment_reminder": NotificationType.PAYMENT_REMINDER,
        "low_stock": NotificationType.LOW_STOCK,
        "welcome": NotificationType.WELCOME,
        "custom": NotificationType.CUSTOM,
    }
    
    message = NotificationMessage(
        to=to,
        subject=subject,
        body=body,
        attachments=attachments,
        notification_type=type_mapping.get(notification_type, NotificationType.CUSTOM)
    )
    
    results = await notification_service.send(message, channels=channels)
    
    return {
        "to": to,
        "success": any(r.success for r in results),
        "results": [r.model_dump() for r in results],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@celery_app.task(
    bind=True,
    name="app.tasks.notifications.send_whatsapp",
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 2, "countdown": 30}
)
def send_whatsapp(
    self,
    to: str,
    body: str,
    attachments: List[str] = None
):
    """Send a WhatsApp message.
    
    Args:
        to: Phone number
        body: Message body
        attachments: List of attachment URLs (PDFs, images)
    """
    return asyncio.run(_send_whatsapp_async(to, body, attachments))


async def _send_whatsapp_async(to: str, body: str, attachments: List[str] = None):
    """Async implementation of WhatsApp sending."""
    from shared.libs.notifications.whatsapp import WhatsAppChannel
    from shared.libs.notifications.base import NotificationMessage
    from app.core.config import settings
    
    whatsapp = WhatsAppChannel(
        access_token=settings.WHATSAPP_ACCESS_TOKEN,
        phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID
    )
    
    message = NotificationMessage(
        to=to,
        body=body,
        attachments=attachments
    )
    
    result = await whatsapp.send(message)
    
    return result.model_dump()


@celery_app.task(
    bind=True,
    name="app.tasks.notifications.send_sms",
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 2, "countdown": 30}
)
def send_sms(
    self,
    to: str,
    body: str
):
    """Send an SMS message.
    
    Args:
        to: Phone number
        body: Message body (max 1600 chars)
    """
    return asyncio.run(_send_sms_async(to, body))


async def _send_sms_async(to: str, body: str):
    """Async implementation of SMS sending."""
    from shared.libs.notifications.sms_africas_talking import AfricasTalkingSMSChannel
    from shared.libs.notifications.base import NotificationMessage
    from app.core.config import settings
    
    sms = AfricasTalkingSMSChannel(
        api_key=settings.AFRICASTALKING_API_KEY,
        username=settings.AFRICASTALKING_USERNAME,
        sandbox=settings.AFRICASTALKING_SANDBOX
    )
    
    message = NotificationMessage(
        to=to,
        body=body[:1600]  # SMS limit
    )
    
    result = await sms.send(message)
    
    return result.model_dump()


@celery_app.task(
    bind=True,
    name="app.tasks.notifications.send_bulk_sms",
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 1, "countdown": 60}
)
def send_bulk_sms(
    self,
    recipients: List[str],
    body: str
):
    """Send SMS to multiple recipients.
    
    Args:
        recipients: List of phone numbers
        body: Message body
    """
    return asyncio.run(_send_bulk_sms_async(recipients, body))


async def _send_bulk_sms_async(recipients: List[str], body: str):
    """Async implementation of bulk SMS sending."""
    from shared.libs.notifications.sms_africas_talking import AfricasTalkingSMSChannel
    from shared.libs.notifications.base import NotificationMessage
    from app.core.config import settings
    
    sms = AfricasTalkingSMSChannel(
        api_key=settings.AFRICASTALKING_API_KEY,
        username=settings.AFRICASTALKING_USERNAME,
        sandbox=settings.AFRICASTALKING_SANDBOX
    )
    
    messages = [
        NotificationMessage(to=phone, body=body[:1600])
        for phone in recipients
    ]
    
    results = await sms.send_batch(messages)
    
    return {
        "total": len(recipients),
        "successful": sum(1 for r in results if r.success),
        "failed": sum(1 for r in results if not r.success),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@celery_app.task(
    bind=True,
    name="app.tasks.notifications.send_invoice_whatsapp"
)
def send_invoice_whatsapp(
    self,
    invoice_id: int,
    phone: str
):
    """Send invoice PDF via WhatsApp.
    
    Args:
        invoice_id: Invoice ID
        phone: Customer phone number
    """
    return asyncio.run(_send_invoice_whatsapp_async(invoice_id, phone))


async def _send_invoice_whatsapp_async(invoice_id: int, phone: str):
    """Async implementation of invoice WhatsApp sending."""
    async with AsyncSessionLocal() as db:
        from app.models.all_models import Invoice
        
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await db.execute(stmt)
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            return {"error": "Invoice not found"}
        
        customer = invoice.customer
        
        body = f"Facture {invoice.invoice_number}\n\n"
        body += f"Montant: {float(invoice.total_amount):,.0f} {invoice.currency}\n\n"
        body += "Veuillez trouver votre facture en pièce jointe."
        
        from shared.libs.notifications.notification_service import (
            get_notification_service, NotificationMessage, NotificationType
        )
        
        notification_service = get_notification_service()
        
        message = NotificationMessage(
            to=phone,
            subject=f"Facture {invoice.invoice_number}",
            body=body,
            attachments=[invoice.pdf_path] if invoice.pdf_path else None,
            notification_type=NotificationType.INVOICE_SENT,
            reference_id=str(invoice.id),
            reference_type="invoice"
        )
        
        results = await notification_service.send(message, channels=["whatsapp"])
        
        return {
            "invoice_id": invoice_id,
            "success": any(r.success for r in results),
            "results": [r.model_dump() for r in results]
        }


@celery_app.task(name="app.tasks.notifications.send_otp")
def send_otp(phone: str, otp_code: str, expiry_minutes: int = 5):
    """Send OTP code via SMS.
    
    Args:
        phone: Phone number
        otp_code: OTP code to send
        expiry_minutes: OTP expiry time in minutes
    """
    return asyncio.run(_send_otp_async(phone, otp_code, expiry_minutes))


async def _send_otp_async(phone: str, otp_code: str, expiry_minutes: int):
    """Async implementation of OTP sending."""
    from shared.libs.notifications.notification_service import (
        get_notification_service, NotificationMessage, NotificationType, NotificationPriority
    )
    
    notification_service = get_notification_service()
    
    result = await notification_service.send_otp(phone, otp_code, expiry_minutes)
    
    return result.model_dump()
