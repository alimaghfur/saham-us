"""Screener endpoints."""
from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter

from app.schemas.stock import ScreenerFilter, ScreenerResult
from app.services.screener import get_screener_service

router = APIRouter(prefix="/screener", tags=["screener"])


# Common preset screens — users can customize later
PRESETS: Dict[str, ScreenerFilter] = {
    "value": ScreenerFilter(
        pe_max=15, pb_max=2, market_cap_min=2e9, limit=50
    ),
    "growth": ScreenerFilter(
        revenue_growth_min=0.15, pe_max=50, market_cap_min=2e9, limit=50
    ),
    "dividend": ScreenerFilter(
        dividend_yield_min=0.03, market_cap_min=2e9, limit=50
    ),
    "quality": ScreenerFilter(
        roe_min=0.15, market_cap_min=5e9, limit=50
    ),
    "large_cap": ScreenerFilter(
        market_cap_min=1e11, limit=50
    ),
}


@router.post("/run", response_model=List[ScreenerResult])
async def run_screener(filters: ScreenerFilter):
    """Run a custom screener with the given filter body."""
    return await get_screener_service().run(filters)


@router.get("/presets", response_model=Dict[str, ScreenerFilter])
async def list_presets():
    """List the available preset screens."""
    return PRESETS


@router.get("/presets/{name}", response_model=List[ScreenerResult])
async def run_preset(name: str):
    """Run a preset screen by name."""
    preset = PRESETS.get(name.lower())
    if preset is None:
        return []
    return await get_screener_service().run(preset)
