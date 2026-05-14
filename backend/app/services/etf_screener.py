"""ETF screener and comparison service.

Provides ETF data including holdings, expense ratios, AUM, performance,
sector allocation, and side-by-side comparison. All data is synthetically
generated based on ETF characteristics.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np


@dataclass
class ETFHolding:
    """A single holding within an ETF."""
    symbol: str
    name: str
    weight: float  # Percentage weight
    shares: int
    market_value: float
    sector: str


@dataclass
class ETFPerformance:
    """ETF performance metrics."""
    return_1d: float
    return_1w: float
    return_1m: float
    return_3m: float
    return_6m: float
    return_ytd: float
    return_1y: float
    return_3y_ann: float
    return_5y_ann: float
    return_10y_ann: Optional[float] = None
    max_drawdown_1y: float = 0.0
    volatility_1y: float = 0.0
    sharpe_ratio_1y: float = 0.0
    beta: float = 1.0
    alpha: float = 0.0
    tracking_error: float = 0.0


@dataclass
class SectorAllocation:
    """Sector weight within an ETF."""
    sector: str
    weight: float
    change_1m: float  # Change in weight over 1 month


@dataclass
class ETFProfile:
    """Complete ETF profile data."""
    symbol: str
    name: str
    issuer: str
    category: str  # "Equity", "Fixed Income", "Commodity", "Alternative"
    focus: str  # "Large Cap", "Small Cap", "Tech", "Dividend", etc.
    index_tracked: str
    inception_date: str
    expense_ratio: float  # Annual expense ratio (%)
    aum: float  # Assets under management ($)
    avg_volume: int
    shares_outstanding: int
    price: float
    nav: float
    premium_discount: float  # Premium/discount to NAV (%)
    dividend_yield: float
    pe_ratio: float
    num_holdings: int
    turnover_ratio: float
    performance: ETFPerformance
    top_holdings: List[ETFHolding]
    sector_allocation: List[SectorAllocation]
    summary: str


@dataclass
class ETFComparison:
    """Side-by-side comparison of multiple ETFs."""
    etfs: List[ETFProfile]
    best_return_1y: str  # Symbol with best 1Y return
    lowest_expense: str  # Symbol with lowest expense ratio
    highest_sharpe: str  # Symbol with best risk-adjusted return
    largest_aum: str
    recommendation: str
    comparison_table: Dict[str, Dict[str, float]]  # metric -> {symbol: value}


# Known ETF data templates
_ETF_DATABASE = {
    "SPY": {"name": "SPDR S&P 500 ETF", "issuer": "State Street", "category": "Equity", "focus": "Large Cap Blend", "index": "S&P 500", "expense": 0.09, "aum": 500e9},
    "QQQ": {"name": "Invesco QQQ Trust", "issuer": "Invesco", "category": "Equity", "focus": "Large Cap Growth", "index": "NASDAQ-100", "expense": 0.20, "aum": 250e9},
    "IWM": {"name": "iShares Russell 2000 ETF", "issuer": "BlackRock", "category": "Equity", "focus": "Small Cap Blend", "index": "Russell 2000", "expense": 0.19, "aum": 60e9},
    "VTI": {"name": "Vanguard Total Stock Market ETF", "issuer": "Vanguard", "category": "Equity", "focus": "Total Market", "index": "CRSP US Total Market", "expense": 0.03, "aum": 350e9},
    "VOO": {"name": "Vanguard S&P 500 ETF", "issuer": "Vanguard", "category": "Equity", "focus": "Large Cap Blend", "index": "S&P 500", "expense": 0.03, "aum": 400e9},
    "VUG": {"name": "Vanguard Growth ETF", "issuer": "Vanguard", "category": "Equity", "focus": "Large Cap Growth", "index": "CRSP US Large Cap Growth", "expense": 0.04, "aum": 100e9},
    "VTV": {"name": "Vanguard Value ETF", "issuer": "Vanguard", "category": "Equity", "focus": "Large Cap Value", "index": "CRSP US Large Cap Value", "expense": 0.04, "aum": 90e9},
    "ARKK": {"name": "ARK Innovation ETF", "issuer": "ARK Invest", "category": "Equity", "focus": "Thematic Innovation", "index": "Active", "expense": 0.75, "aum": 8e9},
    "XLK": {"name": "Technology Select Sector SPDR", "issuer": "State Street", "category": "Equity", "focus": "Technology", "index": "S&P Tech Sector", "expense": 0.10, "aum": 55e9},
    "XLF": {"name": "Financial Select Sector SPDR", "issuer": "State Street", "category": "Equity", "focus": "Financials", "index": "S&P Financials Sector", "expense": 0.10, "aum": 35e9},
    "XLE": {"name": "Energy Select Sector SPDR", "issuer": "State Street", "category": "Equity", "focus": "Energy", "index": "S&P Energy Sector", "expense": 0.10, "aum": 30e9},
    "XLV": {"name": "Health Care Select Sector SPDR", "issuer": "State Street", "category": "Equity", "focus": "Healthcare", "index": "S&P Healthcare Sector", "expense": 0.10, "aum": 40e9},
    "BND": {"name": "Vanguard Total Bond Market ETF", "issuer": "Vanguard", "category": "Fixed Income", "focus": "Total Bond", "index": "Bloomberg US Aggregate", "expense": 0.03, "aum": 100e9},
    "TLT": {"name": "iShares 20+ Year Treasury Bond ETF", "issuer": "BlackRock", "category": "Fixed Income", "focus": "Long-Term Treasury", "index": "ICE US Treasury 20+ Year", "expense": 0.15, "aum": 40e9},
    "GLD": {"name": "SPDR Gold Shares", "issuer": "State Street", "category": "Commodity", "focus": "Gold", "index": "Gold Spot Price", "expense": 0.40, "aum": 60e9},
    "SCHD": {"name": "Schwab U.S. Dividend Equity ETF", "issuer": "Schwab", "category": "Equity", "focus": "Dividend", "index": "Dow Jones US Dividend 100", "expense": 0.06, "aum": 50e9},
    "VIG": {"name": "Vanguard Dividend Appreciation ETF", "issuer": "Vanguard", "category": "Equity", "focus": "Dividend Growth", "index": "S&P US Dividend Growers", "expense": 0.06, "aum": 75e9},
    "VXUS": {"name": "Vanguard Total International Stock ETF", "issuer": "Vanguard", "category": "Equity", "focus": "International", "index": "FTSE Global All Cap ex US", "expense": 0.07, "aum": 60e9},
    "EEM": {"name": "iShares MSCI Emerging Markets ETF", "issuer": "BlackRock", "category": "Equity", "focus": "Emerging Markets", "index": "MSCI Emerging Markets", "expense": 0.68, "aum": 25e9},
    "DIA": {"name": "SPDR Dow Jones Industrial Average ETF", "issuer": "State Street", "category": "Equity", "focus": "Large Cap Value", "index": "Dow Jones Industrial Average", "expense": 0.16, "aum": 30e9},
}

_SECTORS = [
    "Technology", "Healthcare", "Financials", "Consumer Discretionary",
    "Communication Services", "Industrials", "Consumer Staples",
    "Energy", "Utilities", "Real Estate", "Materials",
]

_STOCK_NAMES = {
    "AAPL": "Apple Inc", "MSFT": "Microsoft Corp", "AMZN": "Amazon.com",
    "NVDA": "NVIDIA Corp", "GOOGL": "Alphabet Inc", "META": "Meta Platforms",
    "TSLA": "Tesla Inc", "BRK.B": "Berkshire Hathaway", "UNH": "UnitedHealth",
    "JNJ": "Johnson & Johnson", "JPM": "JPMorgan Chase", "V": "Visa Inc",
    "PG": "Procter & Gamble", "MA": "Mastercard", "HD": "Home Depot",
    "XOM": "Exxon Mobil", "CVX": "Chevron Corp", "LLY": "Eli Lilly",
    "ABBV": "AbbVie Inc", "KO": "Coca-Cola Co",
}


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def get_etf_profile(
    symbol: str,
    price: Optional[float] = None,
) -> ETFProfile:
    """Get comprehensive ETF profile data.

    Args:
        symbol: ETF ticker symbol.
        price: Optional current price override.

    Returns:
        ETFProfile with all fund data.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    # Use known data or generate
    known = _ETF_DATABASE.get(symbol.upper(), None)
    if known:
        name = known["name"]
        issuer = known["issuer"]
        category = known["category"]
        focus = known["focus"]
        index_tracked = known["index"]
        expense_ratio = known["expense"]
        aum = known["aum"]
    else:
        name = f"{symbol.upper()} ETF"
        issuer = rng.choice(["Vanguard", "BlackRock", "State Street", "Invesco", "Schwab"])
        category = rng.choice(["Equity", "Fixed Income", "Commodity"])
        focus = rng.choice(["Large Cap Blend", "Small Cap", "International", "Sector"])
        index_tracked = f"Custom {symbol} Index"
        expense_ratio = round(np_rng.uniform(0.03, 0.75), 2)
        aum = np_rng.uniform(1e9, 100e9)

    if price is None:
        price = round(np_rng.uniform(50, 500), 2)

    nav = round(price * (1 + np_rng.normal(0, 0.001)), 2)
    premium_discount = round((price - nav) / nav * 100, 3)

    # Performance
    base_return = np_rng.normal(0.10, 0.08)  # Centered around 10% annual
    performance = ETFPerformance(
        return_1d=round(float(np_rng.normal(0, 0.01)) * 100, 2),
        return_1w=round(float(np_rng.normal(0, 0.02)) * 100, 2),
        return_1m=round(float(np_rng.normal(0.005, 0.04)) * 100, 2),
        return_3m=round(float(np_rng.normal(0.02, 0.06)) * 100, 2),
        return_6m=round(float(np_rng.normal(0.04, 0.08)) * 100, 2),
        return_ytd=round(float(np_rng.normal(base_return * 0.7, 0.08)) * 100, 2),
        return_1y=round(float(base_return + np_rng.normal(0, 0.05)) * 100, 2),
        return_3y_ann=round(float(np_rng.normal(0.09, 0.04)) * 100, 2),
        return_5y_ann=round(float(np_rng.normal(0.10, 0.03)) * 100, 2),
        return_10y_ann=round(float(np_rng.normal(0.11, 0.02)) * 100, 2),
        max_drawdown_1y=round(float(np_rng.uniform(-0.25, -0.05)) * 100, 2),
        volatility_1y=round(float(np_rng.uniform(0.10, 0.30)) * 100, 2),
        sharpe_ratio_1y=round(float(np_rng.normal(0.8, 0.4)), 2),
        beta=round(float(np_rng.normal(1.0, 0.2)), 2),
        alpha=round(float(np_rng.normal(0, 2)), 2),
        tracking_error=round(float(np_rng.uniform(0.01, 0.5)), 2),
    )

    # Top holdings
    num_holdings = rng.randint(30, 500)
    stock_symbols = list(_STOCK_NAMES.keys())
    rng.shuffle(stock_symbols)
    top_n = min(10, len(stock_symbols))

    top_holdings: List[ETFHolding] = []
    remaining_weight = 100.0
    for i in range(top_n):
        if i == top_n - 1:
            weight = remaining_weight
        else:
            weight = np_rng.uniform(2, min(15, remaining_weight * 0.4))
            remaining_weight -= weight

        sym = stock_symbols[i]
        top_holdings.append(ETFHolding(
            symbol=sym,
            name=_STOCK_NAMES.get(sym, sym),
            weight=round(weight, 2),
            shares=rng.randint(100000, 5000000),
            market_value=round(weight / 100 * aum, 0),
            sector=rng.choice(_SECTORS),
        ))

    top_holdings.sort(key=lambda h: h.weight, reverse=True)

    # Sector allocation
    sector_allocation: List[SectorAllocation] = []
    sector_remaining = 100.0
    shuffled_sectors = rng.sample(_SECTORS, len(_SECTORS))
    for i, sector in enumerate(shuffled_sectors):
        if i == len(shuffled_sectors) - 1:
            weight = sector_remaining
        else:
            weight = np_rng.uniform(2, min(30, sector_remaining * 0.5))
            sector_remaining -= weight

        if weight > 0.5:
            sector_allocation.append(SectorAllocation(
                sector=sector,
                weight=round(weight, 2),
                change_1m=round(float(np_rng.normal(0, 1)), 2),
            ))

    sector_allocation.sort(key=lambda s: s.weight, reverse=True)

    summary = (
        f"{name} ({symbol}): {category} ETF focused on {focus}. "
        f"Expense ratio: {expense_ratio}%. AUM: ${aum/1e9:.1f}B. "
        f"1Y return: {performance.return_1y}%. Yield: {round(np_rng.uniform(0.5, 4.0), 2)}%."
    )

    return ETFProfile(
        symbol=symbol.upper(),
        name=name,
        issuer=issuer,
        category=category,
        focus=focus,
        index_tracked=index_tracked,
        inception_date=f"{rng.randint(1993, 2020)}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}",
        expense_ratio=expense_ratio,
        aum=aum,
        avg_volume=rng.randint(1000000, 80000000),
        shares_outstanding=int(aum / price),
        price=price,
        nav=nav,
        premium_discount=premium_discount,
        dividend_yield=round(float(np_rng.uniform(0.5, 4.0)), 2),
        pe_ratio=round(float(np_rng.uniform(15, 35)), 2),
        num_holdings=num_holdings,
        turnover_ratio=round(float(np_rng.uniform(3, 50)), 1),
        performance=performance,
        top_holdings=top_holdings,
        sector_allocation=sector_allocation,
        summary=summary,
    )


def compare_etfs(symbols: List[str]) -> ETFComparison:
    """Compare multiple ETFs side by side.

    Args:
        symbols: List of ETF ticker symbols to compare.

    Returns:
        ETFComparison with side-by-side metrics.
    """
    if not symbols:
        symbols = ["SPY", "QQQ", "IWM"]
    if len(symbols) < 2:
        symbols.append("SPY")

    etfs = [get_etf_profile(s) for s in symbols]

    # Find bests
    best_return = max(etfs, key=lambda e: e.performance.return_1y)
    lowest_expense = min(etfs, key=lambda e: e.expense_ratio)
    highest_sharpe = max(etfs, key=lambda e: e.performance.sharpe_ratio_1y)
    largest_aum = max(etfs, key=lambda e: e.aum)

    # Comparison table
    comparison_table: Dict[str, Dict[str, float]] = {
        "expense_ratio": {e.symbol: e.expense_ratio for e in etfs},
        "return_1y": {e.symbol: e.performance.return_1y for e in etfs},
        "return_3y_ann": {e.symbol: e.performance.return_3y_ann for e in etfs},
        "volatility_1y": {e.symbol: e.performance.volatility_1y for e in etfs},
        "sharpe_ratio": {e.symbol: e.performance.sharpe_ratio_1y for e in etfs},
        "max_drawdown": {e.symbol: e.performance.max_drawdown_1y for e in etfs},
        "dividend_yield": {e.symbol: e.dividend_yield for e in etfs},
        "aum_billions": {e.symbol: round(e.aum / 1e9, 2) for e in etfs},
        "beta": {e.symbol: e.performance.beta for e in etfs},
    }

    # Recommendation
    scores = {}
    for e in etfs:
        score = (
            e.performance.sharpe_ratio_1y * 30 +
            (1 - e.expense_ratio) * 20 +
            e.performance.return_1y * 0.5 +
            (100 + e.performance.max_drawdown_1y) * 0.3
        )
        scores[e.symbol] = score

    best_overall = max(scores, key=scores.get)
    recommendation = (
        f"Based on risk-adjusted returns, expense ratio, and drawdown, "
        f"{best_overall} scores highest overall. "
        f"Best 1Y return: {best_return.symbol}. "
        f"Lowest cost: {lowest_expense.symbol} ({lowest_expense.expense_ratio}%). "
        f"Best Sharpe: {highest_sharpe.symbol} ({highest_sharpe.performance.sharpe_ratio_1y})."
    )

    return ETFComparison(
        etfs=etfs,
        best_return_1y=best_return.symbol,
        lowest_expense=lowest_expense.symbol,
        highest_sharpe=highest_sharpe.symbol,
        largest_aum=largest_aum.symbol,
        recommendation=recommendation,
        comparison_table=comparison_table,
    )
