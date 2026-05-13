"""Buy the Dip & Opportunity Detection endpoints."""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.core.cache import get_cache
from app.services.indicators import compute_all
from app.services.market_data import get_market_data_service
from app.utils.constants import DEFAULT_UNIVERSE

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


class DipOpportunity(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    price: Optional[float] = None
    change_percent: Optional[float] = None
    drop_severity: str  # mild, moderate, severe
    score: int  # 0-100 quality score
    rating: str
    rsi: Optional[float] = None
    trend: Optional[str] = None
    reason: str
    entry: Optional[float] = None
    stop_loss: Optional[float] = None
    target: Optional[float] = None
    risk_reward: Optional[float] = None


class PeerData(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    price: Optional[float] = None
    change_percent: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    price_to_book: Optional[float] = None
    roe: Optional[float] = None
    profit_margin: Optional[float] = None
    revenue_growth: Optional[float] = None
    dividend_yield: Optional[float] = None
    debt_to_equity: Optional[float] = None
    rsi: Optional[float] = None
    trend: Optional[str] = None
    score: int = 50


@router.get("/dips", response_model=List[DipOpportunity])
async def get_buy_the_dip(
    min_drop: float = Query(-3.0, description="Minimum % drop to qualify (negative)"),
    min_score: int = Query(50, description="Minimum quality score"),
    limit: int = Query(10, ge=1, le=25),
):
    """Find quality stocks that dropped significantly today."""
    cache = get_cache()
    key = f"dips:{min_drop}:{min_score}:{limit}"
    cached = cache.get(key)
    if cached:
        return [DipOpportunity(**d) for d in cached]

    service = get_market_data_service()

    async def _check_one(sym: str) -> Optional[DipOpportunity]:
        try:
            quote = await service.quote(sym)
            if quote.change_percent is None or quote.change_percent > min_drop:
                return None

            fund = await service.fundamentals(sym)
            profile = await service.profile(sym)

            score = 50
            if fund.pe_ratio and 5 < fund.pe_ratio < 30:
                score += 15
            if fund.roe and fund.roe > 0.12:
                score += 15
            if fund.revenue_growth and fund.revenue_growth > 0.05:
                score += 10
            if fund.profit_margin and fund.profit_margin > 0.1:
                score += 10

            if score < min_score:
                return None

            tech = None
            try:
                history = await service.history(sym, range_="6mo", interval="1d")
                if history.candles and len(history.candles) > 20:
                    tech = compute_all(history.candles, symbol=sym, interval="1d")
            except Exception:
                pass

            drop = abs(quote.change_percent)
            severity = "severe" if drop >= 8 else "moderate" if drop >= 5 else "mild"
            rating = "Strong Buy the Dip" if score >= 70 else "Consider Buying" if score >= 55 else "Watch"

            reasons = [f"Dropped {quote.change_percent:.1f}% today"]
            if fund.pe_ratio and fund.pe_ratio < 20:
                reasons.append(f"PE {fund.pe_ratio:.1f} (cheap)")
            if fund.roe and fund.roe > 0.15:
                reasons.append(f"ROE {fund.roe*100:.0f}% (quality)")
            if tech and tech.rsi_14 and tech.rsi_14 < 40:
                reasons.append(f"RSI {tech.rsi_14:.0f} (oversold)")

            entry = quote.price
            sl, tp, rr = None, None, None
            if entry and tech and tech.atr_14:
                sl = round(entry - tech.atr_14 * 2, 2)
                tp = round(entry + tech.atr_14 * 4, 2)
                if entry > sl:
                    rr = round((tp - entry) / (entry - sl), 1)

            return DipOpportunity(
                symbol=sym, name=profile.name or quote.name, sector=profile.sector,
                price=quote.price, change_percent=quote.change_percent,
                drop_severity=severity, score=score, rating=rating,
                rsi=tech.rsi_14 if tech else None, trend=tech.trend if tech else None,
                reason="; ".join(reasons), entry=entry, stop_loss=sl, target=tp, risk_reward=rr,
            )
        except Exception:
            return None

    results = await asyncio.gather(*(_check_one(s) for s in DEFAULT_UNIVERSE[:30]), return_exceptions=True)
    dips = [r for r in results if isinstance(r, DipOpportunity)]
    dips.sort(key=lambda d: d.score, reverse=True)
    cache.set(key, [d.model_dump() for d in dips[:limit]], 120)
    return dips[:limit]


@router.get("/compare", response_model=List[PeerData])
async def compare_peers(
    symbols: str = Query(..., description="Comma-separated symbols"),
):
    """Compare multiple stocks side-by-side."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:8]
    if not symbol_list:
        return []

    cache = get_cache()
    key = f"compare:{','.join(sorted(symbol_list))}"
    cached = cache.get(key)
    if cached:
        return [PeerData(**p) for p in cached]

    service = get_market_data_service()

    async def _get_peer(sym: str) -> Optional[PeerData]:
        try:
            quote = await service.quote(sym)
            fund = await service.fundamentals(sym)
            profile = await service.profile(sym)
            tech = None
            try:
                history = await service.history(sym, range_="6mo", interval="1d")
                if history.candles and len(history.candles) > 20:
                    tech = compute_all(history.candles, symbol=sym, interval="1d")
            except Exception:
                pass

            score = 50
            if fund.pe_ratio and 5 < fund.pe_ratio < 25:
                score += 15
            if fund.roe and fund.roe > 0.15:
                score += 15
            if fund.revenue_growth and fund.revenue_growth > 0.1:
                score += 10
            if tech and tech.trend == "bullish":
                score += 10

            return PeerData(
                symbol=sym, name=profile.name or quote.name, sector=profile.sector,
                price=quote.price, change_percent=quote.change_percent,
                market_cap=fund.market_cap or quote.market_cap,
                pe_ratio=fund.pe_ratio, price_to_book=fund.price_to_book,
                roe=fund.roe, profit_margin=fund.profit_margin,
                revenue_growth=fund.revenue_growth, dividend_yield=fund.dividend_yield,
                debt_to_equity=fund.debt_to_equity,
                rsi=tech.rsi_14 if tech else None, trend=tech.trend if tech else None,
                score=min(100, score),
            )
        except Exception:
            return PeerData(symbol=sym, score=0)

    results = await asyncio.gather(*(_get_peer(s) for s in symbol_list))
    peers = [r for r in results if r is not None]
    cache.set(key, [p.model_dump() for p in peers], 300)
    return peers
