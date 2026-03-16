from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "FacturePro Africa"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-super-secret-key-32chars!!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+asyncpg://facturepro_user:facturepro_pass@localhost:5432/facturepro"

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@facturepro.africa"
    SMTP_STARTTLS: bool = False

    ADMIN_EMAIL: str = "admin@facturepro.africa"
    ADMIN_PASSWORD: str = "Admin1234!"
    ADMIN_FIRST_NAME: str = "Admin"
    ADMIN_LAST_NAME: str = "System"

    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3001,http://facturepro.localhost"

    # Redis & Celery Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER: str = "redis://localhost:6379/0"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # CinetPay (UEMOA/CEMAC - XOF/XAF)
    CINETPAY_API_KEY: str = ""
    CINETPAY_SITE_ID: str = ""
    CINETPAY_SECRET_KEY: str = ""
    CINETPAY_SANDBOX: bool = True

    # Paystack (Nigeria, Ghana, South Africa)
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_SANDBOX: bool = True

    # M-Pesa (Kenya, Tanzania, Ghana)
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_TILL_NUMBER: str = ""
    MPESA_SANDBOX: bool = True

    # Pawapay (Panafrican)
    PAWAPAY_API_TOKEN: str = ""
    PAWAPAY_SANDBOX: bool = True

    # Payment callback URL
    PAYMENT_CALLBACK_URL: str = ""

    # WhatsApp Business API
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = ""

    # Africa's Talking SMS
    AFRICASTALKING_API_KEY: str = ""
    AFRICASTALKING_USERNAME: str = ""
    AFRICASTALKING_SENDER_ID: str = "SAVANA"
    AFRICASTALKING_SANDBOX: bool = True

    # Firebase Push Notifications
    FIREBASE_CREDENTIALS_PATH: str = ""

    # Sentry Monitoring
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    # Exchange Rates API
    EXCHANGE_RATE_API_KEY: str = ""
    EXCHANGE_RATE_CACHE_HOURS: int = 24

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def payment_config(self) -> dict:
        """Get payment provider configuration."""
        return {
            "cinetpay_api_key": self.CINETPAY_API_KEY,
            "cinetpay_site_id": self.CINETPAY_SITE_ID,
            "cinetpay_secret_key": self.CINETPAY_SECRET_KEY,
            "cinetpay_sandbox": self.CINETPAY_SANDBOX,
            "paystack_secret_key": self.PAYSTACK_SECRET_KEY,
            "paystack_public_key": self.PAYSTACK_PUBLIC_KEY,
            "paystack_sandbox": self.PAYSTACK_SANDBOX,
            "mpesa_consumer_key": self.MPESA_CONSUMER_KEY,
            "mpesa_consumer_secret": self.MPESA_CONSUMER_SECRET,
            "mpesa_passkey": self.MPESA_PASSKEY,
            "mpesa_shortcode": self.MPESA_SHORTCODE,
            "mpesa_till_number": self.MPESA_TILL_NUMBER,
            "mpesa_sandbox": self.MPESA_SANDBOX,
            "pawapay_api_token": self.PAWAPAY_API_TOKEN,
            "pawapay_sandbox": self.PAWAPAY_SANDBOX,
            "callback_url": self.PAYMENT_CALLBACK_URL,
        }

    @property
    def notification_config(self) -> dict:
        """Get notification channels configuration."""
        return {
            "whatsapp_access_token": self.WHATSAPP_ACCESS_TOKEN,
            "whatsapp_phone_number_id": self.WHATSAPP_PHONE_NUMBER_ID,
            "africastalking_api_key": self.AFRICASTALKING_API_KEY,
            "africastalking_username": self.AFRICASTALKING_USERNAME,
            "africastalking_sender_id": self.AFRICASTALKING_SENDER_ID,
            "africastalking_sandbox": self.AFRICASTALKING_SANDBOX,
            "firebase_credentials_path": self.FIREBASE_CREDENTIALS_PATH,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
