"""Macro economy endpoints — treasury yields, VIX, dollar index, sector ETFs."""
from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

from fastapi import APIRouter, Query

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.core.cache import get_cache
from app.schemas.stock import Quote

router = APIRouter(prefix="/macro", tags=["macro"])


# Treasury/Bond tickers available via yfinance
TREASURY_TICKERS = {
    "^IRX": {"name": "3-Month T-Bill", "maturity": "3mo"},
    "^FVX": {"name": "5-Year Treasury", "maturity": "5y"},
    "^TNX": {"name": "10-Year Treasury", "maturity": "10y"},
    "^TYX": {"name": "30-Year Treasury", "maturity": "30y"},
}

# Market indicators
MARKET_INDICATORS = {
    "^VIX": "CBOE Volatility Index (VIX)",
    "DX-Y.NYB": "US Dollar Index (DXY)",
    "GC=F": "Gold Futures",
    "CL=F": "Crude Oil WTI",
    "^TNX": "10Y Treasury Yield",
    "BTC-USD": "Bitcoin",
}

# Fear & Greed proxy indicators
FEAR_GREED_COMPONENTS = {
    "^VIX": "Market Volatility",
    "^GSPC": "S&P 500 Momentum",
    "^VIX": "VIX Level",
    "HYG": "Junk Bond Demand",
    "SHY": "Safe Haven Demand",
}


@router.get("/treasury")
async def get_treasury_yields():
    """Return current US Treasury yields for key maturities."""
    adapter = get_yfinance_adapter()
    cache = get_cache()

    key = "macro:treasury"
    cached = cache.get(key)
    if cached:
        return cached

    async def _get_yield(symbol: str, info: dict):
        def _fetch():
            q = adapter.get_quote(symbol)
            return {
                "symbol": symbol,
                "name": info["name"],
                "maturity": info["maturity"],
                "yield_percent": q.price,
                "change": q.change,
                "change_percent": q.change_percent,
            }
        try:
            return await asyncio.to_thread(_fetch)
        except Exception:
            return {
                "symbol": symbol,
                "name": info["name"],
                "maturity": info["maturity"],
                "yield_percent": None,
                "change": None,
                "change_percent": None,
            }

    results = await asyncio.gather(
        *(_get_yield(sym, info) for sym, info in TREASURY_TICKERS.items())
    )
    cache.set(key, results, 300)
    return results


@router.get("/indicators")
async def get_market_indicators():
    """Return key macro market indicators (VIX, DXY, Gold, Oil, BTC)."""
    adapter = get_yfinance_adapter()
    cache = get_cache()

    key = "macro:indicators"
    cached = cache.get(key)
    if cached:
        return cached

    async def _get_indicator(symbol: str, name: str):
        def _fetch():
            q = adapter.get_quote(symbol)
            return {
                "symbol": symbol,
                "name": name,
                "price": q.price,
                "change": q.change,
                "change_percent": q.change_percent,
            }
        try:
            return await asyncio.to_thread(_fetch)
        except Exception:
            return {
                "symbol": symbol,
                "name": name,
                "price": None,
                "change": None,
                "change_percent": None,
            }

    results = await asyncio.gather(
        *(_get_indicator(sym, name) for sym, name in MARKET_INDICATORS.items())
    )
    cache.set(key, results, 120)
    return results


@router.get("/fear-greed")
async def get_fear_greed():
    """Calculate a simple Fear & Greed score based on VIX and S&P 500 momentum."""
    adapter = get_yfinance_adapter()
    cache = get_cache()

    key = "macro:fear_greed"
    cached = cache.get(key)
    if cached:
        return cached

    def _compute():
        vix_quote = adapter.get_quote("^VIX")
        sp500_quote = adapter.get_quote("^GSPC")

        vix = vix_quote.price or 20
        sp500_change = sp500_quote.change_percent or 0

        # Simple scoring: VIX < 15 = extreme greed, > 30 = extreme fear
        # S&P momentum adds/subtracts from score
        vix_score = max(0, min(100, 100 - ((vix - 12) / 28) * 100))
        momentum_score = max(0, min(100, 50 + sp500_change * 10))

        score = int((vix_score * 0.6 + momentum_score * 0.4))
        score = max(0, min(100, score))

        if score >= 75:
            label = "Extreme Greed"
        elif score >= 55:
            label = "Greed"
        elif score >= 45:
            label = "Neutral"
        elif score >= 25:
            label = "Fear"
        else:
            label = "Extreme Fear"

        return {
            "score": score,
            "label": label,
            "vix": vix,
            "vix_score": int(vix_score),
            "sp500_change_percent": sp500_change,
            "momentum_score": int(momentum_score),
            "description": f"VIX at {vix:.1f}, S&P 500 {sp500_change:+.2f}% today",
        }

    try:
        result = await asyncio.to_thread(_compute)
    except Exception:
        result = {"score": 50, "label": "Neutral", "vix": None, "description": "Unable to calculate"}

    cache.set(key, result, 120)
    return result


@router.get("/yield-curve")
async def get_yield_curve():
    """Return yield curve data points for charting."""
    adapter = get_yfinance_adapter()
    cache = get_cache()

    key = "macro:yield_curve"
    cached = cache.get(key)
    if cached:
        return cached

    # Extended maturities
    curve_tickers = [
        ("^IRX", "3mo", 0.25),
        ("^FVX", "5y", 5.0),
        ("^TNX", "10y", 10.0),
        ("^TYX", "30y", 30.0),
    ]

    def _fetch_all():
        points = []
        for symbol, label, years in curve_tickers:
            q = adapter.get_quote(symbol)
            points.append({
                "maturity": label,
                "years": years,
                "yield_percent": q.price,
            })
        return points

    try:
        result = await asyncio.to_thread(_fetch_all)
    except Exception:
        result = []

    cache.set(key, result, 300)
    return result
