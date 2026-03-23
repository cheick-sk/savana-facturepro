"""Base classes for notification channels."""
from abc import ABC, abstractmethod
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationType(str, Enum):
    # Invoice related
    INVOICE_CREATED = "invoice_created"
    INVOICE_SENT = "invoice_sent"
    INVOICE_PAID = "invoice_paid"
    INVOICE_OVERDUE = "invoice_overdue"
    PAYMENT_REMINDER = "payment_reminder"
    
    # Quote related
    QUOTE_CREATED = "quote_created"
    QUOTE_ACCEPTED = "quote_accepted"
    QUOTE_EXPIRED = "quote_expired"
    
    # POS/Sales
    SALE_COMPLETED = "sale_completed"
    LOW_STOCK = "low_stock"
    SHIFT_OPENED = "shift_opened"
    SHIFT_CLOSED = "shift_closed"
    
    # Account
    WELCOME = "welcome"
    PASSWORD_RESET = "password_reset"
    TWO_FA_ENABLED = "two_fa_enabled"
    
    # Subscription
    SUBSCRIPTION_CREATED = "subscription_created"
    SUBSCRIPTION_RENEWED = "subscription_renewed"
    SUBSCRIPTION_EXPIRED = "subscription_expired"
    
    # Custom
    CUSTOM = "custom"


class NotificationMessage(BaseModel):
    """Message to send via a notification channel."""
    to: str  # Phone number, email, or device token
    subject: Optional[str] = None
    body: str
    html_body: Optional[str] = None  # For email
    data: Optional[dict] = None  # Additional data (for push notifications)
    attachments: Optional[List[str]] = None  # File URLs
    
    # Metadata
    notification_type: NotificationType = NotificationType.CUSTOM
    priority: NotificationPriority = NotificationPriority.NORMAL
    reference_id: Optional[str] = None  # Invoice ID, sale ID, etc.
    reference_type: Optional[str] = None  # "invoice", "sale", etc.


class NotificationResult(BaseModel):
    """Result of a notification send attempt."""
    success: bool
    channel: str
    message_id: Optional[str] = None
    error: Optional[str] = None
    cost: Optional[float] = None  # Cost in USD or local currency
    sent_at: Optional[str] = None


class NotificationChannel(ABC):
    """Abstract base class for notification channels."""
    
    @abstractmethod
    async def send(self, message: NotificationMessage) -> NotificationResult:
        """Send a notification message."""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Channel name (whatsapp, sms, push, email)."""
        pass
    
    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable channel name."""
        pass
    
    @abstractmethod
    async def is_configured(self) -> bool:
        """Check if the channel is properly configured."""
        pass
    
    async def send_batch(self, messages: List[NotificationMessage]) -> List[NotificationResult]:
        """Send multiple notifications. Override for optimized batch sending."""
        results = []
        for message in messages:
            result = await self.send(message)
            results.append(result)
        return results
    
    def format_phone(self, phone: str) -> str:
        """Format phone number for sending."""
        # Remove spaces, dashes, parentheses
        phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Handle + prefix
        if phone.startswith("+"):
            phone = phone[1:]
        
        return phone
