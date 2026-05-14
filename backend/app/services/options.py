"""Options Chain & Greeks calculation service.

Computes Black-Scholes Greeks (Delta, Gamma, Theta, Vega, Rho)
and generates synthetic options chain data.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import math

import numpy as np


def _norm_cdf(x: float) -> float:
    """Standard normal CDF approximation."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    """Standard normal PDF."""
    return (1.0 / math.sqrt(2.0 * math.pi)) * math.exp(-0.5 * x * x)


@dataclass
class Greeks:
    """Option Greeks."""
    delta: float
    gamma: float
    theta: float  # per day
    vega: float  # per 1% IV change
    rho: float


@dataclass
class OptionContract:
    """Single option contract."""
    strike: float
    expiry_days: int
    option_type: str  # "call" or "put"
    price: float
    bid: float
    ask: float
    iv: float  # implied volatility
    volume: int
    open_interest: int
    greeks: Greeks
    itm: bool
    moneyness: str  # "ITM", "ATM", "OTM"


@dataclass
class OptionsChain:
    """Full options chain for a symbol."""
    symbol: str
    stock_price: float
    expiry_days: int
    risk_free_rate: float
    calls: List[OptionContract]
    puts: List[OptionContract]
    max_pain: float
    put_call_ratio: float
    iv_rank: float  # 0-100


def black_scholes(S: float, K: float, T: float, r: float, sigma: float, option_type: str = "call") -> float:
    """Black-Scholes option pricing."""
    if T <= 0 or sigma <= 0:
        if option_type == "call":
            return max(S - K, 0)
        else:
            return max(K - S, 0)

    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if option_type == "call":
        return S * _norm_cdf(d1) - K * math.exp(-r * T) * _norm_cdf(d2)
    else:
        return K * math.exp(-r * T) * _norm_cdf(-d2) - S * _norm_cdf(-d1)


def compute_greeks(S: float, K: float, T: float, r: float, sigma: float, option_type: str = "call") -> Greeks:
    """Compute all Greeks for an option."""
    if T <= 0 or sigma <= 0:
        return Greeks(delta=0, gamma=0, theta=0, vega=0, rho=0)

    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    # Delta
    if option_type == "call":
        delta = _norm_cdf(d1)
    else:
        delta = _norm_cdf(d1) - 1.0

    # Gamma (same for call and put)
    gamma = _norm_pdf(d1) / (S * sigma * sqrt_T)

    # Theta (per day)
    term1 = -(S * _norm_pdf(d1) * sigma) / (2 * sqrt_T)
    if option_type == "call":
        term2 = -r * K * math.exp(-r * T) * _norm_cdf(d2)
        theta = (term1 + term2) / 365.0
    else:
        term2 = r * K * math.exp(-r * T) * _norm_cdf(-d2)
        theta = (term1 + term2) / 365.0

    # Vega (per 1% move in IV)
    vega = S * sqrt_T * _norm_pdf(d1) / 100.0

    # Rho
    if option_type == "call":
        rho = K * T * math.exp(-r * T) * _norm_cdf(d2) / 100.0
    else:
        rho = -K * T * math.exp(-r * T) * _norm_cdf(-d2) / 100.0

    return Greeks(
        delta=round(delta, 4),
        gamma=round(gamma, 6),
        theta=round(theta, 4),
        vega=round(vega, 4),
        rho=round(rho, 4),
    )


def generate_options_chain(
    stock_price: float,
    symbol: str,
    historical_volatility: float = 0.30,
    expiry_days: int = 30,
    risk_free_rate: float = 0.05,
) -> OptionsChain:
    """Generate synthetic options chain with Greeks."""
    T = expiry_days / 365.0

    # Generate strikes around current price (±20%)
    strike_min = stock_price * 0.80
    strike_max = stock_price * 1.20
    step = stock_price * 0.025  # 2.5% increments
    strikes = np.arange(strike_min, strike_max + step, step)

    # IV smile: higher IV for OTM options
    base_iv = historical_volatility

    calls = []
    puts = []
    total_call_oi = 0
    total_put_oi = 0

    for K in strikes:
        K = round(float(K), 2)
        moneyness_ratio = K / stock_price

        # IV skew/smile
        skew = abs(moneyness_ratio - 1.0) * 0.5
        iv = base_iv * (1.0 + skew)

        # Compute prices
        call_price = black_scholes(stock_price, K, T, risk_free_rate, iv, "call")
        put_price = black_scholes(stock_price, K, T, risk_free_rate, iv, "put")

        # Greeks
        call_greeks = compute_greeks(stock_price, K, T, risk_free_rate, iv, "call")
        put_greeks = compute_greeks(stock_price, K, T, risk_free_rate, iv, "put")

        # Synthetic volume/OI (higher near ATM)
        atm_factor = max(0.1, 1.0 - abs(moneyness_ratio - 1.0) * 5)
        call_vol = int(500 * atm_factor * np.random.uniform(0.5, 1.5))
        put_vol = int(400 * atm_factor * np.random.uniform(0.5, 1.5))
        call_oi = int(2000 * atm_factor * np.random.uniform(0.5, 2.0))
        put_oi = int(1800 * atm_factor * np.random.uniform(0.5, 2.0))
        total_call_oi += call_oi
        total_put_oi += put_oi

        # Bid/Ask spread
        spread = max(0.01, call_price * 0.03)

        # Moneyness label
        if abs(moneyness_ratio - 1.0) < 0.025:
            moneyness = "ATM"
        elif moneyness_ratio < 1.0:
            moneyness = "ITM"  # call ITM when K < S
        else:
            moneyness = "OTM"

        calls.append(OptionContract(
            strike=K,
            expiry_days=expiry_days,
            option_type="call",
            price=round(call_price, 2),
            bid=round(max(0, call_price - spread / 2), 2),
            ask=round(call_price + spread / 2, 2),
            iv=round(iv * 100, 1),
            volume=call_vol,
            open_interest=call_oi,
            greeks=call_greeks,
            itm=K < stock_price,
            moneyness=moneyness,
        ))

        # Put moneyness is opposite
        put_moneyness = "ATM" if moneyness == "ATM" else ("ITM" if moneyness == "OTM" else "OTM")

        puts.append(OptionContract(
            strike=K,
            expiry_days=expiry_days,
            option_type="put",
            price=round(put_price, 2),
            bid=round(max(0, put_price - spread / 2), 2),
            ask=round(put_price + spread / 2, 2),
            iv=round(iv * 100, 1),
            volume=put_vol,
            open_interest=put_oi,
            greeks=put_greeks,
            itm=K > stock_price,
            moneyness=put_moneyness,
        ))

    # Max pain: strike where total option value (for writers) is minimized
    max_pain_strike = stock_price  # simplified
    min_pain = float("inf")
    for K in strikes:
        pain = 0
        for c in calls:
            if stock_price > c.strike:
                pain += (stock_price - c.strike) * c.open_interest
        for p in puts:
            if stock_price < p.strike:
                pain += (p.strike - stock_price) * p.open_interest
        if pain < min_pain:
            min_pain = pain
            max_pain_strike = float(K)

    # Put/Call ratio
    pcr = total_put_oi / total_call_oi if total_call_oi > 0 else 1.0

    # IV Rank (synthetic, based on historical vol comparison)
    iv_rank = min(100, max(0, (base_iv - 0.15) / 0.50 * 100))

    return OptionsChain(
        symbol=symbol.upper(),
        stock_price=round(stock_price, 2),
        expiry_days=expiry_days,
        risk_free_rate=risk_free_rate,
        calls=calls,
        puts=puts,
        max_pain=round(max_pain_strike, 2),
        put_call_ratio=round(pcr, 2),
        iv_rank=round(iv_rank, 1),
    )
