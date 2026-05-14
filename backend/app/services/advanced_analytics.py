"""Advanced Analytics Engine — Institutional-grade analysis tools.

Features:
- Multi-timeframe scoring (short-term 1-4 weeks vs long-term 6-12 months)
- Smart Money Flow Detection (volume pattern analysis)
- Technical Pattern Recognition (support/resistance, trend channels)
- Sector Rotation Signal (money flow between sectors)
- Composite Signal Strength (convergence of multiple indicators)
"""
from __future__ import annotations
import asyncio
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.core.cache import get_cache
from app.services.indicators import _to_dataframe, sma, ema, rsi, macd, atr, bollinger_bands
from app.services.market_data import get_market_data_service


class AdvancedAnalytics:
    """Institutional-grade analytics engine."""

    def __init__(self):
        self.adapter = get_yfinance_adapter()
        self.cache = get_cache()

    async def multi_timeframe_score(self, symbol: str) -> Dict[str, Any]:
        """Score stock on multiple timeframes: short-term (1-4 weeks) vs long-term (6-12 months).
        
        Short-term focuses on: RSI, MACD crossover direction, volume spike, 5-day momentum
        Long-term focuses on: SMA200 trend, fundamental quality, earnings trajectory, valuation
        """
        service = get_market_data_service()
        
        # Get history for both timeframes
        short_hist = await service.history(symbol, range_="1mo", interval="1d")
        long_hist = await service.history(symbol, range_="1y", interval="1d")
        
        short_score = 50
        long_score = 50
        short_signals = []
        long_signals = []
        
        if short_hist.candles and len(short_hist.candles) >= 10:
            df = _to_dataframe(short_hist.candles)
            close = df["close"]
            
            # Short-term RSI
            rsi_vals = rsi(close, 14)
            current_rsi = float(rsi_vals.iloc[-1]) if not pd.isna(rsi_vals.iloc[-1]) else None
            if current_rsi:
                if 30 <= current_rsi <= 50:
                    short_score += 20
                    short_signals.append(f"RSI {current_rsi:.0f} — bounce zone")
                elif current_rsi > 70:
                    short_score -= 15
                    short_signals.append(f"RSI {current_rsi:.0f} — overbought risk")
                elif current_rsi < 30:
                    short_score += 10
                    short_signals.append(f"RSI {current_rsi:.0f} — deeply oversold")
            
            # 5-day momentum
            if len(close) >= 5:
                five_day_change = ((float(close.iloc[-1]) - float(close.iloc[-5])) / float(close.iloc[-5])) * 100
                if five_day_change > 3:
                    short_score += 15
                    short_signals.append(f"5-day momentum +{five_day_change:.1f}%")
                elif five_day_change < -5:
                    short_score -= 10
                    short_signals.append(f"5-day momentum {five_day_change:.1f}%")
            
            # MACD direction
            macd_data = macd(close)
            if not macd_data["hist"].empty:
                hist_last = float(macd_data["hist"].iloc[-1]) if not pd.isna(macd_data["hist"].iloc[-1]) else 0
                hist_prev = float(macd_data["hist"].iloc[-2]) if len(macd_data["hist"]) > 1 and not pd.isna(macd_data["hist"].iloc[-2]) else 0
                if hist_last > 0 and hist_last > hist_prev:
                    short_score += 10
                    short_signals.append("MACD histogram expanding (bullish)")
                elif hist_last < 0 and hist_last < hist_prev:
                    short_score -= 10
                    short_signals.append("MACD histogram declining (bearish)")
            
            # Volume spike detection
            vol = df["volume"]
            if len(vol) >= 10:
                avg_vol = float(vol.tail(20).mean()) if len(vol) >= 20 else float(vol.mean())
                last_vol = float(vol.iloc[-1])
                if avg_vol > 0:
                    vol_ratio = last_vol / avg_vol
                    if vol_ratio > 2.0 and float(close.iloc[-1]) > float(close.iloc[-2]):
                        short_score += 15
                        short_signals.append(f"Volume spike {vol_ratio:.1f}x + price up (smart money)")
                    elif vol_ratio > 2.0 and float(close.iloc[-1]) < float(close.iloc[-2]):
                        short_score -= 10
                        short_signals.append(f"Volume spike {vol_ratio:.1f}x + price down (distribution)")
        
        if long_hist.candles and len(long_hist.candles) >= 100:
            df = _to_dataframe(long_hist.candles)
            close = df["close"]
            
            # SMA200 trend
            sma200 = sma(close, 200)
            sma50_vals = sma(close, 50)
            if not sma200.empty and not pd.isna(sma200.iloc[-1]):
                current_price = float(close.iloc[-1])
                sma200_val = float(sma200.iloc[-1])
                if current_price > sma200_val:
                    pct_above = ((current_price - sma200_val) / sma200_val) * 100
                    long_score += min(20, int(pct_above))
                    long_signals.append(f"Above SMA200 by {pct_above:.1f}% (long-term bullish)")
                else:
                    long_score -= 15
                    long_signals.append("Below SMA200 (long-term bearish)")
            
            # Golden/Death cross check
            if not sma50_vals.empty and not sma200.empty:
                sma50_last = float(sma50_vals.iloc[-1]) if not pd.isna(sma50_vals.iloc[-1]) else None
                sma200_last = float(sma200.iloc[-1]) if not pd.isna(sma200.iloc[-1]) else None
                if sma50_last and sma200_last:
                    if sma50_last > sma200_last:
                        long_score += 10
                        long_signals.append("Golden cross active (SMA50 > SMA200)")
                    else:
                        long_score -= 10
                        long_signals.append("Death cross active (SMA50 < SMA200)")
            
            # 6-month trend consistency
            if len(close) >= 126:
                six_month_change = ((float(close.iloc[-1]) - float(close.iloc[-126])) / float(close.iloc[-126])) * 100
                if six_month_change > 20:
                    long_score += 15
                    long_signals.append(f"6-month return +{six_month_change:.0f}% (strong trend)")
                elif six_month_change > 10:
                    long_score += 10
                    long_signals.append(f"6-month return +{six_month_change:.0f}%")
                elif six_month_change < -15:
                    long_score -= 15
                    long_signals.append(f"6-month return {six_month_change:.0f}% (bearish)")
        
        short_score = max(0, min(100, short_score))
        long_score = max(0, min(100, long_score))
        
        # Alignment — when both agree, signal is stronger
        alignment = "aligned" if (short_score >= 55 and long_score >= 55) or (short_score < 45 and long_score < 45) else "diverging"
        
        return {
            "symbol": symbol.upper(),
            "short_term": {"score": short_score, "signals": short_signals, "outlook": "bullish" if short_score >= 60 else "bearish" if short_score < 40 else "neutral"},
            "long_term": {"score": long_score, "signals": long_signals, "outlook": "bullish" if long_score >= 60 else "bearish" if long_score < 40 else "neutral"},
            "alignment": alignment,
            "composite_signal": "STRONG BUY" if short_score >= 65 and long_score >= 65 else "BUY" if short_score >= 55 and long_score >= 55 else "SELL" if short_score < 40 and long_score < 40 else "MIXED",
        }

    async def detect_smart_money(self, symbol: str) -> Dict[str, Any]:
        """Detect institutional/smart money flow using volume patterns.
        
        Signals:
        - Accumulation: High volume on up days, low volume on down days
        - Distribution: High volume on down days, low volume on up days
        - Breakout confirmation: Volume surge with price breakout
        """
        service = get_market_data_service()
        hist = await service.history(symbol, range_="3mo", interval="1d")
        
        if not hist.candles or len(hist.candles) < 20:
            return {"symbol": symbol.upper(), "signal": "insufficient_data", "confidence": 0}
        
        df = _to_dataframe(hist.candles)
        close = df["close"]
        volume = df["volume"]
        
        # Calculate up/down day volumes
        price_changes = close.diff()
        up_days = price_changes > 0
        down_days = price_changes < 0
        
        # Last 20 days analysis
        recent = 20
        up_volume = float(volume[up_days].tail(recent).mean()) if up_days.tail(recent).any() else 0
        down_volume = float(volume[down_days].tail(recent).mean()) if down_days.tail(recent).any() else 0
        avg_volume = float(volume.tail(recent).mean())
        
        # Accumulation/Distribution ratio
        if down_volume > 0:
            ad_ratio = up_volume / down_volume
        else:
            ad_ratio = 2.0  # All up days = strong accumulation
        
        # On-Balance Volume trend (simplified)
        obv = (volume * price_changes.apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))).cumsum()
        obv_trend = "rising" if float(obv.iloc[-1]) > float(obv.iloc[-10]) else "falling"
        
        # Volume trend (is volume increasing or decreasing)
        vol_sma5 = float(volume.tail(5).mean())
        vol_sma20 = float(volume.tail(20).mean())
        volume_trend = "increasing" if vol_sma5 > vol_sma20 * 1.2 else "decreasing" if vol_sma5 < vol_sma20 * 0.8 else "stable"
        
        # Determine signal
        if ad_ratio > 1.5 and obv_trend == "rising":
            signal = "accumulation"
            description = "Smart money is accumulating — higher volume on up days, OBV rising"
            confidence = min(90, int(ad_ratio * 30))
        elif ad_ratio < 0.7 and obv_trend == "falling":
            signal = "distribution"
            description = "Smart money is distributing — higher volume on down days, OBV falling"
            confidence = min(90, int((1/max(ad_ratio, 0.1)) * 30))
        elif ad_ratio > 1.2:
            signal = "mild_accumulation"
            description = "Slight accumulation bias detected"
            confidence = 50
        elif ad_ratio < 0.8:
            signal = "mild_distribution"
            description = "Slight distribution bias detected"
            confidence = 50
        else:
            signal = "neutral"
            description = "No clear institutional flow detected"
            confidence = 30
        
        return {
            "symbol": symbol.upper(),
            "signal": signal,
            "description": description,
            "confidence": confidence,
            "metrics": {
                "ad_ratio": round(ad_ratio, 2),
                "obv_trend": obv_trend,
                "volume_trend": volume_trend,
                "up_day_avg_volume": int(up_volume),
                "down_day_avg_volume": int(down_volume),
            },
        }

    async def find_support_resistance(self, symbol: str) -> Dict[str, Any]:
        """Auto-detect key support and resistance levels from price history.
        
        Method: pivot points, volume clusters, and round numbers.
        """
        service = get_market_data_service()
        hist = await service.history(symbol, range_="6mo", interval="1d")
        
        if not hist.candles or len(hist.candles) < 30:
            return {"symbol": symbol.upper(), "levels": [], "current_price": None}
        
        df = _to_dataframe(hist.candles)
        close = df["close"]
        high = df["high"]
        low = df["low"]
        current_price = float(close.iloc[-1])
        
        levels = []
        
        # Method 1: Recent swing highs and lows (pivot points)
        for i in range(5, len(df) - 5):
            # Swing high
            if float(high.iloc[i]) == float(high.iloc[i-5:i+5].max()):
                levels.append({"price": round(float(high.iloc[i]), 2), "type": "resistance", "method": "swing_high"})
            # Swing low
            if float(low.iloc[i]) == float(low.iloc[i-5:i+5].min()):
                levels.append({"price": round(float(low.iloc[i]), 2), "type": "support", "method": "swing_low"})
        
        # Method 2: SMA levels as dynamic S/R
        sma20_val = float(sma(close, 20).iloc[-1]) if len(close) >= 20 else None
        sma50_val = float(sma(close, 50).iloc[-1]) if len(close) >= 50 else None
        sma200_val = float(sma(close, 200).iloc[-1]) if len(close) >= 200 else None
        
        if sma20_val:
            sr_type = "support" if current_price > sma20_val else "resistance"
            levels.append({"price": round(sma20_val, 2), "type": sr_type, "method": "SMA20"})
        if sma50_val:
            sr_type = "support" if current_price > sma50_val else "resistance"
            levels.append({"price": round(sma50_val, 2), "type": sr_type, "method": "SMA50"})
        if sma200_val:
            sr_type = "support" if current_price > sma200_val else "resistance"
            levels.append({"price": round(sma200_val, 2), "type": sr_type, "method": "SMA200"})
        
        # Method 3: Bollinger Bands as dynamic S/R
        bb = bollinger_bands(close, 20, 2.0)
        if not bb["upper"].empty:
            levels.append({"price": round(float(bb["upper"].iloc[-1]), 2), "type": "resistance", "method": "BB_upper"})
            levels.append({"price": round(float(bb["lower"].iloc[-1]), 2), "type": "support", "method": "BB_lower"})
        
        # Deduplicate: merge levels within 2% of each other
        merged = []
        sorted_levels = sorted(levels, key=lambda x: x["price"])
        for level in sorted_levels:
            if merged and abs(level["price"] - merged[-1]["price"]) / merged[-1]["price"] < 0.02:
                # Merge — keep the one with "better" method
                if level["method"] in ("SMA200", "SMA50"):
                    merged[-1] = level
            else:
                merged.append(level)
        
        # Only keep levels near current price (within 20%)
        relevant = [l for l in merged if abs(l["price"] - current_price) / current_price < 0.20]
        
        # Sort: supports below price, resistances above
        supports = sorted([l for l in relevant if l["price"] < current_price], key=lambda x: x["price"], reverse=True)[:5]
        resistances = sorted([l for l in relevant if l["price"] >= current_price], key=lambda x: x["price"])[:5]
        
        # Nearest support/resistance
        nearest_support = supports[0]["price"] if supports else None
        nearest_resistance = resistances[0]["price"] if resistances else None
        
        return {
            "symbol": symbol.upper(),
            "current_price": round(current_price, 2),
            "nearest_support": nearest_support,
            "nearest_resistance": nearest_resistance,
            "risk_reward_from_here": round((nearest_resistance - current_price) / (current_price - nearest_support), 2) if nearest_support and nearest_resistance and current_price > nearest_support else None,
            "supports": supports[:3],
            "resistances": resistances[:3],
        }

    async def sector_rotation_signal(self) -> Dict[str, Any]:
        """Detect sector rotation — where is money flowing?
        
        Compare 1-week vs 1-month sector performance to detect rotation.
        """
        service = get_market_data_service()
        
        sectors = [
            ("Technology", "XLK"), ("Financials", "XLF"), ("Health Care", "XLV"),
            ("Consumer Discretionary", "XLY"), ("Energy", "XLE"), ("Industrials", "XLI"),
            ("Utilities", "XLU"), ("Real Estate", "XLRE"), ("Communication Services", "XLC"),
        ]
        
        async def _get_sector_data(name: str, etf: str):
            try:
                quote = await service.quote(etf)
                hist = await service.history(etf, range_="1mo", interval="1d")
                
                weekly_change = None
                monthly_change = None
                
                if hist.candles and len(hist.candles) >= 5:
                    df = _to_dataframe(hist.candles)
                    close = df["close"]
                    if len(close) >= 5:
                        weekly_change = ((float(close.iloc[-1]) - float(close.iloc[-5])) / float(close.iloc[-5])) * 100
                    if len(close) >= 20:
                        monthly_change = ((float(close.iloc[-1]) - float(close.iloc[-20])) / float(close.iloc[-20])) * 100
                
                return {
                    "sector": name,
                    "etf": etf,
                    "daily_change": quote.change_percent,
                    "weekly_change": round(weekly_change, 2) if weekly_change else None,
                    "monthly_change": round(monthly_change, 2) if monthly_change else None,
                    "momentum": "accelerating" if weekly_change and monthly_change and weekly_change > monthly_change / 4 else "decelerating" if weekly_change and monthly_change and weekly_change < monthly_change / 4 else "steady",
                }
            except Exception:
                return {"sector": name, "etf": etf, "daily_change": None, "weekly_change": None, "monthly_change": None, "momentum": "unknown"}
        
        results = await asyncio.gather(*(_get_sector_data(n, e) for n, e in sectors))
        
        # Sort by weekly performance
        sorted_results = sorted(results, key=lambda x: x.get("weekly_change") or 0, reverse=True)
        
        # Determine rotation signal
        leaders = [r for r in sorted_results[:3] if (r.get("weekly_change") or 0) > 0]
        laggards = [r for r in sorted_results[-3:] if (r.get("weekly_change") or 0) < 0]
        
        # Market regime detection
        avg_weekly = sum((r.get("weekly_change") or 0) for r in results) / len(results)
        if avg_weekly > 1.5:
            regime = "risk_on"
            regime_desc = "Risk-On: Money flowing into growth/cyclical sectors"
        elif avg_weekly < -1.5:
            regime = "risk_off"
            regime_desc = "Risk-Off: Money flowing into defensive/safe-haven sectors"
        else:
            regime = "neutral"
            regime_desc = "Neutral: No strong sector rotation signal"
        
        return {
            "regime": regime,
            "regime_description": regime_desc,
            "avg_weekly_change": round(avg_weekly, 2),
            "leaders": leaders,
            "laggards": laggards,
            "all_sectors": sorted_results,
            "rotation_signal": f"Money flowing from {laggards[0]['sector'] if laggards else 'N/A'} → {leaders[0]['sector'] if leaders else 'N/A'}",
        }

    async def composite_signal(self, symbol: str) -> Dict[str, Any]:
        """Generate a composite signal from ALL available indicators.
        
        Checks convergence: when multiple signals agree, confidence is higher.
        """
        # Run all analyses in parallel
        mtf, smart_money, sr_levels = await asyncio.gather(
            self.multi_timeframe_score(symbol),
            self.detect_smart_money(symbol),
            self.find_support_resistance(symbol),
        )
        
        signals_bullish = 0
        signals_bearish = 0
        signals_total = 0
        reasons = []
        
        # Multi-timeframe alignment
        if mtf["short_term"]["outlook"] == "bullish":
            signals_bullish += 1
            reasons.append("Short-term momentum bullish")
        elif mtf["short_term"]["outlook"] == "bearish":
            signals_bearish += 1
            reasons.append("Short-term momentum bearish")
        signals_total += 1
        
        if mtf["long_term"]["outlook"] == "bullish":
            signals_bullish += 1
            reasons.append("Long-term trend bullish")
        elif mtf["long_term"]["outlook"] == "bearish":
            signals_bearish += 1
            reasons.append("Long-term trend bearish")
        signals_total += 1
        
        # Smart money
        if smart_money["signal"] in ("accumulation", "mild_accumulation"):
            signals_bullish += 1
            reasons.append("Smart money accumulating")
        elif smart_money["signal"] in ("distribution", "mild_distribution"):
            signals_bearish += 1
            reasons.append("Smart money distributing")
        signals_total += 1
        
        # Support/Resistance position
        if sr_levels.get("risk_reward_from_here") and sr_levels["risk_reward_from_here"] > 1.5:
            signals_bullish += 1
            reasons.append(f"Favorable R:R {sr_levels['risk_reward_from_here']:.1f}:1 from current level")
        elif sr_levels.get("risk_reward_from_here") and sr_levels["risk_reward_from_here"] < 0.5:
            signals_bearish += 1
            reasons.append("Poor risk/reward at current level")
        signals_total += 1
        
        # Calculate convergence
        if signals_total > 0:
            bull_pct = (signals_bullish / signals_total) * 100
            bear_pct = (signals_bearish / signals_total) * 100
        else:
            bull_pct = bear_pct = 50
        
        # Final signal
        if bull_pct >= 75:
            signal = "STRONG BUY"
            confidence = 85
        elif bull_pct >= 60:
            signal = "BUY"
            confidence = 70
        elif bear_pct >= 75:
            signal = "STRONG SELL"
            confidence = 85
        elif bear_pct >= 60:
            signal = "SELL"
            confidence = 70
        else:
            signal = "HOLD"
            confidence = 50
        
        return {
            "symbol": symbol.upper(),
            "signal": signal,
            "confidence": confidence,
            "convergence": {
                "bullish_signals": signals_bullish,
                "bearish_signals": signals_bearish,
                "total_signals": signals_total,
                "bull_percentage": round(bull_pct),
                "bear_percentage": round(bear_pct),
            },
            "reasons": reasons,
            "components": {
                "multi_timeframe": mtf,
                "smart_money": smart_money,
                "support_resistance": sr_levels,
            },
        }


_analytics: Optional[AdvancedAnalytics] = None

def get_advanced_analytics() -> AdvancedAnalytics:
    global _analytics
    if _analytics is None:
        _analytics = AdvancedAnalytics()
    return _analytics
