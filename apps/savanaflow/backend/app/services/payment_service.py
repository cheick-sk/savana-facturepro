"""Payment integration services for SavanaFlow E-commerce.

This module provides integration with African payment providers:
- CinetPay: Mobile Money for UEMOA countries (Côte d'Ivoire, Senegal, etc.)
- Paystack: Cards and Mobile Money for Nigeria and Ghana
- M-Pesa: Mobile Money for East Africa (Kenya, Tanzania, etc.)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Payment Request/Response Models ───────────────────────────────────────────────

class PaymentRequest(BaseModel):
    """Payment initialization request."""
    order_id: int
    order_number: str
    amount: float
    currency: str = "XOF"
    customer_email: str
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    return_url: Optional[str] = None
    webhook_url: Optional[str] = None
    metadata: dict = {}


class PaymentResponse(BaseModel):
    """Payment initialization response."""
    success: bool
    message: str
    payment_url: Optional[str] = None
    reference: Optional[str] = None
    provider: Optional[str] = None
    error_code: Optional[str] = None


class PaymentCallbackData(BaseModel):
    """Payment callback data from provider."""
    reference: str
    status: str
    amount: float
    currency: str
    transaction_id: Optional[str] = None
    payment_method: Optional[str] = None
    customer_phone: Optional[str] = None
    raw_data: dict = {}


# ── CinetPay Integration (UEMOA) ───────────────────────────────────────────────

class CinetPayService:
    """
    CinetPay payment integration for West Africa.
    
    Supports Mobile Money: Orange Money, MTN Money, Moov Money, Wave
    Countries: Côte d'Ivoire, Senegal, Mali, Burkina Faso, Benin, Togo, Niger
    
    Documentation: https://docs.cinetpay.com/
    """
    
    BASE_URL = "https://api-checkout.cinetpay.com/v2"
    
    def __init__(self, site_id: str, api_key: str):
        self.site_id = site_id
        self.api_key = api_key
    
    async def initialize_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Initialize a CinetPay payment."""
        try:
            # Generate unique transaction ID
            transaction_id = f"CPT-{request.order_number}-{secrets.token_hex(4)}"
            
            payload = {
                "apikey": self.api_key,
                "site_id": self.site_id,
                "transaction_id": transaction_id,
                "amount": int(request.amount),
                "currency": request.currency,
                "description": f"Commande {request.order_number}",
                "customer_name": request.customer_name or "Client",
                "customer_email": request.customer_email,
                "customer_phone_number": request.customer_phone or "",
                "return_url": request.return_url,
                "notify_url": request.webhook_url,
                "channels": "ALL",
                "metadata": json.dumps(request.metadata),
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.BASE_URL}/payment",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                data = response.json()
            
            if data.get("code") == "201":
                return PaymentResponse(
                    success=True,
                    message="Payment initialized successfully",
                    payment_url=data.get("data", {}).get("payment_url"),
                    reference=transaction_id,
                    provider="cinetpay",
                )
            else:
                return PaymentResponse(
                    success=False,
                    message=data.get("message", "Payment initialization failed"),
                    error_code=str(data.get("code")),
                )
        
        except Exception as e:
            logger.error(f"CinetPay initialization error: {e}")
            return PaymentResponse(
                success=False,
                message=f"Payment service error: {str(e)}",
            )
    
    def verify_signature(self, data: dict, signature: str) -> bool:
        """Verify CinetPay webhook signature."""
        try:
            # CinetPay uses specific fields for signature verification
            expected_fields = [
                "cpm_amount", "cpm_currency", "cpm_site_id",
                "cpm_trans_id", "cpm_trans_date", "cpm_payment_config",
                "cpm_page_action", "cpm_version", "cpm_language",
                "cpm_custom"
            ]
            
            # Sort and concatenate values
            values = [str(data.get(f, "")) for f in expected_fields if data.get(f)]
            concatenated = "".join(values)
            
            # Generate HMAC-SHA256
            expected_sig = hmac.new(
                self.api_key.encode(),
                concatenated.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_sig, signature)
        
        except Exception as e:
            logger.error(f"CinetPay signature verification error: {e}")
            return False
    
    def parse_callback(self, data: dict) -> PaymentCallbackData:
        """Parse CinetPay callback data."""
        return PaymentCallbackData(
            reference=data.get("cpm_trans_id", ""),
            status="paid" if data.get("cpm_result") == "00" else "failed",
            amount=float(data.get("cpm_amount", 0)),
            currency=data.get("cpm_currency", "XOF"),
            transaction_id=data.get("cpm_payid"),
            payment_method=data.get("payment_method"),
            customer_phone=data.get("cel_phone_num"),
            raw_data=data,
        )


# ── Paystack Integration (Nigeria, Ghana) ───────────────────────────────────────────────

class PaystackService:
    """
    Paystack payment integration for Nigeria and Ghana.
    
    Supports: Cards, Bank Transfer, USSD, Mobile Money (Ghana)
    
    Documentation: https://paystack.com/docs/
    """
    
    BASE_URL = "https://api.paystack.co"
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
    
    async def initialize_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Initialize a Paystack payment."""
        try:
            # Convert currency if needed (Paystack mainly uses NGN, GHS, USD)
            currency = request.currency
            if currency == "XOF":
                currency = "NGN"  # Convert to Naira for Nigeria
            
            payload = {
                "email": request.customer_email,
                "amount": int(request.amount * 100),  # Paystack uses kobo/cents
                "currency": currency,
                "reference": f"PSK-{request.order_number}-{secrets.token_hex(4)}",
                "callback_url": request.return_url,
                "metadata": {
                    "order_id": request.order_id,
                    "order_number": request.order_number,
                    "customer_name": request.customer_name,
                    **request.metadata,
                },
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.BASE_URL}/transaction/initialize",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.secret_key}",
                        "Content-Type": "application/json",
                    },
                )
                data = response.json()
            
            if data.get("status"):
                return PaymentResponse(
                    success=True,
                    message="Payment initialized successfully",
                    payment_url=data.get("data", {}).get("authorization_url"),
                    reference=data.get("data", {}).get("reference"),
                    provider="paystack",
                )
            else:
                return PaymentResponse(
                    success=False,
                    message=data.get("message", "Payment initialization failed"),
                )
        
        except Exception as e:
            logger.error(f"Paystack initialization error: {e}")
            return PaymentResponse(
                success=False,
                message=f"Payment service error: {str(e)}",
            )
    
    async def verify_payment(self, reference: str) -> dict:
        """Verify a Paystack payment."""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers={
                        "Authorization": f"Bearer {self.secret_key}",
                        "Content-Type": "application/json",
                    },
                )
                return response.json()
        
        except Exception as e:
            logger.error(f"Paystack verification error: {e}")
            return {"status": False, "message": str(e)}
    
    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Paystack webhook signature."""
        try:
            expected_sig = hmac.new(
                self.secret_key.encode(),
                payload,
                hashlib.sha512
            ).hexdigest()
            return hmac.compare_digest(expected_sig, signature)
        
        except Exception as e:
            logger.error(f"Paystack signature verification error: {e}")
            return False
    
    def parse_callback(self, data: dict) -> PaymentCallbackData:
        """Parse Paystack callback data."""
        transaction = data.get("data", {})
        
        status_map = {
            "success": "paid",
            "failed": "failed",
            "abandoned": "pending",
        }
        
        return PaymentCallbackData(
            reference=transaction.get("reference", ""),
            status=status_map.get(transaction.get("status"), "pending"),
            amount=float(transaction.get("amount", 0)) / 100,
            currency=transaction.get("currency", "NGN"),
            transaction_id=str(transaction.get("id", "")),
            payment_method=transaction.get("channel"),
            customer_phone=transaction.get("customer", {}).get("phone"),
            raw_data=data,
        )


# ── M-Pesa Integration (East Africa) ───────────────────────────────────────────────

class MpesaService:
    """
    M-Pesa STK Push integration for Kenya and Tanzania.
    
    Documentation: https://developer.safaricom.co.ke/
    """
    
    BASE_URL = "https://api.safaricom.co.ke"  # Production
    SANDBOX_URL = "https://sandbox.safaricom.co.ke"  # Sandbox
    
    def __init__(self, shortcode: str, passkey: str, consumer_key: str, 
                 consumer_secret: str, sandbox: bool = False):
        self.shortcode = shortcode
        self.passkey = passkey
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.base_url = self.SANDBOX_URL if sandbox else self.BASE_URL
        self._access_token = None
        self._token_expires_at = None
    
    async def get_access_token(self) -> str:
        """Get M-Pesa OAuth access token."""
        if self._access_token and self._token_expires_at:
            if datetime.now(timezone.utc) < self._token_expires_at:
                return self._access_token
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
                    auth=(self.consumer_key, self.consumer_secret),
                )
                data = response.json()
            
            self._access_token = data.get("access_token")
            # Token expires in 1 hour, refresh 5 minutes before
            self._token_expires_at = datetime.now(timezone.utc) + \
                timezone.timedelta(seconds=data.get("expires_in", 3600) - 300)
            
            return self._access_token
        
        except Exception as e:
            logger.error(f"M-Pesa token error: {e}")
            raise
    
    async def initialize_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Initialize M-Pesa STK Push payment."""
        try:
            if not request.customer_phone:
                return PaymentResponse(
                    success=False,
                    message="Phone number required for M-Pesa payment",
                )
            
            access_token = await self.get_access_token()
            
            # Format phone number (Kenya format: 2547XXXXXXXX)
            phone = request.customer_phone
            if phone.startswith("0"):
                phone = "254" + phone[1:]
            elif phone.startswith("+"):
                phone = phone[1:]
            
            # Generate timestamp and password
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            password = base64.b64encode(
                f"{self.shortcode}{self.passkey}{timestamp}".encode()
            ).decode()
            
            # Generate reference
            reference = f"MPESA-{request.order_number}-{secrets.token_hex(4)}"
            
            payload = {
                "BusinessShortCode": self.shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(request.amount),
                "PartyA": phone,
                "PartyB": self.shortcode,
                "PhoneNumber": phone,
                "CallBackURL": request.webhook_url,
                "AccountReference": reference,
                "TransactionDesc": f"Order {request.order_number}",
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                )
                data = response.json()
            
            if data.get("ResponseCode") == "0":
                return PaymentResponse(
                    success=True,
                    message="STK Push sent to your phone",
                    reference=reference,
                    provider="mpesa",
                    payment_url=None,  # No redirect URL for M-Pesa
                )
            else:
                return PaymentResponse(
                    success=False,
                    message=data.get("errorMessage", "M-Pesa request failed"),
                    error_code=data.get("errorCode"),
                )
        
        except Exception as e:
            logger.error(f"M-Pesa initialization error: {e}")
            return PaymentResponse(
                success=False,
                message=f"Payment service error: {str(e)}",
            )
    
    def parse_callback(self, data: dict) -> PaymentCallbackData:
        """Parse M-Pesa callback data."""
        result = data.get("Body", {}).get("stkCallback", {})
        metadata = result.get("CallbackMetadata", {}).get("Item", [])
        
        # Extract metadata values
        meta_dict = {}
        for item in metadata:
            meta_dict[item.get("Name")] = item.get("Value")
        
        status = "paid" if result.get("ResultCode") == 0 else "failed"
        
        return PaymentCallbackData(
            reference=result.get("CheckoutRequestID", ""),
            status=status,
            amount=float(meta_dict.get("Amount", 0)),
            currency="KES",
            transaction_id=meta_dict.get("MpesaReceiptNumber"),
            payment_method="mpesa",
            customer_phone=meta_dict.get("PhoneNumber"),
            raw_data=data,
        )


# ── Payment Factory ───────────────────────────────────────────────

class PaymentServiceFactory:
    """Factory for creating payment service instances."""
    
    @staticmethod
    def get_cinetpay(site_id: str, api_key: str) -> CinetPayService:
        """Create CinetPay service instance."""
        return CinetPayService(site_id, api_key)
    
    @staticmethod
    def get_paystack(secret_key: str) -> PaystackService:
        """Create Paystack service instance."""
        return PaystackService(secret_key)
    
    @staticmethod
    def get_mpesa(shortcode: str, passkey: str, consumer_key: str,
                  consumer_secret: str, sandbox: bool = False) -> MpesaService:
        """Create M-Pesa service instance."""
        return MpesaService(shortcode, passkey, consumer_key, consumer_secret, sandbox)


# ── Unified Payment Service ───────────────────────────────────────────────

async def initialize_payment(
    provider: str,
    request: PaymentRequest,
    store_config: dict,
) -> PaymentResponse:
    """
    Initialize payment with the specified provider.
    
    Args:
        provider: Payment provider (cinetpay, paystack, mpesa)
        request: Payment request data
        store_config: Store configuration with API keys
    
    Returns:
        Payment response with payment URL or error
    """
    if provider == "cinetpay":
        service = PaymentServiceFactory.get_cinetpay(
            site_id=store_config.get("cinetpay_site_id"),
            api_key=store_config.get("cinetpay_api_key"),
        )
    elif provider == "paystack":
        service = PaymentServiceFactory.get_paystack(
            secret_key=store_config.get("paystack_secret_key"),
        )
    elif provider == "mpesa":
        service = PaymentServiceFactory.get_mpesa(
            shortcode=store_config.get("mpesa_shortcode"),
            passkey=store_config.get("mpesa_passkey"),
            consumer_key=store_config.get("mpesa_consumer_key"),
            consumer_secret=store_config.get("mpesa_consumer_secret"),
        )
    else:
        return PaymentResponse(
            success=False,
            message=f"Unknown payment provider: {provider}",
        )
    
    return await service.initialize_payment(request)


# Import base64 for M-Pesa password encoding
import base64
