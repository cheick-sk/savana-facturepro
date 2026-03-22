"""M-Pesa payment provider via Safaricom Daraja API.
Kenya's dominant mobile money platform with presence in multiple countries.
Supports: STK Push, C2B, B2C, B2B transactions.
"""
import base64
import hashlib
import json
import time
from datetime import datetime
from typing import List, Optional
import aiohttp

from .base import (
    PaymentProvider, PaymentRequest, PaymentResponse,
    PaymentVerification, PaymentStatus, PaymentMethod, WebhookData
)


class MpesaProvider(PaymentProvider):
    """M-Pesa via Safaricom Daraja API.
    
    Primary market: Kenya (KES)
    Also operates in: Tanzania (TZS), Ghana (GHS), DRC, Mozambique, Lesotho
    Documentation: https://developer.safaricom.co.ke/
    """
    
    name = "mpesa"
    display_name = "M-Pesa"
    
    supported_currencies = ["KES", "TZS", "GHS"]
    supported_countries = ["KE", "TZ", "GH"]
    supported_methods = [PaymentMethod.MOBILE_MONEY, PaymentMethod.USSD]
    
    # Daraja API URLs
    SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
    PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"
    
    def __init__(
        self,
        consumer_key: str,
        consumer_secret: str,
        passkey: str,
        shortcode: str,
        till_number: str = None,
        sandbox: bool = True,
        callback_url: str = None
    ):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.passkey = passkey
        self.shortcode = shortcode
        self.till_number = till_number or shortcode
        self.sandbox = sandbox
        self.callback_url = callback_url
        self.base_url = self.SANDBOX_BASE_URL if sandbox else self.PRODUCTION_BASE_URL
        self._access_token = None
        self._token_expires_at = 0
    
    async def _get_access_token(self) -> str:
        """Get OAuth access token from M-Pesa API."""
        
        # Check if we have a valid cached token
        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token
        
        credentials = base64.b64encode(
            f"{self.consumer_key}:{self.consumer_secret}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
                    headers=headers
                ) as response:
                    result = await response.json()
                    self._access_token = result.get("access_token")
                    # Token expires in ~1 hour, refresh 5 minutes before
                    self._token_expires_at = time.time() + 3300
                    return self._access_token
        except Exception:
            return None
    
    def _generate_password(self) -> tuple[str, str]:
        """Generate password and timestamp for STK Push."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()
        return password, timestamp
    
    def _get_headers(self, token: str) -> dict:
        """Get authorization headers."""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for M-Pesa (254XXXXXXXXX)."""
        phone = phone.replace("+", "").replace(" ", "")
        
        # Convert 07XX or 01XX to 2547XX
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif phone.startswith("254"):
            pass  # Already in correct format
        else:
            phone = "254" + phone
        
        return phone
    
    async def initiate_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Initiate M-Pesa STK Push payment.
        
        This sends a payment prompt to the customer's phone.
        """
        
        token = await self._get_access_token()
        if not token:
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                message="Failed to authenticate with M-Pesa",
                provider_name=self.name
            )
        
        password, timestamp = self._generate_password()
        formatted_phone = self._format_phone_number(request.phone_number)
        
        data = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(request.amount),
            "PartyA": formatted_phone,
            "PartyB": self.shortcode,
            "PhoneNumber": formatted_phone,
            "CallBackURL": self.callback_url,
            "AccountReference": request.reference[:12],  # Max 12 chars
            "TransactionDesc": request.description[:13]  # Max 13 chars
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                    json=data,
                    headers=self._get_headers(token)
                ) as response:
                    result = await response.json()
                    
                    if result.get("ResponseCode") == "0":
                        return PaymentResponse(
                            success=True,
                            transaction_id=result.get("CheckoutRequestID"),
                            provider_reference=result.get("MerchantRequestID"),
                            status=PaymentStatus.PENDING,
                            message="STK Push sent. Check your phone for payment prompt.",
                            ussd_instructions="Check your phone for M-Pesa payment prompt",
                            provider_name=self.name,
                            raw_response=result
                        )
                    else:
                        return PaymentResponse(
                            success=False,
                            status=PaymentStatus.FAILED,
                            message=result.get("errorMessage", "STK Push failed"),
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
        """Query STK Push transaction status."""
        
        token = await self._get_access_token()
        if not token:
            return PaymentVerification(
                success=False,
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                amount=0,
                currency="KES"
            )
        
        password, timestamp = self._generate_password()
        
        data = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": transaction_id
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/mpesa/stkpushquery/v1/query",
                    json=data,
                    headers=self._get_headers(token)
                ) as response:
                    result = await response.json()
                    
                    result_code = result.get("ResultCode")
                    
                    if result_code == 0:
                        return PaymentVerification(
                            success=True,
                            transaction_id=transaction_id,
                            status=PaymentStatus.SUCCESS,
                            amount=0,  # Amount not returned in query
                            currency="KES",
                            paid_at=datetime.now(),
                            payment_method=PaymentMethod.MOBILE_MONEY,
                            provider_data=result
                        )
                    elif result_code == 1032:
                        # Transaction cancelled by user
                        return PaymentVerification(
                            success=False,
                            transaction_id=transaction_id,
                            status=PaymentStatus.CANCELLED,
                            amount=0,
                            currency="KES",
                            provider_data=result
                        )
                    elif result_code == 1:
                        # Balance insufficient
                        return PaymentVerification(
                            success=False,
                            transaction_id=transaction_id,
                            status=PaymentStatus.FAILED,
                            amount=0,
                            currency="KES",
                            provider_data=result
                        )
                    else:
                        return PaymentVerification(
                            success=False,
                            transaction_id=transaction_id,
                            status=PaymentStatus.PENDING,
                            amount=0,
                            currency="KES",
                            provider_data=result
                        )
                        
        except Exception as e:
            return PaymentVerification(
                success=False,
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                amount=0,
                currency="KES",
                provider_data={"error": str(e)}
            )
    
    async def handle_webhook(self, payload: dict, headers: dict) -> WebhookData:
        """Handle M-Pesa callback."""
        
        # M-Pesa sends callback in specific format
        stk_callback = payload.get("Body", {}).get("stkCallback", {})
        
        result_code = stk_callback.get("ResultCode")
        
        status = PaymentStatus.PENDING
        if result_code == 0:
            status = PaymentStatus.SUCCESS
        elif result_code == 1032:
            status = PaymentStatus.CANCELLED
        elif result_code in [1, 2001]:
            status = PaymentStatus.FAILED
        
        # Extract payment details from callback metadata
        callback_metadata = {}
        metadata_items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
        for item in metadata_items:
            callback_metadata[item.get("Name")] = item.get("Value")
        
        amount = callback_metadata.get("Amount", 0)
        mpesa_receipt = callback_metadata.get("MpesaReceiptNumber", "")
        phone = callback_metadata.get("PhoneNumber", "")
        
        return WebhookData(
            transaction_id=stk_callback.get("CheckoutRequestID"),
            status=status,
            amount=float(amount),
            currency="KES",
            reference=mpesa_receipt,
            paid_at=datetime.now() if status == PaymentStatus.SUCCESS else None,
            payment_method="mpesa",
            customer_phone=str(phone),
            provider_data=payload
        )
    
    async def b2c_payment(
        self,
        phone: str,
        amount: float,
        occasion: str = ""
    ) -> PaymentResponse:
        """Business to Customer payment (disbursements/payouts)."""
        
        token = await self._get_access_token()
        if not token:
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                message="Failed to authenticate",
                provider_name=self.name
            )
        
        formatted_phone = self._format_phone_number(phone)
        
        data = {
            "InitiatorName": "SavanaFlow",  # Should be configured
            "SecurityCredential": "",  # Encrypted password
            "CommandID": "BusinessPayment",
            "Amount": int(amount),
            "PartyA": self.shortcode,
            "PartyB": formatted_phone,
            "Remarks": occasion[:100],
            "QueueTimeOutURL": self.callback_url,
            "ResultURL": self.callback_url,
            "Occasion": occasion[:100]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/mpesa/b2c/v1/paymentrequest",
                    json=data,
                    headers=self._get_headers(token)
                ) as response:
                    result = await response.json()
                    
                    if result.get("ResponseCode") == "0":
                        return PaymentResponse(
                            success=True,
                            transaction_id=result.get("ConversationID"),
                            status=PaymentStatus.PENDING,
                            message="B2C payment initiated",
                            provider_name=self.name,
                            raw_response=result
                        )
                    else:
                        return PaymentResponse(
                            success=False,
                            status=PaymentStatus.FAILED,
                            message=result.get("errorMessage", "B2C payment failed"),
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
