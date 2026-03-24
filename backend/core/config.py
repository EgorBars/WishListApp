from functools import lru_cache

from pydantic import AnyUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="WishListApp API", alias="APP_NAME")
    debug: bool = Field(default=False, alias="DEBUG")

    postgres_user: str = Field(default="wishlist_user", alias="POSTGRES_USER")
    postgres_password: str = Field(default="wishlist_password", alias="POSTGRES_PASSWORD")
    postgres_db: str = Field(default="wishlist_db", alias="POSTGRES_DB")

    database_url: AnyUrl | None = Field(default=None, alias="DATABASE_URL")
    database_url_sync: str | None = Field(default=None, alias="DATABASE_URL_SYNC")

    secret_key: str = Field(default="0" * 32, alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    reset_token_expire_hours: int = Field(default=1, alias="RESET_TOKEN_EXPIRE_HOURS")

    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")

    smtp_host: str = Field(default="localhost", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")

    @field_validator("secret_key")
    @classmethod
    def secret_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @property
    def async_database_url(self) -> str:
        if self.database_url is not None:
            return str(self.database_url)
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@db:5432/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        if self.database_url_sync:
            return self.database_url_sync
        base = self.async_database_url
        if base.startswith("postgresql+asyncpg"):
            return base.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
        return base


@lru_cache
def get_settings() -> Settings:
    return Settings()
