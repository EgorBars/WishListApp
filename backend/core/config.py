from functools import lru_cache
from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "WishListApp API"

    postgres_user: str = Field(default="wishlist_user", alias="POSTGRES_USER")
    postgres_password: str = Field(default="wishlist_password", alias="POSTGRES_PASSWORD")
    postgres_db: str = Field(default="wishlist_db", alias="POSTGRES_DB")

    database_url: AnyUrl | None = Field(default=None, alias="DATABASE_URL")

    secret_key: str = Field(default="change_me", alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True

    @property
    def async_database_url(self) -> str:
        if self.database_url is not None:
            return str(self.database_url)
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@db:5432/{self.postgres_db}"


@lru_cache
def get_settings() -> Settings:
    return Settings()

