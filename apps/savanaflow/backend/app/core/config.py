from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "SavanaFlow POS"
    APP_ENV: str = "development"
    SECRET_KEY: str = "savanaflow-secret-key-32chars-abc!!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+asyncpg://savanaflow_user:savanaflow_pass@localhost:5434/savanaflow"

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@savanaflow.africa"
    SMTP_STARTTLS: bool = False

    ADMIN_EMAIL: str = "admin@savanaflow.africa"
    ADMIN_PASSWORD: str = "Admin1234!"
    ADMIN_FIRST_NAME: str = "Admin"
    ADMIN_LAST_NAME: str = "POS"

    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3003,http://savanaflow.localhost"
    LOW_STOCK_THRESHOLD: int = 10

    # Redis & Celery Configuration
    REDIS_URL: str = "redis://localhost:6379/1"
    CELERY_BROKER: str = "redis://localhost:6379/1"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Global settings instance for Celery and other modules
settings = get_settings()
