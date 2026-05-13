"""Market data service — caches + async-wraps the adapter layer."""
from __future__ import annotations

import asyncio
from typing import List

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.core.cache import get_cache
from app.core.config import get_settings
from app.schemas.stock import (
    CompanyProfile,
    Fundamentals,
    HistoryResponse,
    NewsItem,
    Quote,
)


class MarketDataService:
    """High-level market data API used by routers."""

    def __init__(self) -> None:
        self.adapter = get_yfinance_adapter()
        self.cache = get_cache()
        self.settings = get_settings()

    # ---- helpers ----
    async def _run(self, fn, *args, **kwargs):
        """Offload blocking adapter calls to a thread."""
        return await asyncio.to_thread(fn, *args, **kwargs)

    # ---- endpoints ----
    async def quote(self, symbol: str) -> Quote:
        key = f"quote:{symbol.upper()}"
        cached = self.cache.get(key)
        if cached:
            return Quote(**cached)
        result = await self._run(self.adapter.get_quote, symbol)
        self.cache.set(key, result.model_dump(), self.settings.cache_ttl_quote)
        return result

    async def profile(self, symbol: str) -> CompanyProfile:
        key = f"profile:{symbol.upper()}"
        cached = self.cache.get(key)
        if cached:
            return CompanyProfile(**cached)
        result = await self._run(self.adapter.get_profile, symbol)
        self.cache.set(key, result.model_dump(), self.settings.cache_ttl_fundamentals)
        return result

    async def history(
        self, symbol: str, range_: str = "1y", interval: str = "1d"
    ) -> HistoryResponse:
        key = f"history:{symbol.upper()}:{range_}:{interval}"
        cached = self.cache.get(key)
        if cached:
            return HistoryResponse(**cached)
        result = await self._run(self.adapter.get_history, symbol, range_, interval)
        self.cache.set(key, result.model_dump(), self.settings.cache_ttl_history)
        return result

    async def fundamentals(self, symbol: str) -> Fundamentals:
        key = f"fundamentals:{symbol.upper()}"
        cached = self.cache.get(key)
        if cached:
            return Fundamentals(**cached)
        result = await self._run(self.adapter.get_fundamentals, symbol)
        self.cache.set(key, result.model_dump(), self.settings.cache_ttl_fundamentals)
        return result

    async def news(self, symbol: str, limit: int = 20) -> List[NewsItem]:
        key = f"news:{symbol.upper()}:{limit}"
        cached = self.cache.get(key)
        if cached:
            return [NewsItem(**n) for n in cached]
        result = await self._run(self.adapter.get_news, symbol, limit)
        self.cache.set(
            key, [n.model_dump() for n in result], self.settings.cache_ttl_news
        )
        return result

    async def search(self, query: str, limit: int = 10):
        return await self._run(self.adapter.search, query, limit)


_service: MarketDataService | None = None


def get_market_data_service() -> MarketDataService:
    global _service
    if _service is None:
        _service = MarketDataService()
    return _service
