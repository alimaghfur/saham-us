"""Unusual options activity detection service.

Identifies contracts with abnormal volume, large block trades,
and unusual put/call ratios. Generates synthetic unusual activity
alerts based on symbol characteristics.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np


@dataclass
class OptionsContract:
    """A single options contract with activity data."""
    symbol: str
    contract_type: str  # "Call" or "Put"
    strike: float
    expiration: str  # ISO date
    last_price: float
    bid: float
    ask: float
    volume: int
    open_interest: int
    implied_volatility: float
    delta: float
    gamma: float
    theta: float
    vega: float


@dataclass
class UnusualActivity:
    """An unusual options activity alert."""
    symbol: str
    contract_type: str  # "Call" or "Put"
    strike: float
    expiration: str
    volume: int
    open_interest: int
    volume_oi_ratio: float
    avg_volume: int
    volume_multiple: float  # How many times above average
    premium_total: float  # Total premium paid
    implied_volatility: float
    sentiment: str  # "Bullish", "Bearish", "Neutral"
    trade_type: str  # "Sweep", "Block", "Split"
    alert_time: str  # ISO datetime
    description: str


@dataclass
class UnusualOptionsReport:
    """Complete unusual options report for a symbol."""
    symbol: str
    timestamp: str
    put_call_ratio: float
    total_call_volume: int
    total_put_volume: int
    total_call_oi: int
    total_put_oi: int
    iv_rank: float  # 0-100 percentile
    iv_percentile: float
    unusual_activities: List[UnusualActivity]
    largest_trades: List[UnusualActivity]
    bullish_flow_pct: float
    bearish_flow_pct: float
    net_premium: float  # Positive = bullish premium, negative = bearish
    summary: str


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def generate_options_chain(
    symbol: str,
    current_price: float = 150.0,
    num_expirations: int = 4,
    strikes_per_exp: int = 10,
) -> List[OptionsContract]:
    """Generate a synthetic options chain for a symbol.

    Args:
        symbol: Stock ticker.
        current_price: Current underlying price.
        num_expirations: Number of expiration dates to generate.
        strikes_per_exp: Number of strike prices per expiration.

    Returns:
        List of OptionsContract objects.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    contracts: List[OptionsContract] = []
    today = datetime.now()

    # Generate expiration dates (weekly/monthly)
    expirations = []
    for i in range(num_expirations):
        days_ahead = (i + 1) * 7 if i < 2 else (i - 1) * 30 + 14
        exp_date = today + timedelta(days=days_ahead)
        # Align to Friday
        days_to_friday = (4 - exp_date.weekday()) % 7
        exp_date += timedelta(days=days_to_friday)
        expirations.append(exp_date.strftime("%Y-%m-%d"))

    for exp in expirations:
        # Generate strikes around current price
        strike_step = max(1.0, round(current_price * 0.025, 0))
        center_strike = round(current_price / strike_step) * strike_step
        strikes = [center_strike + (i - strikes_per_exp // 2) * strike_step
                   for i in range(strikes_per_exp)]

        days_to_exp = max(1, (datetime.strptime(exp, "%Y-%m-%d") - today).days)

        for strike in strikes:
            for contract_type in ["Call", "Put"]:
                # Simplified Black-Scholes-like pricing
                moneyness = (current_price - strike) / current_price
                if contract_type == "Put":
                    moneyness = -moneyness

                base_iv = 0.25 + abs(moneyness) * 0.3 + np_rng.normal(0, 0.02)
                base_iv = max(0.1, min(1.5, base_iv))

                time_value = base_iv * current_price * np.sqrt(days_to_exp / 365)
                intrinsic = max(0, (current_price - strike) if contract_type == "Call"
                               else (strike - current_price))
                price = max(0.01, round(intrinsic + time_value * 0.3, 2))

                spread = max(0.01, round(price * rng.uniform(0.02, 0.08), 2))
                bid = round(max(0.01, price - spread / 2), 2)
                ask = round(price + spread / 2, 2)

                # Volume and OI
                atm_factor = max(0.1, 1 - abs(moneyness) * 5)
                base_volume = int(atm_factor * rng.randint(100, 5000))
                oi = int(atm_factor * rng.randint(500, 20000))

                # Greeks (simplified)
                delta = 0.5 + moneyness * 2 if contract_type == "Call" else -0.5 + moneyness * 2
                delta = max(-1.0, min(1.0, delta))
                gamma = max(0, 0.05 * atm_factor)
                theta = -price * 0.01 * (30 / max(1, days_to_exp))
                vega = price * 0.1 * np.sqrt(days_to_exp / 365)

                contracts.append(OptionsContract(
                    symbol=symbol,
                    contract_type=contract_type,
                    strike=strike,
                    expiration=exp,
                    last_price=price,
                    bid=bid,
                    ask=ask,
                    volume=base_volume,
                    open_interest=oi,
                    implied_volatility=round(base_iv, 4),
                    delta=round(delta, 4),
                    gamma=round(gamma, 4),
                    theta=round(theta, 4),
                    vega=round(vega, 4),
                ))

    return contracts


def detect_unusual_activity(
    symbol: str,
    current_price: float = 150.0,
    volume_threshold: float = 5.0,
    min_premium: float = 50000.0,
) -> UnusualOptionsReport:
    """Detect unusual options activity for a symbol.

    Identifies contracts where volume significantly exceeds average,
    large block trades, and unusual put/call imbalances.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price.
        volume_threshold: Minimum volume multiple to flag (default 5x).
        min_premium: Minimum total premium ($) to consider as large trade.

    Returns:
        UnusualOptionsReport with all detected anomalies.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed + 42)
    np_rng = np.random.default_rng(seed + 42)

    chain = generate_options_chain(symbol, current_price)

    # Inject some unusual activity
    unusual_activities: List[UnusualActivity] = []
    today = datetime.now()
    num_unusual = rng.randint(3, 8)

    total_call_volume = 0
    total_put_volume = 0
    total_call_oi = 0
    total_put_oi = 0

    for contract in chain:
        if contract.contract_type == "Call":
            total_call_volume += contract.volume
            total_call_oi += contract.open_interest
        else:
            total_put_volume += contract.volume
            total_put_oi += contract.open_interest

    # Generate unusual trades
    for i in range(num_unusual):
        contract = rng.choice(chain)
        volume_multiple = rng.uniform(volume_threshold, 20.0)
        unusual_volume = int(contract.volume * volume_multiple)
        avg_vol = max(1, contract.volume)
        premium = round(unusual_volume * contract.last_price * 100, 2)

        # Determine trade type
        if unusual_volume > 5000:
            trade_type = "Block"
        elif rng.random() > 0.5:
            trade_type = "Sweep"
        else:
            trade_type = "Split"

        # Sentiment
        if contract.contract_type == "Call":
            sentiment = "Bullish"
        elif contract.contract_type == "Put":
            sentiment = "Bearish"
        else:
            sentiment = "Neutral"

        # Alert time within trading hours today
        hour = rng.randint(9, 15)
        minute = rng.randint(0, 59)
        alert_time = today.replace(hour=hour, minute=minute, second=0)

        desc = (
            f"{trade_type} of {unusual_volume:,} {contract.contract_type}s "
            f"at ${contract.strike} exp {contract.expiration} "
            f"for ${premium:,.0f} premium ({volume_multiple:.1f}x avg volume)"
        )

        unusual_activities.append(UnusualActivity(
            symbol=symbol,
            contract_type=contract.contract_type,
            strike=contract.strike,
            expiration=contract.expiration,
            volume=unusual_volume,
            open_interest=contract.open_interest,
            volume_oi_ratio=round(unusual_volume / max(1, contract.open_interest), 2),
            avg_volume=avg_vol,
            volume_multiple=round(volume_multiple, 2),
            premium_total=premium,
            implied_volatility=contract.implied_volatility,
            sentiment=sentiment,
            trade_type=trade_type,
            alert_time=alert_time.strftime("%Y-%m-%dT%H:%M:%S"),
            description=desc,
        ))

    # Sort by premium
    unusual_activities.sort(key=lambda u: u.premium_total, reverse=True)
    largest_trades = unusual_activities[:3]

    # Compute metrics
    put_call_ratio = round(total_put_volume / max(1, total_call_volume), 3)
    bullish_flow = sum(1 for u in unusual_activities if u.sentiment == "Bullish")
    bearish_flow = sum(1 for u in unusual_activities if u.sentiment == "Bearish")
    total_flow = max(1, len(unusual_activities))

    bullish_pct = round(bullish_flow / total_flow * 100, 1)
    bearish_pct = round(bearish_flow / total_flow * 100, 1)

    net_premium = sum(
        u.premium_total if u.sentiment == "Bullish" else -u.premium_total
        for u in unusual_activities
    )

    # IV rank (simulated)
    iv_rank = round(np_rng.uniform(20, 85), 1)
    iv_percentile = round(np_rng.uniform(15, 90), 1)

    # Summary
    dominant = "bullish" if bullish_pct > bearish_pct else "bearish"
    summary = (
        f"Detected {len(unusual_activities)} unusual options activities for {symbol}. "
        f"Flow is predominantly {dominant} ({bullish_pct}% bullish / {bearish_pct}% bearish). "
        f"Put/Call ratio: {put_call_ratio:.2f}. IV Rank: {iv_rank:.0f}%."
    )

    return UnusualOptionsReport(
        symbol=symbol,
        timestamp=today.strftime("%Y-%m-%dT%H:%M:%S"),
        put_call_ratio=put_call_ratio,
        total_call_volume=total_call_volume,
        total_put_volume=total_put_volume,
        total_call_oi=total_call_oi,
        total_put_oi=total_put_oi,
        iv_rank=iv_rank,
        iv_percentile=iv_percentile,
        unusual_activities=unusual_activities,
        largest_trades=largest_trades,
        bullish_flow_pct=bullish_pct,
        bearish_flow_pct=bearish_pct,
        net_premium=round(net_premium, 2),
        summary=summary,
    )
