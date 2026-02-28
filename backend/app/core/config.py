from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/cricket"

    jwt_secret: str = "change-me"
    jwt_issuer: str = "cricket-api"
    jwt_audience: str = "cricket-ui"
    jwt_access_token_expires_minutes: int = 60 * 24 * 7  # 7 days

    cors_origins: str = "http://localhost:3000"

    admin_username: str = "admin"
    admin_password: str = "admin"

    log_level: str = "INFO"
    app_version: str | None = None


settings = Settings()

