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

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
