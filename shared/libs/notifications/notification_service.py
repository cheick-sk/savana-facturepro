"""Unified notification service with automatic channel selection and fallback.
Supports: WhatsApp, SMS, Push, Email with intelligent routing.
"""
import asyncio
from typing import Optional, List, Dict
from datetime import datetime
from dataclasses import dataclass

from .base import (
    NotificationChannel, NotificationMessage, NotificationResult,
    NotificationType, NotificationPriority
)
from .whatsapp import WhatsAppChannel
from .sms_africas_talking import AfricasTalkingSMSChannel


@dataclass
class NotificationConfig:
    """Configuration for notification channels."""
    # WhatsApp Business
    whatsapp_access_token: str = None
    whatsapp_phone_number_id: str = None
    
    # Africa's Talking SMS
    africastalking_api_key: str = None
    africastalking_username: str = None
    africastalking_sender_id: str = None
    africastalking_sandbox: bool = True
    
    # Email (existing service)
    email_service = None
    
    # Firebase Push
    firebase_credentials_path: str = None


class NotificationService:
    """Multi-channel notification service with intelligent routing.
    
    Features:
    - Automatic channel selection based on notification type
    - Fallback to alternative channels on failure
    - Cost optimization (WhatsApp free > SMS paid)
    - Rate limiting per channel
    - Template support for each channel
    """
    
    def __init__(self, config: NotificationConfig = None):
        self.config = config or NotificationConfig()
        self._channels: Dict[str, NotificationChannel] = {}
        self._initialize_channels()
    
    def _initialize_channels(self):
        """Initialize available channels based on configuration."""
        
        # WhatsApp
        if self.config.whatsapp_access_token and self.config.whatsapp_phone_number_id:
            self._channels["whatsapp"] = WhatsAppChannel(
                access_token=self.config.whatsapp_access_token,
                phone_number_id=self.config.whatsapp_phone_number_id
            )
        
        # SMS
        if self.config.africastalking_api_key and self.config.africastalking_username:
            self._channels["sms"] = AfricasTalkingSMSChannel(
                api_key=self.config.africastalking_api_key,
                username=self.config.africastalking_username,
                sender_id=self.config.africastalking_sender_id,
                sandbox=self.config.africastalking_sandbox
            )
        
        # Email (use existing email_service)
        if self.config.email_service:
            self._channels["email"] = self.config.email_service
    
    def get_available_channels(self) -> List[str]:
        """Get list of configured channels."""
        return list(self._channels.keys())
    
    async def send(
        self,
        message: NotificationMessage,
        channels: List[str] = None,
        fallback: bool = True
    ) -> List[NotificationResult]:
        """Send notification via specified channels with optional fallback.
        
        Args:
            message: Notification message to send
            channels: List of channel names to try (default: auto-select)
            fallback: Try alternative channels on failure
            
        Returns:
            List of results from each attempted channel
        """
        
        # Auto-select channels if not specified
        if not channels:
            channels = self._select_channels(message)
        
        results = []
        
        for channel_name in channels:
            channel = self._channels.get(channel_name)
            if not channel:
                continue
            
            # Check if channel is configured
            if not await channel.is_configured():
                continue
            
            # Try to send
            result = await channel.send(message)
            results.append(result)
            
            # If successful or no fallback, stop
            if result.success or not fallback:
                break
        
        return results
    
    def _select_channels(self, message: NotificationMessage) -> List[str]:
        """Automatically select best channels for notification type.
        
        Priority order:
        1. WhatsApp (free, rich content)
        2. SMS (paid, wide reach)
        3. Email (free, attachments)
        4. Push (free, instant)
        """
        
        # Channel priority by notification type
        channel_priority = {
            NotificationType.INVOICE_CREATED: ["whatsapp", "email", "sms"],
            NotificationType.INVOICE_SENT: ["whatsapp", "email"],
            NotificationType.INVOICE_PAID: ["whatsapp", "sms"],
            NotificationType.INVOICE_OVERDUE: ["sms", "whatsapp", "email"],
            NotificationType.PAYMENT_REMINDER: ["sms", "whatsapp"],
            NotificationType.QUOTE_CREATED: ["whatsapp", "email"],
            NotificationType.QUOTE_ACCEPTED: ["email", "whatsapp"],
            NotificationType.SALE_COMPLETED: ["whatsapp", "sms"],
            NotificationType.LOW_STOCK: ["sms", "push", "whatsapp"],
            NotificationType.WELCOME: ["email", "whatsapp"],
            NotificationType.PASSWORD_RESET: ["email", "sms"],
            NotificationType.SUBSCRIPTION_CREATED: ["email", "whatsapp"],
            NotificationType.SUBSCRIPTION_EXPIRED: ["email", "sms", "whatsapp"],
            NotificationType.CUSTOM: ["whatsapp", "sms", "email"],
        }
        
        return channel_priority.get(message.notification_type, ["whatsapp", "sms", "email"])
    
    async def send_invoice_notification(
        self,
        customer_phone: str,
        customer_email: str,
        invoice_number: str,
        amount: float,
        currency: str,
        customer_name: str = None,
        pdf_url: str = None,
        payment_link: str = None
    ) -> List[NotificationResult]:
        """Send invoice notification to customer.
        
        Attempts WhatsApp with PDF first, falls back to SMS/Email.
        """
        
        # Build message
        body = f"Facture {invoice_number}"
        if customer_name:
            body = f"Bonjour {customer_name},\n\n{body}"
        
        body += f"\n\nMontant: {amount:,.0f} {currency}"
        
        if payment_link:
            body += f"\n\nLien de paiement: {payment_link}"
        
        message = NotificationMessage(
            to=customer_phone,
            subject=f"Facture {invoice_number}",
            body=body,
            attachments=[pdf_url] if pdf_url else None,
            notification_type=NotificationType.INVOICE_SENT,
            reference_id=invoice_number,
            reference_type="invoice"
        )
        
        results = await self.send(message, channels=["whatsapp", "sms", "email"])
        
        # If WhatsApp failed and we have email, try email with PDF
        if pdf_url and customer_email and not any(r.success for r in results):
            email_message = NotificationMessage(
                to=customer_email,
                subject=f"Facture {invoice_number} - {amount:,.0f} {currency}",
                body=body,
                attachments=[pdf_url],
                notification_type=NotificationType.INVOICE_SENT,
                reference_id=invoice_number,
                reference_type="invoice"
            )
            email_results = await self.send(email_message, channels=["email"])
            results.extend(email_results)
        
        return results
    
    async def send_payment_reminder(
        self,
        customer_phone: str,
        invoice_number: str,
        amount: float,
        currency: str,
        days_overdue: int,
        customer_name: str = None
    ) -> NotificationResult:
        """Send payment reminder for overdue invoice."""
        
        if days_overdue == 0:
            body = f"Rappel: Votre facture {invoice_number} de {amount:,.0f} {currency} arrive à échéance aujourd'hui."
        else:
            body = f"Rappel: Votre facture {invoice_number} de {amount:,.0f} {currency} a {days_overdue} jour(s) de retard."
        
        if customer_name:
            body = f"Bonjour {customer_name},\n\n{body}"
        
        body += "\n\nMerci de régler votre facture dans les meilleurs délais."
        
        message = NotificationMessage(
            to=customer_phone,
            body=body,
            notification_type=NotificationType.PAYMENT_REMINDER,
            reference_id=invoice_number,
            reference_type="invoice",
            priority=NotificationPriority.HIGH
        )
        
        results = await self.send(message, channels=["sms", "whatsapp"])
        return results[0] if results else NotificationResult(
            success=False,
            channel="none",
            error="No channels available"
        )
    
    async def send_low_stock_alert(
        self,
        admin_phones: List[str],
        product_name: str,
        current_stock: float,
        threshold: float,
        store_name: str = None
    ) -> List[NotificationResult]:
        """Send low stock alert to administrators."""
        
        body = f"⚠️ Alerte stock bas!\n\n"
        if store_name:
            body += f"Magasin: {store_name}\n"
        body += f"Produit: {product_name}\n"
        body += f"Stock actuel: {current_stock}\n"
        body += f"Seuil d'alerte: {threshold}"
        
        results = []
        
        for phone in admin_phones:
            message = NotificationMessage(
                to=phone,
                body=body,
                notification_type=NotificationType.LOW_STOCK,
                priority=NotificationPriority.HIGH
            )
            
            phone_results = await self.send(message, channels=["sms", "whatsapp"])
            results.extend(phone_results)
        
        return results
    
    async def send_welcome_message(
        self,
        user_phone: str,
        user_email: str,
        user_name: str,
        organisation_name: str
    ) -> List[NotificationResult]:
        """Send welcome message to new user."""
        
        body = f"Bienvenue {user_name}!\n\n"
        body += f"Votre compte {organisation_name} a été créé avec succès.\n\n"
        body += "Connectez-vous pour commencer à utiliser nos services."
        
        results = []
        
        # Send to both phone and email
        if user_phone:
            message = NotificationMessage(
                to=user_phone,
                body=body,
                notification_type=NotificationType.WELCOME,
                priority=NotificationPriority.NORMAL
            )
            results.extend(await self.send(message, channels=["whatsapp", "sms"]))
        
        if user_email:
            email_message = NotificationMessage(
                to=user_email,
                subject=f"Bienvenue sur {organisation_name}",
                body=body,
                notification_type=NotificationType.WELCOME
            )
            results.extend(await self.send(email_message, channels=["email"]))
        
        return results
    
    async def send_otp(
        self,
        phone: str,
        otp_code: str,
        expiry_minutes: int = 5
    ) -> NotificationResult:
        """Send OTP code via SMS."""
        
        body = f"Votre code de vérification est: {otp_code}\n\n"
        body += f"Ce code expire dans {expiry_minutes} minutes.\n\n"
        body += "Ne partagez pas ce code avec personne."
        
        message = NotificationMessage(
            to=phone,
            body=body,
            notification_type=NotificationType.PASSWORD_RESET,
            priority=NotificationPriority.URGENT
        )
        
        # Always use SMS for OTP (most reliable)
        results = await self.send(message, channels=["sms"])
        return results[0] if results else NotificationResult(
            success=False,
            channel="sms",
            error="SMS not configured"
        )


# Global notification service instance
_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    """Get the global notification service instance."""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service


def init_notification_service(config: NotificationConfig) -> NotificationService:
    """Initialize the global notification service with configuration."""
    global _notification_service
    _notification_service = NotificationService(config)
    return _notification_service
