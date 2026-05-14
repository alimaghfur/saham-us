"""Market breadth indicators service.

Computes market breadth indicators: Advance/Decline ratio, new highs/lows,
McClellan Oscillator, percentage above 200 SMA, and sector breadth.
All data is synthetically generated to simulate realistic market conditions.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
import pandas as pd


@dataclass
class AdvanceDeclineData:
    """Daily advance/decline data point."""
    date: str
    advances: int
    declines: int
    unchanged: int
    ad_ratio: float
    ad_line: float  # Cumulative A-D line
    net_advances: int


@dataclass
class McClellanOscillator:
    """McClellan Oscillator data."""
    current_value: float
    signal_line: float  # 39-day EMA of oscillator
    histogram: float
    interpretation: str  # "Bullish", "Bearish", "Neutral"
    breadth_thrust: bool  # True if oscillator > +100
    oversold: bool  # True if oscillator < -100
    history: List[Dict[str, float]]  # date -> value for charting


@dataclass
class NewHighsLows:
    """New highs and new lows data."""
    date: str
    new_highs: int
    new_lows: int
    net_new_highs: int
    high_low_ratio: float
    high_low_index: float  # 10-day MA of (NH / (NH + NL))
    interpretation: str


@dataclass
class SectorBreadth:
    """Breadth data for a single sector."""
    sector: str
    etf_symbol: str
    advances: int
    declines: int
    pct_above_20sma: float
    pct_above_50sma: float
    pct_above_200sma: float
    ad_ratio: float
    breadth_score: float  # 0-100 composite
    trend: str  # "Improving", "Deteriorating", "Stable"


@dataclass
class MarketBreadthReport:
    """Complete market breadth analysis."""
    timestamp: str
    market: str  # "NYSE", "NASDAQ", "S&P 500"
    # Core metrics
    total_issues: int
    advances: int
    declines: int
    unchanged: int
    ad_ratio: float
    ad_line_value: float
    ad_line_trend: str  # "Rising", "Falling", "Flat"
    # Percentage above MAs
    pct_above_20sma: float
    pct_above_50sma: float
    pct_above_200sma: float
    # New highs/lows
    new_highs_lows: NewHighsLows
    # McClellan
    mcclellan: McClellanOscillator
    # Historical A/D data
    ad_history: List[AdvanceDeclineData]
    # Sector breadth
    sector_breadth: List[SectorBreadth]
    # Signals
    breadth_divergence: bool  # Prices rising but breadth narrowing
    breadth_thrust_signal: bool
    overall_health: str  # "Healthy", "Weakening", "Deteriorating", "Recovering"
    summary: str


_SECTORS = [
    ("Technology", "XLK"),
    ("Healthcare", "XLV"),
    ("Financials", "XLF"),
    ("Consumer Discretionary", "XLY"),
    ("Communication Services", "XLC"),
    ("Industrials", "XLI"),
    ("Consumer Staples", "XLP"),
    ("Energy", "XLE"),
    ("Utilities", "XLU"),
    ("Real Estate", "XLRE"),
    ("Materials", "XLB"),
]


def _generate_ad_history(
    days: int = 30,
    total_issues: int = 3000,
    seed: int = 42,
) -> List[AdvanceDeclineData]:
    """Generate synthetic advance/decline history.

    Args:
        days: Number of trading days of history.
        total_issues: Total number of issues tracked.
        seed: Random seed.

    Returns:
        List of daily A/D data points.
    """
    np_rng = np.random.default_rng(seed)
    today = datetime.now()

    history: List[AdvanceDeclineData] = []
    cumulative_ad = 0.0

    # Generate with some trending behavior
    trend_bias = np_rng.normal(0.05, 0.02)  # Slight bullish bias

    for i in range(days, 0, -1):
        date = today - timedelta(days=i)
        # Skip weekends
        if date.weekday() >= 5:
            continue

        # Daily advance ratio with mean reversion
        daily_sentiment = trend_bias + np_rng.normal(0, 0.1)
        advance_pct = 0.5 + daily_sentiment
        advance_pct = max(0.2, min(0.8, advance_pct))

        advances = int(total_issues * advance_pct)
        unchanged = int(total_issues * np_rng.uniform(0.02, 0.06))
        declines = total_issues - advances - unchanged

        net_advances = advances - declines
        cumulative_ad += net_advances
        ad_ratio = round(advances / max(1, declines), 3)

        history.append(AdvanceDeclineData(
            date=date.strftime("%Y-%m-%d"),
            advances=advances,
            declines=declines,
            unchanged=unchanged,
            ad_ratio=ad_ratio,
            ad_line=round(cumulative_ad, 0),
            net_advances=net_advances,
        ))

    return history


def _compute_mcclellan(
    ad_history: List[AdvanceDeclineData],
) -> McClellanOscillator:
    """Compute McClellan Oscillator from A/D data.

    The McClellan Oscillator is the difference between 19-day EMA
    and 39-day EMA of net advances.

    Args:
        ad_history: List of A/D data points.

    Returns:
        McClellanOscillator with current and historical values.
    """
    if not ad_history:
        return McClellanOscillator(
            current_value=0.0, signal_line=0.0, histogram=0.0,
            interpretation="Neutral", breadth_thrust=False, oversold=False,
            history=[],
        )

    net_advances = pd.Series([d.net_advances for d in ad_history], dtype=float)

    # 19-day EMA (ratio adjusted)
    ema_19 = net_advances.ewm(span=19, adjust=False).mean()
    # 39-day EMA
    ema_39 = net_advances.ewm(span=39, adjust=False).mean()

    # McClellan Oscillator = EMA(19) - EMA(39)
    oscillator = ema_19 - ema_39

    # Signal line (9-day EMA of oscillator)
    signal = oscillator.ewm(span=9, adjust=False).mean()

    current = float(oscillator.iloc[-1])
    signal_value = float(signal.iloc[-1])
    histogram = current - signal_value

    # Interpretation
    if current > 100:
        interpretation = "Bullish (Breadth Thrust)"
    elif current > 50:
        interpretation = "Bullish"
    elif current > 0:
        interpretation = "Mildly Bullish"
    elif current > -50:
        interpretation = "Mildly Bearish"
    elif current > -100:
        interpretation = "Bearish"
    else:
        interpretation = "Bearish (Oversold)"

    # History for charting
    history_points = []
    for i in range(max(0, len(oscillator) - 30), len(oscillator)):
        history_points.append({
            "date": ad_history[i].date,
            "oscillator": round(float(oscillator.iloc[i]), 2),
            "signal": round(float(signal.iloc[i]), 2),
        })

    return McClellanOscillator(
        current_value=round(current, 2),
        signal_line=round(signal_value, 2),
        histogram=round(histogram, 2),
        interpretation=interpretation,
        breadth_thrust=current > 100,
        oversold=current < -100,
        history=history_points,
    )


def get_market_breadth(
    market: str = "S&P 500",
    days_history: int = 30,
) -> MarketBreadthReport:
    """Compute comprehensive market breadth indicators.

    Generates a full breadth analysis including A/D line, McClellan
    Oscillator, new highs/lows, and sector breadth.

    Args:
        market: Market to analyze ("NYSE", "NASDAQ", "S&P 500").
        days_history: Number of days of historical data.

    Returns:
        MarketBreadthReport with all breadth indicators.
    """
    seed = hash(market) % (2**31)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    today = datetime.now()

    # Total issues by market
    total_issues_map = {"NYSE": 3300, "NASDAQ": 3500, "S&P 500": 500}
    total_issues = total_issues_map.get(market, 3000)

    # Generate A/D history
    ad_history = _generate_ad_history(days_history, total_issues, seed)

    # Current day data (latest entry)
    current = ad_history[-1] if ad_history else AdvanceDeclineData(
        date=today.strftime("%Y-%m-%d"),
        advances=int(total_issues * 0.55),
        declines=int(total_issues * 0.40),
        unchanged=int(total_issues * 0.05),
        ad_ratio=1.375,
        ad_line=0,
        net_advances=int(total_issues * 0.15),
    )

    # A/D line trend
    if len(ad_history) >= 5:
        recent_ad = [d.ad_line for d in ad_history[-5:]]
        if recent_ad[-1] > recent_ad[0] * 1.01:
            ad_trend = "Rising"
        elif recent_ad[-1] < recent_ad[0] * 0.99:
            ad_trend = "Falling"
        else:
            ad_trend = "Flat"
    else:
        ad_trend = "Flat"

    # Percentage above moving averages
    pct_above_20 = round(float(np_rng.uniform(40, 80)), 1)
    pct_above_50 = round(float(np_rng.uniform(35, 75)), 1)
    pct_above_200 = round(float(np_rng.uniform(45, 70)), 1)

    # New Highs / New Lows
    new_highs = rng.randint(50, 200)
    new_lows = rng.randint(20, 100)
    hl_ratio = round(new_highs / max(1, new_lows), 2)
    hl_index = round(new_highs / max(1, new_highs + new_lows) * 100, 1)

    if hl_ratio > 3:
        hl_interp = "Strong bullish breadth (many new highs)"
    elif hl_ratio > 1.5:
        hl_interp = "Healthy breadth (highs outnumber lows)"
    elif hl_ratio > 0.7:
        hl_interp = "Mixed breadth (roughly balanced)"
    else:
        hl_interp = "Weak breadth (lows dominating)"

    new_highs_lows = NewHighsLows(
        date=today.strftime("%Y-%m-%d"),
        new_highs=new_highs,
        new_lows=new_lows,
        net_new_highs=new_highs - new_lows,
        high_low_ratio=hl_ratio,
        high_low_index=hl_index,
        interpretation=hl_interp,
    )

    # McClellan Oscillator
    mcclellan = _compute_mcclellan(ad_history)

    # Sector Breadth
    sector_breadth: List[SectorBreadth] = []
    for sector_name, etf_sym in _SECTORS:
        sector_seed = _symbol_seed(sector_name)
        s_rng = np.random.default_rng(sector_seed)

        s_advances = rng.randint(15, 40)
        s_declines = rng.randint(10, 35)
        s_pct_20 = round(float(s_rng.uniform(30, 85)), 1)
        s_pct_50 = round(float(s_rng.uniform(25, 80)), 1)
        s_pct_200 = round(float(s_rng.uniform(35, 75)), 1)

        # Breadth score composite
        breadth_score = round((s_pct_20 + s_pct_50 + s_pct_200) / 3, 1)

        # Trend
        if breadth_score > 65:
            trend = "Improving"
        elif breadth_score < 40:
            trend = "Deteriorating"
        else:
            trend = "Stable"

        sector_breadth.append(SectorBreadth(
            sector=sector_name,
            etf_symbol=etf_sym,
            advances=s_advances,
            declines=s_declines,
            pct_above_20sma=s_pct_20,
            pct_above_50sma=s_pct_50,
            pct_above_200sma=s_pct_200,
            ad_ratio=round(s_advances / max(1, s_declines), 2),
            breadth_score=breadth_score,
            trend=trend,
        ))

    sector_breadth.sort(key=lambda s: s.breadth_score, reverse=True)

    # Breadth divergence detection
    # If A/D line falling but market making new highs = divergence
    breadth_divergence = ad_trend == "Falling" and new_highs > new_lows * 2

    # Breadth thrust (McClellan > 100 or very strong A/D)
    breadth_thrust = mcclellan.breadth_thrust or current.ad_ratio > 3.0

    # Overall market health assessment
    health_score = (
        (pct_above_200 - 50) * 0.3 +
        (current.ad_ratio - 1) * 20 +
        mcclellan.current_value * 0.1 +
        (new_highs - new_lows) * 0.05
    )

    if health_score > 15:
        overall_health = "Healthy"
    elif health_score > 5:
        overall_health = "Recovering"
    elif health_score > -5:
        overall_health = "Weakening"
    else:
        overall_health = "Deteriorating"

    summary = (
        f"Market Breadth ({market}): {overall_health}. "
        f"A/D Ratio: {current.ad_ratio:.2f} ({current.advances} adv / {current.declines} dec). "
        f"A/D Line: {ad_trend}. "
        f"McClellan: {mcclellan.current_value:.0f} ({mcclellan.interpretation}). "
        f"% Above 200 SMA: {pct_above_200}%. "
        f"New Highs/Lows: {new_highs}/{new_lows}."
    )
    if breadth_divergence:
        summary += " WARNING: Breadth divergence detected."

    return MarketBreadthReport(
        timestamp=today.strftime("%Y-%m-%dT%H:%M:%S"),
        market=market,
        total_issues=total_issues,
        advances=current.advances,
        declines=current.declines,
        unchanged=current.unchanged,
        ad_ratio=current.ad_ratio,
        ad_line_value=current.ad_line,
        ad_line_trend=ad_trend,
        pct_above_20sma=pct_above_20,
        pct_above_50sma=pct_above_50,
        pct_above_200sma=pct_above_200,
        new_highs_lows=new_highs_lows,
        mcclellan=mcclellan,
        ad_history=ad_history,
        sector_breadth=sector_breadth,
        breadth_divergence=breadth_divergence,
        breadth_thrust_signal=breadth_thrust,
        overall_health=overall_health,
        summary=summary,
    )


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from a string."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)
