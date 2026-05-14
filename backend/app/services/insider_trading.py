"""Insider trading simulation service.

Generates synthetic insider transaction data for any given stock symbol.
No external API calls - all data is deterministically generated based on
symbol hash and price context.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np


@dataclass
class InsiderTransaction:
    """A single insider transaction record."""
    insider_name: str
    title: str  # CEO, CFO, COO, VP, Director, etc.
    transaction_type: str  # "Buy" or "Sell"
    shares: int
    price: float
    total_value: float
    date: str  # ISO date
    filing_date: str  # SEC filing date (1-2 days after transaction)
    ownership_type: str  # "Direct" or "Indirect"
    shares_owned_after: int


@dataclass
class InsiderSignal:
    """Aggregated insider trading signal for a symbol."""
    symbol: str
    signal_strength: float  # -1.0 (bearish/selling) to 1.0 (bullish/buying)
    signal_label: str  # "Strong Buy", "Buy", "Neutral", "Sell", "Strong Sell"
    net_shares_30d: int  # Net shares bought/sold in last 30 days
    net_value_30d: float  # Net $ value in last 30 days
    buy_count_90d: int
    sell_count_90d: int
    total_transactions: int
    notable_transactions: List[InsiderTransaction]
    cluster_buy: bool  # Multiple insiders buying within short period
    summary: str


# Common executive names for simulation
_FIRST_NAMES = [
    "James", "Robert", "Michael", "William", "David", "Richard", "Joseph",
    "Thomas", "Charles", "Christopher", "Sarah", "Jennifer", "Lisa", "Karen",
    "Nancy", "Margaret", "Susan", "Patricia", "Linda", "Elizabeth"
]

_LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas",
    "Jackson", "White", "Harris", "Martin", "Thompson", "Robinson", "Clark"
]

_TITLES = [
    ("CEO", "Chief Executive Officer"),
    ("CFO", "Chief Financial Officer"),
    ("COO", "Chief Operating Officer"),
    ("CTO", "Chief Technology Officer"),
    ("VP Sales", "Vice President of Sales"),
    ("VP Engineering", "Vice President of Engineering"),
    ("Director", "Board Director"),
    ("Director", "Independent Director"),
    ("SVP", "Senior Vice President"),
    ("General Counsel", "General Counsel"),
]


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def generate_insider_transactions(
    symbol: str,
    current_price: float = 150.0,
    days_back: int = 90,
    num_transactions: Optional[int] = None,
) -> List[InsiderTransaction]:
    """Generate synthetic insider transactions for a stock.

    Args:
        symbol: Stock ticker symbol.
        current_price: Current stock price for realistic transaction sizing.
        days_back: How far back to generate transactions.
        num_transactions: Number of transactions to generate. If None, random 5-15.

    Returns:
        List of InsiderTransaction sorted by date descending.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    if num_transactions is None:
        num_transactions = rng.randint(5, 15)

    # Generate a set of insiders for this company
    num_insiders = min(num_transactions, len(_TITLES))
    insiders = []
    used_names = set()
    for i in range(num_insiders):
        while True:
            first = rng.choice(_FIRST_NAMES)
            last = rng.choice(_LAST_NAMES)
            name = f"{first} {last}"
            if name not in used_names:
                used_names.add(name)
                break
        title_short, title_full = _TITLES[i % len(_TITLES)]
        insiders.append((name, title_short))

    transactions: List[InsiderTransaction] = []
    today = datetime.now()

    for i in range(num_transactions):
        insider_name, title = rng.choice(insiders)
        days_ago = rng.randint(1, days_back)
        tx_date = today - timedelta(days=days_ago)
        filing_date = tx_date + timedelta(days=rng.randint(1, 2))

        # Price varies slightly from current (historical)
        price_variation = np_rng.normal(0, 0.05)
        tx_price = round(current_price * (1 + price_variation), 2)
        tx_price = max(tx_price, 1.0)

        # Determine buy vs sell (slight bias toward sells as is realistic)
        is_buy = rng.random() < 0.4

        # Transaction size based on title seniority
        if title in ("CEO", "CFO", "COO"):
            base_shares = rng.randint(5000, 50000)
        elif "VP" in title or "SVP" in title:
            base_shares = rng.randint(2000, 20000)
        else:
            base_shares = rng.randint(1000, 10000)

        shares = base_shares
        total_value = round(shares * tx_price, 2)

        # Shares owned after transaction
        base_ownership = rng.randint(50000, 500000)
        shares_owned_after = base_ownership + shares if is_buy else max(base_ownership - shares, 0)

        transactions.append(InsiderTransaction(
            insider_name=insider_name,
            title=title,
            transaction_type="Buy" if is_buy else "Sell",
            shares=shares,
            price=tx_price,
            total_value=total_value,
            date=tx_date.strftime("%Y-%m-%d"),
            filing_date=filing_date.strftime("%Y-%m-%d"),
            ownership_type="Direct" if rng.random() > 0.2 else "Indirect",
            shares_owned_after=shares_owned_after,
        ))

    # Sort by date descending
    transactions.sort(key=lambda t: t.date, reverse=True)
    return transactions


def compute_insider_signal(
    symbol: str,
    current_price: float = 150.0,
    days_back: int = 90,
) -> InsiderSignal:
    """Compute an aggregated insider trading signal for a symbol.

    Analyzes recent insider activity and returns a signal indicating
    whether insiders are net buying or selling.

    Args:
        symbol: Stock ticker symbol.
        current_price: Current stock price.
        days_back: Analysis window in days.

    Returns:
        InsiderSignal with aggregated metrics and signal strength.
    """
    transactions = generate_insider_transactions(
        symbol=symbol,
        current_price=current_price,
        days_back=days_back,
    )

    # Compute metrics
    today = datetime.now()
    cutoff_30d = (today - timedelta(days=30)).strftime("%Y-%m-%d")

    buys = [t for t in transactions if t.transaction_type == "Buy"]
    sells = [t for t in transactions if t.transaction_type == "Sell"]

    buys_30d = [t for t in buys if t.date >= cutoff_30d]
    sells_30d = [t for t in sells if t.date >= cutoff_30d]

    net_shares_30d = sum(t.shares for t in buys_30d) - sum(t.shares for t in sells_30d)
    net_value_30d = sum(t.total_value for t in buys_30d) - sum(t.total_value for t in sells_30d)

    # Signal strength calculation
    total_value = sum(t.total_value for t in transactions) or 1.0
    buy_value = sum(t.total_value for t in buys)
    buy_ratio = buy_value / total_value

    # Map to -1 to 1 scale
    signal_strength = round((buy_ratio - 0.5) * 2, 3)
    signal_strength = max(-1.0, min(1.0, signal_strength))

    # Cluster buy detection: 3+ different insiders buying within 14 days
    cluster_buy = False
    if len(buys) >= 3:
        buy_dates = sorted([datetime.strptime(t.date, "%Y-%m-%d") for t in buys])
        for i in range(len(buy_dates) - 2):
            if (buy_dates[i + 2] - buy_dates[i]).days <= 14:
                cluster_buy = True
                break

    # Signal label
    if signal_strength >= 0.5:
        signal_label = "Strong Buy"
    elif signal_strength >= 0.2:
        signal_label = "Buy"
    elif signal_strength <= -0.5:
        signal_label = "Strong Sell"
    elif signal_strength <= -0.2:
        signal_label = "Sell"
    else:
        signal_label = "Neutral"

    # Notable transactions (top 3 by value)
    notable = sorted(transactions, key=lambda t: t.total_value, reverse=True)[:3]

    # Generate summary
    summary_parts = []
    if cluster_buy:
        summary_parts.append("Cluster buying detected (multiple insiders buying in short period)")
    summary_parts.append(
        f"{len(buys)} buys vs {len(sells)} sells in {days_back} days"
    )
    if net_value_30d > 0:
        summary_parts.append(f"Net buying of ${abs(net_value_30d):,.0f} in last 30 days")
    else:
        summary_parts.append(f"Net selling of ${abs(net_value_30d):,.0f} in last 30 days")

    return InsiderSignal(
        symbol=symbol,
        signal_strength=signal_strength,
        signal_label=signal_label,
        net_shares_30d=net_shares_30d,
        net_value_30d=round(net_value_30d, 2),
        buy_count_90d=len(buys),
        sell_count_90d=len(sells),
        total_transactions=len(transactions),
        notable_transactions=notable,
        cluster_buy=cluster_buy,
        summary=". ".join(summary_parts),
    )
