"""Enhanced multi-model stock prediction service.

Combines Technical Analysis, Machine Learning ensemble, News Sentiment,
and Volume Profile analysis into a single enhanced prediction with
weighted scoring and confidence metrics.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from app.schemas.stock import OHLCV
from app.services.indicators import _to_dataframe, sma
from app.services.prediction import generate_prediction
from app.services.ml_prediction import generate_ml_prediction
from app.services.sentiment import analyze_headlines


# --- Weights for combining models ---
WEIGHT_TA = 0.35       # Technical Analysis
WEIGHT_ML = 0.30       # ML Ensemble
WEIGHT_SENTIMENT = 0.20  # News Sentiment
WEIGHT_VOLUME = 0.15   # Volume Profile


@dataclass
class VolumeProfileResult:
    """Volume profile analysis result."""
    score: float  # -100 to +100
    obv_trend: str  # "bullish", "bearish", "neutral"
    money_flow: str  # "accumulation", "distribution", "neutral"
    signals: List[str] = field(default_factory=list)


@dataclass
class ModelBreakdown:
    """Individual model score breakdown."""
    ta_score: float
    ta_confidence: float
    ml_score: float
    ml_confidence: float
    sentiment_score: float
    sentiment_confidence: float
    volume_score: float
    volume_confidence: float


@dataclass
class EnhancedEntryPoint:
    """Enhanced entry point with tighter stop when models agree."""
    entry_price: float
    stop_loss: float
    target_1: float
    target_2: float
    risk_reward_ratio: float
    entry_type: str  # "buy" or "sell"
    reasoning: str
    stop_loss_type: str  # "tight" or "normal"


@dataclass
class EnhancedPredictionResult:
    """Full enhanced prediction result combining all models."""
    symbol: str
    current_price: float
    combined_score: float  # -100 to +100
    confidence: float  # 0-100
    direction: str  # "bullish", "bearish", "neutral"
    signal_agreement: int  # how many models agree (0-4)
    agreement_label: str  # "strong_consensus", "majority", "mixed", "conflicting"
    model_breakdown: ModelBreakdown
    entry_point: EnhancedEntryPoint
    predictions: Dict[str, Dict]  # timeframe predictions
    volume_profile: VolumeProfileResult
    disclaimer: str


def compute_volume_profile(df: pd.DataFrame) -> VolumeProfileResult:
    """
    Compute volume profile analysis including OBV trend and Money Flow.

    Calculates:
    - On-Balance Volume (OBV) trend direction
    - Money Flow (accumulation/distribution) based on close position in range
    - Returns score -100 to +100 and descriptive signals
    """
    if df.empty or len(df) < 20:
        return VolumeProfileResult(
            score=0.0,
            obv_trend="neutral",
            money_flow="neutral",
            signals=["Data tidak cukup untuk analisis volume profile"],
        )

    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)
    volume = df["volume"].astype(float)

    signals = []
    score = 0.0

    # --- On-Balance Volume (OBV) ---
    price_change = close.diff()
    obv = pd.Series(0.0, index=df.index)

    for i in range(1, len(df)):
        if price_change.iloc[i] > 0:
            obv.iloc[i] = obv.iloc[i - 1] + volume.iloc[i]
        elif price_change.iloc[i] < 0:
            obv.iloc[i] = obv.iloc[i - 1] - volume.iloc[i]
        else:
            obv.iloc[i] = obv.iloc[i - 1]

    # OBV trend: compare recent OBV SMA vs longer-term
    obv_sma_5 = sma(obv, 5)
    obv_sma_20 = sma(obv, 20)

    obv_short = obv_sma_5.iloc[-1] if not pd.isna(obv_sma_5.iloc[-1]) else 0
    obv_long = obv_sma_20.iloc[-1] if not pd.isna(obv_sma_20.iloc[-1]) else 0

    if obv_long != 0:
        obv_ratio = (obv_short - obv_long) / abs(obv_long)
    else:
        obv_ratio = 0.0

    if obv_ratio > 0.05:
        obv_trend = "bullish"
        score += 30
        signals.append("OBV trend naik — tekanan beli meningkat")
    elif obv_ratio < -0.05:
        obv_trend = "bearish"
        score -= 30
        signals.append("OBV trend turun — tekanan jual meningkat")
    else:
        obv_trend = "neutral"
        signals.append("OBV trend netral")

    # OBV divergence with price
    price_direction = 1 if close.iloc[-1] > close.iloc[-5] else -1
    obv_direction = 1 if obv.iloc[-1] > obv.iloc[-5] else -1

    if price_direction > 0 and obv_direction < 0:
        score -= 20
        signals.append("Divergensi bearish: harga naik tapi OBV turun (potensi reversal)")
    elif price_direction < 0 and obv_direction > 0:
        score += 20
        signals.append("Divergensi bullish: harga turun tapi OBV naik (akumulasi tersembunyi)")

    # --- Money Flow (Accumulation/Distribution) ---
    # Money Flow Multiplier = ((Close - Low) - (High - Close)) / (High - Low)
    hl_range = high - low
    # Avoid division by zero
    hl_range_safe = hl_range.replace(0, np.nan)
    mf_multiplier = ((close - low) - (high - close)) / hl_range_safe
    mf_multiplier = mf_multiplier.fillna(0)

    # Money Flow Volume
    mf_volume = mf_multiplier * volume

    # Accumulation/Distribution Line (ADL)
    adl = mf_volume.cumsum()

    # ADL trend (compare recent to past)
    adl_recent = adl.iloc[-5:].mean()
    adl_past = adl.iloc[-20:-5].mean() if len(adl) >= 20 else adl.iloc[:5].mean()

    if adl_past != 0:
        adl_change = (adl_recent - adl_past) / abs(adl_past)
    else:
        adl_change = 0.0

    if adl_change > 0.05:
        money_flow = "accumulation"
        score += 25
        signals.append("Money Flow: Akumulasi — smart money membeli")
    elif adl_change < -0.05:
        money_flow = "distribution"
        score -= 25
        signals.append("Money Flow: Distribusi — smart money menjual")
    else:
        money_flow = "neutral"
        signals.append("Money Flow: Netral")

    # --- Volume confirmation ---
    vol_sma_20 = sma(volume, 20)
    recent_vol = volume.iloc[-1]
    avg_vol = vol_sma_20.iloc[-1] if not pd.isna(vol_sma_20.iloc[-1]) else volume.mean()

    if avg_vol > 0:
        vol_ratio = recent_vol / avg_vol
        if vol_ratio > 1.5:
            # High volume — confirms current direction
            if close.iloc[-1] > close.iloc[-2]:
                score += 15
                signals.append(f"Volume tinggi ({vol_ratio:.1f}x) konfirmasi bullish")
            else:
                score -= 15
                signals.append(f"Volume tinggi ({vol_ratio:.1f}x) konfirmasi bearish")
        elif vol_ratio < 0.5:
            # Low volume — weakens current move
            score *= 0.8  # Reduce conviction
            signals.append(f"Volume rendah ({vol_ratio:.1f}x) — pergerakan kurang meyakinkan")

    # Clamp score to -100 to +100
    score = max(-100.0, min(100.0, score))

    return VolumeProfileResult(
        score=round(score, 1),
        obv_trend=obv_trend,
        money_flow=money_flow,
        signals=signals,
    )


def _normalize_score(value: float, from_min: float, from_max: float) -> float:
    """Normalize a value to -100 to +100 range."""
    if from_max == from_min:
        return 0.0
    normalized = ((value - from_min) / (from_max - from_min)) * 200 - 100
    return max(-100.0, min(100.0, normalized))


def _compute_signal_agreement(
    ta_score: float, ml_score: float, sentiment_score: float, volume_score: float
) -> tuple:
    """
    Compute how many models agree on direction.
    Returns (agreement_count, label).
    """
    scores = [ta_score, ml_score, sentiment_score, volume_score]
    bullish = sum(1 for s in scores if s > 10)
    bearish = sum(1 for s in scores if s < -10)

    agreement = max(bullish, bearish)

    if agreement == 4:
        label = "strong_consensus"
    elif agreement == 3:
        label = "majority"
    elif agreement == 2:
        label = "mixed"
    else:
        label = "conflicting"

    return agreement, label


def _compute_enhanced_entry(
    current_price: float,
    atr_val: float,
    combined_score: float,
    signal_agreement: int,
) -> EnhancedEntryPoint:
    """
    Compute enhanced entry point. Uses tighter stop loss when all models agree.
    """
    # Tighter stops when there is strong agreement
    if signal_agreement >= 4:
        stop_mult = 1.0  # Tight stop
        stop_type = "tight"
    elif signal_agreement >= 3:
        stop_mult = 1.2
        stop_type = "tight"
    else:
        stop_mult = 1.5  # Normal stop
        stop_type = "normal"

    if combined_score > 10:
        # Bullish entry
        entry_price = current_price - (atr_val * 0.2)
        stop_loss = entry_price - (atr_val * stop_mult)
        target_1 = entry_price + (atr_val * 2.0)
        target_2 = entry_price + (atr_val * 3.5)
        entry_type = "buy"
        reasoning = "Semua model menunjukkan bias bullish. " if signal_agreement >= 3 else "Mayoritas model bullish. "
        reasoning += f"Stop loss {'ketat' if stop_type == 'tight' else 'normal'} berdasarkan agreement level."
    elif combined_score < -10:
        # Bearish entry
        entry_price = current_price + (atr_val * 0.2)
        stop_loss = entry_price + (atr_val * stop_mult)
        target_1 = entry_price - (atr_val * 2.0)
        target_2 = entry_price - (atr_val * 3.5)
        entry_type = "sell"
        reasoning = "Semua model menunjukkan bias bearish. " if signal_agreement >= 3 else "Mayoritas model bearish. "
        reasoning += f"Stop loss {'ketat' if stop_type == 'tight' else 'normal'} berdasarkan agreement level."
    else:
        # Neutral — conservative entry
        entry_price = current_price - (atr_val * 0.5)
        stop_loss = entry_price - (atr_val * 1.5)
        target_1 = entry_price + (atr_val * 1.5)
        target_2 = entry_price + (atr_val * 2.5)
        entry_type = "buy"
        stop_type = "normal"
        reasoning = "Sinyal campur — tunggu konfirmasi atau entry di support kuat dengan stop normal."

    # Risk/reward
    risk = abs(entry_price - stop_loss)
    reward = abs(target_1 - entry_price)
    rr = reward / risk if risk > 0 else 0.0

    return EnhancedEntryPoint(
        entry_price=round(entry_price, 2),
        stop_loss=round(stop_loss, 2),
        target_1=round(target_1, 2),
        target_2=round(target_2, 2),
        risk_reward_ratio=round(rr, 2),
        entry_type=entry_type,
        reasoning=reasoning,
        stop_loss_type=stop_type,
    )


def generate_enhanced_prediction(
    candles: List[OHLCV],
    symbol: str,
    news_headlines: Optional[List[str]] = None,
) -> EnhancedPredictionResult:
    """
    Generate enhanced prediction combining multiple analysis models.

    Combines:
    - Technical Analysis (35% weight)
    - ML Ensemble prediction (30% weight)
    - News Sentiment analysis (20% weight)
    - Volume Profile analysis (15% weight)

    Args:
        candles: List of OHLCV candle data
        symbol: Stock ticker symbol
        news_headlines: Optional list of news headlines for sentiment analysis

    Returns:
        EnhancedPredictionResult with combined scoring and confidence
    """
    df = _to_dataframe(candles)

    if df.empty or len(df) < 50:
        current = float(df["close"].iloc[-1]) if not df.empty else 0.0
        return EnhancedPredictionResult(
            symbol=symbol.upper(),
            current_price=current,
            combined_score=0.0,
            confidence=0.0,
            direction="neutral",
            signal_agreement=0,
            agreement_label="conflicting",
            model_breakdown=ModelBreakdown(
                ta_score=0, ta_confidence=0,
                ml_score=0, ml_confidence=0,
                sentiment_score=0, sentiment_confidence=0,
                volume_score=0, volume_confidence=0,
            ),
            entry_point=EnhancedEntryPoint(
                entry_price=current,
                stop_loss=current * 0.95,
                target_1=current * 1.05,
                target_2=current * 1.10,
                risk_reward_ratio=1.0,
                entry_type="buy",
                reasoning="Data tidak cukup untuk analisis multi-model.",
                stop_loss_type="normal",
            ),
            predictions={},
            volume_profile=VolumeProfileResult(
                score=0, obv_trend="neutral", money_flow="neutral", signals=[]
            ),
            disclaimer="Data historis tidak cukup (minimum 50 candles).",
        )

    current_price = float(df["close"].iloc[-1])

    # --- 1. Technical Analysis ---
    ta_result = generate_prediction(candles, symbol)
    ta_score = ta_result.overall_score  # Already -100 to +100
    # Average confidence from TA predictions
    ta_confidences = [p.confidence for p in ta_result.predictions]
    ta_confidence = sum(ta_confidences) / len(ta_confidences) if ta_confidences else 50.0

    # --- 2. ML Ensemble ---
    ml_result = generate_ml_prediction(candles, symbol)
    # Convert ML prediction to -100 to +100 score
    # Use the 1-week prediction as the primary ML signal
    ml_pred_1w = ml_result.predictions.get("1w", {})
    ml_change_pct = ml_pred_1w.get("predicted_change_pct", 0.0)
    # Map change percentage to score: +-5% maps to +-100
    ml_score = max(-100.0, min(100.0, ml_change_pct * 20))
    ml_confidence = ml_pred_1w.get("confidence", 0.0)

    # --- 3. Sentiment Analysis ---
    if news_headlines and len(news_headlines) > 0:
        sentiment_result = analyze_headlines(news_headlines, symbol)
        # Convert sentiment score (-1 to +1) to (-100 to +100)
        sentiment_score = sentiment_result.overall_score * 100.0
        sentiment_confidence = sentiment_result.confidence
    else:
        sentiment_score = 0.0
        sentiment_confidence = 0.0

    # --- 4. Volume Profile ---
    volume_profile = compute_volume_profile(df)
    volume_score = volume_profile.score
    # Volume confidence based on data availability and signal strength
    volume_confidence = min(75.0, 30.0 + abs(volume_score) * 0.45)

    # --- Combine Scores (weighted) ---
    # If sentiment has no data, redistribute its weight
    if news_headlines and len(news_headlines) > 0:
        w_ta = WEIGHT_TA
        w_ml = WEIGHT_ML
        w_sent = WEIGHT_SENTIMENT
        w_vol = WEIGHT_VOLUME
    else:
        # Redistribute sentiment weight proportionally
        w_ta = WEIGHT_TA + WEIGHT_SENTIMENT * (WEIGHT_TA / (WEIGHT_TA + WEIGHT_ML + WEIGHT_VOLUME))
        w_ml = WEIGHT_ML + WEIGHT_SENTIMENT * (WEIGHT_ML / (WEIGHT_TA + WEIGHT_ML + WEIGHT_VOLUME))
        w_sent = 0.0
        w_vol = WEIGHT_VOLUME + WEIGHT_SENTIMENT * (WEIGHT_VOLUME / (WEIGHT_TA + WEIGHT_ML + WEIGHT_VOLUME))

    combined_score = (
        ta_score * w_ta
        + ml_score * w_ml
        + sentiment_score * w_sent
        + volume_score * w_vol
    )
    combined_score = max(-100.0, min(100.0, combined_score))

    # --- Confidence (weighted average) ---
    if w_sent > 0:
        combined_confidence = (
            ta_confidence * w_ta
            + ml_confidence * w_ml
            + sentiment_confidence * w_sent
            + volume_confidence * w_vol
        )
    else:
        combined_confidence = (
            ta_confidence * w_ta
            + ml_confidence * w_ml
            + volume_confidence * w_vol
        ) / (w_ta + w_ml + w_vol)  # Normalize since weights don't sum to 1 without sentiment
        combined_confidence *= (w_ta + w_ml + w_vol)

    combined_confidence = max(0.0, min(100.0, combined_confidence))

    # --- Signal Agreement ---
    signal_agreement, agreement_label = _compute_signal_agreement(
        ta_score, ml_score, sentiment_score, volume_score
    )

    # --- Direction ---
    if combined_score > 15:
        direction = "bullish"
    elif combined_score < -15:
        direction = "bearish"
    else:
        direction = "neutral"

    # --- Enhanced Entry Point ---
    # Estimate ATR from data
    high = df["high"].astype(float)
    low = df["low"].astype(float)
    close = df["close"].astype(float)
    tr = pd.concat([
        high - low,
        (high - close.shift(1)).abs(),
        (low - close.shift(1)).abs(),
    ], axis=1).max(axis=1)
    atr_val = float(tr.rolling(14).mean().iloc[-1]) if not pd.isna(tr.rolling(14).mean().iloc[-1]) else current_price * 0.02

    entry_point = _compute_enhanced_entry(
        current_price, atr_val, combined_score, signal_agreement
    )

    # --- Predictions per timeframe (merged from TA and ML) ---
    predictions = {}
    for tf in ["1d", "1w", "1m"]:
        ta_pred = next((p for p in ta_result.predictions if p.timeframe == tf), None)
        ml_pred = ml_result.predictions.get(tf, {})

        tf_data = {
            "direction": direction,
            "ta_direction": ta_pred.direction if ta_pred else "neutral",
            "ml_direction": ml_pred.get("direction", "neutral"),
            "ta_confidence": ta_pred.confidence if ta_pred else 0,
            "ml_confidence": ml_pred.get("confidence", 0),
        }

        if ta_pred:
            tf_data["predicted_range"] = {
                "low": ta_pred.predicted_low,
                "high": ta_pred.predicted_high,
            }
        if ml_pred:
            tf_data["ml_predicted_price"] = ml_pred.get("predicted_price", current_price)
            tf_data["ml_predicted_change_pct"] = ml_pred.get("predicted_change_pct", 0)

        predictions[tf] = tf_data

    # --- Model Breakdown ---
    model_breakdown = ModelBreakdown(
        ta_score=round(ta_score, 1),
        ta_confidence=round(ta_confidence, 1),
        ml_score=round(ml_score, 1),
        ml_confidence=round(ml_confidence, 1),
        sentiment_score=round(sentiment_score, 1),
        sentiment_confidence=round(sentiment_confidence, 1),
        volume_score=round(volume_score, 1),
        volume_confidence=round(volume_confidence, 1),
    )

    return EnhancedPredictionResult(
        symbol=symbol.upper(),
        current_price=round(current_price, 2),
        combined_score=round(combined_score, 1),
        confidence=round(combined_confidence, 1),
        direction=direction,
        signal_agreement=signal_agreement,
        agreement_label=agreement_label,
        model_breakdown=model_breakdown,
        entry_point=entry_point,
        predictions=predictions,
        volume_profile=volume_profile,
        disclaimer=(
            "Prediksi multi-model (TA + ML + Sentiment + Volume). "
            "Akurasi estimasi: 60-65%. Gunakan risk management yang ketat."
        ),
    )
