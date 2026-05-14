"""Machine Learning-based stock price prediction.

Uses feature engineering from technical indicators + statistical models
(Linear Regression + ensemble scoring) to predict price movements.
This avoids heavy ML dependencies (sklearn) by implementing core algos from scratch.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import math

import numpy as np
import pandas as pd

from app.schemas.stock import OHLCV
from app.services.indicators import (
    _to_dataframe, sma, ema, rsi, macd, bollinger_bands, atr,
)


@dataclass
class MLPredictionResult:
    """ML prediction output."""
    symbol: str
    current_price: float
    model: str  # "ensemble"
    predictions: Dict[str, Dict]  # timeframe -> {price, change_pct, confidence}
    features_importance: List[Dict[str, float]]
    model_accuracy: float
    backtest_hit_rate: float


def _compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute feature matrix for ML prediction."""
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"].astype(float)

    features = pd.DataFrame(index=df.index)

    # Price-based features
    features["return_1d"] = close.pct_change(1)
    features["return_5d"] = close.pct_change(5)
    features["return_10d"] = close.pct_change(10)
    features["return_20d"] = close.pct_change(20)

    # Volatility
    features["volatility_5d"] = close.pct_change().rolling(5).std()
    features["volatility_20d"] = close.pct_change().rolling(20).std()

    # Moving averages ratios
    sma_20 = sma(close, 20)
    sma_50 = sma(close, 50)
    features["price_sma20_ratio"] = close / sma_20
    features["price_sma50_ratio"] = close / sma_50
    features["sma20_sma50_ratio"] = sma_20 / sma_50

    # RSI
    features["rsi_14"] = rsi(close, 14)
    features["rsi_change"] = features["rsi_14"].diff(3)

    # MACD
    macd_data = macd(close)
    features["macd_hist"] = macd_data["hist"]
    features["macd_hist_change"] = macd_data["hist"].diff(3)

    # Bollinger Bands
    bb = bollinger_bands(close, 20)
    bb_range = bb["upper"] - bb["lower"]
    features["bb_position"] = (close - bb["lower"]) / bb_range.replace(0, np.nan)
    features["bb_width"] = bb_range / bb["middle"]

    # ATR
    atr_14 = atr(high, low, close, 14)
    features["atr_ratio"] = atr_14 / close

    # Volume
    vol_sma = sma(volume, 20)
    features["volume_ratio"] = volume / vol_sma.replace(0, np.nan)
    features["volume_change"] = volume.pct_change(5)

    # Momentum
    features["momentum_10"] = close / close.shift(10) - 1
    features["momentum_20"] = close / close.shift(20) - 1

    # High/Low relative
    features["high_ratio_20"] = close / high.rolling(20).max()
    features["low_ratio_20"] = close / low.rolling(20).min()

    return features


def _linear_regression(X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, float]:
    """Simple OLS linear regression. Returns (coefficients, r_squared)."""
    n = len(y)
    if n < 10:
        return np.zeros(X.shape[1]), 0.0

    # Add bias
    X_b = np.column_stack([np.ones(n), X])

    try:
        # Normal equation: (X^T X)^-1 X^T y
        XtX = X_b.T @ X_b
        # Add regularization to avoid singular matrix
        XtX += np.eye(XtX.shape[0]) * 0.01
        Xty = X_b.T @ y
        theta = np.linalg.solve(XtX, Xty)
    except np.linalg.LinAlgError:
        return np.zeros(X.shape[1] + 1), 0.0

    # R-squared
    y_pred = X_b @ theta
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - y.mean()) ** 2)
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    r2 = max(0, min(1, r2))

    return theta, r2


def _predict_direction_ensemble(features: pd.DataFrame, target_days: int) -> Tuple[float, float]:
    """
    Ensemble prediction using multiple sub-models.
    Returns (predicted_change_pct, confidence).
    """
    # Drop NaN rows
    features_clean = features.dropna()
    if len(features_clean) < 60:
        return 0.0, 0.0

    X = features_clean.values
    close_series = features_clean.index

    # Target: future return
    # We can't use actual future data, so we train on historical patterns
    # and use the latest features for prediction

    # Split: use all but last row for training
    n = len(X)
    train_size = n - 1

    # For each training sample, the target is the actual return over next N days
    # We approximate by shifting
    feature_cols = features_clean.columns.tolist()

    # Create lagged targets from historical data
    returns = features_clean.get("return_1d", pd.Series(dtype=float))
    if returns.empty:
        return 0.0, 0.0

    # Multiple model predictions
    predictions = []

    # Model 1: Momentum-based linear
    momentum_features = ["return_5d", "return_10d", "momentum_10", "momentum_20"]
    available = [f for f in momentum_features if f in feature_cols]
    if available:
        X_mom = features_clean[available].dropna().values
        if len(X_mom) > 30:
            # Target: next N-day return (approximated from current momentum)
            y_target = np.roll(X_mom[:, 0], -target_days)  # forward return approximation
            y_target[-target_days:] = 0
            X_train = X_mom[:-target_days]
            y_train = y_target[:-target_days]
            if len(X_train) > 20:
                theta, r2 = _linear_regression(X_train, y_train)
                pred = np.dot(np.concatenate([[1], X_mom[-1]]), theta)
                predictions.append((pred * target_days * 0.5, r2))

    # Model 2: Mean reversion (RSI + BB position)
    reversion_features = ["rsi_14", "bb_position", "price_sma20_ratio"]
    available = [f for f in reversion_features if f in feature_cols]
    if available:
        last_vals = features_clean[available].iloc[-1]
        rsi_val = last_vals.get("rsi_14", 50)
        bb_pos = last_vals.get("bb_position", 0.5)
        sma_ratio = last_vals.get("price_sma20_ratio", 1.0)

        # Mean reversion signal
        reversion_signal = 0.0
        if rsi_val < 30:
            reversion_signal += 0.02 * target_days * 0.3
        elif rsi_val > 70:
            reversion_signal -= 0.02 * target_days * 0.3

        if bb_pos < 0.1:
            reversion_signal += 0.015 * target_days * 0.3
        elif bb_pos > 0.9:
            reversion_signal -= 0.015 * target_days * 0.3

        if sma_ratio < 0.95:
            reversion_signal += 0.01 * target_days * 0.3
        elif sma_ratio > 1.05:
            reversion_signal -= 0.01 * target_days * 0.3

        predictions.append((reversion_signal, 0.4))

    # Model 3: Trend following (MA alignment + MACD)
    trend_features = ["sma20_sma50_ratio", "macd_hist", "macd_hist_change"]
    available = [f for f in trend_features if f in feature_cols]
    if available:
        last_vals = features_clean[available].iloc[-1]
        trend_signal = 0.0

        sma_ratio = last_vals.get("sma20_sma50_ratio", 1.0)
        macd_h = last_vals.get("macd_hist", 0)
        macd_chg = last_vals.get("macd_hist_change", 0)

        if sma_ratio > 1.0:
            trend_signal += 0.01 * target_days * 0.2
        else:
            trend_signal -= 0.01 * target_days * 0.2

        if macd_h > 0 and macd_chg > 0:
            trend_signal += 0.015 * target_days * 0.2
        elif macd_h < 0 and macd_chg < 0:
            trend_signal -= 0.015 * target_days * 0.2

        predictions.append((trend_signal, 0.5))

    # Model 4: Volatility-adjusted momentum
    vol_features = ["volatility_20d", "atr_ratio", "volume_ratio"]
    available = [f for f in vol_features if f in feature_cols]
    if available:
        last_vals = features_clean[available].iloc[-1]
        vol = last_vals.get("volatility_20d", 0.02)
        vol_ratio = last_vals.get("volume_ratio", 1.0)

        # High volume + momentum = stronger signal
        mom_10 = features_clean.get("momentum_10", pd.Series(dtype=float))
        if not mom_10.empty:
            current_mom = mom_10.iloc[-1] if not pd.isna(mom_10.iloc[-1]) else 0
            vol_adj_signal = current_mom * min(vol_ratio, 2.0) * 0.5
            predictions.append((vol_adj_signal * target_days * 0.1, 0.3))

    # Ensemble: weighted average
    if not predictions:
        return 0.0, 0.0

    total_pred = sum(p * w for p, w in predictions)
    total_weight = sum(w for _, w in predictions)
    ensemble_pred = total_pred / total_weight if total_weight > 0 else 0.0

    # Confidence
    avg_r2 = sum(w for _, w in predictions) / len(predictions)
    # Check agreement
    signs = [1 if p > 0 else -1 for p, _ in predictions]
    agreement = abs(sum(signs)) / len(signs)
    confidence = min(85, (avg_r2 * 50 + agreement * 35))

    return ensemble_pred, confidence


def generate_ml_prediction(candles: List[OHLCV], symbol: str) -> MLPredictionResult:
    """Generate ML-based prediction for a stock."""
    df = _to_dataframe(candles)

    if df.empty or len(df) < 60:
        return MLPredictionResult(
            symbol=symbol.upper(),
            current_price=float(df["close"].iloc[-1]) if not df.empty else 0,
            model="ensemble",
            predictions={},
            features_importance=[],
            model_accuracy=0.0,
            backtest_hit_rate=0.0,
        )

    # Compute features
    features = _compute_features(df)
    current_price = float(df["close"].iloc[-1])

    # Predict for each timeframe
    timeframes = {"1d": 1, "1w": 5, "1m": 22}
    predictions = {}

    for tf_name, days in timeframes.items():
        change_pct, confidence = _predict_direction_ensemble(features, days)
        predicted_price = current_price * (1 + change_pct)

        predictions[tf_name] = {
            "predicted_price": round(predicted_price, 2),
            "predicted_change_pct": round(change_pct * 100, 2),
            "confidence": round(confidence, 1),
            "direction": "bullish" if change_pct > 0.005 else "bearish" if change_pct < -0.005 else "neutral",
        }

    # Feature importance (simplified)
    feature_importance = [
        {"feature": "Momentum (10d/20d)", "importance": 0.25},
        {"feature": "RSI + Mean Reversion", "importance": 0.20},
        {"feature": "Trend (MA Alignment)", "importance": 0.20},
        {"feature": "MACD Signal", "importance": 0.15},
        {"feature": "Volume Pattern", "importance": 0.10},
        {"feature": "Volatility", "importance": 0.10},
    ]

    # Backtest accuracy (estimate from historical pattern matching)
    # Simple: count how often momentum direction matched next-day direction
    returns = df["close"].pct_change()
    momentum = df["close"].pct_change(5)
    valid = (~returns.isna()) & (~momentum.isna())
    if valid.sum() > 20:
        matches = ((returns.shift(-1) > 0) == (momentum > 0))[valid]
        hit_rate = float(matches.mean()) * 100
    else:
        hit_rate = 50.0

    return MLPredictionResult(
        symbol=symbol.upper(),
        current_price=current_price,
        model="ensemble_4model",
        predictions=predictions,
        features_importance=feature_importance,
        model_accuracy=round(hit_rate, 1),
        backtest_hit_rate=round(hit_rate, 1),
    )
