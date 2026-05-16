"""Stock-level endpoints: search, quote, profile, history, fundamentals, news."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Query

from app.schemas.stock import (
    CompanyProfile,
    Fundamentals,
    HistoryResponse,
    NewsItem,
    Quote,
    SearchResult,
)
from app.services.market_data import get_market_data_service

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/search", response_model=List[SearchResult])
async def search_stocks(
    q: str = Query(..., min_length=1, max_length=50, description="Query"),
    limit: int = Query(10, ge=1, le=25),
):
    """Search tickers by company name or symbol."""
    service = get_market_data_service()
    raw = await service.search(q, limit)
    return [
        SearchResult(
            symbol=item.get("symbol", ""),
            name=item.get("longname") or item.get("shortname") or item.get("name", ""),
            exchange=item.get("exchange"),
            type=item.get("quoteType") or item.get("type"),
        )
        for item in raw
        if item.get("symbol")
    ]


@router.get("/{symbol}/quote", response_model=Quote)
async def get_quote(symbol: str):
    """Return the current quote for a single symbol.
    
    Uses Finnhub (real-time, no delay) if API key is configured,
    falls back to yfinance (15-min delay) otherwise.
    """
    from app.adapters.finnhub_adapter import get_realtime_quote
    from app.core.config import get_settings

    settings = get_settings()

    # Try Finnhub first (real-time)
    if settings.finnhub_api_key:
        fh_quote = await get_realtime_quote(symbol)
        if fh_quote:
            return Quote(
                symbol=symbol.upper(),
                name=None,  # Will be filled by profile call if needed
                price=fh_quote["price"],
                change=fh_quote["change"],
                change_percent=fh_quote["change_percent"],
                previous_close=fh_quote["previous_close"],
                open=fh_quote["open"],
                day_high=fh_quote["high"],
                day_low=fh_quote["low"],
                volume=None,
                avg_volume=None,
                market_cap=None,
                pe_ratio=None,
                eps=None,
                dividend_yield=None,
                beta=None,
                week52_high=None,
                week52_low=None,
                currency="USD",
                exchange=None,
            )

    # Fallback to yfinance (15-min delay)
    return await get_market_data_service().quote(symbol)


@router.get("/{symbol}/profile", response_model=CompanyProfile)
async def get_profile(symbol: str):
    """Return the company profile."""
    return await get_market_data_service().profile(symbol)


@router.get("/{symbol}/history", response_model=HistoryResponse)
async def get_history(
    symbol: str,
    range_: str = Query("1y", alias="range", description="e.g. 1d, 5d, 1mo, 6mo, 1y, 5y, max"),
    interval: str = Query("1d", description="e.g. 1m, 5m, 15m, 1h, 1d, 1wk, 1mo"),
):
    """Return OHLCV history."""
    return await get_market_data_service().history(symbol, range_=range_, interval=interval)


@router.get("/{symbol}/fundamentals", response_model=Fundamentals)
async def get_fundamentals(symbol: str):
    """Return fundamental snapshot."""
    return await get_market_data_service().fundamentals(symbol)


@router.get("/{symbol}/news", response_model=List[NewsItem])
async def get_news(
    symbol: str,
    limit: int = Query(20, ge=1, le=50),
):
    """Return recent news for the ticker."""
    return await get_market_data_service().news(symbol, limit)
