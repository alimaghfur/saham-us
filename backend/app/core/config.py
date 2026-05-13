"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings.

    Values are read from environment variables and `.env` file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Saham-US API"
    app_version: str = "0.1.0"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"

    # External APIs
    finnhub_api_key: str = ""
    alpha_vantage_api_key: str = ""
    polygon_api_key: str = ""
    fred_api_key: str = ""

    # Infrastructure
    redis_url: str = "redis://localhost:6379"
    database_url: str = ""

    # Cache TTL (seconds)
    cache_ttl_quote: int = 60          # 1 min (was 15s — too aggressive)
    cache_ttl_history: int = 300       # 5 min
    cache_ttl_fundamentals: int = 86400  # 24h
    cache_ttl_news: int = 600          # 10 min

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS_ORIGINS into list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
