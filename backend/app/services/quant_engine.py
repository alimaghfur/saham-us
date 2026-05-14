"""Quantitative Analysis Engine — hedge fund grade analytics.

Provides alpha scoring, market regime detection, composite signal
strength, and risk-parity position sizing. All calculations use
real market data fetched via yfinance.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.core.cache import get_cache
from app.services.indicators import (
    atr,
    ema,
    macd,
    rsi,
    sma,
)

log = logging.getLogger(__name__)

# Cache TTLs (seconds)
_ALPHA_TTL = 300  # 5 min
_REGIME_TTL = 600  # 10 min
_SIGNAL_TTL = 180  # 3 min
_SIZING_TTL = 120  # 2 min


def _history_to_df(symbol: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    """Fetch OHLCV history and return as DataFrame."""
    adapter = get_yfinance_adapter()
    resp = adapter.get_history(symbol, range_=period, interval=interval)
    if not resp.candles:
        return pd.DataFrame()
    data = {
        "open": [c.open for c in resp.candles],
        "high": [c.high for c in resp.candles],
        "low": [c.low for c in resp.candles],
        "close": [c.close for c in resp.candles],
        "volume": [c.volume for c in resp.candles],
    }
    df = pd.DataFrame(data)
    return df


class QuantEngine:
    """Quantitative analysis engine with caching and async support."""

    def __init__(self) -> None:
        self._cache = get_cache()

    # ------------------------------------------------------------------
    # 1. Alpha Score
    # ------------------------------------------------------------------

    async def alpha_score(self, symbol: str) -> Dict[str, Any]:
        """Statistical alpha model.

        Components:
        - z_score: standardized return relative to rolling mean
        - sharpe_like: risk-adjusted return metric (annualized)
        - mean_reversion_prob: probability price reverts to mean

        Returns dict with individual components + composite alpha score.
        """
        cache_key = f"quant:alpha:{symbol.upper()}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        df = await asyncio.to_thread(_history_to_df, symbol, "1y", "1d")
        if df.empty or len(df) < 60:
            return {"symbol": symbol.upper(), "error": "insufficient_data"}

        close = df["close"]
        returns = close.pct_change().dropna()

        # Z-score of recent 5-day return vs 60-day distribution
        recent_return = returns.iloc[-5:].sum()
        roll_mean = returns.rolling(60).mean().iloc[-1]
        roll_std = returns.rolling(60).std().iloc[-1]
        z_score = float((recent_return - roll_mean) / roll_std) if roll_std > 0 else 0.0

        # Sharpe-like metric: annualized return / annualized vol (60-day window)
        window_returns = returns.iloc[-60:]
        ann_return = float(window_returns.mean() * 252)
        ann_vol = float(window_returns.std() * np.sqrt(252))
        sharpe_like = ann_return / ann_vol if ann_vol > 0 else 0.0

        # Mean reversion probability using Ornstein-Uhlenbeck heuristic
        # Distance from 20-day SMA normalized by Bollinger width
        sma_20 = close.rolling(20).mean().iloc[-1]
        std_20 = close.rolling(20).std().iloc[-1]
        last_price = float(close.iloc[-1])
        if std_20 > 0:
            deviation = (last_price - sma_20) / (2 * std_20)
            # Sigmoid-based probability of reversion
            mean_reversion_prob = float(1 / (1 + np.exp(-abs(deviation))) - 0.5) * 2
            reversion_direction = "down" if last_price > sma_20 else "up"
        else:
            mean_reversion_prob = 0.0
            reversion_direction = "neutral"

        # Composite alpha: weighted combination
        # High |z_score| + high sharpe + high reversion prob = strong alpha
        composite = (
            abs(z_score) * 0.3
            + max(sharpe_like, 0) * 0.4
            + mean_reversion_prob * 0.3
        )
        # Normalize to 0-100
        alpha_score = float(min(max(composite * 25, 0), 100))

        result = {
            "symbol": symbol.upper(),
            "alpha_score": round(alpha_score, 2),
            "z_score": round(z_score, 4),
            "sharpe_like": round(sharpe_like, 4),
            "mean_reversion_prob": round(mean_reversion_prob, 4),
            "reversion_direction": reversion_direction,
            "ann_return_60d": round(ann_return, 4),
            "ann_vol_60d": round(ann_vol, 4),
            "last_price": round(last_price, 2),
            "sma_20": round(float(sma_20), 2),
            "timestamp": time.time(),
        }

        self._cache.set(cache_key, result, _ALPHA_TTL)
        return result

    # ------------------------------------------------------------------
    # 2. Regime Detection
    # ------------------------------------------------------------------

    async def regime_detection(self) -> Dict[str, Any]:
        """Detect current market regime using VIX + S&P 500 trend + breadth.

        Regimes:
        - bull_trending: low vol, strong uptrend
        - bull_volatile: high vol, still up
        - bear_trending: low vol, strong downtrend
        - bear_volatile: high vol, falling
        - sideways: no clear direction

        Returns regime label + supporting metrics.
        """
        cache_key = "quant:regime:market"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        # Fetch VIX and S&P 500
        vix_df = await asyncio.to_thread(_history_to_df, "^VIX", "6mo", "1d")
        spy_df = await asyncio.to_thread(_history_to_df, "SPY", "6mo", "1d")

        if vix_df.empty or spy_df.empty:
            return {"regime": "unknown", "error": "data_unavailable"}

        # VIX analysis
        vix_current = float(vix_df["close"].iloc[-1])
        vix_avg = float(vix_df["close"].rolling(20).mean().iloc[-1])
        vix_elevated = vix_current > 20
        vix_extreme = vix_current > 30

        # S&P 500 trend
        spy_close = spy_df["close"]
        spy_sma50 = float(spy_close.rolling(50).mean().iloc[-1])
        spy_sma200 = float(spy_close.rolling(min(200, len(spy_close))).mean().iloc[-1])
        spy_last = float(spy_close.iloc[-1])
        spy_return_20d = float((spy_close.iloc[-1] / spy_close.iloc[-20] - 1) * 100) if len(spy_close) >= 20 else 0

        # Trend direction
        above_50 = spy_last > spy_sma50
        above_200 = spy_last > spy_sma200
        strong_uptrend = above_50 and above_200 and spy_return_20d > 2
        strong_downtrend = not above_50 and not above_200 and spy_return_20d < -2

        # Market breadth proxy: % of recent days that were up
        recent_returns = spy_close.pct_change().iloc[-20:]
        breadth_pct = float((recent_returns > 0).sum() / len(recent_returns) * 100)

        # Regime classification
        if strong_uptrend and not vix_elevated:
            regime = "bull_trending"
        elif above_200 and vix_elevated:
            regime = "bull_volatile"
        elif strong_downtrend and not vix_extreme:
            regime = "bear_trending"
        elif not above_200 and vix_extreme:
            regime = "bear_volatile"
        else:
            regime = "sideways"

        # Confidence based on signal agreement
        signals_bullish = sum([above_50, above_200, spy_return_20d > 0, breadth_pct > 55])
        signals_bearish = sum([not above_50, not above_200, spy_return_20d < 0, breadth_pct < 45])
        confidence = max(signals_bullish, signals_bearish) / 4 * 100

        result = {
            "regime": regime,
            "confidence": round(float(confidence), 1),
            "vix_current": round(vix_current, 2),
            "vix_20d_avg": round(vix_avg, 2),
            "vix_elevated": vix_elevated,
            "spy_last": round(spy_last, 2),
            "spy_sma50": round(spy_sma50, 2),
            "spy_sma200": round(spy_sma200, 2),
            "spy_return_20d_pct": round(spy_return_20d, 2),
            "breadth_pct_up_days": round(breadth_pct, 1),
            "timestamp": time.time(),
        }

        self._cache.set(cache_key, result, _REGIME_TTL)
        return result

    # ------------------------------------------------------------------
    # 3. Signal Strength
    # ------------------------------------------------------------------

    async def signal_strength(self, symbol: str) -> Dict[str, Any]:
        """Combine technical signals into a single 0-100 strength score.

        Signals: MACD, RSI, volume surge, trend alignment.
        Uses exponential decay — newer signals weighted more heavily.

        Returns composite score + individual signal breakdown.
        """
        cache_key = f"quant:signal:{symbol.upper()}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        df = await asyncio.to_thread(_history_to_df, symbol, "6mo", "1d")
        if df.empty or len(df) < 50:
            return {"symbol": symbol.upper(), "error": "insufficient_data"}

        close = df["close"]
        high = df["high"]
        low = df["low"]
        volume = df["volume"]

        # --- MACD Signal (0-25) ---
        macd_data = macd(close)
        macd_hist = macd_data["hist"]
        # Score based on histogram direction and magnitude
        hist_last = float(macd_hist.iloc[-1]) if not pd.isna(macd_hist.iloc[-1]) else 0
        hist_prev = float(macd_hist.iloc[-2]) if len(macd_hist) > 1 and not pd.isna(macd_hist.iloc[-2]) else 0
        macd_increasing = hist_last > hist_prev
        macd_positive = hist_last > 0
        macd_score = 0.0
        if macd_positive and macd_increasing:
            macd_score = 25.0
        elif macd_positive:
            macd_score = 18.0
        elif macd_increasing:
            macd_score = 12.0
        else:
            macd_score = 5.0

        # --- RSI Signal (0-25) ---
        rsi_series = rsi(close, 14)
        rsi_val = float(rsi_series.iloc[-1]) if not pd.isna(rsi_series.iloc[-1]) else 50
        # Optimal RSI for bullish momentum: 50-70
        if 50 <= rsi_val <= 70:
            rsi_score = 25.0
        elif 40 <= rsi_val < 50:
            rsi_score = 18.0
        elif 70 < rsi_val <= 80:
            rsi_score = 15.0
        elif rsi_val < 30:
            # Oversold — potential reversal
            rsi_score = 12.0
        elif rsi_val > 80:
            # Overbought risk
            rsi_score = 5.0
        else:
            rsi_score = 10.0

        # --- Volume Signal (0-25) ---
        vol_sma20 = volume.rolling(20).mean().iloc[-1]
        vol_last = float(volume.iloc[-1])
        vol_ratio = vol_last / vol_sma20 if vol_sma20 > 0 else 1.0
        # Volume surge with price increase = bullish confirmation
        price_up = float(close.iloc[-1]) > float(close.iloc[-2]) if len(close) > 1 else False
        if vol_ratio > 2.0 and price_up:
            vol_score = 25.0
        elif vol_ratio > 1.5 and price_up:
            vol_score = 20.0
        elif vol_ratio > 1.2:
            vol_score = 15.0
        elif vol_ratio > 0.8:
            vol_score = 10.0
        else:
            vol_score = 5.0

        # --- Trend Signal (0-25) ---
        sma_20_val = float(sma(close, 20).iloc[-1])
        sma_50_val = float(sma(close, 50).iloc[-1])
        ema_9_val = float(ema(close, 9).iloc[-1])
        last_price = float(close.iloc[-1])
        trend_points = 0.0
        if last_price > sma_20_val:
            trend_points += 6.25
        if last_price > sma_50_val:
            trend_points += 6.25
        if sma_20_val > sma_50_val:
            trend_points += 6.25
        if last_price > ema_9_val:
            trend_points += 6.25
        trend_score = trend_points

        # --- Apply decay factor (newer signals weighted more) ---
        # Weights: most recent signal gets 1.0, older get exponential decay
        decay = 0.85
        weights = np.array([decay**3, decay**2, decay**1, decay**0])
        scores = np.array([macd_score, rsi_score, vol_score, trend_score])
        weighted_sum = float(np.sum(scores * weights))
        weight_total = float(np.sum(weights * 25))  # max per signal * weight
        composite = (weighted_sum / weight_total) * 100 if weight_total > 0 else 0

        # Determine bias
        if composite >= 70:
            bias = "strong_bullish"
        elif composite >= 55:
            bias = "bullish"
        elif composite >= 45:
            bias = "neutral"
        elif composite >= 30:
            bias = "bearish"
        else:
            bias = "strong_bearish"

        result = {
            "symbol": symbol.upper(),
            "signal_strength": round(float(composite), 2),
            "bias": bias,
            "components": {
                "macd_score": round(macd_score, 1),
                "rsi_score": round(rsi_score, 1),
                "volume_score": round(vol_score, 1),
                "trend_score": round(trend_score, 1),
            },
            "details": {
                "rsi_14": round(rsi_val, 2),
                "macd_histogram": round(hist_last, 4),
                "volume_ratio": round(float(vol_ratio), 2),
                "last_price": round(last_price, 2),
                "sma_20": round(sma_20_val, 2),
                "sma_50": round(sma_50_val, 2),
            },
            "decay_factor": decay,
            "timestamp": time.time(),
        }

        self._cache.set(cache_key, result, _SIGNAL_TTL)
        return result

    # ------------------------------------------------------------------
    # 4. Risk Parity Sizing
    # ------------------------------------------------------------------

    async def risk_parity_sizing(
        self,
        symbol: str,
        portfolio_value: float,
        max_risk_pct: float = 2.0,
    ) -> Dict[str, Any]:
        """Calculate optimal position size using ATR-based volatility normalization.

        Uses the risk parity concept: allocate so each position contributes
        equal risk. Position size = (portfolio_value * risk_pct) / (ATR * multiplier).

        Args:
            symbol: Stock ticker
            portfolio_value: Total portfolio value in USD
            max_risk_pct: Maximum risk per position as % of portfolio (default 2%)

        Returns dict with shares, dollar amount, stop loss, and risk metrics.
        """
        cache_key = f"quant:sizing:{symbol.upper()}:{portfolio_value}:{max_risk_pct}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        df = await asyncio.to_thread(_history_to_df, symbol, "3mo", "1d")
        if df.empty or len(df) < 20:
            return {"symbol": symbol.upper(), "error": "insufficient_data"}

        close = df["close"]
        high = df["high"]
        low = df["low"]

        last_price = float(close.iloc[-1])
        if last_price <= 0:
            return {"symbol": symbol.upper(), "error": "invalid_price"}

        # ATR-based volatility (14-period)
        atr_series = atr(high, low, close, 14)
        atr_val = float(atr_series.iloc[-1])

        # Daily volatility (annualized)
        returns = close.pct_change().dropna()
        daily_vol = float(returns.iloc[-20:].std())
        ann_vol = daily_vol * np.sqrt(252)

        # Risk budget in dollars
        risk_budget = portfolio_value * (max_risk_pct / 100)

        # Position size: risk_budget / ATR gives shares
        # Use 2x ATR as the stop distance (standard institutional approach)
        stop_distance = atr_val * 2
        shares = int(risk_budget / stop_distance) if stop_distance > 0 else 0

        # Cap at reasonable position concentration (max 20% of portfolio)
        max_shares = int((portfolio_value * 0.20) / last_price)
        shares = min(shares, max_shares)

        position_value = shares * last_price
        position_pct = (position_value / portfolio_value * 100) if portfolio_value > 0 else 0

        # Stop loss and target
        stop_loss = last_price - stop_distance
        # Risk:reward of 1:2
        target_price = last_price + (stop_distance * 2)

        # Volatility-adjusted Kelly fraction (simplified)
        # kelly = (win_rate * avg_win - loss_rate * avg_loss) / avg_win
        # Approximate using recent win rate
        wins = returns[returns > 0]
        losses = returns[returns < 0]
        win_rate = len(wins) / len(returns) if len(returns) > 0 else 0.5
        avg_win = float(wins.mean()) if len(wins) > 0 else 0.01
        avg_loss = float(abs(losses.mean())) if len(losses) > 0 else 0.01
        kelly_fraction = (win_rate - (1 - win_rate) * avg_loss / avg_win) if avg_win > 0 else 0
        kelly_fraction = max(0, min(kelly_fraction, 0.25))  # Cap at 25%

        result = {
            "symbol": symbol.upper(),
            "recommended_shares": shares,
            "position_value": round(position_value, 2),
            "position_pct_of_portfolio": round(position_pct, 2),
            "last_price": round(last_price, 2),
            "stop_loss": round(stop_loss, 2),
            "target_price": round(target_price, 2),
            "risk_reward_ratio": 2.0,
            "risk_metrics": {
                "atr_14": round(atr_val, 4),
                "stop_distance": round(stop_distance, 4),
                "daily_volatility": round(daily_vol, 6),
                "annualized_volatility": round(ann_vol, 4),
                "risk_budget_usd": round(risk_budget, 2),
                "max_risk_pct": max_risk_pct,
                "kelly_fraction": round(kelly_fraction, 4),
            },
            "portfolio": {
                "total_value": portfolio_value,
                "max_position_pct": 20.0,
            },
            "timestamp": time.time(),
        }

        self._cache.set(cache_key, result, _SIZING_TTL)
        return result


# Module-level singleton
_engine: Optional[QuantEngine] = None


def get_quant_engine() -> QuantEngine:
    """Return singleton QuantEngine instance."""
    global _engine
    if _engine is None:
        _engine = QuantEngine()
    return _engine
