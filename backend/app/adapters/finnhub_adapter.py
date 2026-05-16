"""Finnhub adapter — real-time stock data via REST API and WebSocket.

Provides real-time quotes (no 15-min delay) using Finnhub free tier.
WebSocket streams real-time trades for subscribed symbols.

Requires FINNHUB_API_KEY in .env
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.core.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

FINNHUB_BASE = "https://finnhub.io/api/v1"
FINNHUB_WS = "wss://ws.finnhub.io"


def _headers() -> dict:
    return {"X-Finnhub-Token": settings.finnhub_api_key}


async def get_realtime_quote(symbol: str) -> Optional[dict]:
    """Get real-time quote from Finnhub (no 15-min delay).

    Returns dict with keys: c (current), h (high), l (low), o (open),
    pc (previous close), t (timestamp), d (change), dp (change percent)
    """
    if not settings.finnhub_api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{FINNHUB_BASE}/quote",
                params={"symbol": symbol.upper()},
                headers=_headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                # Finnhub returns 0 for all fields if symbol not found
                if data.get("c", 0) == 0 and data.get("pc", 0) == 0:
                    return None
                return {
                    "price": data.get("c"),
                    "high": data.get("h"),
                    "low": data.get("l"),
                    "open": data.get("o"),
                    "previous_close": data.get("pc"),
                    "change": data.get("d"),
                    "change_percent": data.get("dp"),
                    "timestamp": data.get("t"),
                }
            else:
                log.warning("Finnhub quote failed %s: %d", symbol, resp.status_code)
                return None
    except Exception as e:
        log.warning("Finnhub quote error %s: %s", symbol, e)
        return None


async def get_company_profile(symbol: str) -> Optional[dict]:
    """Get company profile from Finnhub."""
    if not settings.finnhub_api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{FINNHUB_BASE}/stock/profile2",
                params={"symbol": symbol.upper()},
                headers=_headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                if not data.get("name"):
                    return None
                return data
            return None
    except Exception as e:
        log.warning("Finnhub profile error %s: %s", symbol, e)
        return None


async def search_symbols(query: str, limit: int = 10) -> list[dict]:
    """Search for symbols via Finnhub."""
    if not settings.finnhub_api_key:
        return []

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{FINNHUB_BASE}/search",
                params={"q": query},
                headers=_headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in (data.get("result") or [])[:limit]:
                    if item.get("type") in ("Common Stock", "ETP", "ADR"):
                        results.append({
                            "symbol": item.get("symbol"),
                            "name": item.get("description"),
                            "type": item.get("type"),
                        })
                return results
            return []
    except Exception as e:
        log.warning("Finnhub search error: %s", e)
        return []


async def get_market_news(category: str = "general", limit: int = 20) -> list[dict]:
    """Get market news from Finnhub."""
    if not settings.finnhub_api_key:
        return []

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{FINNHUB_BASE}/news",
                params={"category": category},
                headers=_headers(),
            )
            if resp.status_code == 200:
                return resp.json()[:limit]
            return []
    except Exception as e:
        log.warning("Finnhub news error: %s", e)
        return []


async def get_company_news(symbol: str, limit: int = 20) -> list[dict]:
    """Get company-specific news from Finnhub."""
    if not settings.finnhub_api_key:
        return []

    from datetime import datetime, timedelta
    today = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{FINNHUB_BASE}/company-news",
                params={"symbol": symbol.upper(), "from": week_ago, "to": today},
                headers=_headers(),
            )
            if resp.status_code == 200:
                return resp.json()[:limit]
            return []
    except Exception as e:
        log.warning("Finnhub company news error %s: %s", symbol, e)
        return []
