"""Stock scoring & recommendation endpoints."""
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

router = APIRouter(prefix="/score", tags=["score"])


class SubScore(BaseModel):
    category: str
    score: int  # 0-100
    label: str
    details: str


class StockScore(BaseModel):
    symbol: str
    name: Optional[str] = None
    overall_score: int  # 0-100
    rating: str  # Strong Buy, Buy, Hold, Sell, Strong Sell
    rating_color: str  # bull, warning, bear
    sub_scores: List[SubScore]
    summary: str
    entry_zone: Optional[str] = None
    stop_loss: Optional[str] = None
    target: Optional[str] = None
    risk_level: str  # Low, Medium, High


class Recommendation(BaseModel):
    symbol: str
    name: Optional[str] = None
    score: int
    rating: str
    price: Optional[float] = None
    change_percent: Optional[float] = None
    sector: Optional[str] = None
    style: str  # conservative, balanced, aggressive
    why: str
    entry: Optional[float] = None
    stop_loss: Optional[float] = None
    target: Optional[float] = None
    risk_reward: Optional[float] = None


def _compute_valuation_score(pe: float | None, pb: float | None, ps: float | None) -> tuple[int, str]:
    """Score based on PE, PB, Price/Sales. Lower = better value."""
    score = 50
    details = []

    if pe is not None:
        if pe < 0:
            score -= 20
            details.append("Negative earnings")
        elif pe < 12:
            score += 30
            details.append(f"PE {pe:.1f} (very cheap)")
        elif pe < 20:
            score += 15
            details.append(f"PE {pe:.1f} (fair value)")
        elif pe < 35:
            score -= 5
            details.append(f"PE {pe:.1f} (moderate)")
        else:
            score -= 20
            details.append(f"PE {pe:.1f} (expensive)")

    if pb is not None:
        if pb < 1.5:
            score += 15
            details.append(f"PB {pb:.1f} (undervalued)")
        elif pb < 4:
            score += 5
        else:
            score -= 10
            details.append(f"PB {pb:.1f} (premium)")

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient data"


def _compute_quality_score(roe: float | None, margin: float | None, de: float | None) -> tuple[int, str]:
    """Score based on ROE, profit margin, debt/equity."""
    score = 50
    details = []

    if roe is not None:
        roe_pct = roe * 100 if abs(roe) < 1 else roe
        if roe_pct > 25:
            score += 25
            details.append(f"ROE {roe_pct:.1f}% (excellent)")
        elif roe_pct > 15:
            score += 15
            details.append(f"ROE {roe_pct:.1f}% (good)")
        elif roe_pct > 8:
            score += 5
            details.append(f"ROE {roe_pct:.1f}% (average)")
        else:
            score -= 15
            details.append(f"ROE {roe_pct:.1f}% (weak)")

    if margin is not None:
        m_pct = margin * 100 if abs(margin) < 1 else margin
        if m_pct > 20:
            score += 15
            details.append(f"Margin {m_pct:.1f}% (high)")
        elif m_pct > 10:
            score += 5
        elif m_pct < 0:
            score -= 20
            details.append("Unprofitable")

    if de is not None:
        if de < 50:
            score += 10
            details.append("Low debt")
        elif de > 200:
            score -= 15
            details.append("High debt")

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient data"


def _compute_growth_score(rev_growth: float | None, earn_growth: float | None) -> tuple[int, str]:
    """Score based on revenue and earnings growth."""
    score = 50
    details = []

    if rev_growth is not None:
        rg_pct = rev_growth * 100 if abs(rev_growth) < 5 else rev_growth
        if rg_pct > 30:
            score += 30
            details.append(f"Revenue +{rg_pct:.0f}% (explosive)")
        elif rg_pct > 15:
            score += 20
            details.append(f"Revenue +{rg_pct:.0f}% (strong)")
        elif rg_pct > 5:
            score += 10
            details.append(f"Revenue +{rg_pct:.0f}% (moderate)")
        elif rg_pct > 0:
            score += 0
            details.append(f"Revenue +{rg_pct:.0f}% (slow)")
        else:
            score -= 20
            details.append(f"Revenue {rg_pct:.0f}% (declining)")

    if earn_growth is not None:
        eg_pct = earn_growth * 100 if abs(earn_growth) < 5 else earn_growth
        if eg_pct > 20:
            score += 15
            details.append(f"Earnings +{eg_pct:.0f}%")
        elif eg_pct < -10:
            score -= 15
            details.append(f"Earnings {eg_pct:.0f}%")

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient data"


def _compute_momentum_score(rsi: float | None, trend: str | None, change_pct: float | None) -> tuple[int, str]:
    """Score based on RSI, trend, and recent performance."""
    score = 50
    details = []

    if trend == "bullish":
        score += 20
        details.append("Bullish trend (price > SMA50 > SMA200)")
    elif trend == "bearish":
        score -= 20
        details.append("Bearish trend (price < SMA50 < SMA200)")
    else:
        details.append("Neutral/mixed trend")

    if rsi is not None:
        if 30 <= rsi <= 50:
            score += 15
            details.append(f"RSI {rsi:.0f} (oversold bounce zone)")
        elif 50 < rsi <= 65:
            score += 10
            details.append(f"RSI {rsi:.0f} (healthy momentum)")
        elif rsi > 75:
            score -= 15
            details.append(f"RSI {rsi:.0f} (overbought - risky)")
        elif rsi < 25:
            score += 5
            details.append(f"RSI {rsi:.0f} (deeply oversold)")

    if change_pct is not None:
        if change_pct > 2:
            score += 5
        elif change_pct < -3:
            score -= 5

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient data"


def _get_rating(score: int) -> tuple[str, str]:
    """Convert overall score to rating label and color."""
    if score >= 80:
        return "Strong Buy", "bull"
    elif score >= 65:
        return "Buy", "bull"
    elif score >= 50:
        return "Hold", "warning"
    elif score >= 35:
        return "Sell", "bear"
    else:
        return "Strong Sell", "bear"


@router.get("/analyze/{symbol}", response_model=StockScore)
async def get_stock_score(symbol: str):
    """Compute a comprehensive score for a single stock."""
    cache = get_cache()
    key = f"score:{symbol.upper()}"
    cached = cache.get(key)
    if cached:
        return StockScore(**cached)

    service = get_market_data_service()

    # Fetch data in parallel
    quote, fundamentals, technicals_data = await asyncio.gather(
        service.quote(symbol),
        service.fundamentals(symbol),
        _get_technicals(symbol),
    )

    f = fundamentals
    t = technicals_data

    # Compute sub-scores
    val_score, val_details = _compute_valuation_score(f.pe_ratio, f.price_to_book, f.price_to_sales)
    qual_score, qual_details = _compute_quality_score(f.roe, f.profit_margin, f.debt_to_equity)
    growth_score, growth_details = _compute_growth_score(f.revenue_growth, f.earnings_growth)
    mom_score, mom_details = _compute_momentum_score(
        t.rsi_14 if t else None,
        t.trend if t else None,
        quote.change_percent,
    )

    # Weighted overall score
    overall = int(val_score * 0.25 + qual_score * 0.25 + growth_score * 0.25 + mom_score * 0.25)
    rating, rating_color = _get_rating(overall)

    # Risk level
    if f.debt_to_equity and f.debt_to_equity > 150:
        risk = "High"
    elif quote.beta and quote.beta > 1.5:
        risk = "High"
    elif quote.beta and quote.beta < 0.8:
        risk = "Low"
    else:
        risk = "Medium"

    # Entry/SL/TP based on ATR
    entry_zone = None
    stop_loss = None
    target = None
    if quote.price and t and t.atr_14:
        entry_zone = f"${quote.price - t.atr_14 * 0.5:.2f} - ${quote.price:.2f}"
        stop_loss = f"${quote.price - t.atr_14 * 2:.2f}"
        target = f"${quote.price + t.atr_14 * 3:.2f}"

    # Summary
    summary_parts = []
    if overall >= 65:
        summary_parts.append(f"{symbol} looks attractive")
    elif overall >= 50:
        summary_parts.append(f"{symbol} is fairly valued")
    else:
        summary_parts.append(f"{symbol} appears risky at current levels")

    if val_score >= 65:
        summary_parts.append("trading at reasonable valuation")
    if qual_score >= 70:
        summary_parts.append("with strong business quality")
    if growth_score >= 65:
        summary_parts.append("and solid growth trajectory")
    if mom_score >= 60:
        summary_parts.append("with positive price momentum")

    summary = ", ".join(summary_parts) + "."

    result = StockScore(
        symbol=symbol.upper(),
        name=quote.name,
        overall_score=overall,
        rating=rating,
        rating_color=rating_color,
        sub_scores=[
            SubScore(category="Valuation", score=val_score, label=_score_label(val_score), details=val_details),
            SubScore(category="Quality", score=qual_score, label=_score_label(qual_score), details=qual_details),
            SubScore(category="Growth", score=growth_score, label=_score_label(growth_score), details=growth_details),
            SubScore(category="Momentum", score=mom_score, label=_score_label(mom_score), details=mom_details),
        ],
        summary=summary,
        entry_zone=entry_zone,
        stop_loss=stop_loss,
        target=target,
        risk_level=risk,
    )

    cache.set(key, result.model_dump(), 300)
    return result


@router.get("/recommendations/top", response_model=List[Recommendation])
async def get_recommendations(
    style: str = Query("balanced", pattern="^(conservative|balanced|aggressive)$"),
    limit: int = Query(5, ge=1, le=15),
):
    """Return top stock recommendations based on investment style."""
    cache = get_cache()
    key = f"recommendations:{style}:{limit}"
    cached = cache.get(key)
    if cached:
        return [Recommendation(**r) for r in cached[:limit]]

    service = get_market_data_service()
    adapter = get_yfinance_adapter()

    # Score all stocks in universe
    async def _score_one(sym: str) -> Optional[Dict[str, Any]]:
        try:
            quote = await service.quote(sym)
            fund = await service.fundamentals(sym)
            tech = await _get_technicals(sym)
            profile = await service.profile(sym)

            val_score, _ = _compute_valuation_score(fund.pe_ratio, fund.price_to_book, fund.price_to_sales)
            qual_score, _ = _compute_quality_score(fund.roe, fund.profit_margin, fund.debt_to_equity)
            growth_score, _ = _compute_growth_score(fund.revenue_growth, fund.earnings_growth)
            mom_score, _ = _compute_momentum_score(
                tech.rsi_14 if tech else None,
                tech.trend if tech else None,
                quote.change_percent,
            )

            # Style weighting
            if style == "conservative":
                overall = int(val_score * 0.35 + qual_score * 0.35 + growth_score * 0.1 + mom_score * 0.2)
                # Prefer dividend stocks
                if fund.dividend_yield and fund.dividend_yield > 0.02:
                    overall += 10
            elif style == "aggressive":
                overall = int(val_score * 0.1 + qual_score * 0.15 + growth_score * 0.4 + mom_score * 0.35)
            else:  # balanced
                overall = int(val_score * 0.25 + qual_score * 0.25 + growth_score * 0.25 + mom_score * 0.25)

            overall = min(100, overall)
            rating, _ = _get_rating(overall)

            # Generate "why buy" reasoning
            why_parts = []
            if val_score >= 60:
                why_parts.append("reasonable valuation")
            if qual_score >= 65:
                why_parts.append("high business quality")
            if growth_score >= 60:
                why_parts.append("strong growth")
            if mom_score >= 60:
                why_parts.append("positive momentum")
            if fund.dividend_yield and fund.dividend_yield > 0.025:
                why_parts.append(f"dividend {fund.dividend_yield*100:.1f}%")

            why = f"Recommended for {style} investors: " + ", ".join(why_parts) if why_parts else "Balanced profile"

            # Entry/SL/TP
            entry = quote.price
            sl = None
            tp = None
            rr = None
            if entry and tech and tech.atr_14:
                sl = round(entry - tech.atr_14 * 2, 2)
                tp = round(entry + tech.atr_14 * 3, 2)
                if entry > sl:
                    rr = round((tp - entry) / (entry - sl), 1)

            return {
                "symbol": sym,
                "name": profile.name or quote.name,
                "score": overall,
                "rating": rating,
                "price": quote.price,
                "change_percent": quote.change_percent,
                "sector": profile.sector,
                "style": style,
                "why": why,
                "entry": entry,
                "stop_loss": sl,
                "target": tp,
                "risk_reward": rr,
            }
        except Exception:
            return None

    # Use smaller subset for recommendations to avoid rate limiting
    universe = DEFAULT_UNIVERSE[:30]
    results = await asyncio.gather(*(_score_one(s) for s in universe), return_exceptions=True)
    scored = [r for r in results if isinstance(r, dict) and r is not None and r.get("score", 0) >= 55]
    scored.sort(key=lambda r: r["score"], reverse=True)

    recs = [Recommendation(**r) for r in scored[:limit]]
    cache.set(key, [r.model_dump() for r in recs], 600)
    return recs


async def _get_technicals(symbol: str):
    """Helper to get technicals with error handling."""
    try:
        service = get_market_data_service()
        history = await service.history(symbol, range_="6mo", interval="1d")
        if history.candles:
            return compute_all(history.candles, symbol=symbol, interval="1d")
    except Exception:
        pass
    return None


def _score_label(score: int) -> str:
    if score >= 75:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 45:
        return "Fair"
    elif score >= 30:
        return "Weak"
    else:
        return "Poor"
