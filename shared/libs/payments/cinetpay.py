"""CinetPay payment provider.
Supports: Côte d'Ivoire, Sénégal, Burkina Faso, Mali, Togo, Bénin, Niger, Guinée.
Payment methods: Orange Money, MTN MoMo, Wave, Moov, Coris Money, etc.
"""
import hashlib
import hmac
import time
from typing import List, Optional
from datetime import datetime, timedelta
import aiohttp
import json

from .base import (
    PaymentProvider, PaymentRequest, PaymentResponse, 
    PaymentVerification, PaymentStatus, PaymentMethod, WebhookData
)


class CinetPayProvider(PaymentProvider):
    """CinetPay - Mobile Money aggregator for West Africa (UEMOA zone).
    
    Supports XOF and XAF currencies.
    Documentation: https://docs.cinetpay.com/
    """
    
    name = "cinetpay"
    display_name = "CinetPay"
    
    supported_currencies = ["XOF", "XAF"]
    supported_countries = ["CI", "SN", "BF", "ML", "BJ", "TG", "NE", "GW"]
    supported_methods = [PaymentMethod.MOBILE_MONEY, PaymentMethod.CARD]
    
    # API endpoints
    SANDBOX_BASE_URL = "https://api-checkout-sandbox.cinetpay.com/v2"
    PRODUCTION_BASE_URL = "https://api-checkout.cinetpay.com/v2"
    
    def __init__(
        self,
        api_key: str,
        site_id: str,
        secret_key: str,
        sandbox: bool = True,
        notify_url: str = None
    ):
        self.api_key = api_key
        self.site_id = site_id
        self.secret_key = secret_key
        self.sandbox = sandbox
        self.notify_url = notify_url
        self.base_url = self.SANDBOX_BASE_URL if sandbox else self.PRODUCTION_BASE_URL
    
    def _generate_signature(self, data: dict) -> str:
        """Generate HMAC SHA256 signature for request."""
        # CinetPay signature format
        signature_data = f"{data.get('cpm_amount', '')}{data.get('cpm_currency', '')}{data.get('cpm_site_id', '')}{data.get('cpm_trans_id', '')}{self.secret_key}"
        return hashlib.sha256(signature_data.encode()).hexdigest()
    
    def _verify_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature."""
        expected = hmac.new(
            self.secret_key.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
    
    async def initiate_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Initiate a CinetPay payment."""
        
        # Generate unique transaction ID
        transaction_id = request.reference
        
        # Prepare payment data
        data = {
            "apikey": self.api_key,
            "site_id": self.site_id,
            "transaction_id": transaction_id,
            "amount": int(request.amount),  # CinetPay expects integer
            "currency": request.currency,
            "description": request.description[:100],  # Max 100 chars
            "customer_name": request.customer_name or "Client",
            "customer_surname": "",
            "customer_email": request.customer_email or "",
            "customer_phone_number": request.phone_number.replace("+", ""),
            "customer_address": "",
            "customer_city": "",
            "customer_country": request.currency[:2] if request.currency == "XOF" else "CI",
            "customer_state": "",
            "customer_zip_code": "",
            "notify_url": self.notify_url or "",
            "return_url": request.return_url or "",
            "channels": "ALL",  # Accept all payment channels
            "metadata": json.dumps(request.metadata) if request.metadata else "",
            "lang": "fr",
        }
        
        # Calculate signature
        signature_data = f"{data['amount']}{data['currency']}{self.site_id}{transaction_id}{self.secret_key}"
        data["signature"] = hashlib.sha256(signature_data.encode()).hexdigest()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/payment",
                    json=data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    result = await response.json()
                    
                    if result.get("code") == "201" or result.get("code") == "200":
                        data = result.get("data", {})
                        return PaymentResponse(
                            success=True,
                            transaction_id=transaction_id,
                            provider_reference=data.get("cpm_trans_id"),
                            status=PaymentStatus.PENDING,
                            message="Payment initiated successfully",
                            payment_url=data.get("payment_url"),
                            provider_name=self.name,
                            raw_response=result
                        )
                    else:
                        return PaymentResponse(
                            success=False,
                            status=PaymentStatus.FAILED,
                            message=result.get("message", "Payment initiation failed"),
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
        """Verify payment status with CinetPay."""
        
        data = {
            "apikey": self.api_key,
            "site_id": self.site_id,
            "transaction_id": transaction_id
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/payment/check",
                    json=data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    result = await response.json()
                    
                    if result.get("code") == "200":
                        data = result.get("data", {})
                        
                        # Map CinetPay status to our status
                        status_map = {
                            "ACCEPTED": PaymentStatus.SUCCESS,
                            "SUCCESS": PaymentStatus.SUCCESS,
                            "PENDING": PaymentStatus.PENDING,
                            "WAITING": PaymentStatus.PENDING,
                            "FAILED": PaymentStatus.FAILED,
                            "CANCELLED": PaymentStatus.CANCELLED,
                            "REFUSED": PaymentStatus.FAILED,
                        }
                        
                        cp_status = data.get("cpm_result", "PENDING")
                        status = status_map.get(cp_status, PaymentStatus.PENDING)
                        
                        return PaymentVerification(
                            success=status == PaymentStatus.SUCCESS,
                            transaction_id=transaction_id,
                            status=status,
                            amount=float(data.get("cpm_amount", 0)),
                            currency=data.get("cpm_currency", "XOF"),
                            paid_at=datetime.now() if status == PaymentStatus.SUCCESS else None,
                            payment_method=PaymentMethod.MOBILE_MONEY,
                            customer_phone=data.get("phone_number"),
                            provider_data=data
                        )
                    else:
                        return PaymentVerification(
                            success=False,
                            transaction_id=transaction_id,
                            status=PaymentStatus.FAILED,
                            amount=0,
                            currency="XOF"
                        )
                        
        except Exception as e:
            return PaymentVerification(
                success=False,
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                amount=0,
                currency="XOF",
                provider_data={"error": str(e)}
            )
    
    async def handle_webhook(self, payload: dict, headers: dict) -> WebhookData:
        """Handle CinetPay webhook notification."""
        
        # Verify signature (CinetPay sends signature in payload)
        # The signature verification should be done by comparing
        # the hash of specific fields
        
        transaction_id = payload.get("cpm_trans_id") or payload.get("transaction_id")
        
        status_map = {
            "ACCEPTED": PaymentStatus.SUCCESS,
            "SUCCESS": PaymentStatus.SUCCESS,
            "PENDING": PaymentStatus.PENDING,
            "FAILED": PaymentStatus.FAILED,
            "CANCELLED": PaymentStatus.CANCELLED,
        }
        
        cp_status = payload.get("cpm_result", "PENDING")
        status = status_map.get(cp_status, PaymentStatus.PENDING)
        
        return WebhookData(
            transaction_id=transaction_id,
            status=status,
            amount=float(payload.get("cpm_amount", 0)),
            currency=payload.get("cpm_currency", "XOF"),
            reference=transaction_id,
            paid_at=datetime.now() if status == PaymentStatus.SUCCESS else None,
            payment_method=payload.get("payment_method", "mobile_money"),
            customer_phone=payload.get("phone_number"),
            provider_data=payload
        )
    
    async def get_balance(self) -> dict:
        """Get CinetPay account balance."""
        
        data = {
            "apikey": self.api_key,
            "site_id": self.site_id
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/balance",
                    json=data
                ) as response:
                    result = await response.json()
                    return result
        except Exception:
            return {"error": "Unable to fetch balance"}
