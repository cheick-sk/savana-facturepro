"""WhatsApp Business API notification channel.
Supports text messages, documents, templates, and interactive buttons.
"""
import aiohttp
from typing import Optional, List
from datetime import datetime
import json

from .base import (
    NotificationChannel, NotificationMessage, NotificationResult,
    NotificationType, NotificationPriority
)


class WhatsAppChannel(NotificationChannel):
    """WhatsApp Business API channel.
    
    Can use:
    - Meta's official WhatsApp Business API
    - Twilio WhatsApp API
    - Vonage (Nexmo) WhatsApp API
    """
    
    name = "whatsapp"
    display_name = "WhatsApp Business"
    
    # Meta WhatsApp API URLs
    API_VERSION = "v18.0"
    API_BASE_URL = f"https://graph.facebook.com/{API_VERSION}"
    
    def __init__(
        self,
        access_token: str,
        phone_number_id: str,
        business_account_id: str = None,
        verify_token: str = None,
        provider: str = "meta"  # "meta", "twilio", "vonage"
    ):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.business_account_id = business_account_id
        self.verify_token = verify_token
        self.provider = provider
        
        # Provider-specific configuration
        if provider == "twilio":
            self.account_sid = None  # Set separately for Twilio
            self.auth_token = None
        elif provider == "vonage":
            self.api_key = None
            self.api_secret = None
    
    async def is_configured(self) -> bool:
        """Check if WhatsApp is properly configured."""
        return bool(self.access_token and self.phone_number_id)
    
    def _get_headers(self) -> dict:
        """Get authorization headers."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def send(self, message: NotificationMessage) -> NotificationResult:
        """Send a WhatsApp message."""
        
        phone = self.format_phone(message.to)
        
        # Determine message type based on content
        if message.attachments and len(message.attachments) > 0:
            return await self._send_document(message)
        else:
            return await self._send_text(message)
    
    async def _send_text(self, message: NotificationMessage) -> NotificationResult:
        """Send a text message."""
        
        phone = self.format_phone(message.to)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "text",
            "text": {
                "body": message.body[:4096]  # WhatsApp limit
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.API_BASE_URL}/{self.phone_number_id}/messages"
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        message_id = result.get("messages", [{}])[0].get("id")
                        return NotificationResult(
                            success=True,
                            channel=self.name,
                            message_id=message_id,
                            sent_at=datetime.now().isoformat()
                        )
                    else:
                        error = result.get("error", {}).get("message", "Unknown error")
                        return NotificationResult(
                            success=False,
                            channel=self.name,
                            error=error
                        )
                        
        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error=str(e)
            )
    
    async def _send_document(self, message: NotificationMessage) -> NotificationResult:
        """Send a document (PDF, image, etc.)."""
        
        phone = self.format_phone(message.to)
        attachment_url = message.attachments[0]
        
        # Determine if it's a PDF or image
        filename = "document.pdf"
        if attachment_url.endswith(".pdf"):
            filename = message.subject or "document.pdf"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "document",
            "document": {
                "link": attachment_url,
                "filename": filename,
                "caption": message.body[:1024] if message.body else None
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.API_BASE_URL}/{self.phone_number_id}/messages"
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        message_id = result.get("messages", [{}])[0].get("id")
                        return NotificationResult(
                            success=True,
                            channel=self.name,
                            message_id=message_id,
                            sent_at=datetime.now().isoformat()
                        )
                    else:
                        error = result.get("error", {}).get("message", "Unknown error")
                        return NotificationResult(
                            success=False,
                            channel=self.name,
                            error=error
                        )
                        
        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error=str(e)
            )
    
    async def send_template(
        self,
        to: str,
        template_name: str,
        language_code: str = "fr",
        components: List[dict] = None
    ) -> NotificationResult:
        """Send a pre-approved WhatsApp template message.
        
        Templates must be approved by WhatsApp before use.
        
        Args:
            to: Recipient phone number
            template_name: Name of approved template
            language_code: Language (fr, en, etc.)
            components: Template components (header, body, buttons)
        """
        
        phone = self.format_phone(to)
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }
        }
        
        if components:
            payload["template"]["components"] = components
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.API_BASE_URL}/{self.phone_number_id}/messages"
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        message_id = result.get("messages", [{}])[0].get("id")
                        return NotificationResult(
                            success=True,
                            channel=self.name,
                            message_id=message_id
                        )
                    else:
                        return NotificationResult(
                            success=False,
                            channel=self.name,
                            error=result.get("error", {}).get("message")
                        )
        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error=str(e)
            )
    
    async def send_interactive_buttons(
        self,
        to: str,
        body: str,
        buttons: List[dict],
        header: str = None,
        footer: str = None
    ) -> NotificationResult:
        """Send a message with interactive buttons.
        
        Args:
            to: Recipient phone number
            body: Message body
            buttons: List of button dicts [{"id": "btn1", "title": "Button 1"}, ...]
            header: Optional header text
            footer: Optional footer text
        """
        
        phone = self.format_phone(to)
        
        # Build buttons (max 3)
        button_rows = []
        for i, btn in enumerate(buttons[:3]):
            button_rows.append({
                "type": "reply",
                "reply": {
                    "id": btn.get("id", f"btn_{i}"),
                    "title": btn.get("title", f"Button {i+1}")[:20]
                }
            })
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {
                    "text": body[:1024]
                },
                "action": {
                    "buttons": button_rows
                }
            }
        }
        
        if header:
            payload["interactive"]["header"] = {
                "type": "text",
                "text": header[:60]
            }
        
        if footer:
            payload["interactive"]["footer"] = {
                "text": footer[:60]
            }
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.API_BASE_URL}/{self.phone_number_id}/messages"
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        message_id = result.get("messages", [{}])[0].get("id")
                        return NotificationResult(
                            success=True,
                            channel=self.name,
                            message_id=message_id
                        )
                    else:
                        return NotificationResult(
                            success=False,
                            channel=self.name,
                            error=result.get("error", {}).get("message")
                        )
        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error=str(e)
            )
    
    async def send_payment_request(
        self,
        to: str,
        invoice_number: str,
        amount: float,
        currency: str,
        customer_name: str = None,
        payment_link: str = None
    ) -> NotificationResult:
        """Send a payment request message with pay button.
        
        Uses a template with payment link for best deliverability.
        """
        
        body = f"Facture {invoice_number}"
        if customer_name:
            body = f"Bonjour {customer_name},\n\n{body}"
        
        body += f"\n\nMontant: {amount:,.0f} {currency}"
        
        buttons = []
        if payment_link:
            buttons.append({
                "id": f"pay_{invoice_number}",
                "title": "Payer maintenant"
            })
        
        return await self.send_interactive_buttons(
            to=to,
            body=body,
            buttons=buttons,
            footer="Merci de votre confiance!"
        )


# Pre-defined templates for common notifications
WHATSAPP_TEMPLATES = {
    "invoice_created": {
        "name": "invoice_notification",
        "language": "fr",
        "body": "Bonjour {{1}}, votre facture {{2}} d'un montant de {{3}} {{4}} est disponible. Merci!"
    },
    "payment_reminder": {
        "name": "payment_reminder", 
        "language": "fr",
        "body": "Rappel: Votre facture {{1}} de {{2}} {{3}} arrive à échéance. Merci de régler votre facture."
    },
    "low_stock": {
        "name": "low_stock_alert",
        "language": "fr",
        "body": "Alerte stock: {{1}} - Stock actuel: {{2}} (seuil: {{3}})"
    }
}
