"""Correlation Matrix & Monte Carlo Simulation service."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from app.schemas.stock import OHLCV
from app.services.indicators import _to_dataframe


@dataclass
class CorrelationResult:
    """Correlation analysis between multiple stocks."""
    symbols: List[str]
    matrix: List[List[float]]
    strongest_positive: Tuple[str, str, float]
    strongest_negative: Tuple[str, str, float]
    average_correlation: float
    diversification_score: float  # 0-100, higher = better diversified


@dataclass
class MonteCarloResult:
    """Monte Carlo simulation result."""
    symbol: str
    current_price: float
    simulations: int
    days_ahead: int
    percentiles: Dict[str, float]  # p5, p25, p50, p75, p95
    expected_return_pct: float
    max_drawdown_avg: float
    probability_profit: float
    probability_10pct_gain: float
    probability_10pct_loss: float
    var_95: float  # Value at Risk (95%)
    paths_summary: List[Dict]  # [{"day": i, "p5": x, "p25": x, "p50": x, "p75": x, "p95": x}]


def compute_correlation_matrix(
    candles_map: Dict[str, List[OHLCV]],
) -> CorrelationResult:
    """Compute correlation matrix for multiple stocks."""
    symbols = list(candles_map.keys())

    if len(symbols) < 2:
        return CorrelationResult(
            symbols=symbols,
            matrix=[[1.0]],
            strongest_positive=("", "", 0),
            strongest_negative=("", "", 0),
            average_correlation=0,
            diversification_score=100,
        )

    # Build returns DataFrame
    returns_df = pd.DataFrame()
    for sym, candles in candles_map.items():
        df = _to_dataframe(candles)
        if not df.empty:
            returns_df[sym] = df["close"].pct_change().dropna()

    # Align dates
    returns_df = returns_df.dropna()

    if returns_df.empty or len(returns_df) < 10:
        n = len(symbols)
        matrix = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
        return CorrelationResult(
            symbols=symbols, matrix=matrix,
            strongest_positive=(symbols[0], symbols[1] if len(symbols) > 1 else symbols[0], 0),
            strongest_negative=(symbols[0], symbols[1] if len(symbols) > 1 else symbols[0], 0),
            average_correlation=0, diversification_score=50,
        )

    # Compute correlation
    corr = returns_df.corr().values.tolist()

    # Find strongest correlations
    n = len(symbols)
    strongest_pos = ("", "", -1.0)
    strongest_neg = ("", "", 1.0)
    total_corr = 0
    count = 0

    for i in range(n):
        for j in range(i + 1, n):
            val = corr[i][j]
            total_corr += val
            count += 1
            if val > strongest_pos[2]:
                strongest_pos = (symbols[i], symbols[j], round(val, 4))
            if val < strongest_neg[2]:
                strongest_neg = (symbols[i], symbols[j], round(val, 4))

    avg_corr = total_corr / count if count > 0 else 0

    # Diversification score: lower avg correlation = better diversification
    div_score = max(0, min(100, (1 - avg_corr) * 100))

    # Round matrix
    matrix_rounded = [[round(v, 4) for v in row] for row in corr]

    return CorrelationResult(
        symbols=symbols,
        matrix=matrix_rounded,
        strongest_positive=strongest_pos,
        strongest_negative=strongest_neg,
        average_correlation=round(avg_corr, 4),
        diversification_score=round(div_score, 1),
    )


def run_monte_carlo(
    candles: List[OHLCV],
    symbol: str,
    simulations: int = 1000,
    days_ahead: int = 30,
) -> MonteCarloResult:
    """Run Monte Carlo simulation for stock price."""
    df = _to_dataframe(candles)

    if df.empty or len(df) < 30:
        return MonteCarloResult(
            symbol=symbol.upper(),
            current_price=float(df["close"].iloc[-1]) if not df.empty else 0,
            simulations=simulations,
            days_ahead=days_ahead,
            percentiles={},
            expected_return_pct=0,
            max_drawdown_avg=0,
            probability_profit=0.5,
            probability_10pct_gain=0.1,
            probability_10pct_loss=0.1,
            var_95=0,
            paths_summary=[],
        )

    close = df["close"].values
    current_price = float(close[-1])

    # Calculate daily returns statistics
    returns = np.diff(np.log(close))
    mu = float(np.mean(returns))
    sigma = float(np.std(returns))

    # Run simulations using Geometric Brownian Motion
    np.random.seed(42)  # reproducible
    all_paths = np.zeros((simulations, days_ahead + 1))
    all_paths[:, 0] = current_price

    for day in range(1, days_ahead + 1):
        random_returns = np.random.normal(mu, sigma, simulations)
        all_paths[:, day] = all_paths[:, day - 1] * np.exp(random_returns)

    # Final prices
    final_prices = all_paths[:, -1]

    # Percentiles
    percentiles = {
        "p5": round(float(np.percentile(final_prices, 5)), 2),
        "p25": round(float(np.percentile(final_prices, 25)), 2),
        "p50": round(float(np.percentile(final_prices, 50)), 2),
        "p75": round(float(np.percentile(final_prices, 75)), 2),
        "p95": round(float(np.percentile(final_prices, 95)), 2),
    }

    # Expected return
    expected_return = float((np.mean(final_prices) - current_price) / current_price * 100)

    # Max drawdown average
    drawdowns = []
    for path in all_paths:
        running_max = np.maximum.accumulate(path)
        drawdown = (path - running_max) / running_max
        drawdowns.append(float(np.min(drawdown)))
    max_dd_avg = float(np.mean(drawdowns) * 100)

    # Probabilities
    prob_profit = float(np.mean(final_prices > current_price))
    prob_10_gain = float(np.mean(final_prices > current_price * 1.10))
    prob_10_loss = float(np.mean(final_prices < current_price * 0.90))

    # VaR 95%
    var_95 = float((np.percentile(final_prices, 5) - current_price) / current_price * 100)

    # Path summary (percentiles at each day)
    step = max(1, days_ahead // 20)  # Max 20 data points
    paths_summary = []
    for day in range(0, days_ahead + 1, step):
        day_prices = all_paths[:, day]
        paths_summary.append({
            "day": day,
            "p5": round(float(np.percentile(day_prices, 5)), 2),
            "p25": round(float(np.percentile(day_prices, 25)), 2),
            "p50": round(float(np.percentile(day_prices, 50)), 2),
            "p75": round(float(np.percentile(day_prices, 75)), 2),
            "p95": round(float(np.percentile(day_prices, 95)), 2),
        })

    return MonteCarloResult(
        symbol=symbol.upper(),
        current_price=current_price,
        simulations=simulations,
        days_ahead=days_ahead,
        percentiles=percentiles,
        expected_return_pct=round(expected_return, 2),
        max_drawdown_avg=round(max_dd_avg, 2),
        probability_profit=round(prob_profit * 100, 1),
        probability_10pct_gain=round(prob_10_gain * 100, 1),
        probability_10pct_loss=round(prob_10_loss * 100, 1),
        var_95=round(var_95, 2),
        paths_summary=paths_summary,
    )
