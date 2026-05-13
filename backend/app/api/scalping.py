"""Scalping / day-trading endpoints."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Query

from app.schemas.stock import MarketMover
from app.services.scanners import get_scanner_service

router = APIRouter(prefix="/scalping", tags=["scalping"])


@router.get("/hot", response_model=List[MarketMover])
async def hot_stocks(limit: int = Query(25, ge=1, le=50)):
    """Return the hottest intraday movers in the universe (by |% change|)."""
    return await get_scanner_service().hot_stocks(limit=limit)
