"""Technical indicator calculation service.

Uses numpy/pandas directly to avoid the heavy pandas-ta install. For
the MVP we implement the most-used indicators by hand; swap to
pandas-ta later for broader coverage.
"""
from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from app.schemas.stock import OHLCV, TechnicalIndicators


def _to_dataframe(candles: List[OHLCV]) -> pd.DataFrame:
    """Convert list of OHLCV to DataFrame."""
    if not candles:
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
    data = {
        "date": [c.date for c in candles],
        "open": [c.open for c in candles],
        "high": [c.high for c in candles],
        "low": [c.low for c in candles],
        "close": [c.close for c in candles],
        "volume": [c.volume for c in candles],
    }
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.set_index("date")
    return df


def sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period, min_periods=1).mean()


def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Classic Wilder RSI."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def macd(
    series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> Dict[str, pd.Series]:
    ema_fast = ema(series, fast)
    ema_slow = ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal)
    hist = macd_line - signal_line
    return {"macd": macd_line, "signal": signal_line, "hist": hist}


def bollinger_bands(
    series: pd.Series, period: int = 20, num_std: float = 2.0
) -> Dict[str, pd.Series]:
    mid = sma(series, period)
    std = series.rolling(window=period, min_periods=1).std()
    return {
        "upper": mid + num_std * std,
        "middle": mid,
        "lower": mid - num_std * std,
    }


def atr(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1
    ).max(axis=1)
    return tr.ewm(alpha=1 / period, adjust=False).mean()


def vwap(df: pd.DataFrame) -> pd.Series:
    """Session-based VWAP (resets daily for intraday data)."""
    if df.empty:
        return pd.Series(dtype=float)
    typical = (df["high"] + df["low"] + df["close"]) / 3
    pv = typical * df["volume"]
    # Reset per day
    if isinstance(df.index, pd.DatetimeIndex):
        day = df.index.date
        day_series = pd.Series(day, index=df.index)
        cum_pv = pv.groupby(day_series).cumsum()
        cum_vol = df["volume"].groupby(day_series).cumsum()
    else:
        cum_pv = pv.cumsum()
        cum_vol = df["volume"].cumsum()
    return cum_pv / cum_vol.replace(0, np.nan)


def _last(series: pd.Series) -> Optional[float]:
    if series is None or series.empty:
        return None
    val = series.iloc[-1]
    if pd.isna(val):
        return None
    return float(val)


def compute_all(
    candles: List[OHLCV], symbol: str, interval: str = "1d"
) -> TechnicalIndicators:
    """Compute standard indicator set, return last-value snapshot."""
    df = _to_dataframe(candles)
    if df.empty:
        return TechnicalIndicators(symbol=symbol.upper(), interval=interval)

    close = df["close"]

    sma_20_s = sma(close, 20)
    sma_50_s = sma(close, 50)
    sma_200_s = sma(close, 200)
    ema_9_s = ema(close, 9)
    ema_21_s = ema(close, 21)
    rsi_s = rsi(close, 14)
    macd_d = macd(close)
    bb = bollinger_bands(close, 20, 2.0)
    atr_s = atr(df["high"], df["low"], close, 14)
    vwap_s = vwap(df)

    last_price = _last(close)
    sma20 = _last(sma_20_s)
    sma50 = _last(sma_50_s)
    sma200 = _last(sma_200_s)

    trend: Optional[str] = None
    if last_price is not None and sma50 is not None and sma200 is not None:
        if last_price > sma50 > sma200:
            trend = "bullish"
        elif last_price < sma50 < sma200:
            trend = "bearish"
        else:
            trend = "neutral"

    return TechnicalIndicators(
        symbol=symbol.upper(),
        interval=interval,
        last_price=last_price,
        sma_20=sma20,
        sma_50=sma50,
        sma_200=sma200,
        ema_9=_last(ema_9_s),
        ema_21=_last(ema_21_s),
        rsi_14=_last(rsi_s),
        macd=_last(macd_d["macd"]),
        macd_signal=_last(macd_d["signal"]),
        macd_histogram=_last(macd_d["hist"]),
        bb_upper=_last(bb["upper"]),
        bb_middle=_last(bb["middle"]),
        bb_lower=_last(bb["lower"]),
        atr_14=_last(atr_s),
        vwap=_last(vwap_s),
        trend=trend,
    )


def get_dataframe_with_indicators(candles: List[OHLCV]) -> pd.DataFrame:
    """Return full dataframe with all indicators appended — used by scanners."""
    df = _to_dataframe(candles)
    if df.empty:
        return df
    df["sma_20"] = sma(df["close"], 20)
    df["sma_50"] = sma(df["close"], 50)
    df["sma_200"] = sma(df["close"], 200)
    df["ema_9"] = ema(df["close"], 9)
    df["ema_21"] = ema(df["close"], 21)
    df["rsi_14"] = rsi(df["close"], 14)
    m = macd(df["close"])
    df["macd"] = m["macd"]
    df["macd_signal"] = m["signal"]
    df["macd_hist"] = m["hist"]
    bb = bollinger_bands(df["close"], 20, 2.0)
    df["bb_upper"] = bb["upper"]
    df["bb_middle"] = bb["middle"]
    df["bb_lower"] = bb["lower"]
    df["atr_14"] = atr(df["high"], df["low"], df["close"], 14)
    return df
