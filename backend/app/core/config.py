from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/cricket"

    # Required, no default: the app must fail fast rather than boot with a
    # guessable signing key. Set JWT_SECRET in the environment.
    jwt_secret: str
    jwt_issuer: str = "cricket-api"
    jwt_audience: str = "cricket-ui"
    jwt_access_token_expires_minutes: int = 60 * 24 * 7  # 7 days

    cors_origins: str = "http://localhost:3000"

    admin_username: str = "admin"
    # Required, no default: prevents an admin/admin account being auto-created.
    admin_password: str

    # Login throttling, e.g. "5/minute". See slowapi rate-limit syntax.
    login_rate_limit: str = "5/minute"

    log_level: str = "INFO"
    app_version: str | None = None


settings = Settings()

