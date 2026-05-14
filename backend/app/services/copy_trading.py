"""Copy trading simulation service.

Simulates a copy trading system with virtual traders, each having
their own strategy, P&L history, win rate, and performance metrics.
Users can "follow" traders and track paper money results.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np


@dataclass
class Trade:
    """A single trade executed by a virtual trader."""
    trade_id: str
    symbol: str
    direction: str  # "Long" or "Short"
    entry_price: float
    exit_price: Optional[float]
    entry_date: str
    exit_date: Optional[str]
    quantity: int
    pnl: float  # Realized P&L
    pnl_pct: float
    status: str  # "Open", "Closed", "Stopped Out"
    stop_loss: float
    take_profit: float
    hold_duration_days: Optional[int] = None


@dataclass
class TraderPerformance:
    """Performance metrics for a virtual trader."""
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float  # 0-100%
    avg_win_pct: float
    avg_loss_pct: float
    profit_factor: float  # Gross profit / Gross loss
    max_drawdown_pct: float
    total_return_pct: float
    sharpe_ratio: float
    avg_hold_days: float
    best_trade_pct: float
    worst_trade_pct: float
    consecutive_wins: int
    consecutive_losses: int
    monthly_returns: Dict[str, float]  # "YYYY-MM" -> return %


@dataclass
class VirtualTrader:
    """A virtual trader profile with strategy and performance."""
    trader_id: str
    display_name: str
    avatar_seed: str  # For generating a consistent avatar
    strategy_name: str
    strategy_description: str
    risk_level: str  # "Conservative", "Moderate", "Aggressive"
    markets: List[str]  # ["Stocks", "Options", "Crypto"]
    since_date: str  # When they started trading
    followers_count: int
    copiers_count: int
    portfolio_size: float  # Virtual portfolio value
    performance: TraderPerformance
    recent_trades: List[Trade]
    open_positions: List[Trade]
    rank: int  # Leaderboard position
    badges: List[str]  # Achievement badges


@dataclass
class CopyPosition:
    """A position copied from a trader."""
    original_trade: Trade
    copy_amount: float  # Amount allocated to this copy
    copy_shares: int
    current_pnl: float
    current_pnl_pct: float
    status: str


@dataclass
class CopyPortfolio:
    """A user's copy trading portfolio."""
    portfolio_id: str
    total_balance: float
    allocated_amount: float
    available_amount: float
    total_pnl: float
    total_pnl_pct: float
    followed_traders: List[str]  # Trader IDs
    active_copies: List[CopyPosition]
    closed_copies: List[CopyPosition]
    started_date: str


@dataclass
class CopyTradingResult:
    """Complete copy trading data."""
    top_traders: List[VirtualTrader]
    total_traders: int
    leaderboard_period: str  # "1M", "3M", "1Y", "All"
    categories: List[str]
    summary: str


# Strategy templates
_STRATEGIES = [
    {
        "name": "Momentum Rider",
        "description": "Trades high-momentum stocks with breakout entries. Holds 2-5 days.",
        "risk": "Aggressive",
        "markets": ["Stocks"],
        "base_win_rate": 0.55,
        "avg_hold": 3,
    },
    {
        "name": "Value Hunter",
        "description": "Finds undervalued stocks using fundamental analysis. Holds 2-8 weeks.",
        "risk": "Moderate",
        "markets": ["Stocks"],
        "base_win_rate": 0.62,
        "avg_hold": 25,
    },
    {
        "name": "Swing Trader Pro",
        "description": "Technical analysis swing trades on large caps. Holds 3-10 days.",
        "risk": "Moderate",
        "markets": ["Stocks"],
        "base_win_rate": 0.58,
        "avg_hold": 6,
    },
    {
        "name": "Options Wheel",
        "description": "Sells cash-secured puts and covered calls for premium income.",
        "risk": "Conservative",
        "markets": ["Stocks", "Options"],
        "base_win_rate": 0.75,
        "avg_hold": 20,
    },
    {
        "name": "Mean Reversion",
        "description": "Buys oversold stocks and sells overbought ones. Short holding period.",
        "risk": "Moderate",
        "markets": ["Stocks"],
        "base_win_rate": 0.60,
        "avg_hold": 4,
    },
    {
        "name": "Trend Follower",
        "description": "Follows established trends with trailing stops. Lets winners run.",
        "risk": "Moderate",
        "markets": ["Stocks"],
        "base_win_rate": 0.45,
        "avg_hold": 15,
    },
    {
        "name": "Dividend Sniper",
        "description": "Targets high-dividend stocks before ex-dates. Income focused.",
        "risk": "Conservative",
        "markets": ["Stocks"],
        "base_win_rate": 0.70,
        "avg_hold": 30,
    },
    {
        "name": "Gap Hunter",
        "description": "Trades gap-ups and gap-downs at market open. Quick scalps.",
        "risk": "Aggressive",
        "markets": ["Stocks"],
        "base_win_rate": 0.52,
        "avg_hold": 1,
    },
    {
        "name": "Sector Rotator",
        "description": "Rotates between hot sectors using relative strength.",
        "risk": "Moderate",
        "markets": ["Stocks"],
        "base_win_rate": 0.56,
        "avg_hold": 12,
    },
    {
        "name": "Earnings Player",
        "description": "Takes positions before/after earnings based on options pricing.",
        "risk": "Aggressive",
        "markets": ["Stocks", "Options"],
        "base_win_rate": 0.50,
        "avg_hold": 5,
    },
]

_DISPLAY_NAMES = [
    "AlphaTrader", "WallStreetWiz", "TradingMaster", "ProfitHunter",
    "StockSensei", "MarketMaven", "BullRunner", "SwingKing",
    "ValueSeeker", "MomentumPro", "OptionsGuru", "DividendDuke",
    "TechTrader", "QuantWizard", "RiskManager", "TrendRider",
    "PatientCapital", "AgileTrader", "SmartFlow", "EliteTrader",
]

_SYMBOLS = [
    "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA",
    "AMD", "NFLX", "CRM", "SHOP", "SQ", "ROKU", "PLTR",
    "JPM", "BAC", "GS", "XOM", "CVX", "DIS",
]


def _symbol_seed(text: str) -> int:
    """Generate a deterministic seed from text."""
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


def _generate_trades(
    trader_id: str,
    strategy: dict,
    num_trades: int = 30,
    portfolio_size: float = 100000.0,
) -> List[Trade]:
    """Generate synthetic trade history for a virtual trader.

    Args:
        trader_id: Unique trader identifier.
        strategy: Strategy configuration dict.
        num_trades: Number of trades to generate.
        portfolio_size: Portfolio size for position sizing.

    Returns:
        List of trades sorted by date.
    """
    seed = _symbol_seed(trader_id)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    trades: List[Trade] = []
    today = datetime.now()
    win_rate = strategy["base_win_rate"]
    avg_hold = strategy["avg_hold"]

    for i in range(num_trades):
        symbol = rng.choice(_SYMBOLS)
        direction = "Long" if rng.random() > 0.2 else "Short"
        days_ago = rng.randint(1, 180)
        entry_date = today - timedelta(days=days_ago)

        # Entry price
        base_price = 50 + _symbol_seed(symbol) % 400
        entry_price = round(base_price * (1 + np_rng.normal(0, 0.1)), 2)

        # Position size (2-5% of portfolio)
        position_pct = np_rng.uniform(0.02, 0.05)
        position_value = portfolio_size * position_pct
        quantity = max(1, int(position_value / entry_price))

        # Win or loss
        is_winner = rng.random() < win_rate
        hold_days = max(1, int(np_rng.normal(avg_hold, avg_hold * 0.3)))

        if is_winner:
            pnl_pct = abs(np_rng.normal(3, 2))  # Avg 3% win
        else:
            pnl_pct = -abs(np_rng.normal(2, 1.5))  # Avg 2% loss

        if direction == "Short":
            pnl_pct = -pnl_pct if is_winner else abs(pnl_pct)
            exit_price = round(entry_price * (1 - pnl_pct / 100), 2)
        else:
            exit_price = round(entry_price * (1 + pnl_pct / 100), 2)

        pnl = round((exit_price - entry_price) * quantity if direction == "Long"
                    else (entry_price - exit_price) * quantity, 2)

        # Stop loss and take profit
        stop_pct = np_rng.uniform(0.02, 0.05)
        tp_pct = np_rng.uniform(0.04, 0.10)

        if direction == "Long":
            stop_loss = round(entry_price * (1 - stop_pct), 2)
            take_profit = round(entry_price * (1 + tp_pct), 2)
        else:
            stop_loss = round(entry_price * (1 + stop_pct), 2)
            take_profit = round(entry_price * (1 - tp_pct), 2)

        # Status
        is_open = days_ago < hold_days + 1 and i < 3
        exit_date_val = entry_date + timedelta(days=hold_days)

        if pnl_pct < -stop_pct * 100:
            status = "Stopped Out"
        elif is_open:
            status = "Open"
            exit_price = None
            exit_date_val = None
            pnl = round((base_price * 1.01 - entry_price) * quantity, 2)
            pnl_pct = round(pnl / (entry_price * quantity) * 100, 2)
        else:
            status = "Closed"

        trades.append(Trade(
            trade_id=f"{trader_id}_t{i:03d}",
            symbol=symbol,
            direction=direction,
            entry_price=entry_price,
            exit_price=exit_price,
            entry_date=entry_date.strftime("%Y-%m-%d"),
            exit_date=exit_date_val.strftime("%Y-%m-%d") if exit_date_val else None,
            quantity=quantity,
            pnl=pnl,
            pnl_pct=round(pnl_pct, 2),
            status=status,
            stop_loss=stop_loss,
            take_profit=take_profit,
            hold_duration_days=hold_days if status != "Open" else None,
        ))

    trades.sort(key=lambda t: t.entry_date, reverse=True)
    return trades


def _compute_performance(trades: List[Trade]) -> TraderPerformance:
    """Compute performance metrics from trade history.

    Args:
        trades: List of completed trades.

    Returns:
        TraderPerformance metrics.
    """
    closed = [t for t in trades if t.status != "Open"]
    if not closed:
        return TraderPerformance(
            total_trades=0, winning_trades=0, losing_trades=0,
            win_rate=0, avg_win_pct=0, avg_loss_pct=0,
            profit_factor=0, max_drawdown_pct=0, total_return_pct=0,
            sharpe_ratio=0, avg_hold_days=0, best_trade_pct=0,
            worst_trade_pct=0, consecutive_wins=0, consecutive_losses=0,
            monthly_returns={},
        )

    winners = [t for t in closed if t.pnl > 0]
    losers = [t for t in closed if t.pnl <= 0]

    win_rate = len(winners) / len(closed) * 100
    avg_win = np.mean([t.pnl_pct for t in winners]) if winners else 0
    avg_loss = np.mean([abs(t.pnl_pct) for t in losers]) if losers else 0

    gross_profit = sum(t.pnl for t in winners)
    gross_loss = abs(sum(t.pnl for t in losers)) or 1
    profit_factor = round(gross_profit / gross_loss, 2)

    # Max drawdown (simplified)
    cumulative_pnl = np.cumsum([t.pnl_pct for t in sorted(closed, key=lambda t: t.entry_date)])
    peak = np.maximum.accumulate(cumulative_pnl)
    drawdown = cumulative_pnl - peak
    max_dd = float(np.min(drawdown)) if len(drawdown) > 0 else 0

    total_return = float(np.sum([t.pnl_pct for t in closed]))
    returns_array = np.array([t.pnl_pct for t in closed])
    sharpe = float(np.mean(returns_array) / np.std(returns_array) * np.sqrt(252)) if np.std(returns_array) > 0 else 0

    # Consecutive wins/losses
    max_consec_wins = 0
    max_consec_losses = 0
    current_streak = 0
    for t in sorted(closed, key=lambda x: x.entry_date):
        if t.pnl > 0:
            if current_streak > 0:
                current_streak += 1
            else:
                current_streak = 1
            max_consec_wins = max(max_consec_wins, current_streak)
        else:
            if current_streak < 0:
                current_streak -= 1
            else:
                current_streak = -1
            max_consec_losses = max(max_consec_losses, abs(current_streak))

    # Monthly returns
    monthly_returns: Dict[str, float] = {}
    for t in closed:
        month_key = t.entry_date[:7]
        monthly_returns[month_key] = monthly_returns.get(month_key, 0) + t.pnl_pct

    avg_hold = np.mean([t.hold_duration_days for t in closed if t.hold_duration_days]) if closed else 0

    return TraderPerformance(
        total_trades=len(closed),
        winning_trades=len(winners),
        losing_trades=len(losers),
        win_rate=round(win_rate, 1),
        avg_win_pct=round(float(avg_win), 2),
        avg_loss_pct=round(float(avg_loss), 2),
        profit_factor=profit_factor,
        max_drawdown_pct=round(max_dd, 2),
        total_return_pct=round(total_return, 2),
        sharpe_ratio=round(sharpe, 2),
        avg_hold_days=round(float(avg_hold), 1),
        best_trade_pct=round(float(max(t.pnl_pct for t in closed)), 2),
        worst_trade_pct=round(float(min(t.pnl_pct for t in closed)), 2),
        consecutive_wins=max_consec_wins,
        consecutive_losses=max_consec_losses,
        monthly_returns={k: round(v, 2) for k, v in sorted(monthly_returns.items())},
    )


def get_top_traders(
    num_traders: int = 10,
    sort_by: str = "return",  # "return", "win_rate", "sharpe", "followers"
    risk_filter: Optional[str] = None,
) -> CopyTradingResult:
    """Get leaderboard of top virtual traders.

    Args:
        num_traders: Number of traders to return.
        sort_by: Sorting criterion.
        risk_filter: Filter by risk level.

    Returns:
        CopyTradingResult with trader leaderboard.
    """
    rng = random.Random(42)
    np_rng = np.random.default_rng(42)

    traders: List[VirtualTrader] = []

    for i in range(min(num_traders * 2, 20)):
        strategy = _STRATEGIES[i % len(_STRATEGIES)]
        
        if risk_filter and strategy["risk"] != risk_filter:
            continue

        trader_id = f"trader_{i:03d}"
        display_name = _DISPLAY_NAMES[i % len(_DISPLAY_NAMES)]
        if i >= len(_DISPLAY_NAMES):
            display_name += str(i)

        # Generate trades
        portfolio_size = np_rng.uniform(50000, 500000)
        trades = _generate_trades(trader_id, strategy, num_trades=30, portfolio_size=portfolio_size)
        performance = _compute_performance(trades)

        # Followers/copiers
        followers = rng.randint(100, 10000)
        copiers = rng.randint(10, min(followers, 500))

        # Since date
        months_active = rng.randint(6, 36)
        since = datetime.now() - timedelta(days=months_active * 30)

        # Badges
        badges = []
        if performance.win_rate > 65:
            badges.append("High Win Rate")
        if performance.total_return_pct > 50:
            badges.append("Top Performer")
        if months_active > 24:
            badges.append("Veteran")
        if performance.max_drawdown_pct > -10:
            badges.append("Risk Manager")
        if copiers > 200:
            badges.append("Popular")

        open_positions = [t for t in trades if t.status == "Open"]
        recent_closed = [t for t in trades if t.status != "Open"][:10]

        traders.append(VirtualTrader(
            trader_id=trader_id,
            display_name=display_name,
            avatar_seed=hashlib.md5(trader_id.encode()).hexdigest()[:8],
            strategy_name=strategy["name"],
            strategy_description=strategy["description"],
            risk_level=strategy["risk"],
            markets=strategy["markets"],
            since_date=since.strftime("%Y-%m-%d"),
            followers_count=followers,
            copiers_count=copiers,
            portfolio_size=round(portfolio_size, 2),
            performance=performance,
            recent_trades=recent_closed[:5],
            open_positions=open_positions,
            rank=0,  # Will be set after sorting
            badges=badges,
        ))

    # Sort traders
    if sort_by == "return":
        traders.sort(key=lambda t: t.performance.total_return_pct, reverse=True)
    elif sort_by == "win_rate":
        traders.sort(key=lambda t: t.performance.win_rate, reverse=True)
    elif sort_by == "sharpe":
        traders.sort(key=lambda t: t.performance.sharpe_ratio, reverse=True)
    elif sort_by == "followers":
        traders.sort(key=lambda t: t.followers_count, reverse=True)

    # Assign ranks
    for i, trader in enumerate(traders):
        trader.rank = i + 1

    # Limit to requested count
    traders = traders[:num_traders]

    categories = ["All", "Stocks", "Options", "Conservative", "Moderate", "Aggressive"]
    
    if traders:
        best = traders[0]
        summary = (
            f"Top {len(traders)} traders by {sort_by}. "
            f"#1: {best.display_name} ({best.strategy_name}) - "
            f"{best.performance.total_return_pct:.1f}% return, "
            f"{best.performance.win_rate:.0f}% win rate, "
            f"{best.copiers_count} copiers."
        )
    else:
        summary = "No traders found matching criteria."

    return CopyTradingResult(
        top_traders=traders,
        total_traders=len(traders),
        leaderboard_period="3M",
        categories=categories,
        summary=summary,
    )


def simulate_copy(
    trader_id: str,
    allocation: float = 10000.0,
    days: int = 30,
) -> CopyPortfolio:
    """Simulate copying a trader's trades with paper money.

    Args:
        trader_id: ID of the trader to copy.
        allocation: Amount to allocate for copying.
        days: Number of days to simulate.

    Returns:
        CopyPortfolio with simulated results.
    """
    seed = _symbol_seed(trader_id)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    # Get trader's strategy
    strategy_idx = seed % len(_STRATEGIES)
    strategy = _STRATEGIES[strategy_idx]

    trades = _generate_trades(trader_id, strategy, num_trades=10, portfolio_size=allocation)

    # Create copy positions
    active_copies: List[CopyPosition] = []
    closed_copies: List[CopyPosition] = []

    total_pnl = 0.0
    for trade in trades[:8]:  # Copy last 8 trades
        # Proportional sizing
        trade_allocation = allocation * np_rng.uniform(0.05, 0.15)
        copy_shares = max(1, int(trade_allocation / trade.entry_price))

        if trade.status == "Open":
            current_price = trade.entry_price * (1 + np_rng.normal(0.01, 0.03))
            copy_pnl = (current_price - trade.entry_price) * copy_shares
            copy_pnl_pct = (current_price - trade.entry_price) / trade.entry_price * 100
            active_copies.append(CopyPosition(
                original_trade=trade,
                copy_amount=round(trade_allocation, 2),
                copy_shares=copy_shares,
                current_pnl=round(copy_pnl, 2),
                current_pnl_pct=round(copy_pnl_pct, 2),
                status="Active",
            ))
        else:
            copy_pnl = trade.pnl_pct / 100 * trade_allocation
            closed_copies.append(CopyPosition(
                original_trade=trade,
                copy_amount=round(trade_allocation, 2),
                copy_shares=copy_shares,
                current_pnl=round(copy_pnl, 2),
                current_pnl_pct=trade.pnl_pct,
                status="Closed",
            ))

        total_pnl += copy_pnl if trade.status == "Open" else copy_pnl

    allocated = sum(c.copy_amount for c in active_copies)
    total_pnl_pct = total_pnl / allocation * 100

    today = datetime.now()
    started = today - timedelta(days=days)

    return CopyPortfolio(
        portfolio_id=f"cp_{trader_id}_{seed % 1000:03d}",
        total_balance=round(allocation + total_pnl, 2),
        allocated_amount=round(allocated, 2),
        available_amount=round(allocation - allocated, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        followed_traders=[trader_id],
        active_copies=active_copies,
        closed_copies=closed_copies,
        started_date=started.strftime("%Y-%m-%d"),
    )
