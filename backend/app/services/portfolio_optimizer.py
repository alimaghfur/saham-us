"""Portfolio optimization service using Modern Portfolio Theory (Markowitz).

Computes efficient frontier, optimal weights for max Sharpe ratio,
and minimum variance portfolio using numpy matrix operations.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


@dataclass
class AssetStats:
    """Statistics for a single asset."""
    symbol: str
    expected_return: float  # Annualized
    volatility: float  # Annualized std dev
    sharpe_ratio: float
    weight: float  # Portfolio weight (0-1)


@dataclass
class PortfolioPoint:
    """A single point on the efficient frontier."""
    expected_return: float
    volatility: float
    sharpe_ratio: float
    weights: Dict[str, float]


@dataclass
class EfficientFrontier:
    """The efficient frontier curve."""
    points: List[PortfolioPoint]
    min_volatility: float
    max_return: float


@dataclass
class OptimalPortfolio:
    """An optimized portfolio allocation."""
    name: str  # "Max Sharpe", "Min Variance", "Risk Parity"
    expected_return: float
    volatility: float
    sharpe_ratio: float
    weights: Dict[str, float]
    asset_stats: List[AssetStats]


@dataclass
class PortfolioOptimizationResult:
    """Complete portfolio optimization result."""
    symbols: List[str]
    risk_free_rate: float
    max_sharpe_portfolio: OptimalPortfolio
    min_variance_portfolio: OptimalPortfolio
    efficient_frontier: EfficientFrontier
    correlation_matrix: Dict[str, Dict[str, float]]
    covariance_matrix: Dict[str, Dict[str, float]]
    individual_stats: List[AssetStats]
    summary: str


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def _generate_returns(
    symbols: List[str],
    num_days: int = 252,
) -> pd.DataFrame:
    """Generate synthetic daily returns for a list of symbols.

    Returns are generated with realistic correlations and volatility
    levels based on symbol characteristics.

    Args:
        symbols: List of stock tickers.
        num_days: Number of trading days of history.

    Returns:
        DataFrame with daily returns, columns = symbols.
    """
    n = len(symbols)
    combined_seed = sum(_symbol_seed(s) for s in symbols) % (2**31)
    np_rng = np.random.default_rng(combined_seed)

    # Generate a random correlation matrix
    # Use a method that guarantees positive semi-definite
    random_matrix = np_rng.normal(0, 1, (n, n))
    correlation = np.corrcoef(random_matrix)

    # Ensure diagonal is 1
    np.fill_diagonal(correlation, 1.0)

    # Generate volatilities for each asset (annualized 15-50%)
    vols = np.array([
        0.15 + (_symbol_seed(s) % 100) / 280.0 for s in symbols
    ])

    # Daily vols
    daily_vols = vols / np.sqrt(252)

    # Generate expected daily returns (annualized 5-25%)
    daily_means = np.array([
        (0.05 + (_symbol_seed(s) % 100) / 500.0) / 252 for s in symbols
    ])

    # Cholesky decomposition for correlated returns
    try:
        L = np.linalg.cholesky(correlation)
    except np.linalg.LinAlgError:
        # Fallback: make it positive definite
        eigvals, eigvecs = np.linalg.eigh(correlation)
        eigvals = np.maximum(eigvals, 0.01)
        correlation = eigvecs @ np.diag(eigvals) @ eigvecs.T
        np.fill_diagonal(correlation, 1.0)
        L = np.linalg.cholesky(correlation)

    # Generate correlated random returns
    uncorrelated = np_rng.normal(0, 1, (num_days, n))
    correlated = uncorrelated @ L.T

    # Scale to desired volatilities and add drift
    returns = correlated * daily_vols + daily_means

    return pd.DataFrame(returns, columns=symbols)


def _max_sharpe_weights(
    mean_returns: np.ndarray,
    cov_matrix: np.ndarray,
    risk_free_rate: float = 0.05,
    num_portfolios: int = 10000,
) -> Tuple[np.ndarray, float, float, float]:
    """Find max Sharpe ratio portfolio via Monte Carlo simulation.

    Args:
        mean_returns: Annualized mean returns vector.
        cov_matrix: Annualized covariance matrix.
        risk_free_rate: Annual risk-free rate.
        num_portfolios: Number of random portfolios to generate.

    Returns:
        Tuple of (weights, return, volatility, sharpe_ratio).
    """
    n = len(mean_returns)
    rng = np.random.default_rng(42)

    best_sharpe = -np.inf
    best_weights = np.ones(n) / n
    best_ret = 0.0
    best_vol = 1.0

    for _ in range(num_portfolios):
        weights = rng.random(n)
        weights /= weights.sum()

        port_return = np.dot(weights, mean_returns)
        port_vol = np.sqrt(weights @ cov_matrix @ weights)
        sharpe = (port_return - risk_free_rate) / port_vol if port_vol > 0 else 0

        if sharpe > best_sharpe:
            best_sharpe = sharpe
            best_weights = weights
            best_ret = port_return
            best_vol = port_vol

    return best_weights, best_ret, best_vol, best_sharpe


def _min_variance_weights(
    cov_matrix: np.ndarray,
    mean_returns: np.ndarray,
) -> Tuple[np.ndarray, float, float]:
    """Find minimum variance portfolio analytically.

    Uses the closed-form solution: w = (Σ^-1 * 1) / (1^T * Σ^-1 * 1)

    Args:
        cov_matrix: Covariance matrix.
        mean_returns: Mean returns vector.

    Returns:
        Tuple of (weights, return, volatility).
    """
    n = len(mean_returns)
    try:
        inv_cov = np.linalg.inv(cov_matrix)
    except np.linalg.LinAlgError:
        inv_cov = np.linalg.pinv(cov_matrix)

    ones = np.ones(n)
    weights = inv_cov @ ones
    weights /= weights.sum()

    # Ensure non-negative (long-only constraint approximation)
    weights = np.maximum(weights, 0)
    weights /= weights.sum()

    port_return = float(np.dot(weights, mean_returns))
    port_vol = float(np.sqrt(weights @ cov_matrix @ weights))

    return weights, port_return, port_vol


def optimize_portfolio(
    symbols: List[str],
    risk_free_rate: float = 0.05,
    num_frontier_points: int = 50,
) -> PortfolioOptimizationResult:
    """Optimize a portfolio using Modern Portfolio Theory.

    Computes the efficient frontier, maximum Sharpe ratio portfolio,
    and minimum variance portfolio for the given set of assets.

    Args:
        symbols: List of stock tickers (2-20 symbols).
        risk_free_rate: Annual risk-free rate (default 5%).
        num_frontier_points: Number of points on the efficient frontier.

    Returns:
        PortfolioOptimizationResult with all optimization outputs.
    """
    if len(symbols) < 2:
        symbols = symbols + ["SPY"]  # Need at least 2 assets
    if len(symbols) > 20:
        symbols = symbols[:20]

    # Generate synthetic returns
    returns_df = _generate_returns(symbols, num_days=252)

    # Annualized statistics
    mean_returns = returns_df.mean().values * 252
    cov_matrix = returns_df.cov().values * 252
    volatilities = returns_df.std().values * np.sqrt(252)

    n = len(symbols)

    # Individual asset stats
    individual_stats = []
    for i, sym in enumerate(symbols):
        sharpe = (mean_returns[i] - risk_free_rate) / volatilities[i] if volatilities[i] > 0 else 0
        individual_stats.append(AssetStats(
            symbol=sym,
            expected_return=round(float(mean_returns[i]), 4),
            volatility=round(float(volatilities[i]), 4),
            sharpe_ratio=round(float(sharpe), 4),
            weight=0.0,
        ))

    # Max Sharpe portfolio
    ms_weights, ms_ret, ms_vol, ms_sharpe = _max_sharpe_weights(
        mean_returns, cov_matrix, risk_free_rate
    )

    max_sharpe_portfolio = OptimalPortfolio(
        name="Max Sharpe Ratio",
        expected_return=round(float(ms_ret), 4),
        volatility=round(float(ms_vol), 4),
        sharpe_ratio=round(float(ms_sharpe), 4),
        weights={sym: round(float(w), 4) for sym, w in zip(symbols, ms_weights)},
        asset_stats=[
            AssetStats(
                symbol=sym,
                expected_return=round(float(mean_returns[i]), 4),
                volatility=round(float(volatilities[i]), 4),
                sharpe_ratio=round(float((mean_returns[i] - risk_free_rate) / volatilities[i]), 4),
                weight=round(float(ms_weights[i]), 4),
            )
            for i, sym in enumerate(symbols)
        ],
    )

    # Min Variance portfolio
    mv_weights, mv_ret, mv_vol = _min_variance_weights(cov_matrix, mean_returns)
    mv_sharpe = (mv_ret - risk_free_rate) / mv_vol if mv_vol > 0 else 0

    min_variance_portfolio = OptimalPortfolio(
        name="Minimum Variance",
        expected_return=round(float(mv_ret), 4),
        volatility=round(float(mv_vol), 4),
        sharpe_ratio=round(float(mv_sharpe), 4),
        weights={sym: round(float(w), 4) for sym, w in zip(symbols, mv_weights)},
        asset_stats=[
            AssetStats(
                symbol=sym,
                expected_return=round(float(mean_returns[i]), 4),
                volatility=round(float(volatilities[i]), 4),
                sharpe_ratio=round(float((mean_returns[i] - risk_free_rate) / volatilities[i]), 4),
                weight=round(float(mv_weights[i]), 4),
            )
            for i, sym in enumerate(symbols)
        ],
    )

    # Efficient Frontier
    target_returns = np.linspace(
        float(mean_returns.min()),
        float(mean_returns.max()),
        num_frontier_points,
    )

    rng = np.random.default_rng(123)
    frontier_points: List[PortfolioPoint] = []

    for target_ret in target_returns:
        # Monte Carlo to find lowest vol for this return level
        best_vol = np.inf
        best_w = np.ones(n) / n

        for _ in range(2000):
            w = rng.random(n)
            w /= w.sum()
            p_ret = np.dot(w, mean_returns)
            p_vol = np.sqrt(w @ cov_matrix @ w)

            # Accept if close to target return and lower vol
            if abs(p_ret - target_ret) < 0.02 and p_vol < best_vol:
                best_vol = p_vol
                best_w = w

        if best_vol < np.inf:
            p_ret = float(np.dot(best_w, mean_returns))
            p_sharpe = (p_ret - risk_free_rate) / best_vol if best_vol > 0 else 0
            frontier_points.append(PortfolioPoint(
                expected_return=round(p_ret, 4),
                volatility=round(float(best_vol), 4),
                sharpe_ratio=round(float(p_sharpe), 4),
                weights={sym: round(float(w), 4) for sym, w in zip(symbols, best_w)},
            ))

    efficient_frontier = EfficientFrontier(
        points=frontier_points,
        min_volatility=round(float(mv_vol), 4),
        max_return=round(float(mean_returns.max()), 4),
    )

    # Correlation matrix
    corr_df = returns_df.corr()
    correlation_matrix = {
        sym: {s2: round(float(corr_df.loc[sym, s2]), 4) for s2 in symbols}
        for sym in symbols
    }

    # Covariance matrix (annualized)
    covariance_matrix = {
        sym: {s2: round(float(cov_matrix[i][j]), 6) for j, s2 in enumerate(symbols)}
        for i, sym in enumerate(symbols)
    }

    summary = (
        f"Optimized portfolio of {len(symbols)} assets. "
        f"Max Sharpe portfolio: {ms_ret*100:.1f}% return, {ms_vol*100:.1f}% vol, "
        f"Sharpe {ms_sharpe:.2f}. "
        f"Min Variance portfolio: {mv_ret*100:.1f}% return, {mv_vol*100:.1f}% vol."
    )

    return PortfolioOptimizationResult(
        symbols=symbols,
        risk_free_rate=risk_free_rate,
        max_sharpe_portfolio=max_sharpe_portfolio,
        min_variance_portfolio=min_variance_portfolio,
        efficient_frontier=efficient_frontier,
        correlation_matrix=correlation_matrix,
        covariance_matrix=covariance_matrix,
        individual_stats=individual_stats,
        summary=summary,
    )
