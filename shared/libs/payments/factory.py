"""Payment provider factory.
Automatically selects the best provider based on currency and country.
"""
from typing import Optional, List, Type
from .base import PaymentProvider, PaymentMethod
from .cinetpay import CinetPayProvider
from .paystack import PaystackProvider
from .mpesa import MpesaProvider


# Provider priority by currency
CURRENCY_PROVIDERS = {
    "XOF": ["cinetpay"],  # UEMOA zone
    "XAF": ["cinetpay"],  # CEMAC zone
    "NGN": ["paystack"],  # Nigeria
    "GHS": ["paystack", "mpesa"],  # Ghana
    "KES": ["mpesa", "paystack"],  # Kenya
    "TZS": ["mpesa"],  # Tanzania
    "ZAR": ["paystack"],  # South Africa
    "USD": ["paystack"],  # International
}

# Provider priority by country
COUNTRY_PROVIDERS = {
    "CI": ["cinetpay"],  # Côte d'Ivoire
    "SN": ["cinetpay"],  # Sénégal
    "BF": ["cinetpay"],  # Burkina Faso
    "ML": ["cinetpay"],  # Mali
    "BJ": ["cinetpay"],  # Bénin
    "TG": ["cinetpay"],  # Togo
    "NE": ["cinetpay"],  # Niger
    "GW": ["cinetpay"],  # Guinée-Bissau
    "CM": ["cinetpay"],  # Cameroun
    "GA": ["cinetpay"],  # Gabon
    "CG": ["cinetpay"],  # Congo
    "NG": ["paystack"],  # Nigeria
    "GH": ["paystack", "mpesa"],  # Ghana
    "KE": ["mpesa", "paystack"],  # Kenya
    "TZ": ["mpesa"],  # Tanzania
    "UG": ["mpesa"],  # Uganda (via M-Pesa)
    "ZA": ["paystack"],  # South Africa
    "RW": ["mpesa"],  # Rwanda (via M-Pesa)
}


def get_provider(
    currency: str,
    country: Optional[str] = None,
    provider_name: Optional[str] = None,
    config: Optional[dict] = None
) -> Optional[PaymentProvider]:
    """Get the best payment provider for a currency/country combination.
    
    Args:
        currency: Currency code (XOF, NGN, KES, etc.)
        country: Optional country code (CI, NG, KE, etc.)
        provider_name: Optional specific provider to use
        config: Configuration dict with API keys
        
    Returns:
        Configured PaymentProvider instance or None if not available
    """
    config = config or {}
    currency = currency.upper()
    country = country.upper() if country else None
    
    # Determine which provider to use
    if provider_name:
        provider_names = [provider_name.lower()]
    elif country and country in COUNTRY_PROVIDERS:
        provider_names = COUNTRY_PROVIDERS[country]
    elif currency in CURRENCY_PROVIDERS:
        provider_names = CURRENCY_PROVIDERS[currency]
    else:
        provider_names = ["cinetpay", "paystack", "mpesa"]  # Default order
    
    # Try to instantiate each provider in priority order
    for name in provider_names:
        provider = _create_provider(name, config)
        if provider:
            if provider.supports_currency(currency):
                return provider
    
    return None


def _create_provider(name: str, config: dict) -> Optional[PaymentProvider]:
    """Create a provider instance from configuration."""
    
    if name == "cinetpay":
        if all(k in config for k in ["cinetpay_api_key", "cinetpay_site_id", "cinetpay_secret_key"]):
            return CinetPayProvider(
                api_key=config["cinetpay_api_key"],
                site_id=config["cinetpay_site_id"],
                secret_key=config["cinetpay_secret_key"],
                sandbox=config.get("cinetpay_sandbox", True),
                notify_url=config.get("callback_url")
            )
    
    elif name == "paystack":
        if "paystack_secret_key" in config:
            return PaystackProvider(
                secret_key=config["paystack_secret_key"],
                public_key=config.get("paystack_public_key"),
                sandbox=config.get("paystack_sandbox", True),
                callback_url=config.get("callback_url")
            )
    
    elif name == "mpesa":
        if all(k in config for k in ["mpesa_consumer_key", "mpesa_consumer_secret", "mpesa_passkey", "mpesa_shortcode"]):
            return MpesaProvider(
                consumer_key=config["mpesa_consumer_key"],
                consumer_secret=config["mpesa_consumer_secret"],
                passkey=config["mpesa_passkey"],
                shortcode=config["mpesa_shortcode"],
                till_number=config.get("mpesa_till_number"),
                sandbox=config.get("mpesa_sandbox", True),
                callback_url=config.get("callback_url")
            )
    
    return None


def get_available_providers(config: dict) -> List[str]:
    """Get list of available providers based on configuration.
    
    Returns:
        List of provider names that have valid configuration
    """
    available = []
    
    if all(k in config for k in ["cinetpay_api_key", "cinetpay_site_id", "cinetpay_secret_key"]):
        available.append("cinetpay")
    
    if "paystack_secret_key" in config:
        available.append("paystack")
    
    if all(k in config for k in ["mpesa_consumer_key", "mpesa_consumer_secret", "mpesa_passkey", "mpesa_shortcode"]):
        available.append("mpesa")
    
    return available


def get_provider_info(provider_name: str) -> dict:
    """Get information about a payment provider.
    
    Returns:
        Dict with provider details (name, currencies, countries, methods)
    """
    info = {
        "cinetpay": {
            "name": "CinetPay",
            "description": "Mobile Money aggregator for West & Central Africa",
            "currencies": ["XOF", "XAF"],
            "countries": ["CI", "SN", "BF", "ML", "BJ", "TG", "NE", "GW", "CM", "GA", "CG"],
            "methods": ["mobile_money", "card"],
            "operators": ["Orange Money", "MTN MoMo", "Wave", "Moov", "Coris Money"],
            "fees": "Variable by operator (~1-3%)"
        },
        "paystack": {
            "name": "Paystack",
            "description": "Leading Nigerian payment gateway (Stripe-owned)",
            "currencies": ["NGN", "GHS", "ZAR", "KES", "USD"],
            "countries": ["NG", "GH", "ZA", "KE"],
            "methods": ["card", "bank_transfer", "ussd", "qr_code", "mobile_money"],
            "features": ["Recurring payments", "Virtual accounts", "Refunds"],
            "fees": "~1.5% + 100 NGN (Nigeria)"
        },
        "mpesa": {
            "name": "M-Pesa",
            "description": "Safaricom's mobile money platform",
            "currencies": ["KES", "TZS", "GHS"],
            "countries": ["KE", "TZ", "GH", "UG", "RW", "CD", "MZ", "LS"],
            "methods": ["mobile_money", "ussd"],
            "features": ["STK Push", "B2C payouts", "C2B payments"],
            "fees": "Variable by transaction size"
        }
    }
    
    return info.get(provider_name, {})


# Default configuration template for .env
DEFAULT_PAYMENT_CONFIG = """
# CinetPay (UEMOA/CEMAC - XOF/XAF)
CINETPAY_API_KEY=your_api_key
CINETPAY_SITE_ID=your_site_id
CINETPAY_SECRET_KEY=your_secret_key
CINETPAY_SANDBOX=true

# Paystack (Nigeria, Ghana, South Africa)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SANDBOX=true

# M-Pesa (Kenya, Tanzania, Ghana)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_SANDBOX=true

# Global callback URL for webhooks
PAYMENT_CALLBACK_URL=https://your-domain.com/api/v1/payments/callback
"""
