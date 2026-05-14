"""Dark pool / institutional flow simulation service.

Simulates dark pool block trades, short volume ratio, institutional
ownership changes, and whale alerts for any stock symbol.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np


@dataclass
class BlockTrade:
    """A single dark pool block trade."""
    timestamp: str
    price: float
    shares: int
    notional_value: float
    exchange: str  # "DARK", "ATS", etc.
    trade_type: str  # "Block", "Cross", "VWAP"
    side_indicator: str  # "Buy", "Sell", "Unknown"
    percent_of_adv: float  # % of average daily volume


@dataclass
class WhaleAlert:
    """A significant institutional trade alert."""
    timestamp: str
    alert_type: str  # "Large Block", "Accumulation", "Distribution", "Unusual Size"
    direction: str  # "Bullish", "Bearish", "Neutral"
    shares: int
    notional_value: float
    price: float
    description: str
    significance: str  # "High", "Medium", "Low"


@dataclass
class InstitutionalOwnership:
    """Institutional ownership data."""
    institution_name: str
    shares_held: int
    market_value: float
    percent_of_portfolio: float
    percent_of_shares_outstanding: float
    change_shares: int  # Quarterly change
    change_pct: float
    filing_date: str
    action: str  # "New Position", "Added", "Reduced", "Sold Out", "No Change"


@dataclass
class DarkPoolReport:
    """Complete dark pool / institutional flow report."""
    symbol: str
    timestamp: str
    # Dark pool metrics
    dark_pool_volume: int
    dark_pool_pct_of_total: float  # % of total volume through dark pools
    short_volume: int
    short_volume_ratio: float  # 0-1
    short_exempt_volume: int
    # Flow analysis
    net_institutional_flow: float  # Positive = net buying
    block_trade_count: int
    block_trades: List[BlockTrade]
    whale_alerts: List[WhaleAlert]
    # Institutional ownership
    institutional_ownership_pct: float
    top_holders: List[InstitutionalOwnership]
    # Signals
    accumulation_score: float  # 0-100 (higher = more accumulation)
    distribution_score: float  # 0-100 (higher = more distribution)
    smart_money_signal: str  # "Accumulating", "Distributing", "Neutral"
    summary: str


# Simulated institutional names
_INSTITUTIONS = [
    "Vanguard Group", "BlackRock", "State Street Corp", "Fidelity Investments",
    "Berkshire Hathaway", "JP Morgan Chase", "Morgan Stanley", "Goldman Sachs",
    "Bank of America", "Citadel Advisors", "Bridgewater Associates",
    "Two Sigma Investments", "Renaissance Technologies", "DE Shaw & Co",
    "AQR Capital", "Point72 Asset Management", "Tiger Global Management",
    "Millennium Management", "Baupost Group", "Elliott Management",
]

_DARK_POOL_VENUES = [
    "DARK (Midpoint)", "IEX", "BATS Dark", "NYSE Arca Dark",
    "Sigma-X (Goldman)", "CrossFinder (Credit Suisse)", "Instinet",
    "Level ATS", "POSIT (Virtu)", "Liquidnet",
]


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def generate_block_trades(
    symbol: str,
    current_price: float = 150.0,
    avg_daily_volume: int = 10_000_000,
    num_trades: int = 15,
) -> List[BlockTrade]:
    """Generate synthetic dark pool block trades.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price.
        avg_daily_volume: Average daily trading volume.
        num_trades: Number of block trades to generate.

    Returns:
        List of BlockTrade objects.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    trades: List[BlockTrade] = []
    today = datetime.now()

    for i in range(num_trades):
        # Time during market hours
        hour = rng.randint(9, 15)
        minute = rng.randint(0, 59)
        second = rng.randint(0, 59)
        trade_time = today.replace(hour=hour, minute=minute, second=second)

        # Price near current (dark pool trades typically at/near NBBO)
        price_offset = np_rng.normal(0, 0.001)
        price = round(current_price * (1 + price_offset), 2)

        # Block size (minimum 10,000 shares or $200,000)
        min_block = max(10000, int(200000 / current_price))
        shares = rng.randint(min_block, min_block * 10)

        notional = round(shares * price, 2)
        pct_adv = round(shares / avg_daily_volume * 100, 3)

        # Trade type
        trade_type = rng.choice(["Block", "Block", "Cross", "VWAP"])
        exchange = rng.choice(_DARK_POOL_VENUES)

        # Side indicator (often unknown in dark pools)
        side_probs = [0.35, 0.35, 0.30]
        side = rng.choices(["Buy", "Sell", "Unknown"], weights=side_probs)[0]

        trades.append(BlockTrade(
            timestamp=trade_time.strftime("%Y-%m-%dT%H:%M:%S"),
            price=price,
            shares=shares,
            notional_value=notional,
            exchange=exchange,
            trade_type=trade_type,
            side_indicator=side,
            percent_of_adv=pct_adv,
        ))

    # Sort by timestamp
    trades.sort(key=lambda t: t.timestamp, reverse=True)
    return trades


def generate_whale_alerts(
    symbol: str,
    current_price: float = 150.0,
    block_trades: Optional[List[BlockTrade]] = None,
) -> List[WhaleAlert]:
    """Generate whale alert notifications from block trade data.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price.
        block_trades: Optional pre-generated block trades.

    Returns:
        List of WhaleAlert for significant trades.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed + 100)

    if block_trades is None:
        block_trades = generate_block_trades(symbol, current_price)

    # Filter to significant trades (top by notional value)
    sorted_trades = sorted(block_trades, key=lambda t: t.notional_value, reverse=True)
    significant = sorted_trades[:min(5, len(sorted_trades))]

    alerts: List[WhaleAlert] = []
    for trade in significant:
        if trade.notional_value > 5_000_000:
            alert_type = "Large Block"
            significance = "High"
        elif trade.notional_value > 1_000_000:
            alert_type = "Unusual Size"
            significance = "Medium"
        else:
            alert_type = "Block Trade"
            significance = "Low"

        if trade.side_indicator == "Buy":
            direction = "Bullish"
        elif trade.side_indicator == "Sell":
            direction = "Bearish"
        else:
            direction = "Neutral"

        desc = (
            f"{trade.shares:,} shares at ${trade.price:.2f} "
            f"(${trade.notional_value:,.0f}) via {trade.exchange}. "
            f"{trade.percent_of_adv:.2f}% of ADV."
        )

        alerts.append(WhaleAlert(
            timestamp=trade.timestamp,
            alert_type=alert_type,
            direction=direction,
            shares=trade.shares,
            notional_value=trade.notional_value,
            price=trade.price,
            description=desc,
            significance=significance,
        ))

    return alerts


def get_dark_pool_report(
    symbol: str,
    current_price: float = 150.0,
    avg_daily_volume: int = 10_000_000,
    shares_outstanding: int = 500_000_000,
) -> DarkPoolReport:
    """Generate a comprehensive dark pool / institutional flow report.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price.
        avg_daily_volume: Average daily volume.
        shares_outstanding: Total shares outstanding.

    Returns:
        DarkPoolReport with all institutional flow data.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    today = datetime.now()

    # Generate block trades
    block_trades = generate_block_trades(symbol, current_price, avg_daily_volume)
    whale_alerts = generate_whale_alerts(symbol, current_price, block_trades)

    # Dark pool volume metrics
    dp_pct = np_rng.uniform(0.30, 0.50)  # 30-50% typical for large caps
    dark_pool_volume = int(avg_daily_volume * dp_pct)

    # Short volume (typically 40-60% of total dark pool)
    short_ratio = np_rng.uniform(0.35, 0.60)
    short_volume = int(dark_pool_volume * short_ratio)
    short_exempt = int(short_volume * np_rng.uniform(0.01, 0.05))

    # Institutional ownership
    inst_ownership_pct = np_rng.uniform(0.60, 0.95)  # 60-95% typical
    num_holders = rng.randint(8, 15)
    top_holders: List[InstitutionalOwnership] = []

    remaining_pct = inst_ownership_pct
    shuffled_institutions = rng.sample(_INSTITUTIONS, min(num_holders, len(_INSTITUTIONS)))

    for i, inst_name in enumerate(shuffled_institutions):
        if i == len(shuffled_institutions) - 1:
            holder_pct = remaining_pct
        else:
            holder_pct = np_rng.uniform(0.02, min(0.12, remaining_pct * 0.5))
            remaining_pct -= holder_pct

        shares_held = int(shares_outstanding * holder_pct)
        market_value = round(shares_held * current_price, 2)

        # Quarterly change
        change_pct = np_rng.normal(0, 5)  # % change in position
        change_shares = int(shares_held * change_pct / 100)

        if abs(change_pct) < 1:
            action = "No Change"
        elif change_pct > 20:
            action = "New Position"
        elif change_pct > 0:
            action = "Added"
        elif change_pct < -50:
            action = "Sold Out"
        else:
            action = "Reduced"

        filing_date = (today - timedelta(days=rng.randint(10, 45))).strftime("%Y-%m-%d")

        top_holders.append(InstitutionalOwnership(
            institution_name=inst_name,
            shares_held=shares_held,
            market_value=market_value,
            percent_of_portfolio=round(np_rng.uniform(0.5, 5.0), 2),
            percent_of_shares_outstanding=round(holder_pct * 100, 2),
            change_shares=change_shares,
            change_pct=round(change_pct, 2),
            filing_date=filing_date,
            action=action,
        ))

    top_holders.sort(key=lambda h: h.shares_held, reverse=True)

    # Net institutional flow
    net_flow = sum(h.change_shares * current_price for h in top_holders)

    # Accumulation/Distribution scores
    buyers = sum(1 for h in top_holders if h.change_pct > 0)
    sellers = sum(1 for h in top_holders if h.change_pct < 0)
    total_holders = max(1, len(top_holders))

    accumulation_score = round(buyers / total_holders * 100, 1)
    distribution_score = round(sellers / total_holders * 100, 1)

    if accumulation_score > 60:
        smart_money_signal = "Accumulating"
    elif distribution_score > 60:
        smart_money_signal = "Distributing"
    else:
        smart_money_signal = "Neutral"

    summary = (
        f"Dark pool volume: {dark_pool_volume:,} shares ({dp_pct*100:.1f}% of total). "
        f"Short volume ratio: {short_ratio:.1%}. "
        f"Institutional ownership: {inst_ownership_pct:.1%}. "
        f"Smart money signal: {smart_money_signal}. "
        f"{len(whale_alerts)} whale alerts detected."
    )

    return DarkPoolReport(
        symbol=symbol,
        timestamp=today.strftime("%Y-%m-%dT%H:%M:%S"),
        dark_pool_volume=dark_pool_volume,
        dark_pool_pct_of_total=round(dp_pct * 100, 2),
        short_volume=short_volume,
        short_volume_ratio=round(short_ratio, 4),
        short_exempt_volume=short_exempt,
        net_institutional_flow=round(net_flow, 2),
        block_trade_count=len(block_trades),
        block_trades=block_trades,
        whale_alerts=whale_alerts,
        institutional_ownership_pct=round(inst_ownership_pct * 100, 2),
        top_holders=top_holders,
        accumulation_score=accumulation_score,
        distribution_score=distribution_score,
        smart_money_signal=smart_money_signal,
        summary=summary,
    )
