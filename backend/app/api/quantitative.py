"""Advanced Quantitative endpoints: Correlation, Monte Carlo, Fibonacci."""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.market_data import get_market_data_service
from app.services.correlation import compute_correlation_matrix, run_monte_carlo
from app.services.fibonacci import compute_fibonacci_levels

router = APIRouter(prefix="/quantitative", tags=["quantitative"])


# --- Correlation ---

class CorrelationResponse(BaseModel):
    symbols: List[str]
    matrix: List[List[float]]
    strongest_positive: List  # [sym1, sym2, value]
    strongest_negative: List
    average_correlation: float
    diversification_score: float


@router.get("/correlation", response_model=CorrelationResponse)
async def get_correlation(
    symbols: str = Query(..., description="Comma-separated symbols (e.g. AAPL,MSFT,GOOG)"),
):
    """
    Compute correlation matrix between multiple stocks.
    Shows how stocks move together — useful for portfolio diversification.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:10]

    # Fetch history for each
    candles_map = {}
    for sym in symbol_list:
        try:
            history = await get_market_data_service().history(sym, range_="6mo", interval="1d")
            candles_map[sym] = history.candles
        except Exception:
            pass

    result = compute_correlation_matrix(candles_map)

    return CorrelationResponse(
        symbols=result.symbols,
        matrix=result.matrix,
        strongest_positive=list(result.strongest_positive),
        strongest_negative=list(result.strongest_negative),
        average_correlation=result.average_correlation,
        diversification_score=result.diversification_score,
    )


# --- Monte Carlo ---

class MonteCarloPathPoint(BaseModel):
    day: int
    p5: float
    p25: float
    p50: float
    p75: float
    p95: float


class MonteCarloResponse(BaseModel):
    symbol: str
    current_price: float
    simulations: int
    days_ahead: int
    percentiles: Dict[str, float]
    expected_return_pct: float
    max_drawdown_avg: float
    probability_profit: float
    probability_10pct_gain: float
    probability_10pct_loss: float
    var_95: float
    paths_summary: List[MonteCarloPathPoint]


@router.get("/monte-carlo/{symbol}", response_model=MonteCarloResponse)
async def get_monte_carlo(
    symbol: str,
    simulations: int = Query(1000, ge=100, le=10000),
    days: int = Query(30, ge=5, le=252),
):
    """
    Run Monte Carlo simulation for stock price projection.

    Uses Geometric Brownian Motion with historical volatility to simulate
    thousands of possible price paths. Returns probability distributions.
    """
    history = await get_market_data_service().history(symbol, range_="1y", interval="1d")
    result = run_monte_carlo(history.candles, symbol, simulations=simulations, days_ahead=days)

    return MonteCarloResponse(
        symbol=result.symbol,
        current_price=result.current_price,
        simulations=result.simulations,
        days_ahead=result.days_ahead,
        percentiles=result.percentiles,
        expected_return_pct=result.expected_return_pct,
        max_drawdown_avg=result.max_drawdown_avg,
        probability_profit=result.probability_profit,
        probability_10pct_gain=result.probability_10pct_gain,
        probability_10pct_loss=result.probability_10pct_loss,
        var_95=result.var_95,
        paths_summary=[MonteCarloPathPoint(**p) for p in result.paths_summary],
    )


# --- Fibonacci ---

class FibonacciLevel(BaseModel):
    level: str
    price: float
    type: str  # "support" or "resistance"


class FibonacciResponse(BaseModel):
    symbol: str
    current_price: float
    trend: str
    swing_high: float
    swing_low: float
    levels: List[FibonacciLevel]
    nearest_support: float
    nearest_resistance: float


@router.get("/fibonacci/{symbol}", response_model=FibonacciResponse)
async def get_fibonacci(symbol: str):
    """
    Auto-detect Fibonacci retracement levels.

    Finds recent swing high/low and computes key Fibonacci levels
    (23.6%, 38.2%, 50%, 61.8%, 78.6%).
    """
    history = await get_market_data_service().history(symbol, range_="6mo", interval="1d")
    result = compute_fibonacci_levels(history.candles, symbol)

    return FibonacciResponse(
        symbol=result["symbol"],
        current_price=result["current_price"],
        trend=result["trend"],
        swing_high=result["swing_high"],
        swing_low=result["swing_low"],
        levels=[FibonacciLevel(**lv) for lv in result["levels"]],
        nearest_support=result["nearest_support"],
        nearest_resistance=result["nearest_resistance"],
    )
