"""Earnings surprise prediction service.

Predicts earnings beat/miss probability based on historical patterns,
revenue growth trends, analyst consensus vs actual history, and
sector momentum. All data is synthetically generated.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np


@dataclass
class HistoricalEarnings:
    """A single historical earnings result."""
    quarter: str  # e.g., "Q3 2024"
    report_date: str
    eps_estimate: float
    eps_actual: float
    surprise_pct: float
    revenue_estimate: float  # in millions
    revenue_actual: float
    revenue_surprise_pct: float
    stock_move_pct: float  # Price change on earnings day


@dataclass
class EarningsPrediction:
    """Predicted earnings outcome."""
    symbol: str
    next_earnings_date: str
    beat_probability: float  # 0-100%
    miss_probability: float
    meet_probability: float
    expected_surprise_pct: float  # Expected EPS surprise %
    expected_revenue_surprise_pct: float
    confidence: float  # 0-100%
    factors: List[str]  # Contributing factors
    historical_beat_rate: float  # % of past quarters that beat
    consecutive_beats: int
    avg_surprise_magnitude: float
    sector_momentum: float  # -1 to 1
    revenue_growth_trend: float  # Recent QoQ revenue growth
    implied_move: float  # Options-implied expected move %
    recommendation: str  # "Hold Through", "Sell Before", "Buy Before"
    risk_level: str  # "Low", "Medium", "High"


@dataclass
class EarningsAnalysis:
    """Complete earnings analysis for a symbol."""
    symbol: str
    prediction: EarningsPrediction
    historical: List[HistoricalEarnings]
    whisper_number: float  # Street whisper EPS
    consensus_eps: float
    consensus_revenue: float  # millions
    summary: str


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def _generate_historical_earnings(
    symbol: str,
    num_quarters: int = 8,
    base_eps: float = 2.50,
) -> List[HistoricalEarnings]:
    """Generate synthetic historical earnings data.

    Args:
        symbol: Stock ticker.
        num_quarters: Number of past quarters to generate.
        base_eps: Starting EPS level.

    Returns:
        List of historical earnings, most recent first.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    history: List[HistoricalEarnings] = []
    today = datetime.now()

    quarters = ["Q1", "Q2", "Q3", "Q4"]
    current_q = (today.month - 1) // 3
    current_year = today.year

    eps = base_eps
    revenue_base = rng.uniform(5000, 50000)  # millions

    for i in range(num_quarters):
        q_idx = (current_q - i - 1) % 4
        year = current_year - ((current_q - i - 1) < 0)
        if q_idx > current_q and i > 0:
            year -= 1
        quarter_label = f"{quarters[q_idx]} {year}"

        # Report date (roughly)
        report_month = q_idx * 3 + 4  # Q1 reports in Apr, etc.
        if report_month > 12:
            report_month -= 12
        report_date = datetime(year, min(12, report_month), rng.randint(15, 28))

        # EPS with growth trend
        growth = np_rng.normal(0.03, 0.08)
        eps = eps * (1 + growth)
        eps_estimate = round(eps * (1 + np_rng.normal(0, 0.02)), 2)
        
        # Bias toward beats (realistic - ~70% of S&P beat)
        beat_bias = 0.02 if rng.random() < 0.7 else -0.03
        eps_actual = round(eps_estimate * (1 + beat_bias + np_rng.normal(0, 0.03)), 2)
        surprise_pct = round((eps_actual - eps_estimate) / abs(eps_estimate) * 100, 2)

        # Revenue
        rev_growth = np_rng.normal(0.02, 0.05)
        revenue_base *= (1 + rev_growth)
        rev_estimate = round(revenue_base * (1 + np_rng.normal(0, 0.01)), 1)
        rev_actual = round(rev_estimate * (1 + np_rng.normal(0.01, 0.02)), 1)
        rev_surprise = round((rev_actual - rev_estimate) / rev_estimate * 100, 2)

        # Stock move on earnings
        stock_move = np_rng.normal(surprise_pct * 0.3, 3.0)

        history.append(HistoricalEarnings(
            quarter=quarter_label,
            report_date=report_date.strftime("%Y-%m-%d"),
            eps_estimate=eps_estimate,
            eps_actual=eps_actual,
            surprise_pct=surprise_pct,
            revenue_estimate=rev_estimate,
            revenue_actual=rev_actual,
            revenue_surprise_pct=rev_surprise,
            stock_move_pct=round(stock_move, 2),
        ))

    return history


def predict_earnings(
    symbol: str,
    current_price: float = 150.0,
    sector: str = "Technology",
) -> EarningsAnalysis:
    """Predict upcoming earnings surprise for a stock.

    Uses historical beat patterns, revenue growth trend, sector
    momentum, and analyst consensus patterns to estimate probability
    of beat/miss.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price.
        sector: Stock's sector for momentum analysis.

    Returns:
        EarningsAnalysis with prediction and historical data.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    # Generate historical data
    base_eps = current_price / rng.uniform(15, 35)  # Derive EPS from P/E
    historical = _generate_historical_earnings(symbol, num_quarters=8, base_eps=base_eps)

    # Analyze patterns
    beats = sum(1 for h in historical if h.surprise_pct > 0)
    beat_rate = beats / len(historical) * 100

    # Consecutive beats
    consecutive = 0
    for h in historical:
        if h.surprise_pct > 0:
            consecutive += 1
        else:
            break

    avg_surprise = np.mean([h.surprise_pct for h in historical])

    # Revenue growth trend
    if len(historical) >= 2:
        rev_growth = (historical[0].revenue_actual - historical[-1].revenue_actual) / \
                     historical[-1].revenue_actual
    else:
        rev_growth = 0.0

    # Sector momentum (-1 to 1)
    sector_seeds = {
        "Technology": 0.3, "Healthcare": 0.1, "Financial": 0.2,
        "Energy": -0.1, "Consumer": 0.15, "Industrial": 0.05,
    }
    sector_base = sector_seeds.get(sector, 0.0)
    sector_momentum = round(sector_base + np_rng.normal(0, 0.15), 3)
    sector_momentum = max(-1.0, min(1.0, sector_momentum))

    # Compute probabilities
    # Higher beat rate + positive momentum + growth = higher beat probability
    base_beat_prob = beat_rate * 0.6 + 20  # Historical weight
    momentum_adj = sector_momentum * 10
    growth_adj = min(15, max(-15, rev_growth * 50))
    streak_adj = consecutive * 2

    beat_probability = round(min(95, max(10, base_beat_prob + momentum_adj + growth_adj + streak_adj)), 1)
    miss_probability = round(min(80, max(5, 100 - beat_probability - rng.uniform(5, 15))), 1)
    meet_probability = round(100 - beat_probability - miss_probability, 1)

    # Expected surprise
    expected_surprise = round(avg_surprise * 0.8 + sector_momentum * 2, 2)
    expected_rev_surprise = round(np.mean([h.revenue_surprise_pct for h in historical]) * 0.7, 2)

    # Confidence
    confidence = round(min(90, max(30, 50 + consecutive * 5 + (beat_rate - 50) * 0.3)), 1)

    # Implied move from options
    implied_move = round(abs(np_rng.normal(0, 1)) * 3 + 2, 1)

    # Next earnings date
    today = datetime.now()
    days_to_earnings = rng.randint(7, 60)
    next_date = today + timedelta(days=days_to_earnings)

    # Consensus estimates
    consensus_eps = round(historical[0].eps_actual * (1 + np_rng.normal(0.03, 0.02)), 2)
    whisper = round(consensus_eps * (1 + np_rng.normal(0.01, 0.005)), 2)
    consensus_revenue = round(historical[0].revenue_actual * (1 + np_rng.normal(0.02, 0.01)), 1)

    # Contributing factors
    factors = []
    if beat_rate > 70:
        factors.append(f"Strong historical beat rate ({beat_rate:.0f}%)")
    if consecutive >= 3:
        factors.append(f"{consecutive} consecutive earnings beats")
    if sector_momentum > 0.2:
        factors.append(f"Positive sector momentum ({sector} sector)")
    elif sector_momentum < -0.2:
        factors.append(f"Negative sector headwinds ({sector} sector)")
    if rev_growth > 0.1:
        factors.append(f"Strong revenue growth trend ({rev_growth*100:.1f}%)")
    if whisper > consensus_eps:
        factors.append("Whisper number above consensus")
    if not factors:
        factors.append("Mixed signals - no dominant factor")

    # Recommendation
    if beat_probability > 70 and implied_move < 5:
        recommendation = "Buy Before"
    elif miss_probability > 50 or implied_move > 8:
        recommendation = "Sell Before"
    else:
        recommendation = "Hold Through"

    # Risk level
    if implied_move > 7:
        risk_level = "High"
    elif implied_move > 4:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    prediction = EarningsPrediction(
        symbol=symbol,
        next_earnings_date=next_date.strftime("%Y-%m-%d"),
        beat_probability=beat_probability,
        miss_probability=miss_probability,
        meet_probability=meet_probability,
        expected_surprise_pct=expected_surprise,
        expected_revenue_surprise_pct=expected_rev_surprise,
        confidence=confidence,
        factors=factors,
        historical_beat_rate=round(beat_rate, 1),
        consecutive_beats=consecutive,
        avg_surprise_magnitude=round(float(np.mean([abs(h.surprise_pct) for h in historical])), 2),
        sector_momentum=sector_momentum,
        revenue_growth_trend=round(rev_growth * 100, 2),
        implied_move=implied_move,
        recommendation=recommendation,
        risk_level=risk_level,
    )

    summary = (
        f"{symbol} has a {beat_probability:.0f}% probability of beating earnings estimates. "
        f"Historical beat rate: {beat_rate:.0f}% ({consecutive} consecutive beats). "
        f"Expected surprise: {expected_surprise:+.2f}%. "
        f"Recommendation: {recommendation} (Risk: {risk_level})."
    )

    return EarningsAnalysis(
        symbol=symbol,
        prediction=prediction,
        historical=historical,
        whisper_number=whisper,
        consensus_eps=consensus_eps,
        consensus_revenue=consensus_revenue,
        summary=summary,
    )
