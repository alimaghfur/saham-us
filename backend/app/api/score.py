"""Stock scoring & recommendation endpoints — Institutional-Grade Engine.

Scoring improvements:
- Sector-relative valuation (PE vs sector median, not absolute)
- Multi-factor momentum (trend + RSI + volume + 52w position)
- Risk score (beta, volatility ATR/price, debt levels)
- Confidence level (data completeness indicator)
- Earnings consistency check (positive growth bonus)
- Volume analysis (institutional buying detection)
- Support/resistance proximity (52-week range position)
- Risk-adjusted overall score weighting
- 5 sub-scores: Valuation, Quality, Growth, Momentum, Risk
- More detailed actionable summaries
"""
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

# ---------------------------------------------------------------------------
# Sector PE/PB Averages (approximate medians for sector-relative scoring)
# ---------------------------------------------------------------------------
SECTOR_PE_MEDIANS: Dict[str, float] = {
    "Technology": 35.0,
    "Financial Services": 12.0,
    "Financials": 12.0,
    "Healthcare": 25.0,
    "Health Care": 25.0,
    "Energy": 10.0,
    "Consumer Cyclical": 22.0,
    "Consumer Defensive": 22.0,
    "Consumer Discretionary": 22.0,
    "Consumer Staples": 22.0,
    "Industrials": 18.0,
    "Communication Services": 20.0,
    "Basic Materials": 15.0,
    "Materials": 15.0,
    "Real Estate": 35.0,
    "Utilities": 16.0,
}

SECTOR_PB_MEDIANS: Dict[str, float] = {
    "Technology": 8.0,
    "Financial Services": 1.5,
    "Financials": 1.5,
    "Healthcare": 5.0,
    "Health Care": 5.0,
    "Energy": 1.8,
    "Consumer Cyclical": 4.0,
    "Consumer Defensive": 4.0,
    "Consumer Discretionary": 4.0,
    "Consumer Staples": 4.0,
    "Industrials": 4.0,
    "Communication Services": 3.5,
    "Basic Materials": 2.5,
    "Materials": 2.5,
    "Real Estate": 2.5,
    "Utilities": 1.8,
}

SECTOR_MARGIN_MEDIANS: Dict[str, float] = {
    "Technology": 20.0,
    "Financial Services": 25.0,
    "Financials": 25.0,
    "Healthcare": 15.0,
    "Health Care": 15.0,
    "Energy": 8.0,
    "Consumer Cyclical": 8.0,
    "Consumer Defensive": 8.0,
    "Consumer Discretionary": 8.0,
    "Consumer Staples": 8.0,
    "Industrials": 10.0,
    "Communication Services": 15.0,
    "Basic Materials": 10.0,
    "Materials": 10.0,
    "Real Estate": 20.0,
    "Utilities": 12.0,
}


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------
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
    confidence: int  # 0-100 data completeness indicator
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


# ---------------------------------------------------------------------------
# Confidence Calculator
# ---------------------------------------------------------------------------
def _compute_confidence(
    pe: Any, pb: Any, roe: Any, margin: Any, de: Any,
    rev_growth: Any, earn_growth: Any, rsi: Any, trend: Any,
    volume: Any, avg_volume: Any, week52_high: Any, week52_low: Any,
    beta: Any, atr: Any, current_ratio: Any, price: Any,
) -> int:
    """Compute confidence level (0-100) based on data availability."""
    fields = [
        pe, pb, roe, margin, de, rev_growth, earn_growth,
        rsi, trend, volume, avg_volume, week52_high, week52_low,
        beta, atr, current_ratio, price,
    ]
    available = sum(1 for f in fields if f is not None)
    total = len(fields)
    return int((available / total) * 100)


# ---------------------------------------------------------------------------
# VALUATION SCORE (0-100) — Sector-Relative
# ---------------------------------------------------------------------------
def _compute_valuation_score(
    pe: float | None,
    pb: float | None,
    price: float | None,
    week52_high: float | None,
    week52_low: float | None,
    sector: str | None,
) -> tuple[int, str]:
    """Sector-relative valuation scoring.

    Compares PE/PB vs sector median instead of absolute thresholds.
    Also factors in price position within 52-week range.
    """
    score = 50
    details = []
    sector_pe = SECTOR_PE_MEDIANS.get(sector or "", 20.0)
    sector_pb = SECTOR_PB_MEDIANS.get(sector or "", 3.0)

    # PE relative to sector median
    if pe is not None:
        if pe < 0:
            score -= 15
            details.append("Negative earnings (unprofitable)")
        else:
            pe_ratio_vs_sector = pe / sector_pe
            if pe_ratio_vs_sector < 0.5:
                score += 30
                details.append(f"PE {pe:.1f} — {((1-pe_ratio_vs_sector)*100):.0f}% below sector median ({sector_pe:.0f})")
            elif pe_ratio_vs_sector < 0.8:
                score += 20
                details.append(f"PE {pe:.1f} — undervalued vs sector ({sector_pe:.0f})")
            elif pe_ratio_vs_sector < 1.2:
                score += 5
                details.append(f"PE {pe:.1f} — in line with sector ({sector_pe:.0f})")
            elif pe_ratio_vs_sector < 1.8:
                score -= 10
                details.append(f"PE {pe:.1f} — premium to sector ({sector_pe:.0f})")
            else:
                score -= 25
                details.append(f"PE {pe:.1f} — expensive vs sector ({sector_pe:.0f})")

    # PB relative to sector median
    if pb is not None:
        pb_ratio_vs_sector = pb / sector_pb
        if pb_ratio_vs_sector < 0.5:
            score += 15
            details.append(f"PB {pb:.1f} — deep value vs sector")
        elif pb_ratio_vs_sector < 0.9:
            score += 10
            details.append(f"PB {pb:.1f} — below sector median")
        elif pb_ratio_vs_sector < 1.3:
            score += 0
        elif pb_ratio_vs_sector < 2.0:
            score -= 5
        else:
            score -= 10
            details.append(f"PB {pb:.1f} — rich valuation")

    # Price position in 52-week range (0=at low, 100=at high)
    if price is not None and week52_high is not None and week52_low is not None:
        if week52_high > week52_low:
            range_position = ((price - week52_low) / (week52_high - week52_low)) * 100
            if range_position < 25:
                score += 10
                details.append(f"Near 52w low ({range_position:.0f}% of range) — potential value")
            elif range_position > 90:
                score -= 10
                details.append(f"Near 52w high ({range_position:.0f}% of range) — stretched")

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient valuation data"


# ---------------------------------------------------------------------------
# QUALITY SCORE (0-100)
# ---------------------------------------------------------------------------
def _compute_quality_score(
    roe: float | None,
    margin: float | None,
    de: float | None,
    current_ratio: float | None,
    rev_growth: float | None,
    earn_growth: float | None,
    sector: str | None,
) -> tuple[int, str]:
    """Quality scoring with earnings consistency check."""
    score = 50
    details = []
    sector_margin = SECTOR_MARGIN_MEDIANS.get(sector or "", 12.0)

    # ROE scoring
    if roe is not None:
        roe_pct = roe * 100 if abs(roe) < 1 else roe
        if roe_pct > 25:
            score += 25
            details.append(f"ROE {roe_pct:.1f}% (excellent capital efficiency)")
        elif roe_pct > 15:
            score += 15
            details.append(f"ROE {roe_pct:.1f}% (above average)")
        elif roe_pct > 8:
            score += 5
            details.append(f"ROE {roe_pct:.1f}% (acceptable)")
        elif roe_pct > 0:
            score -= 5
            details.append(f"ROE {roe_pct:.1f}% (below average)")
        else:
            score -= 20
            details.append(f"ROE {roe_pct:.1f}% (negative — burning equity)")

    # Profit margin relative to sector
    if margin is not None:
        m_pct = margin * 100 if abs(margin) < 1 else margin
        margin_vs_sector = m_pct / sector_margin if sector_margin else 1.0
        if margin_vs_sector > 1.5:
            score += 15
            details.append(f"Margin {m_pct:.1f}% (sector-leading)")
        elif margin_vs_sector > 1.0:
            score += 8
            details.append(f"Margin {m_pct:.1f}% (above sector median)")
        elif m_pct > 0:
            score += 0
        else:
            score -= 20
            details.append(f"Margin {m_pct:.1f}% (unprofitable)")

    # Debt/Equity ratio
    if de is not None:
        if de < 30:
            score += 10
            details.append("Very low debt (D/E < 30)")
        elif de < 100:
            score += 5
            details.append("Manageable debt")
        elif de < 200:
            score -= 5
            details.append("Elevated debt (D/E > 100)")
        else:
            score -= 15
            details.append(f"High leverage (D/E {de:.0f})")

    # Current ratio (liquidity)
    if current_ratio is not None:
        if current_ratio > 2.0:
            score += 8
            details.append(f"Strong liquidity (CR {current_ratio:.1f})")
        elif current_ratio > 1.5:
            score += 5
        elif current_ratio < 1.0:
            score -= 10
            details.append(f"Liquidity concern (CR {current_ratio:.1f})")

    # Earnings consistency bonus — positive growth in both metrics is quality signal
    if rev_growth is not None and earn_growth is not None:
        rg = rev_growth * 100 if abs(rev_growth) < 5 else rev_growth
        eg = earn_growth * 100 if abs(earn_growth) < 5 else earn_growth
        if rg > 0 and eg > 0:
            score += 5
            details.append("Consistent positive growth (revenue + earnings)")
        elif rg < 0 and eg < 0:
            score -= 10
            details.append("Double negative: both revenue & earnings declining")

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient quality data"


# ---------------------------------------------------------------------------
# GROWTH SCORE (0-100)
# ---------------------------------------------------------------------------
def _compute_growth_score(
    rev_growth: float | None,
    earn_growth: float | None,
) -> tuple[int, str]:
    """Growth scoring: revenue (60% weight), earnings (40% weight), consistency bonus."""
    score = 50
    details = []
    rev_component = 0
    earn_component = 0

    if rev_growth is not None:
        rg_pct = rev_growth * 100 if abs(rev_growth) < 5 else rev_growth
        if rg_pct > 30:
            rev_component = 30
            details.append(f"Revenue +{rg_pct:.0f}% (explosive growth)")
        elif rg_pct > 15:
            rev_component = 20
            details.append(f"Revenue +{rg_pct:.0f}% (strong growth)")
        elif rg_pct > 5:
            rev_component = 10
            details.append(f"Revenue +{rg_pct:.0f}% (moderate)")
        elif rg_pct > 0:
            rev_component = 3
            details.append(f"Revenue +{rg_pct:.0f}% (slow)")
        else:
            rev_component = -15
            details.append(f"Revenue {rg_pct:.0f}% (declining)")

    if earn_growth is not None:
        eg_pct = earn_growth * 100 if abs(earn_growth) < 5 else earn_growth
        if eg_pct > 30:
            earn_component = 20
            details.append(f"Earnings +{eg_pct:.0f}% (accelerating)")
        elif eg_pct > 15:
            earn_component = 13
            details.append(f"Earnings +{eg_pct:.0f}% (solid)")
        elif eg_pct > 5:
            earn_component = 7
            details.append(f"Earnings +{eg_pct:.0f}%")
        elif eg_pct > 0:
            earn_component = 2
        else:
            earn_component = -10
            details.append(f"Earnings {eg_pct:.0f}% (contracting)")

    # Apply weighted components (revenue 60%, earnings 40%)
    score += int(rev_component * 0.6 + earn_component * 0.4)

    # Consistency bonus: both positive and > 10% is a strong quality signal
    if rev_growth is not None and earn_growth is not None:
        rg_pct = rev_growth * 100 if abs(rev_growth) < 5 else rev_growth
        eg_pct = earn_growth * 100 if abs(earn_growth) < 5 else earn_growth
        if rg_pct > 10 and eg_pct > 10:
            score += 10
            details.append("Consistency bonus: both metrics > 10%")
        elif rg_pct > 0 and eg_pct > 0:
            score += 3

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient growth data"



# ---------------------------------------------------------------------------
# MOMENTUM SCORE (0-100) — Multi-factor
# ---------------------------------------------------------------------------
def _compute_momentum_score(
    rsi: float | None,
    trend: str | None,
    price: float | None,
    sma50: float | None,
    sma200: float | None,
    volume: int | None,
    avg_volume: int | None,
    week52_high: float | None,
    week52_low: float | None,
) -> tuple[int, str]:
    """Multi-factor momentum: trend(30%) + RSI(25%) + volume(20%) + 52w position(25%)."""
    trend_score = 50
    rsi_score = 50
    volume_score = 50
    range_score = 50
    details = []

    # --- Trend Strength (30%) — HOW bullish, not just binary ---
    if price is not None and sma200 is not None and sma50 is not None:
        # Distance from SMA200 as % (trend strength indicator)
        dist_sma200 = ((price - sma200) / sma200) * 100 if sma200 > 0 else 0
        dist_sma50 = ((price - sma50) / sma50) * 100 if sma50 > 0 else 0

        if price > sma50 > sma200:
            # Bullish — score based on distance
            if dist_sma200 > 30:
                trend_score = 65  # Extended but strong
                details.append(f"Strong bullish (+{dist_sma200:.0f}% above SMA200) — extended")
            elif dist_sma200 > 10:
                trend_score = 80
                details.append(f"Healthy uptrend (+{dist_sma200:.0f}% above SMA200)")
            else:
                trend_score = 70
                details.append("Early bullish trend forming")
        elif price < sma50 < sma200:
            # Bearish
            if dist_sma200 < -20:
                trend_score = 15
                details.append(f"Deep bearish ({dist_sma200:.0f}% below SMA200)")
            else:
                trend_score = 25
                details.append("Bearish trend (price < SMA50 < SMA200)")
        elif price > sma200 and price < sma50:
            trend_score = 45
            details.append("Pullback within uptrend (price between SMAs)")
        elif price < sma200 and price > sma50:
            trend_score = 55
            details.append("Potential trend reversal forming")
        else:
            trend_score = 50
            details.append("Neutral/choppy trend")
    elif trend == "bullish":
        trend_score = 70
        details.append("Bullish trend")
    elif trend == "bearish":
        trend_score = 30
        details.append("Bearish trend")

    # --- RSI Position (25%) — optimal buying zone 30-60 ---
    if rsi is not None:
        if 30 <= rsi <= 45:
            rsi_score = 85
            details.append(f"RSI {rsi:.0f} — prime buying zone (oversold bounce)")
        elif 45 < rsi <= 60:
            rsi_score = 75
            details.append(f"RSI {rsi:.0f} — healthy momentum range")
        elif 60 < rsi <= 70:
            rsi_score = 60
            details.append(f"RSI {rsi:.0f} — strong but watch for exhaustion")
        elif rsi > 75:
            rsi_score = 25
            details.append(f"RSI {rsi:.0f} — overbought (high reversal risk)")
        elif rsi < 25:
            rsi_score = 55
            details.append(f"RSI {rsi:.0f} — deeply oversold (contrarian signal)")
        elif rsi < 30:
            rsi_score = 65
            details.append(f"RSI {rsi:.0f} — oversold territory")
        else:
            rsi_score = 50

    # --- Volume Analysis (20%) — institutional buying detection ---
    if volume is not None and avg_volume is not None and avg_volume > 0:
        vol_ratio = volume / avg_volume
        if vol_ratio > 2.0:
            volume_score = 85
            details.append(f"Volume {vol_ratio:.1f}x average — heavy institutional activity")
        elif vol_ratio > 1.5:
            volume_score = 70
            details.append(f"Volume {vol_ratio:.1f}x average — above-normal interest")
        elif vol_ratio > 0.8:
            volume_score = 50
        else:
            volume_score = 35
            details.append("Below-average volume — low conviction")

    # --- 52-Week Range Position (25%) ---
    if price is not None and week52_high is not None and week52_low is not None:
        if week52_high > week52_low:
            range_position = ((price - week52_low) / (week52_high - week52_low)) * 100
            if range_position > 85:
                range_score = 70  # Near highs = strong momentum
                details.append(f"52w range: {range_position:.0f}% — near highs (strong)")
            elif range_position > 60:
                range_score = 65
            elif range_position > 40:
                range_score = 50
            elif range_position > 20:
                range_score = 40
                details.append(f"52w range: {range_position:.0f}% — weak positioning")
            else:
                range_score = 30
                details.append(f"52w range: {range_position:.0f}% — near lows")

    # Weighted combination: trend 30%, RSI 25%, volume 20%, range 25%
    final_score = int(trend_score * 0.30 + rsi_score * 0.25 + volume_score * 0.20 + range_score * 0.25)
    return max(0, min(100, final_score)), "; ".join(details) if details else "Insufficient momentum data"


# ---------------------------------------------------------------------------
# RISK SCORE (0-100, higher = SAFER)
# ---------------------------------------------------------------------------
def _compute_risk_score(
    beta: float | None,
    atr: float | None,
    price: float | None,
    de: float | None,
    current_ratio: float | None,
    week52_high: float | None,
    week52_low: float | None,
) -> tuple[int, str]:
    """Risk-adjusted scoring: higher = safer investment.

    Factors: beta, ATR/price volatility ratio, debt levels, drawdown from high.
    """
    score = 50
    details = []

    # Beta scoring (lower = safer)
    if beta is not None:
        if beta < 0.5:
            score += 20
            details.append(f"Beta {beta:.2f} — very low volatility (defensive)")
        elif beta < 0.8:
            score += 15
            details.append(f"Beta {beta:.2f} — below-market risk")
        elif beta < 1.2:
            score += 5
            details.append(f"Beta {beta:.2f} — market-like risk")
        elif beta < 1.5:
            score -= 5
            details.append(f"Beta {beta:.2f} — above-market volatility")
        else:
            score -= 15
            details.append(f"Beta {beta:.2f} — high volatility stock")

    # ATR/Price ratio (lower = less day-to-day volatility)
    if atr is not None and price is not None and price > 0:
        atr_pct = (atr / price) * 100
        if atr_pct < 1.5:
            score += 15
            details.append(f"Daily volatility {atr_pct:.1f}% (very stable)")
        elif atr_pct < 2.5:
            score += 8
            details.append(f"Daily volatility {atr_pct:.1f}% (moderate)")
        elif atr_pct < 4.0:
            score -= 5
            details.append(f"Daily volatility {atr_pct:.1f}% (elevated)")
        else:
            score -= 15
            details.append(f"Daily volatility {atr_pct:.1f}% (high risk)")

    # Debt/Equity as risk factor
    if de is not None:
        if de < 50:
            score += 10
            details.append("Low financial leverage")
        elif de < 100:
            score += 3
        elif de < 200:
            score -= 5
        else:
            score -= 15
            details.append(f"Dangerous leverage (D/E {de:.0f})")

    # Drawdown from 52-week high (max pain indicator)
    if price is not None and week52_high is not None and week52_high > 0:
        drawdown = ((week52_high - price) / week52_high) * 100
        if drawdown < 5:
            score += 5
            details.append("Near 52w high — price stability")
        elif drawdown > 30:
            score -= 10
            details.append(f"Down {drawdown:.0f}% from 52w high — significant risk")
        elif drawdown > 50:
            score -= 20
            details.append(f"Down {drawdown:.0f}% from 52w high — potential value trap")

    # Liquidity buffer
    if current_ratio is not None:
        if current_ratio > 2.0:
            score += 5
        elif current_ratio < 1.0:
            score -= 10
            details.append("Liquidity risk (current ratio < 1)")

    return max(0, min(100, score)), "; ".join(details) if details else "Insufficient risk data"


# ---------------------------------------------------------------------------
# Rating & Helpers
# ---------------------------------------------------------------------------
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


def _risk_level_from_score(risk_score: int, beta: float | None) -> str:
    """Determine risk level label from the risk score."""
    if risk_score >= 70:
        return "Low"
    elif risk_score >= 45:
        return "Medium"
    else:
        return "High"


def _generate_summary(
    symbol: str, overall: int, val_score: int, qual_score: int,
    growth_score: int, mom_score: int, risk_score: int, confidence: int,
    sector: str | None, pe: float | None, sector_pe: float,
) -> str:
    """Generate detailed, actionable summary text."""
    parts = []

    # Overall assessment
    if overall >= 75:
        parts.append(f"{symbol} is a high-conviction opportunity")
    elif overall >= 65:
        parts.append(f"{symbol} presents an attractive risk/reward setup")
    elif overall >= 55:
        parts.append(f"{symbol} is fairly positioned with balanced signals")
    elif overall >= 45:
        parts.append(f"{symbol} shows mixed signals — selective entry only")
    else:
        parts.append(f"{symbol} carries elevated risk at current levels")

    # Sector context
    if sector:
        parts.append(f"in the {sector} sector")

    # Key strengths
    strengths = []
    if val_score >= 65:
        strengths.append("attractive valuation vs sector peers")
    if qual_score >= 70:
        strengths.append("high business quality")
    if growth_score >= 65:
        strengths.append("solid growth trajectory")
    if mom_score >= 65:
        strengths.append("strong price momentum")
    if risk_score >= 70:
        strengths.append("favorable risk profile")

    if strengths:
        parts.append("| Strengths: " + ", ".join(strengths))

    # Key concerns
    concerns = []
    if val_score < 35:
        concerns.append("stretched valuation")
    if qual_score < 35:
        concerns.append("weak fundamentals")
    if growth_score < 35:
        concerns.append("declining growth")
    if mom_score < 35:
        concerns.append("negative momentum")
    if risk_score < 35:
        concerns.append("high-risk profile")

    if concerns:
        parts.append("| Concerns: " + ", ".join(concerns))

    # Confidence note
    if confidence < 50:
        parts.append("| Note: Limited data — lower confidence in score")

    # Actionable guidance
    if overall >= 65 and risk_score >= 55:
        parts.append("| Action: Consider accumulating on pullbacks")
    elif overall >= 55 and mom_score >= 60:
        parts.append("| Action: Watch for entry on support levels")
    elif overall < 40:
        parts.append("| Action: Avoid or reduce exposure")

    return ". ".join(parts) + "."



# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@router.get("/analyze/{symbol}", response_model=StockScore)
async def get_stock_score(symbol: str):
    """Compute an institutional-grade comprehensive score for a single stock."""
    cache = get_cache()
    key = f"score:{symbol.upper()}"
    cached = cache.get(key)
    if cached:
        return StockScore(**cached)

    service = get_market_data_service()

    # Fetch data in parallel
    quote, fundamentals, technicals_data, profile = await asyncio.gather(
        service.quote(symbol),
        service.fundamentals(symbol),
        _get_technicals(symbol),
        service.profile(symbol),
    )

    f = fundamentals
    t = technicals_data
    sector = profile.sector if profile else None

    # Extract key data points
    price = quote.price
    volume = quote.volume
    avg_volume = quote.avg_volume
    week52_high = quote.week52_high
    week52_low = quote.week52_low
    beta = quote.beta
    atr_val = t.atr_14 if t else None
    sma50 = t.sma_50 if t else None
    sma200 = t.sma_200 if t else None
    rsi_val = t.rsi_14 if t else None
    trend_val = t.trend if t else None

    # Compute confidence level
    confidence = _compute_confidence(
        pe=f.pe_ratio, pb=f.price_to_book, roe=f.roe, margin=f.profit_margin,
        de=f.debt_to_equity, rev_growth=f.revenue_growth, earn_growth=f.earnings_growth,
        rsi=rsi_val, trend=trend_val, volume=volume, avg_volume=avg_volume,
        week52_high=week52_high, week52_low=week52_low, beta=beta,
        atr=atr_val, current_ratio=f.current_ratio, price=price,
    )

    # Compute all 5 sub-scores
    val_score, val_details = _compute_valuation_score(
        f.pe_ratio, f.price_to_book, price, week52_high, week52_low, sector,
    )
    qual_score, qual_details = _compute_quality_score(
        f.roe, f.profit_margin, f.debt_to_equity, f.current_ratio,
        f.revenue_growth, f.earnings_growth, sector,
    )
    growth_score, growth_details = _compute_growth_score(f.revenue_growth, f.earnings_growth)
    mom_score, mom_details = _compute_momentum_score(
        rsi_val, trend_val, price, sma50, sma200,
        volume, avg_volume, week52_high, week52_low,
    )
    risk_score, risk_details = _compute_risk_score(
        beta, atr_val, price, f.debt_to_equity, f.current_ratio,
        week52_high, week52_low,
    )

    # Weighted overall score: Valuation 20%, Quality 25%, Growth 20%, Momentum 20%, Risk 15%
    overall = int(
        val_score * 0.20 +
        qual_score * 0.25 +
        growth_score * 0.20 +
        mom_score * 0.20 +
        risk_score * 0.15
    )
    overall = max(0, min(100, overall))
    rating, rating_color = _get_rating(overall)

    # Risk level from risk score
    risk_level = _risk_level_from_score(risk_score, beta)

    # Entry/SL/TP based on ATR
    entry_zone = None
    stop_loss = None
    target = None
    if price and atr_val:
        entry_zone = f"${price - atr_val * 0.5:.2f} - ${price:.2f}"
        stop_loss = f"${price - atr_val * 2:.2f}"
        target = f"${price + atr_val * 3:.2f}"

    # Generate detailed summary
    sector_pe = SECTOR_PE_MEDIANS.get(sector or "", 20.0)
    summary = _generate_summary(
        symbol.upper(), overall, val_score, qual_score, growth_score,
        mom_score, risk_score, confidence, sector, f.pe_ratio, sector_pe,
    )

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
            SubScore(category="Risk", score=risk_score, label=_score_label(risk_score), details=risk_details),
        ],
        summary=summary,
        confidence=confidence,
        entry_zone=entry_zone,
        stop_loss=stop_loss,
        target=target,
        risk_level=risk_level,
    )

    cache.set(key, result.model_dump(), 300)
    return result


@router.get("/recommendations/top", response_model=List[Recommendation])
async def get_recommendations(
    style: str = Query("balanced", pattern="^(conservative|balanced|aggressive)$"),
    limit: int = Query(5, ge=1, le=15),
):
    """Return top stock recommendations based on investment style using institutional scoring."""
    cache = get_cache()
    key = f"recommendations:{style}:{limit}"
    cached = cache.get(key)
    if cached:
        return [Recommendation(**r) for r in cached[:limit]]

    service = get_market_data_service()
    adapter = get_yfinance_adapter()

    async def _score_one(sym: str) -> Optional[Dict[str, Any]]:
        try:
            quote, fund, tech, profile = await asyncio.gather(
                service.quote(sym),
                service.fundamentals(sym),
                _get_technicals(sym),
                service.profile(sym),
            )

            sector = profile.sector if profile else None
            price = quote.price
            volume = quote.volume
            avg_volume = quote.avg_volume
            week52_high = quote.week52_high
            week52_low = quote.week52_low
            beta = quote.beta
            atr_val = tech.atr_14 if tech else None
            sma50 = tech.sma_50 if tech else None
            sma200 = tech.sma_200 if tech else None
            rsi_val = tech.rsi_14 if tech else None
            trend_val = tech.trend if tech else None

            val_score, _ = _compute_valuation_score(
                fund.pe_ratio, fund.price_to_book, price, week52_high, week52_low, sector,
            )
            qual_score, _ = _compute_quality_score(
                fund.roe, fund.profit_margin, fund.debt_to_equity, fund.current_ratio,
                fund.revenue_growth, fund.earnings_growth, sector,
            )
            growth_score, _ = _compute_growth_score(fund.revenue_growth, fund.earnings_growth)
            mom_score, _ = _compute_momentum_score(
                rsi_val, trend_val, price, sma50, sma200,
                volume, avg_volume, week52_high, week52_low,
            )
            risk_score, _ = _compute_risk_score(
                beta, atr_val, price, fund.debt_to_equity, fund.current_ratio,
                week52_high, week52_low,
            )

            # Style-specific weighting
            if style == "conservative":
                # Conservative: emphasize quality, valuation, risk; de-emphasize momentum & growth
                overall = int(
                    val_score * 0.25 +
                    qual_score * 0.30 +
                    growth_score * 0.10 +
                    mom_score * 0.10 +
                    risk_score * 0.25
                )
                # Dividend bonus for conservative
                if fund.dividend_yield and fund.dividend_yield > 0.02:
                    overall += 8
                # Penalize high-beta for conservative
                if beta and beta > 1.3:
                    overall -= 10
            elif style == "aggressive":
                # Aggressive: emphasize growth & momentum; de-emphasize risk & valuation
                overall = int(
                    val_score * 0.10 +
                    qual_score * 0.15 +
                    growth_score * 0.35 +
                    mom_score * 0.30 +
                    risk_score * 0.10
                )
                # Momentum bonus
                if mom_score >= 70:
                    overall += 5
            else:  # balanced
                overall = int(
                    val_score * 0.20 +
                    qual_score * 0.25 +
                    growth_score * 0.20 +
                    mom_score * 0.20 +
                    risk_score * 0.15
                )

            overall = max(0, min(100, overall))
            rating, _ = _get_rating(overall)

            # Generate "why buy" reasoning (more detailed)
            why_parts = []
            if val_score >= 60:
                why_parts.append("sector-relative value")
            if qual_score >= 65:
                why_parts.append("high quality business")
            if growth_score >= 60:
                why_parts.append("strong growth")
            if mom_score >= 60:
                why_parts.append("positive momentum")
            if risk_score >= 65:
                why_parts.append("favorable risk profile")
            if fund.dividend_yield and fund.dividend_yield > 0.025:
                why_parts.append(f"dividend {fund.dividend_yield*100:.1f}%")
            if volume and avg_volume and avg_volume > 0 and volume / avg_volume > 1.5:
                why_parts.append("institutional buying detected")

            why = (
                f"Recommended for {style} investors: " + ", ".join(why_parts)
                if why_parts
                else f"Balanced profile suitable for {style} allocation"
            )

            # Entry/SL/TP
            entry = price
            sl = None
            tp = None
            rr = None
            if entry and atr_val:
                sl = round(entry - atr_val * 2, 2)
                tp = round(entry + atr_val * 3, 2)
                if entry > sl:
                    rr = round((tp - entry) / (entry - sl), 1)

            return {
                "symbol": sym,
                "name": profile.name or quote.name,
                "score": overall,
                "rating": rating,
                "price": price,
                "change_percent": quote.change_percent,
                "sector": sector,
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
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
