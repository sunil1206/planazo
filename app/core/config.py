from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from datetime import timedelta
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Core ──────────────────────────────────────────────────────────────────
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://planazo:planazo123@postgres:5432/planazo"
    DB_HOST: str = "postgres"
    DB_PORT: int = 5432
    DB_NAME: str = "planazo"
    DB_USER: str = "planazo"
    DB_PASSWORD: str = "planazo123"

    # ── Auth ──────────────────────────────────────────────────────────────────
    DJANGO_SECRET_KEY: str = "change-me-in-production"
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_LIFETIME_MINUTES: int = 15
    JWT_REFRESH_TOKEN_LIFETIME_DAYS: int = 30

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def set_secret_key(cls, v, info):
        if not v:
            return info.data.get("DJANGO_SECRET_KEY", "change-me")
        return v

    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── Media / Static ────────────────────────────────────────────────────────
    MEDIA_ROOT: str = "/app/media"
    MEDIA_URL: str = "/media/"
    STATIC_ROOT: str = "/app/staticfiles"

    # ── Email ─────────────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "no-reply@planazo.ai"
    FROM_EMAIL: str = "no-reply@planazo.ai"  # legacy alias
    GIFT_ADMIN_EMAIL: str = "gifts@planazo.ai"
    VENDOR_ADMIN_EMAIL: str = "vendors@planazo.ai"
    WEDDING_ADMIN_EMAIL: str = "weddings@planazo.ai"

    # ── Frontend ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Razorpay ──────────────────────────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"

    # ── Sentry ────────────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── Twilio (optional OTP) ─────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # ── Computed ─────────────────────────────────────────────────────────────
    @property
    def access_token_expire(self) -> timedelta:
        return timedelta(minutes=self.JWT_ACCESS_TOKEN_LIFETIME_MINUTES)

    @property
    def refresh_token_expire(self) -> timedelta:
        return timedelta(days=self.JWT_REFRESH_TOKEN_LIFETIME_DAYS)

    @property
    def sync_database_url(self) -> str:
        """psycopg2 URL for sync contexts (Celery tasks, Alembic)."""
        return self.DATABASE_URL.replace("+asyncpg", "")


settings = Settings()
