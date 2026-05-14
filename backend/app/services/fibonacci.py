"""Fibonacci Retracement auto-detection service."""
from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd

from app.schemas.stock import OHLCV
from app.services.indicators import _to_dataframe


# Standard Fibonacci ratios
FIB_RATIOS = [0.0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
FIB_LABELS = ["0%", "23.6%", "38.2%", "50%", "61.8%", "78.6%", "100%"]


def _find_swing_points(high: pd.Series, low: pd.Series, window: int = 20) -> tuple:
    """Find significant swing high and swing low."""
    # Swing high: highest point in recent window
    swing_high_idx = high.rolling(window=window, center=True).apply(
        lambda x: x.argmax() == window // 2, raw=True
    )

    # Swing low: lowest point in recent window
    swing_low_idx = low.rolling(window=window, center=True).apply(
        lambda x: x.argmin() == window // 2, raw=True
    )

    # Get the most recent significant swing points
    # Use simple approach: highest high and lowest low in lookback
    lookback = min(len(high), 120)  # ~6 months

    recent_high = high.tail(lookback)
    recent_low = low.tail(lookback)

    swing_high = float(recent_high.max())
    swing_low = float(recent_low.min())

    # Determine which came first to identify trend
    high_idx = recent_high.idxmax()
    low_idx = recent_low.idxmin()

    return swing_high, swing_low, high_idx, low_idx


def compute_fibonacci_levels(candles: List[OHLCV], symbol: str) -> Dict:
    """Compute Fibonacci retracement levels for a stock."""
    df = _to_dataframe(candles)

    if df.empty or len(df) < 30:
        return {
            "symbol": symbol.upper(),
            "current_price": 0,
            "trend": "neutral",
            "swing_high": 0,
            "swing_low": 0,
            "levels": [],
            "nearest_support": 0,
            "nearest_resistance": 0,
        }

    current_price = float(df["close"].iloc[-1])
    swing_high, swing_low, high_idx, low_idx = _find_swing_points(df["high"], df["low"])

    # Determine trend: if high came after low, it's uptrend (retracement from high)
    # If low came after high, it's downtrend (retracement from low)
    if high_idx > low_idx:
        trend = "uptrend"
        # In uptrend, fib levels are measured from high to low (pullback levels)
        diff = swing_high - swing_low
        levels = []
        for ratio, label in zip(FIB_RATIOS, FIB_LABELS):
            price = swing_high - (diff * ratio)
            level_type = "support" if price < current_price else "resistance"
            levels.append({
                "level": label,
                "price": round(price, 2),
                "type": level_type,
            })
    else:
        trend = "downtrend"
        # In downtrend, fib levels measured from low to high (bounce levels)
        diff = swing_high - swing_low
        levels = []
        for ratio, label in zip(FIB_RATIOS, FIB_LABELS):
            price = swing_low + (diff * ratio)
            level_type = "support" if price < current_price else "resistance"
            levels.append({
                "level": label,
                "price": round(price, 2),
                "type": level_type,
            })

    # Find nearest support/resistance
    supports = [lv["price"] for lv in levels if lv["type"] == "support"]
    resistances = [lv["price"] for lv in levels if lv["type"] == "resistance"]

    nearest_support = max(supports) if supports else swing_low
    nearest_resistance = min(resistances) if resistances else swing_high

    return {
        "symbol": symbol.upper(),
        "current_price": round(current_price, 2),
        "trend": trend,
        "swing_high": round(swing_high, 2),
        "swing_low": round(swing_low, 2),
        "levels": levels,
        "nearest_support": round(nearest_support, 2),
        "nearest_resistance": round(nearest_resistance, 2),
    }
