"""Paystack payment provider.
Nigeria's leading payment gateway (acquired by Stripe).
Supports: Cards, Bank Transfer, USSD, QR, Mobile Money.
"""
import hashlib
import hmac
import json
from typing import List, Optional
from datetime import datetime
import aiohttp

from .base import (
    PaymentProvider, PaymentRequest, PaymentResponse,
    PaymentVerification, PaymentStatus, PaymentMethod, WebhookData
)


class PaystackProvider(PaymentProvider):
    """Paystack - Nigerian payment gateway with multi-currency support.
    
    Primary market: Nigeria (NGN)
    Also supports: Ghana (GHS), South Africa (ZAR), Kenya (KES)
    Documentation: https://paystack.com/docs/
    """
    
    name = "paystack"
    display_name = "Paystack"
    
    supported_currencies = ["NGN", "GHS", "ZAR", "KES", "USD"]
    supported_countries = ["NG", "GH", "ZA", "KE"]
    supported_methods = [
        PaymentMethod.CARD, 
        PaymentMethod.BANK_TRANSFER, 
        PaymentMethod.USSD,
        PaymentMethod.QR_CODE,
        PaymentMethod.MOBILE_MONEY
    ]
    
    SANDBOX_BASE_URL = "https://api.sandbox.paystack.co"
    PRODUCTION_BASE_URL = "https://api.paystack.co"
    
    def __init__(
        self,
        secret_key: str,
        public_key: str = None,
        sandbox: bool = True,
        callback_url: str = None
    ):
        self.secret_key = secret_key
        self.public_key = public_key
        self.sandbox = sandbox
        self.callback_url = callback_url
        self.base_url = self.SANDBOX_BASE_URL if sandbox else self.PRODUCTION_BASE_URL
    
    def _get_headers(self) -> dict:
        """Get authorization headers."""
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
    
    def _verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify Paystack webhook signature."""
        expected = hmac.new(
            self.secret_key.encode(),
            payload.encode(),
            hashlib.sha512
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
    
    async def initiate_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Initialize a Paystack transaction."""
        
        # Convert amount to kobo/cents (smallest currency unit)
        amount_multiplier = 100  # Paystack uses smallest unit
        amount_in_kobo = int(request.amount * amount_multiplier)
        
        data = {
            "amount": amount_in_kobo,
            "email": request.customer_email or f"{request.phone_number}@paystack.co",
            "currency": request.currency,
            "reference": request.reference,
            "callback_url": request.return_url or self.callback_url,
            "metadata": {
                "phone": request.phone_number,
                "customer_name": request.customer_name,
                **request.metadata
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/transaction/initialize",
                    json=data,
                    headers=self._get_headers()
                ) as response:
                    result = await response.json()
                    
                    if result.get("status"):
                        data = result.get("data", {})
                        return PaymentResponse(
                            success=True,
                            transaction_id=str(data.get("id")),
                            provider_reference=data.get("reference"),
                            status=PaymentStatus.PENDING,
                            message="Payment initialized successfully",
                            payment_url=data.get("authorization_url"),
                            provider_name=self.name,
                            raw_response=result
                        )
                    else:
                        return PaymentResponse(
                            success=False,
                            status=PaymentStatus.FAILED,
                            message=result.get("message", "Payment initialization failed"),
                            provider_name=self.name,
                            raw_response=result
                        )
                        
        except Exception as e:
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                message=str(e),
                provider_name=self.name
            )
    
    async def verify_payment(self, transaction_id: str) -> PaymentVerification:
        """Verify Paystack transaction status."""
        
        # Can verify by reference or ID
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/transaction/verify/{transaction_id}",
                    headers=self._get_headers()
                ) as response:
                    result = await response.json()
                    
                    if result.get("status"):
                        data = result.get("data", {})
                        
                        status_map = {
                            "success": PaymentStatus.SUCCESS,
                            "pending": PaymentStatus.PENDING,
                            "failed": PaymentStatus.FAILED,
                            "abandoned": PaymentStatus.CANCELLED,
                            "reversed": PaymentStatus.REFUNDED,
                        }
                        
                        status = status_map.get(data.get("status"), PaymentStatus.PENDING)
                        
                        # Determine payment method from channel
                        channel = data.get("channel", "")
                        method_map = {
                            "card": PaymentMethod.CARD,
                            "bank_transfer": PaymentMethod.BANK_TRANSFER,
                            "ussd": PaymentMethod.USSD,
                            "qr": PaymentMethod.QR_CODE,
                            "mobile_money": PaymentMethod.MOBILE_MONEY,
                        }
                        
                        return PaymentVerification(
                            success=status == PaymentStatus.SUCCESS,
                            transaction_id=str(data.get("id")),
                            status=status,
                            amount=float(data.get("amount", 0)) / 100,  # Convert from kobo
                            currency=data.get("currency", "NGN"),
                            paid_at=datetime.fromisoformat(data["paid_at"].replace("Z", "+00:00")) if data.get("paid_at") else None,
                            payment_method=method_map.get(channel, PaymentMethod.CARD),
                            customer_phone=data.get("customer", {}).get("phone"),
                            provider_data=data
                        )
                    else:
                        return PaymentVerification(
                            success=False,
                            transaction_id=transaction_id,
                            status=PaymentStatus.FAILED,
                            amount=0,
                            currency="NGN"
                        )
                        
        except Exception as e:
            return PaymentVerification(
                success=False,
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                amount=0,
                currency="NGN",
                provider_data={"error": str(e)}
            )
    
    async def handle_webhook(self, payload: dict, headers: dict) -> WebhookData:
        """Handle Paystack webhook."""
        
        # Verify signature from header
        signature = headers.get("x-paystack-signature", "")
        # Note: Full signature verification should be done with raw body
        
        event = payload.get("event", "")
        data = payload.get("data", {})
        
        status_map = {
            "charge.success": PaymentStatus.SUCCESS,
            "charge.failed": PaymentStatus.FAILED,
            "transfer.success": PaymentStatus.SUCCESS,
            "transfer.failed": PaymentStatus.FAILED,
        }
        
        status = status_map.get(event, PaymentStatus.PENDING)
        
        return WebhookData(
            transaction_id=str(data.get("id")),
            status=status,
            amount=float(data.get("amount", 0)) / 100,
            currency=data.get("currency", "NGN"),
            reference=data.get("reference"),
            paid_at=datetime.fromisoformat(data["paid_at"].replace("Z", "+00:00")) if data.get("paid_at") else None,
            payment_method=data.get("channel"),
            customer_phone=data.get("customer", {}).get("phone"),
            provider_data=payload
        )
    
    async def charge_authorization(
        self,
        authorization_code: str,
        email: str,
        amount: float,
        currency: str = "NGN"
    ) -> PaymentResponse:
        """Charge a saved authorization (recurring payment)."""
        
        data = {
            "authorization_code": authorization_code,
            "email": email,
            "amount": int(amount * 100),  # Convert to kobo
            "currency": currency
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/transaction/charge_authorization",
                    json=data,
                    headers=self._get_headers()
                ) as response:
                    result = await response.json()
                    
                    if result.get("status"):
                        data = result.get("data", {})
                        return PaymentResponse(
                            success=True,
                            transaction_id=str(data.get("id")),
                            provider_reference=data.get("reference"),
                            status=PaymentStatus.SUCCESS if data.get("status") == "success" else PaymentStatus.PENDING,
                            message="Authorization charged successfully",
                            provider_name=self.name,
                            raw_response=result
                        )
                    else:
                        return PaymentResponse(
                            success=False,
                            status=PaymentStatus.FAILED,
                            message=result.get("message", "Charge failed"),
                            provider_name=self.name,
                            raw_response=result
                        )
        except Exception as e:
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                message=str(e),
                provider_name=self.name
            )
    
    async def create_dedicated_virtual_account(
        self,
        customer_email: str,
        customer_name: str
    ) -> dict:
        """Create a dedicated virtual account for bank transfers."""
        
        data = {
            "email": customer_email,
            "first_name": customer_name.split()[0] if customer_name else "",
            "last_name": " ".join(customer_name.split()[1:]) if len(customer_name.split()) > 1 else "",
            "preferred_bank": "wema-bank"  # Options: wema-bank, sterling, provider
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/dedicated_account",
                    json=data,
                    headers=self._get_headers()
                ) as response:
                    result = await response.json()
                    return result
        except Exception as e:
            return {"error": str(e)}
    
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[float] = None,
        reason: str = ""
    ) -> PaymentResponse:
        """Refund a Paystack transaction."""
        
        data = {"transaction": transaction_id}
        if amount:
            data["amount"] = int(amount * 100)  # Convert to kobo
        if reason:
            data["note"] = reason
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/refund",
                    json=data,
                    headers=self._get_headers()
                ) as response:
                    result = await response.json()
                    
                    if result.get("status"):
                        return PaymentResponse(
                            success=True,
                            transaction_id=result["data"]["id"],
                            status=PaymentStatus.REFUNDED,
                            message="Refund processed successfully",
                            provider_name=self.name,
                            raw_response=result
                        )
                    else:
                        return PaymentResponse(
                            success=False,
                            status=PaymentStatus.FAILED,
                            message=result.get("message", "Refund failed"),
                            provider_name=self.name,
                            raw_response=result
                        )
        except Exception as e:
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                message=str(e),
                provider_name=self.name
            )
