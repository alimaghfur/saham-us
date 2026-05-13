"""Screener service — filters a ticker universe by fundamental criteria.

MVP uses on-demand yfinance lookups over a curated universe (~100
names). Production path: pre-compute nightly into Postgres.
"""
from __future__ import annotations

import asyncio
from typing import List

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.core.cache import get_cache
from app.core.config import get_settings
from app.schemas.stock import ScreenerFilter, ScreenerResult
from app.utils.constants import DEFAULT_UNIVERSE


def _passes(filters: ScreenerFilter, row: ScreenerResult) -> bool:
    """Return True if row satisfies all non-null filter criteria."""
    if filters.market_cap_min is not None and (
        row.market_cap is None or row.market_cap < filters.market_cap_min
    ):
        return False
    if filters.market_cap_max is not None and (
        row.market_cap is None or row.market_cap > filters.market_cap_max
    ):
        return False
    if filters.pe_min is not None and (
        row.pe_ratio is None or row.pe_ratio < filters.pe_min
    ):
        return False
    if filters.pe_max is not None and (
        row.pe_ratio is None or row.pe_ratio > filters.pe_max
    ):
        return False
    if filters.pb_min is not None and (
        row.pb_ratio is None or row.pb_ratio < filters.pb_min
    ):
        return False
    if filters.pb_max is not None and (
        row.pb_ratio is None or row.pb_ratio > filters.pb_max
    ):
        return False
    if filters.roe_min is not None and (
        row.roe is None or row.roe < filters.roe_min
    ):
        return False
    if filters.dividend_yield_min is not None and (
        row.dividend_yield is None
        or row.dividend_yield < filters.dividend_yield_min
    ):
        return False
    if filters.revenue_growth_min is not None and (
        row.revenue_growth is None
        or row.revenue_growth < filters.revenue_growth_min
    ):
        return False
    if filters.sectors and row.sector not in filters.sectors:
        return False
    return True


class ScreenerService:
    def __init__(self) -> None:
        self.adapter = get_yfinance_adapter()
        self.cache = get_cache()
        self.settings = get_settings()

    async def _snapshot(self, symbol: str) -> ScreenerResult:
        """Return a lightweight snapshot for one symbol. Cached 1h."""
        key = f"screener_snap:{symbol.upper()}"
        cached = self.cache.get(key)
        if cached:
            return ScreenerResult(**cached)

        def _load() -> ScreenerResult:
            adapter = self.adapter
            quote = adapter.get_quote(symbol)
            fundamentals = adapter.get_fundamentals(symbol)
            profile = adapter.get_profile(symbol)
            return ScreenerResult(
                symbol=symbol.upper(),
                name=profile.name or quote.name,
                sector=profile.sector,
                price=quote.price,
                market_cap=fundamentals.market_cap or quote.market_cap,
                pe_ratio=fundamentals.pe_ratio or quote.pe_ratio,
                pb_ratio=fundamentals.price_to_book,
                roe=fundamentals.roe,
                dividend_yield=fundamentals.dividend_yield,
                revenue_growth=fundamentals.revenue_growth,
            )

        result = await asyncio.to_thread(_load)
        self.cache.set(key, result.model_dump(), 3600)
        return result

    async def run(self, filters: ScreenerFilter) -> List[ScreenerResult]:
        universe = filters.symbols or DEFAULT_UNIVERSE
        # Fetch snapshots concurrently with a bounded gather
        results = await asyncio.gather(
            *(self._snapshot(s) for s in universe), return_exceptions=True
        )
        rows: List[ScreenerResult] = []
        for r in results:
            if isinstance(r, Exception):
                continue
            if _passes(filters, r):
                rows.append(r)
        # Sort by market cap desc, then apply limit
        rows.sort(key=lambda r: r.market_cap or 0, reverse=True)
        return rows[: filters.limit]


_service: ScreenerService | None = None


def get_screener_service() -> ScreenerService:
    global _service
    if _service is None:
        _service = ScreenerService()
    return _service
