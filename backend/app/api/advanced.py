"""Advanced Analytics API endpoints."""
from __future__ import annotations
from typing import Any, Dict
from fastapi import APIRouter
from app.services.advanced_analytics import get_advanced_analytics
from app.core.cache import get_cache

router = APIRouter(prefix="/advanced", tags=["advanced"])

@router.get("/multi-timeframe/{symbol}")
async def multi_timeframe(symbol: str):
    """Multi-timeframe scoring: short-term vs long-term signals."""
    cache = get_cache()
    key = f"mtf:{symbol.upper()}"
    cached = cache.get(key)
    if cached:
        return cached
    result = await get_advanced_analytics().multi_timeframe_score(symbol)
    cache.set(key, result, 300)
    return result

@router.get("/smart-money/{symbol}")
async def smart_money(symbol: str):
    """Detect institutional/smart money flow patterns."""
    cache = get_cache()
    key = f"smartmoney:{symbol.upper()}"
    cached = cache.get(key)
    if cached:
        return cached
    result = await get_advanced_analytics().detect_smart_money(symbol)
    cache.set(key, result, 300)
    return result

@router.get("/support-resistance/{symbol}")
async def support_resistance(symbol: str):
    """Auto-detect key support and resistance levels."""
    cache = get_cache()
    key = f"sr:{symbol.upper()}"
    cached = cache.get(key)
    if cached:
        return cached
    result = await get_advanced_analytics().find_support_resistance(symbol)
    cache.set(key, result, 300)
    return result

@router.get("/sector-rotation")
async def sector_rotation():
    """Detect sector rotation and money flow signals."""
    cache = get_cache()
    key = "sector_rotation"
    cached = cache.get(key)
    if cached:
        return cached
    result = await get_advanced_analytics().sector_rotation_signal()
    cache.set(key, result, 600)
    return result

@router.get("/composite/{symbol}")
async def composite_signal(symbol: str):
    """Generate composite signal from ALL indicators — convergence analysis."""
    cache = get_cache()
    key = f"composite:{symbol.upper()}"
    cached = cache.get(key)
    if cached:
        return cached
    result = await get_advanced_analytics().composite_signal(symbol)
    cache.set(key, result, 300)
    return result
