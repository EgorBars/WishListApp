from functools import lru_cache
from typing import Optional, Any

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

    postgres_user: str = Field(default="wishlist_user", alias="MYSQL_USER")
    postgres_password: str = Field(default="wishlist_password", alias="MYSQL_PASSWORD")
    postgres_db: str = Field(default="wishlist_db", alias="MYSQL_DB")

    database_url: Optional[AnyUrl] = Field(default=None, alias="DATABASE_URL")
    database_url_sync: Optional[str] = Field(default=None, alias="DATABASE_URL_SYNC")

    secret_key: str = Field(default="0" * 32, alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    reset_token_expire_hours: int = Field(default=1, alias="RESET_TOKEN_EXPIRE_HOURS")

    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")
    cors_allowed_origins: Optional[str] = Field(default=None, alias="CORS_ALLOWED_ORIGINS")
    domain_name: str = Field(default="localhost", alias="DOMAIN_NAME")

    smtp_host: str = Field(default="localhost", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")
    smtp_use_ssl: bool = Field(default=False, alias="SMTP_USE_SSL")
    smtp_from_email: Optional[str] = Field(default=None, alias="SMTP_FROM_EMAIL")

    scraper_timeout_seconds: float = Field(default=12.0, alias="SCRAPER_TIMEOUT_SECONDS")
    scraper_connect_timeout_seconds: float = Field(default=5.0, alias="SCRAPER_CONNECT_TIMEOUT_SECONDS")
    scraper_read_timeout_seconds: float = Field(default=8.0, alias="SCRAPER_READ_TIMEOUT_SECONDS")
    scraper_user_agent: Optional[str] = Field(default=None, alias="SCRAPER_USER_AGENT")

    @property
    def sync_database_url(self) -> str:
        if self.database_url_sync:
            return self.database_url_sync
        return f"mysql+pymysql://{self.postgres_user}:{self.postgres_password}@localhost/{self.postgres_db}"
    
    @property
    def async_database_url(self) -> str:
        if self.database_url is not None:
            return str(self.database_url)
        return f"mysql+aiomysql://{self.postgres_user}:{self.postgres_password}@localhost/{self.postgres_db}"

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug(cls, v: object) -> object:
        if isinstance(v, str) and v.lower() in {"release", "prod", "production"}:
            return False
        return v

    @property
    def allowed_cors_origins(self) -> list[str]:
        if self.cors_allowed_origins:
            return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

        origins = [self.frontend_url]
        if self.debug:
            origins.extend(
                [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                ]
            )
        return list(dict.fromkeys(origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()
