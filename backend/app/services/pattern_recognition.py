"""Technical chart pattern recognition service.

Detects chart patterns from OHLCV data using swing point detection:
Head & Shoulders, Double Top/Bottom, Cup & Handle, Triangles,
Flag/Pennant patterns.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd

from app.schemas.stock import OHLCV


@dataclass
class SwingPoint:
    """A detected swing high or swing low."""
    index: int
    date: str
    price: float
    swing_type: str  # "high" or "low"


@dataclass
class PatternMatch:
    """A detected chart pattern."""
    pattern_name: str
    pattern_type: str  # "reversal" or "continuation"
    direction: str  # "bullish" or "bearish"
    confidence: float  # 0-100%
    start_index: int
    end_index: int
    start_date: str
    end_date: str
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    risk_reward: Optional[float] = None
    neckline: Optional[float] = None
    breakout_level: Optional[float] = None
    description: str = ""


@dataclass
class PatternRecognitionResult:
    """Complete pattern recognition analysis."""
    symbol: str
    num_candles: int
    swing_highs: List[SwingPoint]
    swing_lows: List[SwingPoint]
    patterns: List[PatternMatch]
    dominant_pattern: Optional[PatternMatch] = None
    overall_bias: str = "Neutral"  # "Bullish", "Bearish", "Neutral"
    summary: str = ""


def _to_arrays(candles: List[OHLCV]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str]]:
    """Convert OHLCV list to numpy arrays."""
    opens = np.array([c.open for c in candles], dtype=float)
    highs = np.array([c.high for c in candles], dtype=float)
    lows = np.array([c.low for c in candles], dtype=float)
    closes = np.array([c.close for c in candles], dtype=float)
    dates = [c.date for c in candles]
    return opens, highs, lows, closes, dates


def detect_swing_points(
    highs: np.ndarray,
    lows: np.ndarray,
    dates: List[str],
    lookback: int = 5,
) -> Tuple[List[SwingPoint], List[SwingPoint]]:
    """Detect swing highs and swing lows using lookback window.

    A swing high is a bar whose high is higher than the N bars on
    either side. Similarly for swing lows.

    Args:
        highs: Array of high prices.
        lows: Array of low prices.
        dates: List of date strings.
        lookback: Number of bars on each side to confirm swing.

    Returns:
        Tuple of (swing_highs, swing_lows).
    """
    n = len(highs)
    swing_highs: List[SwingPoint] = []
    swing_lows: List[SwingPoint] = []

    for i in range(lookback, n - lookback):
        # Swing High
        is_swing_high = True
        for j in range(1, lookback + 1):
            if highs[i] <= highs[i - j] or highs[i] <= highs[i + j]:
                is_swing_high = False
                break
        if is_swing_high:
            swing_highs.append(SwingPoint(
                index=i,
                date=dates[i],
                price=float(highs[i]),
                swing_type="high",
            ))

        # Swing Low
        is_swing_low = True
        for j in range(1, lookback + 1):
            if lows[i] >= lows[i - j] or lows[i] >= lows[i + j]:
                is_swing_low = False
                break
        if is_swing_low:
            swing_lows.append(SwingPoint(
                index=i,
                date=dates[i],
                price=float(lows[i]),
                swing_type="low",
            ))

    return swing_highs, swing_lows


def _detect_head_and_shoulders(
    swing_highs: List[SwingPoint],
    swing_lows: List[SwingPoint],
    closes: np.ndarray,
    dates: List[str],
    tolerance: float = 0.03,
) -> List[PatternMatch]:
    """Detect Head & Shoulders pattern (bearish reversal)."""
    patterns = []
    if len(swing_highs) < 3 or len(swing_lows) < 2:
        return patterns

    for i in range(len(swing_highs) - 2):
        left_shoulder = swing_highs[i]
        head = swing_highs[i + 1]
        right_shoulder = swing_highs[i + 2]

        # Head must be highest
        if head.price <= left_shoulder.price or head.price <= right_shoulder.price:
            continue

        # Shoulders should be roughly equal (within tolerance)
        shoulder_diff = abs(left_shoulder.price - right_shoulder.price) / left_shoulder.price
        if shoulder_diff > tolerance:
            continue

        # Find neckline (connect lows between shoulders)
        neckline_lows = [
            sl for sl in swing_lows
            if left_shoulder.index < sl.index < right_shoulder.index
        ]
        if not neckline_lows:
            continue

        neckline = np.mean([sl.price for sl in neckline_lows])
        pattern_height = head.price - neckline

        # Confidence based on symmetry and proportions
        symmetry = 1 - shoulder_diff / tolerance
        head_prominence = (head.price - left_shoulder.price) / left_shoulder.price
        confidence = min(90, 50 + symmetry * 20 + head_prominence * 100)

        target = neckline - pattern_height  # Measured move
        stop_loss = head.price * 1.01

        risk = abs(neckline - stop_loss)
        reward = abs(neckline - target)
        rr = reward / risk if risk > 0 else 0

        patterns.append(PatternMatch(
            pattern_name="Head & Shoulders",
            pattern_type="reversal",
            direction="bearish",
            confidence=round(confidence, 1),
            start_index=left_shoulder.index,
            end_index=right_shoulder.index,
            start_date=dates[left_shoulder.index],
            end_date=dates[right_shoulder.index],
            entry_price=round(neckline, 2),
            target_price=round(target, 2),
            stop_loss=round(stop_loss, 2),
            risk_reward=round(rr, 2),
            neckline=round(neckline, 2),
            breakout_level=round(neckline, 2),
            description=(
                f"Head & Shoulders top detected. Head at {head.price:.2f}, "
                f"shoulders at ~{left_shoulder.price:.2f}. "
                f"Neckline: {neckline:.2f}. Target: {target:.2f}"
            ),
        ))

    return patterns


def _detect_double_top(
    swing_highs: List[SwingPoint],
    swing_lows: List[SwingPoint],
    closes: np.ndarray,
    dates: List[str],
    tolerance: float = 0.02,
) -> List[PatternMatch]:
    """Detect Double Top pattern (bearish reversal)."""
    patterns = []
    if len(swing_highs) < 2:
        return patterns

    for i in range(len(swing_highs) - 1):
        top1 = swing_highs[i]
        top2 = swing_highs[i + 1]

        # Tops should be at similar levels
        price_diff = abs(top1.price - top2.price) / top1.price
        if price_diff > tolerance:
            continue

        # Need some separation between tops
        if top2.index - top1.index < 10:
            continue

        # Find the valley between tops
        valley_lows = [sl for sl in swing_lows if top1.index < sl.index < top2.index]
        if not valley_lows:
            continue

        valley = min(valley_lows, key=lambda s: s.price)
        neckline = valley.price
        pattern_height = top1.price - neckline

        confidence = min(85, 55 + (1 - price_diff / tolerance) * 30)
        target = neckline - pattern_height
        stop_loss = max(top1.price, top2.price) * 1.01

        risk = abs(neckline - stop_loss)
        reward = abs(neckline - target)
        rr = reward / risk if risk > 0 else 0

        patterns.append(PatternMatch(
            pattern_name="Double Top",
            pattern_type="reversal",
            direction="bearish",
            confidence=round(confidence, 1),
            start_index=top1.index,
            end_index=top2.index,
            start_date=dates[top1.index],
            end_date=dates[top2.index],
            entry_price=round(neckline, 2),
            target_price=round(target, 2),
            stop_loss=round(stop_loss, 2),
            risk_reward=round(rr, 2),
            neckline=round(neckline, 2),
            breakout_level=round(neckline, 2),
            description=f"Double Top at ~{top1.price:.2f}. Neckline: {neckline:.2f}.",
        ))

    return patterns


def _detect_double_bottom(
    swing_lows: List[SwingPoint],
    swing_highs: List[SwingPoint],
    closes: np.ndarray,
    dates: List[str],
    tolerance: float = 0.02,
) -> List[PatternMatch]:
    """Detect Double Bottom pattern (bullish reversal)."""
    patterns = []
    if len(swing_lows) < 2:
        return patterns

    for i in range(len(swing_lows) - 1):
        bot1 = swing_lows[i]
        bot2 = swing_lows[i + 1]

        price_diff = abs(bot1.price - bot2.price) / bot1.price
        if price_diff > tolerance:
            continue

        if bot2.index - bot1.index < 10:
            continue

        peak_highs = [sh for sh in swing_highs if bot1.index < sh.index < bot2.index]
        if not peak_highs:
            continue

        peak = max(peak_highs, key=lambda s: s.price)
        neckline = peak.price
        pattern_height = neckline - bot1.price

        confidence = min(85, 55 + (1 - price_diff / tolerance) * 30)
        target = neckline + pattern_height
        stop_loss = min(bot1.price, bot2.price) * 0.99

        risk = abs(neckline - stop_loss)
        reward = abs(target - neckline)
        rr = reward / risk if risk > 0 else 0

        patterns.append(PatternMatch(
            pattern_name="Double Bottom",
            pattern_type="reversal",
            direction="bullish",
            confidence=round(confidence, 1),
            start_index=bot1.index,
            end_index=bot2.index,
            start_date=dates[bot1.index],
            end_date=dates[bot2.index],
            entry_price=round(neckline, 2),
            target_price=round(target, 2),
            stop_loss=round(stop_loss, 2),
            risk_reward=round(rr, 2),
            neckline=round(neckline, 2),
            breakout_level=round(neckline, 2),
            description=f"Double Bottom at ~{bot1.price:.2f}. Neckline: {neckline:.2f}.",
        ))

    return patterns


def _detect_triangle(
    swing_highs: List[SwingPoint],
    swing_lows: List[SwingPoint],
    closes: np.ndarray,
    dates: List[str],
) -> List[PatternMatch]:
    """Detect Triangle patterns (ascending, descending, symmetrical)."""
    patterns = []
    if len(swing_highs) < 3 or len(swing_lows) < 3:
        return patterns

    # Use last several swing points
    recent_highs = swing_highs[-4:]
    recent_lows = swing_lows[-4:]

    if len(recent_highs) >= 2 and len(recent_lows) >= 2:
        # Trend of highs
        high_prices = [s.price for s in recent_highs]
        low_prices = [s.price for s in recent_lows]

        high_slope = (high_prices[-1] - high_prices[0]) / max(1, len(high_prices) - 1)
        low_slope = (low_prices[-1] - low_prices[0]) / max(1, len(low_prices) - 1)

        avg_price = np.mean(closes[-50:]) if len(closes) >= 50 else np.mean(closes)
        high_slope_norm = high_slope / avg_price
        low_slope_norm = low_slope / avg_price

        triangle_type = None
        direction = "neutral"

        if abs(high_slope_norm) < 0.001 and low_slope_norm > 0.001:
            triangle_type = "Ascending Triangle"
            direction = "bullish"
        elif high_slope_norm < -0.001 and abs(low_slope_norm) < 0.001:
            triangle_type = "Descending Triangle"
            direction = "bearish"
        elif high_slope_norm < -0.0005 and low_slope_norm > 0.0005:
            triangle_type = "Symmetrical Triangle"
            direction = "bullish"  # Typically breaks in trend direction

        if triangle_type:
            start_idx = min(recent_highs[0].index, recent_lows[0].index)
            end_idx = max(recent_highs[-1].index, recent_lows[-1].index)

            breakout_level = high_prices[-1] if direction == "bullish" else low_prices[-1]
            height = max(high_prices) - min(low_prices)
            target = breakout_level + height if direction == "bullish" else breakout_level - height
            stop_loss = low_prices[-1] if direction == "bullish" else high_prices[-1]

            risk = abs(breakout_level - stop_loss)
            reward = abs(target - breakout_level)
            rr = reward / risk if risk > 0 else 0

            patterns.append(PatternMatch(
                pattern_name=triangle_type,
                pattern_type="continuation",
                direction=direction,
                confidence=round(60 + abs(high_slope_norm + low_slope_norm) * 1000, 1),
                start_index=start_idx,
                end_index=end_idx,
                start_date=dates[start_idx],
                end_date=dates[min(end_idx, len(dates) - 1)],
                entry_price=round(breakout_level, 2),
                target_price=round(target, 2),
                stop_loss=round(stop_loss, 2),
                risk_reward=round(rr, 2),
                breakout_level=round(breakout_level, 2),
                description=f"{triangle_type} forming. Breakout level: {breakout_level:.2f}.",
            ))

    return patterns


def _detect_cup_and_handle(
    swing_highs: List[SwingPoint],
    swing_lows: List[SwingPoint],
    closes: np.ndarray,
    dates: List[str],
) -> List[PatternMatch]:
    """Detect Cup & Handle pattern (bullish continuation)."""
    patterns = []
    n = len(closes)
    if n < 40:
        return patterns

    # Look for U-shaped formation in the last ~60 bars
    window = min(60, n)
    segment = closes[-window:]
    
    # Find the cup: high -> low -> high
    mid_idx = len(segment) // 2
    left_high = np.max(segment[:mid_idx // 2 + 5])
    cup_low = np.min(segment[mid_idx // 4:mid_idx + mid_idx // 4])
    right_high = np.max(segment[mid_idx:])

    # Cup should have roughly equal lips
    lip_diff = abs(left_high - right_high) / left_high
    cup_depth = (left_high - cup_low) / left_high

    if lip_diff < 0.05 and 0.1 < cup_depth < 0.35:
        # Valid cup shape
        neckline = min(left_high, right_high)
        target = neckline + (neckline - cup_low)
        stop_loss = cup_low * 0.98

        confidence = min(80, 50 + (1 - lip_diff / 0.05) * 15 + cup_depth * 50)

        risk = abs(neckline - stop_loss)
        reward = abs(target - neckline)
        rr = reward / risk if risk > 0 else 0

        start_idx = n - window
        end_idx = n - 1

        patterns.append(PatternMatch(
            pattern_name="Cup & Handle",
            pattern_type="continuation",
            direction="bullish",
            confidence=round(confidence, 1),
            start_index=start_idx,
            end_index=end_idx,
            start_date=dates[start_idx],
            end_date=dates[end_idx],
            entry_price=round(neckline, 2),
            target_price=round(target, 2),
            stop_loss=round(stop_loss, 2),
            risk_reward=round(rr, 2),
            neckline=round(neckline, 2),
            breakout_level=round(neckline, 2),
            description=f"Cup & Handle. Cup depth: {cup_depth*100:.1f}%. Rim: {neckline:.2f}.",
        ))

    return patterns


def _detect_flag_pennant(
    closes: np.ndarray,
    highs: np.ndarray,
    lows: np.ndarray,
    dates: List[str],
) -> List[PatternMatch]:
    """Detect Flag and Pennant patterns (continuation)."""
    patterns = []
    n = len(closes)
    if n < 30:
        return patterns

    # Look for a strong move (pole) followed by consolidation (flag)
    pole_len = 15
    flag_len = 10

    if n < pole_len + flag_len:
        return patterns

    pole_segment = closes[-(pole_len + flag_len):-flag_len]
    flag_segment = closes[-flag_len:]

    pole_move = (pole_segment[-1] - pole_segment[0]) / pole_segment[0]
    flag_range = (np.max(flag_segment) - np.min(flag_segment)) / np.mean(flag_segment)

    # Strong pole (>5% move) with tight consolidation (<3% range)
    if abs(pole_move) > 0.05 and flag_range < 0.03:
        is_bullish = pole_move > 0
        direction = "bullish" if is_bullish else "bearish"

        # Determine if flag or pennant
        flag_highs = highs[-flag_len:]
        flag_lows = lows[-flag_len:]
        high_range = np.max(flag_highs) - np.min(flag_highs)
        low_range = np.max(flag_lows) - np.min(flag_lows)

        converging = (high_range > low_range * 0.5)
        pattern_name = "Pennant" if converging else "Bull Flag" if is_bullish else "Bear Flag"

        breakout_level = float(np.max(flag_segment) if is_bullish else np.min(flag_segment))
        pole_height = abs(pole_segment[-1] - pole_segment[0])
        target = breakout_level + pole_height if is_bullish else breakout_level - pole_height
        stop_loss = float(np.min(flag_segment) if is_bullish else np.max(flag_segment))

        risk = abs(breakout_level - stop_loss)
        reward = abs(target - breakout_level)
        rr = reward / risk if risk > 0 else 0

        confidence = min(80, 50 + abs(pole_move) * 200 + (0.03 - flag_range) * 500)

        start_idx = n - pole_len - flag_len
        end_idx = n - 1

        patterns.append(PatternMatch(
            pattern_name=pattern_name,
            pattern_type="continuation",
            direction=direction,
            confidence=round(confidence, 1),
            start_index=start_idx,
            end_index=end_idx,
            start_date=dates[start_idx],
            end_date=dates[end_idx],
            entry_price=round(breakout_level, 2),
            target_price=round(target, 2),
            stop_loss=round(stop_loss, 2),
            risk_reward=round(rr, 2),
            breakout_level=round(breakout_level, 2),
            description=(
                f"{pattern_name} detected. Pole move: {pole_move*100:.1f}%. "
                f"Flag range: {flag_range*100:.2f}%."
            ),
        ))

    return patterns


def recognize_patterns(
    symbol: str,
    candles: List[OHLCV],
    lookback: int = 5,
) -> PatternRecognitionResult:
    """Detect technical chart patterns from OHLCV data.

    Analyzes price data to identify common chart patterns using swing
    point detection and geometric pattern matching.

    Args:
        symbol: Stock ticker symbol.
        candles: List of OHLCV candle data.
        lookback: Swing point detection lookback window.

    Returns:
        PatternRecognitionResult with all detected patterns.
    """
    if not candles or len(candles) < 20:
        return PatternRecognitionResult(
            symbol=symbol,
            num_candles=len(candles) if candles else 0,
            swing_highs=[],
            swing_lows=[],
            patterns=[],
            summary="Insufficient data for pattern recognition (need 20+ candles).",
        )

    opens, highs, lows, closes, dates = _to_arrays(candles)

    # Detect swing points
    swing_highs, swing_lows = detect_swing_points(highs, lows, dates, lookback)

    # Detect all pattern types
    all_patterns: List[PatternMatch] = []

    all_patterns.extend(_detect_head_and_shoulders(swing_highs, swing_lows, closes, dates))
    all_patterns.extend(_detect_double_top(swing_highs, swing_lows, closes, dates))
    all_patterns.extend(_detect_double_bottom(swing_lows, swing_highs, closes, dates))
    all_patterns.extend(_detect_triangle(swing_highs, swing_lows, closes, dates))
    all_patterns.extend(_detect_cup_and_handle(swing_highs, swing_lows, closes, dates))
    all_patterns.extend(_detect_flag_pennant(closes, highs, lows, dates))

    # Sort by confidence
    all_patterns.sort(key=lambda p: p.confidence, reverse=True)

    # Determine dominant pattern and overall bias
    dominant = all_patterns[0] if all_patterns else None
    if all_patterns:
        bullish_count = sum(1 for p in all_patterns if p.direction == "bullish")
        bearish_count = sum(1 for p in all_patterns if p.direction == "bearish")
        if bullish_count > bearish_count:
            overall_bias = "Bullish"
        elif bearish_count > bullish_count:
            overall_bias = "Bearish"
        else:
            overall_bias = "Neutral"
    else:
        overall_bias = "Neutral"

    summary = f"Analyzed {len(candles)} candles for {symbol}. "
    summary += f"Found {len(swing_highs)} swing highs and {len(swing_lows)} swing lows. "
    if all_patterns:
        summary += f"Detected {len(all_patterns)} pattern(s). "
        summary += f"Strongest: {dominant.pattern_name} ({dominant.confidence:.0f}% confidence). "
        summary += f"Overall bias: {overall_bias}."
    else:
        summary += "No significant patterns detected."

    return PatternRecognitionResult(
        symbol=symbol,
        num_candles=len(candles),
        swing_highs=swing_highs,
        swing_lows=swing_lows,
        patterns=all_patterns,
        dominant_pattern=dominant,
        overall_bias=overall_bias,
        summary=summary,
    )
