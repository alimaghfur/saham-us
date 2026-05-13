"""Technical indicators endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.stock import TechnicalIndicators
from app.services.indicators import compute_all
from app.services.market_data import get_market_data_service

router = APIRouter(prefix="/technicals", tags=["technicals"])


@router.get("/{symbol}", response_model=TechnicalIndicators)
async def get_technicals(
    symbol: str,
    range_: str = Query("6mo", alias="range"),
    interval: str = Query("1d"),
):
    """Return the last snapshot of common technical indicators."""
    history = await get_market_data_service().history(
        symbol, range_=range_, interval=interval
    )
    return compute_all(history.candles, symbol=symbol, interval=interval)
