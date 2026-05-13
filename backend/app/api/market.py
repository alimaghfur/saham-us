"""Market-wide endpoints: indices, movers, sectors."""
from __future__ import annotations

import asyncio
from typing import List

from fastapi import APIRouter, Query

from app.schemas.stock import IndexSnapshot, MarketMover, SectorPerformance
from app.services.market_data import get_market_data_service
from app.utils.constants import (
    DEFAULT_UNIVERSE,
    INDEX_SYMBOLS,
    SECTOR_ETFS,
    TOP_MOVERS_UNIVERSE,
)

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/indices", response_model=List[IndexSnapshot])
async def get_indices():
    """Return snapshot of major US indices."""
    service = get_market_data_service()

    async def _one(symbol: str, name: str) -> IndexSnapshot:
        q = await service.quote(symbol)
        return IndexSnapshot(
            symbol=symbol,
            name=name,
            price=q.price,
            change=q.change,
            change_percent=q.change_percent,
        )

    return await asyncio.gather(*(_one(s, n) for s, n in INDEX_SYMBOLS))


@router.get("/movers", response_model=List[MarketMover])
async def get_movers(
    type: str = Query("gainers", pattern="^(gainers|losers|active)$"),
    limit: int = Query(10, ge=1, le=50),
):
    """Return top gainers / losers / most active from the default universe."""
    service = get_market_data_service()

    async def _one(symbol: str) -> MarketMover | None:
        q = await service.quote(symbol)
        if q.change_percent is None:
            return None
        return MarketMover(
            symbol=q.symbol,
            name=q.name,
            price=q.price,
            change=q.change,
            change_percent=q.change_percent,
            volume=q.volume,
        )

    rows = await asyncio.gather(*(_one(s) for s in TOP_MOVERS_UNIVERSE))
    movers = [r for r in rows if r is not None]
    if type == "gainers":
        movers.sort(key=lambda r: r.change_percent or 0, reverse=True)
    elif type == "losers":
        movers.sort(key=lambda r: r.change_percent or 0)
    else:  # active — sort by volume
        movers.sort(key=lambda r: r.volume or 0, reverse=True)
    return movers[:limit]


@router.get("/sectors", response_model=List[SectorPerformance])
async def get_sectors():
    """Return daily performance for each GICS sector via its SPDR ETF."""
    service = get_market_data_service()

    async def _one(sector: str, etf: str) -> SectorPerformance:
        q = await service.quote(etf)
        return SectorPerformance(
            sector=sector, etf=etf, change_percent=q.change_percent
        )

    rows = await asyncio.gather(*(_one(s, e) for s, e in SECTOR_ETFS))
    rows.sort(key=lambda r: r.change_percent or 0, reverse=True)
    return rows


@router.get("/universe", response_model=List[str])
async def get_universe():
    """Return the MVP screener/scanner universe — useful for debugging."""
    return DEFAULT_UNIVERSE
