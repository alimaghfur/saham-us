"""Stock price prediction service.

Uses technical analysis indicators (RSI, MACD, Bollinger Bands, Moving Averages,
ATR, volume analysis) to generate price predictions for 1 day, 1 week, and 1 month
timeframes. Also provides entry point recommendations.

DISCLAIMER: This is NOT financial advice. Predictions are based on technical
analysis patterns and historical data — actual market behavior may differ.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from app.schemas.stock import OHLCV
from app.services.indicators import (
    _to_dataframe,
    atr,
    bollinger_bands,
    ema,
    macd,
    rsi,
    sma,
)


@dataclass
class PredictionResult:
    """Prediction for a single timeframe."""
    timeframe: str  # "1d", "1w", "1m"
    direction: str  # "bullish", "bearish", "neutral"
    confidence: float  # 0-100
    predicted_low: float
    predicted_high: float
    predicted_change_pct_low: float
    predicted_change_pct_high: float
    signals: List[str]


@dataclass
class EntryPoint:
    """Recommended entry point."""
    entry_price: float
    stop_loss: float
    target_1: float
    target_2: float
    risk_reward_ratio: float
    entry_type: str  # "buy" or "sell"
    reasoning: str


@dataclass
class PredictionReport:
    """Full prediction report for a symbol."""
    symbol: str
    current_price: float
    predictions: List[PredictionResult]
    entry_point: EntryPoint
    overall_bias: str  # "bullish", "bearish", "neutral"
    overall_score: float  # -100 to +100
    key_levels: Dict[str, float]
    disclaimer: str


def _compute_signals(df: pd.DataFrame) -> Dict[str, any]:
    """Compute all signals from dataframe."""
    close = df["close"]
    high = df["high"]
    low = df["low"]

    # Moving averages
    sma_20 = sma(close, 20)
    sma_50 = sma(close, 50)
    sma_200 = sma(close, 200)
    ema_9 = ema(close, 9)
    ema_21 = ema(close, 21)

    # RSI
    rsi_14 = rsi(close, 14)

    # MACD
    macd_data = macd(close)

    # Bollinger Bands
    bb = bollinger_bands(close, 20, 2.0)

    # ATR for volatility
    atr_14 = atr(high, low, close, 14)

    # Volume analysis
    vol_sma_20 = sma(df["volume"].astype(float), 20)

    last = close.iloc[-1]
    prev = close.iloc[-2] if len(close) > 1 else last

    return {
        "last_price": float(last),
        "prev_price": float(prev),
        "sma_20": float(sma_20.iloc[-1]) if not pd.isna(sma_20.iloc[-1]) else None,
        "sma_50": float(sma_50.iloc[-1]) if not pd.isna(sma_50.iloc[-1]) else None,
        "sma_200": float(sma_200.iloc[-1]) if not pd.isna(sma_200.iloc[-1]) else None,
        "ema_9": float(ema_9.iloc[-1]) if not pd.isna(ema_9.iloc[-1]) else None,
        "ema_21": float(ema_21.iloc[-1]) if not pd.isna(ema_21.iloc[-1]) else None,
        "rsi_14": float(rsi_14.iloc[-1]) if not pd.isna(rsi_14.iloc[-1]) else None,
        "macd_line": float(macd_data["macd"].iloc[-1]) if not pd.isna(macd_data["macd"].iloc[-1]) else None,
        "macd_signal": float(macd_data["signal"].iloc[-1]) if not pd.isna(macd_data["signal"].iloc[-1]) else None,
        "macd_hist": float(macd_data["hist"].iloc[-1]) if not pd.isna(macd_data["hist"].iloc[-1]) else None,
        "macd_hist_prev": float(macd_data["hist"].iloc[-2]) if len(macd_data["hist"]) > 1 and not pd.isna(macd_data["hist"].iloc[-2]) else None,
        "bb_upper": float(bb["upper"].iloc[-1]) if not pd.isna(bb["upper"].iloc[-1]) else None,
        "bb_middle": float(bb["middle"].iloc[-1]) if not pd.isna(bb["middle"].iloc[-1]) else None,
        "bb_lower": float(bb["lower"].iloc[-1]) if not pd.isna(bb["lower"].iloc[-1]) else None,
        "atr_14": float(atr_14.iloc[-1]) if not pd.isna(atr_14.iloc[-1]) else None,
        "volume_last": float(df["volume"].iloc[-1]),
        "volume_avg": float(vol_sma_20.iloc[-1]) if not pd.isna(vol_sma_20.iloc[-1]) else None,
        # Recent highs and lows for support/resistance
        "high_20": float(high.tail(20).max()),
        "low_20": float(low.tail(20).min()),
        "high_50": float(high.tail(50).max()),
        "low_50": float(low.tail(50).min()),
    }


def _score_direction(signals: Dict) -> tuple:
    """
    Score the overall direction based on multiple indicators.
    Returns (score, signal_descriptions) where score is -100 to +100.
    """
    score = 0.0
    descriptions = []

    price = signals["last_price"]

    # 1. Moving average alignment (weight: 25)
    ma_score = 0
    if signals["sma_50"] and signals["sma_200"]:
        if signals["sma_50"] > signals["sma_200"]:
            ma_score += 10
            descriptions.append("SMA 50 > SMA 200 (Golden Cross territory)")
        else:
            ma_score -= 10
            descriptions.append("SMA 50 < SMA 200 (Death Cross territory)")

    if signals["ema_9"] and signals["ema_21"]:
        if signals["ema_9"] > signals["ema_21"]:
            ma_score += 8
            descriptions.append("EMA 9 > EMA 21 (short-term bullish)")
        else:
            ma_score -= 8
            descriptions.append("EMA 9 < EMA 21 (short-term bearish)")

    if signals["sma_20"]:
        if price > signals["sma_20"]:
            ma_score += 7
        else:
            ma_score -= 7

    score += ma_score

    # 2. RSI (weight: 20)
    rsi_val = signals["rsi_14"]
    if rsi_val is not None:
        if rsi_val < 30:
            score += 15
            descriptions.append(f"RSI {rsi_val:.1f} — Oversold (potensi rebound)")
        elif rsi_val < 40:
            score += 8
            descriptions.append(f"RSI {rsi_val:.1f} — Mendekati oversold")
        elif rsi_val > 70:
            score -= 15
            descriptions.append(f"RSI {rsi_val:.1f} — Overbought (potensi koreksi)")
        elif rsi_val > 60:
            score -= 5
            descriptions.append(f"RSI {rsi_val:.1f} — Mendekati overbought")
        elif 45 <= rsi_val <= 55:
            descriptions.append(f"RSI {rsi_val:.1f} — Netral")
        else:
            if rsi_val > 50:
                score += 5
            else:
                score -= 5

    # 3. MACD (weight: 20)
    if signals["macd_line"] is not None and signals["macd_signal"] is not None:
        if signals["macd_line"] > signals["macd_signal"]:
            score += 12
            descriptions.append("MACD di atas signal line (bullish momentum)")
        else:
            score -= 12
            descriptions.append("MACD di bawah signal line (bearish momentum)")

        # Histogram momentum
        if signals["macd_hist"] is not None and signals["macd_hist_prev"] is not None:
            if signals["macd_hist"] > signals["macd_hist_prev"]:
                score += 8
                descriptions.append("MACD histogram meningkat (momentum menguat)")
            else:
                score -= 8
                descriptions.append("MACD histogram menurun (momentum melemah)")

    # 4. Bollinger Bands position (weight: 15)
    if signals["bb_upper"] and signals["bb_lower"]:
        bb_range = signals["bb_upper"] - signals["bb_lower"]
        bb_position = (price - signals["bb_lower"]) / bb_range if bb_range > 0 else 0.5

        if bb_position > 0.95:
            score -= 10
            descriptions.append("Harga di atas upper BB (overbought)")
        elif bb_position > 0.8:
            score -= 5
        elif bb_position < 0.05:
            score += 10
            descriptions.append("Harga di bawah lower BB (oversold)")
        elif bb_position < 0.2:
            score += 5
        else:
            pass  # neutral zone

    # 5. Volume confirmation (weight: 10)
    if signals["volume_avg"] and signals["volume_avg"] > 0:
        vol_ratio = signals["volume_last"] / signals["volume_avg"]
        if vol_ratio > 1.5:
            # High volume confirms the current direction
            if price > signals["prev_price"]:
                score += 10
                descriptions.append(f"Volume tinggi ({vol_ratio:.1f}x avg) konfirmasi bullish")
            else:
                score -= 10
                descriptions.append(f"Volume tinggi ({vol_ratio:.1f}x avg) konfirmasi bearish")

    # 6. Price relative to key MAs (weight: 10)
    if signals["sma_200"]:
        pct_from_200 = ((price - signals["sma_200"]) / signals["sma_200"]) * 100
        if pct_from_200 > 20:
            score -= 5  # Extended above 200 MA
        elif pct_from_200 < -20:
            score += 5  # Extended below 200 MA (potential value)

    # Clamp score
    score = max(-100, min(100, score))

    return score, descriptions


def _predict_range(
    price: float, atr_val: float, score: float, timeframe: str
) -> tuple:
    """
    Predict price range based on ATR, score, and timeframe multiplier.
    Returns (low, high, direction, confidence).
    """
    # Timeframe multipliers (approximate trading days)
    multipliers = {"1d": 1.0, "1w": 2.2, "1m": 4.5}
    mult = multipliers.get(timeframe, 1.0)

    # Base volatility range from ATR
    base_range = atr_val * mult

    # Direction bias from score (-100 to +100 normalized to -1 to +1)
    bias = score / 100.0

    # Calculate asymmetric range based on bias
    # Positive bias = more upside potential, negative = more downside
    upside_factor = 1.0 + bias * 0.5  # 0.5 to 1.5
    downside_factor = 1.0 - bias * 0.5  # 0.5 to 1.5

    predicted_high = price + base_range * upside_factor
    predicted_low = price - base_range * downside_factor

    # Determine direction
    midpoint_change = ((predicted_high + predicted_low) / 2 - price) / price * 100
    if midpoint_change > 1:
        direction = "bullish"
    elif midpoint_change < -1:
        direction = "bearish"
    else:
        direction = "neutral"

    # Confidence based on signal agreement (higher absolute score = more confidence)
    confidence = min(85, 40 + abs(score) * 0.45)

    return predicted_low, predicted_high, direction, confidence


def _calculate_entry_point(signals: Dict, score: float) -> EntryPoint:
    """Calculate optimal entry point with stop loss and targets."""
    price = signals["last_price"]
    atr_val = signals["atr_14"] or (price * 0.02)  # fallback 2%

    if score > 10:
        # Bullish bias — look for buy entry
        # Entry at pullback to support
        entry_price = price - (atr_val * 0.3)  # Slight pullback
        stop_loss = entry_price - (atr_val * 1.5)
        target_1 = entry_price + (atr_val * 2.0)
        target_2 = entry_price + (atr_val * 3.5)
        entry_type = "buy"

        # Use BB lower or SMA as entry if closer
        if signals["bb_lower"] and signals["bb_lower"] > stop_loss and signals["bb_lower"] < price:
            entry_price = max(entry_price, signals["bb_lower"])

        reasoning = "Entry saat pullback ke support terdekat. "
        if signals["rsi_14"] and signals["rsi_14"] < 40:
            reasoning += "RSI oversold mendukung entry. "
        if signals["ema_9"] and signals["ema_9"] > signals.get("ema_21", 0):
            reasoning += "EMA crossover bullish aktif. "

    elif score < -10:
        # Bearish bias — look for short/sell entry
        entry_price = price + (atr_val * 0.3)  # Slight bounce
        stop_loss = entry_price + (atr_val * 1.5)
        target_1 = entry_price - (atr_val * 2.0)
        target_2 = entry_price - (atr_val * 3.5)
        entry_type = "sell"

        reasoning = "Entry saat bounce ke resistance terdekat. "
        if signals["rsi_14"] and signals["rsi_14"] > 60:
            reasoning += "RSI overbought mendukung sell. "
        if signals["macd_line"] and signals["macd_line"] < signals.get("macd_signal", 0):
            reasoning += "MACD bearish crossover aktif. "
    else:
        # Neutral — provide buy entry with tight stop
        entry_price = signals.get("bb_lower", price - atr_val * 0.5) or (price - atr_val * 0.5)
        stop_loss = entry_price - (atr_val * 1.0)
        target_1 = entry_price + (atr_val * 1.5)
        target_2 = entry_price + (atr_val * 2.5)
        entry_type = "buy"
        reasoning = "Market netral — tunggu konfirmasi arah atau entry di support kuat dengan stop ketat."

    # Risk/reward calculation
    risk = abs(entry_price - stop_loss)
    reward = abs(target_1 - entry_price)
    rr = reward / risk if risk > 0 else 0

    return EntryPoint(
        entry_price=round(entry_price, 2),
        stop_loss=round(stop_loss, 2),
        target_1=round(target_1, 2),
        target_2=round(target_2, 2),
        risk_reward_ratio=round(rr, 2),
        entry_type=entry_type,
        reasoning=reasoning.strip(),
    )


def generate_prediction(candles: List[OHLCV], symbol: str) -> PredictionReport:
    """
    Generate full prediction report for a stock symbol.

    Uses technical indicators to predict price movement for:
    - 1 day
    - 1 week (5 trading days)
    - 1 month (22 trading days)
    """
    df = _to_dataframe(candles)

    if df.empty or len(df) < 50:
        # Not enough data
        current = float(df["close"].iloc[-1]) if not df.empty else 0
        return PredictionReport(
            symbol=symbol.upper(),
            current_price=current,
            predictions=[],
            entry_point=EntryPoint(
                entry_price=current,
                stop_loss=current * 0.95,
                target_1=current * 1.05,
                target_2=current * 1.10,
                risk_reward_ratio=1.0,
                entry_type="buy",
                reasoning="Data tidak cukup untuk analisis lengkap.",
            ),
            overall_bias="neutral",
            overall_score=0,
            key_levels={},
            disclaimer="Data historis tidak cukup (minimum 50 candles). Prediksi tidak dapat diandalkan.",
        )

    # Compute all signals
    signals = _compute_signals(df)
    price = signals["last_price"]
    atr_val = signals["atr_14"] or (price * 0.02)

    # Score direction
    score, signal_descriptions = _score_direction(signals)

    # Generate predictions for each timeframe
    predictions = []
    for tf, label in [("1d", "1 Hari"), ("1w", "1 Minggu"), ("1m", "1 Bulan")]:
        low, high, direction, confidence = _predict_range(price, atr_val, score, tf)
        pct_low = ((low - price) / price) * 100
        pct_high = ((high - price) / price) * 100

        # Timeframe-specific signals
        tf_signals = list(signal_descriptions)  # copy
        if tf == "1d":
            tf_signals.insert(0, f"Prediksi harga {label}: ${low:.2f} — ${high:.2f}")
        elif tf == "1w":
            tf_signals.insert(0, f"Prediksi harga {label}: ${low:.2f} — ${high:.2f}")
        else:
            tf_signals.insert(0, f"Prediksi harga {label}: ${low:.2f} — ${high:.2f}")

        predictions.append(PredictionResult(
            timeframe=tf,
            direction=direction,
            confidence=round(confidence, 1),
            predicted_low=round(low, 2),
            predicted_high=round(high, 2),
            predicted_change_pct_low=round(pct_low, 2),
            predicted_change_pct_high=round(pct_high, 2),
            signals=tf_signals,
        ))

    # Entry point
    entry = _calculate_entry_point(signals, score)

    # Overall bias
    if score > 15:
        overall_bias = "bullish"
    elif score < -15:
        overall_bias = "bearish"
    else:
        overall_bias = "neutral"

    # Key levels
    key_levels = {
        "support_1": round(signals.get("low_20", price * 0.95), 2),
        "support_2": round(signals.get("low_50", price * 0.90), 2),
        "resistance_1": round(signals.get("high_20", price * 1.05), 2),
        "resistance_2": round(signals.get("high_50", price * 1.10), 2),
    }
    if signals["sma_50"]:
        key_levels["sma_50"] = round(signals["sma_50"], 2)
    if signals["sma_200"]:
        key_levels["sma_200"] = round(signals["sma_200"], 2)
    if signals["bb_upper"]:
        key_levels["bb_upper"] = round(signals["bb_upper"], 2)
    if signals["bb_lower"]:
        key_levels["bb_lower"] = round(signals["bb_lower"], 2)

    return PredictionReport(
        symbol=symbol.upper(),
        current_price=round(price, 2),
        predictions=predictions,
        entry_point=entry,
        overall_bias=overall_bias,
        overall_score=round(score, 1),
        key_levels=key_levels,
        disclaimer=(
            "⚠️ DISCLAIMER: Prediksi ini berdasarkan analisis teknikal dan data historis. "
            "Bukan merupakan saran investasi. Selalu lakukan riset mandiri dan gunakan manajemen risiko."
        ),
    )
