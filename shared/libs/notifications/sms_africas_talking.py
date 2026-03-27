"""Africa's Talking SMS notification channel.
Covers 250+ mobile networks across Africa.
Countries: Kenya, Nigeria, Ghana, Uganda, Tanzania, Rwanda, Ethiopia, Malawi, Zambia, Zimbabwe, etc.
"""
import aiohttp
from typing import Optional, List
from datetime import datetime
import json

from .base import (
    NotificationChannel, NotificationMessage, NotificationResult,
    NotificationType, NotificationPriority
)


class AfricasTalkingSMSChannel(NotificationChannel):
    """Africa's Talking SMS channel.
    
    Provides SMS delivery across most African countries.
    Supports: Single SMS, Bulk SMS, Premium SMS, Voice calls.
    
    Documentation: https://developers.africastalking.com/
    """
    
    name = "sms"
    display_name = "Africa's Talking SMS"
    
    # API endpoints
    SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging"
    PRODUCTION_URL = "https://api.africastalking.com/version1/messaging"
    
    # Coverage by country
    SUPPORTED_COUNTRIES = [
        "KE", "NG", "GH", "UG", "TZ", "RW",  # East & West Africa
        "ET", "MZ", "ZM", "ZW", "MW",  # Southern Africa
        "CI", "SN", "BF", "ML", "BJ",  # West Africa (limited)
        "ZA"  # South Africa
    ]
    
    def __init__(
        self,
        api_key: str,
        username: str,
        sender_id: str = None,
        sandbox: bool = True
    ):
        self.api_key = api_key
        self.username = username
        self.sender_id = sender_id or "SAVANA"  # Must be registered
        self.sandbox = sandbox
        self.api_url = self.SANDBOX_URL if sandbox else self.PRODUCTION_URL
    
    async def is_configured(self) -> bool:
        """Check if SMS is properly configured."""
        return bool(self.api_key and self.username)
    
    def _get_headers(self) -> dict:
        """Get API headers."""
        return {
            "apiKey": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
    
    async def send(self, message: NotificationMessage) -> NotificationResult:
        """Send a single SMS message."""
        
        phone = self.format_phone(message.to)
        
        # Africa's Talking expects comma-separated recipients for bulk
        data = {
            "username": self.username,
            "to": phone,
            "message": message.body[:1600],  # Max 3 SMS concatenated
            "from": self.sender_id
        }
        
        # Add enqueue flag for high volume
        if message.priority in [NotificationPriority.HIGH, NotificationPriority.URGENT]:
            data["enqueue"] = "1"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=self._get_headers(),
                    data=data
                ) as response:
                    result = await response.json()
                    
                    if response.status == 201:
                        sms_data = result.get("SMSMessageData", {})
                        recipients = sms_data.get("Recipients", [])
                        
                        if recipients and recipients[0].get("status") == "Success":
                            message_id = recipients[0].get("messageId")
                            cost = float(recipients[0].get("cost", "0").replace("USD ", ""))
                            
                            return NotificationResult(
                                success=True,
                                channel=self.name,
                                message_id=message_id,
                                cost=cost,
                                sent_at=datetime.now().isoformat()
                            )
                        else:
                            # Some recipients failed
                            error = recipients[0].get("status") if recipients else "Unknown error"
                            return NotificationResult(
                                success=False,
                                channel=self.name,
                                error=error
                            )
                    else:
                        return NotificationResult(
                            success=False,
                            channel=self.name,
                            error=result.get("SMSMessageData", {}).get("Message", "Unknown error")
                        )
                        
        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error=str(e)
            )
    
    async def send_batch(self, messages: List[NotificationMessage]) -> List[NotificationResult]:
        """Send bulk SMS - optimized for Africa's Talking bulk endpoint."""
        
        if not messages:
            return []
        
        # Group recipients by message content for efficiency
        results = []
        
        # Africa's Talking supports up to 10,000 recipients per request
        phones = [self.format_phone(m.to) for m in messages]
        phone_list = ",".join(phones)
        
        # Use first message as template (assumes same content)
        first_message = messages[0]
        
        data = {
            "username": self.username,
            "to": phone_list,
            "message": first_message.body[:1600],
            "from": self.sender_id,
            "enqueue": "1"  # Enable queuing for bulk
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=self._get_headers(),
                    data=data
                ) as response:
                    result = await response.json()
                    
                    if response.status == 201:
                        sms_data = result.get("SMSMessageData", {})
                        recipients = sms_data.get("Recipients", [])
                        
                        # Create result for each recipient
                        for i, recipient in enumerate(recipients):
                            status = recipient.get("status")
                            message_id = recipient.get("messageId")
                            cost = float(recipient.get("cost", "0").replace("USD ", "")) if status == "Success" else 0
                            
                            results.append(NotificationResult(
                                success=status == "Success",
                                channel=self.name,
                                message_id=message_id,
                                cost=cost,
                                error=None if status == "Success" else status,
                                sent_at=datetime.now().isoformat() if status == "Success" else None
                            ))
                        
                        return results
                    else:
                        error = result.get("SMSMessageData", {}).get("Message", "Unknown error")
                        return [NotificationResult(
                            success=False,
                            channel=self.name,
                            error=error
                        ) for _ in messages]
                        
        except Exception as e:
            return [NotificationResult(
                success=False,
                channel=self.name,
                error=str(e)
            ) for _ in messages]
    
    async def check_balance(self) -> dict:
        """Check SMS account balance."""
        
        url = self.api_url.replace("/messaging", "/user")
        params = {"username": self.username}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    headers=self._get_headers(),
                    params=params
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        user_data = result.get("UserData", {})
                        balance = user_data.get("balance", "USD 0.00")
                        return {
                            "balance": balance,
                            "currency": "USD"
                        }
                    else:
                        return {"error": "Failed to fetch balance"}
                        
        except Exception as e:
            return {"error": str(e)}
    
    async def fetch_messages(self, last_received_id: int = 0) -> List[dict]:
        """Fetch incoming messages (for delivery reports, replies, etc.)."""
        
        url = self.api_url.replace("/messaging", "/messaging/fetch")
        params = {
            "username": self.username,
            "lastReceivedId": last_received_id
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    headers=self._get_headers(),
                    params=params
                ) as response:
                    result = await response.json()
                    return result.get("SMSMessageData", {}).get("Messages", [])
        except Exception:
            return []
    
    async def create_subscription(
        self,
        phone: str,
        keyword: str,
        short_code: str
    ) -> NotificationResult:
        """Create a premium SMS subscription."""
        
        url = self.api_url.replace("/messaging", "/subscription/create")
        
        data = {
            "username": self.username,
            "phoneNumber": self.format_phone(phone),
            "keyword": keyword,
            "shortCode": short_code
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    data=data
                ) as response:
                    result = await response.json()
                    
                    if response.status == 201:
                        return NotificationResult(
                            success=True,
                            channel=self.name,
                            message_id=result.get("subscriptionId")
                        )
                    else:
                        return NotificationResult(
                            success=False,
                            channel=self.name,
                            error=result.get("status", "Subscription failed")
                        )
        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error=str(e)
            )


# SMS pricing by country (approximate, in USD per SMS)
SMS_PRICING = {
    "KE": 0.012,  # Kenya
    "NG": 0.015,  # Nigeria
    "GH": 0.020,  # Ghana
    "UG": 0.018,  # Uganda
    "TZ": 0.015,  # Tanzania
    "RW": 0.015,  # Rwanda
    "ET": 0.025,  # Ethiopia
    "ZA": 0.035,  # South Africa
    "CI": 0.040,  # Côte d'Ivoire (limited coverage)
    "SN": 0.040,  # Sénégal
}


def estimate_sms_cost(phone_numbers: List[str], message_length: int = 160) -> float:
    """Estimate SMS cost based on destination countries.
    
    Args:
        phone_numbers: List of phone numbers
        message_length: Length of message in characters
        
    Returns:
        Estimated cost in USD
    """
    total_cost = 0.0
    
    # Number of SMS segments
    segments = 1
    if message_length > 160:
        segments = (message_length + 152) // 153  # Concatenated SMS
    
    for phone in phone_numbers:
        # Detect country from phone prefix
        country = detect_country_from_phone(phone)
        price_per_sms = SMS_PRICING.get(country, 0.030)  # Default price
        total_cost += price_per_sms * segments
    
    return total_cost


def detect_country_from_phone(phone: str) -> str:
    """Detect country code from phone number prefix."""
    phone = phone.replace("+", "").replace(" ", "")
    
    # Country prefixes
    prefixes = {
        "254": "KE",  # Kenya
        "234": "NG",  # Nigeria
        "233": "GH",  # Ghana
        "256": "UG",  # Uganda
        "255": "TZ",  # Tanzania
        "250": "RW",  # Rwanda
        "251": "ET",  # Ethiopia
        "27": "ZA",   # South Africa
        "225": "CI",  # Côte d'Ivoire
        "221": "SN",  # Sénégal
        "226": "BF",  # Burkina Faso
        "223": "ML",  # Mali
        "229": "BJ",  # Bénin
    }
    
    for prefix, country in prefixes.items():
        if phone.startswith(prefix):
            return country
    
    return "UNKNOWN"
