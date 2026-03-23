"""Base classes for payment providers."""
from abc import ABC, abstractmethod
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    MOBILE_MONEY = "mobile_money"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    USSD = "ussd"
    QR_CODE = "qr_code"
    CASH = "cash"


class PaymentRequest(BaseModel):
    """Request to initiate a payment."""
    amount: float = Field(..., gt=0, description="Payment amount in smallest currency unit or decimal")
    currency: str = Field(..., min_length=3, max_length=3, description="Currency code (XOF, NGN, KES, etc.)")
    phone_number: str = Field(..., description="Customer phone number in international format")
    description: str = Field(..., description="Payment description")
    reference: str = Field(..., description="Unique reference for this payment")
    customer_email: Optional[str] = Field(None, description="Customer email for receipts")
    customer_name: Optional[str] = Field(None, description="Customer name")
    callback_url: Optional[str] = Field(None, description="Webhook URL for payment notifications")
    return_url: Optional[str] = Field(None, description="URL to redirect after payment")
    metadata: Optional[dict] = Field(default_factory=dict, description="Additional metadata")


class PaymentResponse(BaseModel):
    """Response from payment initiation."""
    success: bool = Field(..., description="Whether the payment was initiated successfully")
    transaction_id: Optional[str] = Field(None, description="Provider transaction ID")
    provider_reference: Optional[str] = Field(None, description="Provider-specific reference")
    status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    message: str = Field(default="", description="Human-readable message")
    
    # Action URLs
    payment_url: Optional[str] = Field(None, description="URL to redirect for payment")
    ussd_code: Optional[str] = Field(None, description="USSD code to dial for payment")
    qr_code_url: Optional[str] = Field(None, description="QR code image URL")
    
    # For mobile money
    ussd_instructions: Optional[str] = Field(None, description="Instructions for USSD payment")
    
    # Expiration
    expires_at: Optional[datetime] = Field(None, description="When this payment request expires")
    
    # Provider info
    provider_name: str = Field(..., description="Name of the payment provider")
    fees: Optional[float] = Field(None, description="Transaction fees")
    
    # Raw response for debugging
    raw_response: Optional[dict] = Field(None, description="Raw provider response")


class PaymentVerification(BaseModel):
    """Result of payment verification."""
    success: bool
    transaction_id: str
    status: PaymentStatus
    amount: float
    currency: str
    paid_at: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = None
    customer_phone: Optional[str] = None
    provider_data: Optional[dict] = None


class WebhookData(BaseModel):
    """Parsed webhook data."""
    transaction_id: str
    status: PaymentStatus
    amount: float
    currency: str
    reference: str
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    customer_phone: Optional[str] = None
    provider_data: Optional[dict] = None


class PaymentProvider(ABC):
    """Abstract base class for payment providers.
    
    All African payment providers must implement this interface.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name (e.g., 'cinetpay', 'paystack')."""
        pass
    
    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name."""
        pass
    
    @property
    @abstractmethod
    def supported_currencies(self) -> List[str]:
        """List of supported currency codes."""
        pass
    
    @property
    @abstractmethod
    def supported_countries(self) -> List[str]:
        """List of supported country codes (ISO 3166-1 alpha-2)."""
        pass
    
    @property
    @abstractmethod
    def supported_methods(self) -> List[PaymentMethod]:
        """List of supported payment methods."""
        pass
    
    @abstractmethod
    async def initiate_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Initiate a payment request.
        
        Args:
            request: Payment request details
            
        Returns:
            PaymentResponse with transaction ID and any action URLs/codes
        """
        pass
    
    @abstractmethod
    async def verify_payment(self, transaction_id: str) -> PaymentVerification:
        """Verify the status of a payment.
        
        Args:
            transaction_id: Provider's transaction ID
            
        Returns:
            PaymentVerification with current status
        """
        pass
    
    @abstractmethod
    async def handle_webhook(self, payload: dict, headers: dict) -> WebhookData:
        """Handle webhook notification from provider.
        
        Args:
            payload: Raw webhook payload
            headers: HTTP headers (for signature verification)
            
        Returns:
            Parsed WebhookData
            
        Raises:
            ValueError: If signature verification fails
        """
        pass
    
    async def refund_payment(self, transaction_id: str, amount: Optional[float] = None, reason: str = "") -> PaymentResponse:
        """Refund a payment (optional - not all providers support this).
        
        Args:
            transaction_id: Original transaction ID
            amount: Amount to refund (None = full refund)
            reason: Refund reason
            
        Returns:
            PaymentResponse with refund details
        """
        raise NotImplementedError(f"{self.name} does not support refunds")
    
    async def get_balance(self) -> dict:
        """Get account balance (optional).
        
        Returns:
            Dict with balance information
        """
        raise NotImplementedError(f"{self.name} does not support balance check")
    
    def supports_currency(self, currency: str) -> bool:
        """Check if provider supports a currency."""
        return currency.upper() in [c.upper() for c in self.supported_currencies]
    
    def supports_country(self, country: str) -> bool:
        """Check if provider supports a country."""
        return country.upper() in [c.upper() for c in self.supported_countries]
    
    def detect_operator(self, phone_number: str) -> Optional[str]:
        """Detect mobile money operator from phone number prefix.
        
        Args:
            phone_number: Phone number in international format
            
        Returns:
            Operator name or None if unknown
        """
        # Common African mobile operator prefixes
        phone = phone_number.replace("+", "").replace(" ", "")
        
        # Orange Money (multiple countries)
        orange_prefixes = ["22507", "22508", "22509", "22177", "22178", "22607", "22608"]  # CI, SN, BF
        if any(phone.startswith(p) for p in orange_prefixes):
            return "ORANGE_MONEY"
        
        # MTN MoMo (multiple countries)
        mtn_prefixes = ["22505", "22506", "23324", "23325", "23353", "23354", "23355", "25477"]  # CI, GH, KE
        if any(phone.startswith(p) for p in mtn_prefixes):
            return "MTN_MOMO"
        
        # Wave (Sénégal, CI)
        wave_prefixes = ["22178", "22507"]
        if any(phone.startswith(p) for p in wave_prefixes):
            return "WAVE"
        
        # M-Pesa (Kenya)
        if phone.startswith("2547"):
            return "MPESA"
        
        # Moov (Benin, Togo)
        moov_prefixes = ["22994", "22995", "22890", "22891"]
        if any(phone.startswith(p) for p in moov_prefixes):
            return "MOOV"
        
        return None
