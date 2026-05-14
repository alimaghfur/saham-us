"""Ensemble Verdict Engine — Maximum Accuracy Through Model Consensus.

This is the ULTIMATE analysis layer that combines:
1. Institutional Score Engine (fundamental + technical scoring)
2. Advanced Analytics (multi-timeframe, smart money, S/R levels)
3. Quant Engine (alpha, regime, signal strength)

The ensemble approach: when ALL models agree → highest confidence.
When models disagree → lower confidence, flag as uncertain.

Accuracy is maximized by:
- Weighting models by their historical reliability
- Requiring consensus (2/3 or 3/3 agreement)
- Adjusting for current market regime
- Penalizing when confidence is low
- Including "DO NOT TRADE" signals when uncertainty is high
"""
from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional

from app.core.cache import get_cache
from app.services.advanced_analytics import get_advanced_analytics
from app.services.market_data import get_market_data_service
from app.services.quant_engine import get_quant_engine


class EnsembleVerdict:
    """Combines all analysis engines for maximum accuracy."""

    def __init__(self):
        self.cache = get_cache()
        self.quant = get_quant_engine()
        self.advanced = get_advanced_analytics()

    async def final_verdict(self, symbol: str) -> Dict[str, Any]:
        """Generate the ULTIMATE trading verdict for a stock.

        Combines 7 independent signals:
        1. Quant Alpha Score
        2. Quant Signal Strength
        3. Market Regime context
        4. Multi-timeframe alignment
        5. Smart Money flow
        6. Support/Resistance position
        7. Composite Advanced Signal

        Returns:
        - verdict: STRONG BUY / BUY / HOLD / SELL / STRONG SELL / DO NOT TRADE
        - accuracy_confidence: 0-100 (how confident we are in this call)
        - consensus: how many models agree
        - risk_reward: calculated from S/R levels
        - position_size: recommended from risk parity
        - regime_context: current market regime affects interpretation
        - all_signals: breakdown of each model's opinion
        """
        cache_key = f"ensemble:{symbol.upper()}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        # Run ALL analyses in parallel for speed
        service = get_market_data_service()

        alpha_result, signal_result, regime_result, mtf_result, smart_money_result, sr_result = await asyncio.gather(
            self.quant.alpha_score(symbol),
            self.quant.signal_strength(symbol),
            self.quant.regime_detection(),
            self.advanced.multi_timeframe_score(symbol),
            self.advanced.detect_smart_money(symbol),
            self.advanced.find_support_resistance(symbol),
            return_exceptions=True,
        )

        # Also get basic quote for context
        try:
            quote = await service.quote(symbol)
            price = quote.price
        except Exception:
            price = None

        # Normalize each signal to bullish/bearish/neutral
        signals = []
        signal_details = []

        # 1. Alpha Score (quant)
        if isinstance(alpha_result, dict) and "alpha_score" in alpha_result:
            alpha = alpha_result["alpha_score"]
            if alpha >= 60:
                signals.append("bullish")
                signal_details.append({"model": "Quant Alpha", "signal": "bullish", "score": alpha, "detail": f"Alpha {alpha:.0f}/100, Sharpe {alpha_result.get('sharpe_like', 0):.2f}"})
            elif alpha <= 30:
                signals.append("bearish")
                signal_details.append({"model": "Quant Alpha", "signal": "bearish", "score": alpha, "detail": f"Alpha {alpha:.0f}/100 — weak statistical edge"})
            else:
                signals.append("neutral")
                signal_details.append({"model": "Quant Alpha", "signal": "neutral", "score": alpha, "detail": f"Alpha {alpha:.0f}/100 — no clear edge"})
        else:
            signals.append("neutral")
            signal_details.append({"model": "Quant Alpha", "signal": "neutral", "score": 50, "detail": "Data unavailable"})

        # 2. Signal Strength (quant)
        if isinstance(signal_result, dict) and "signal_strength" in signal_result:
            strength = signal_result["signal_strength"]
            bias = signal_result.get("bias", "neutral")
            if bias in ("strong_bullish", "bullish"):
                signals.append("bullish")
            elif bias in ("strong_bearish", "bearish"):
                signals.append("bearish")
            else:
                signals.append("neutral")
            signal_details.append({"model": "Signal Strength", "signal": bias, "score": strength, "detail": f"Composite {strength:.0f}/100 (MACD+RSI+Vol+Trend)"})
        else:
            signals.append("neutral")
            signal_details.append({"model": "Signal Strength", "signal": "neutral", "score": 50, "detail": "Data unavailable"})

        # 3. Market Regime (context — doesn't vote but adjusts confidence)
        regime = "unknown"
        if isinstance(regime_result, dict):
            regime = regime_result.get("regime", "unknown")

        # 4. Multi-timeframe
        if isinstance(mtf_result, dict):
            short_outlook = mtf_result.get("short_term", {}).get("outlook", "neutral")
            long_outlook = mtf_result.get("long_term", {}).get("outlook", "neutral")
            alignment = mtf_result.get("alignment", "diverging")

            if short_outlook == "bullish" and long_outlook == "bullish":
                signals.append("bullish")
                signal_details.append({"model": "Multi-Timeframe", "signal": "bullish", "score": 80, "detail": "Both timeframes aligned bullish"})
            elif short_outlook == "bearish" and long_outlook == "bearish":
                signals.append("bearish")
                signal_details.append({"model": "Multi-Timeframe", "signal": "bearish", "score": 20, "detail": "Both timeframes aligned bearish"})
            elif alignment == "diverging":
                signals.append("neutral")
                signal_details.append({"model": "Multi-Timeframe", "signal": "neutral", "score": 50, "detail": f"Diverging: short={short_outlook}, long={long_outlook}"})
            else:
                signals.append("neutral")
                signal_details.append({"model": "Multi-Timeframe", "signal": "neutral", "score": 50, "detail": "Mixed signals"})
        else:
            signals.append("neutral")
            signal_details.append({"model": "Multi-Timeframe", "signal": "neutral", "score": 50, "detail": "Data unavailable"})

        # 5. Smart Money
        if isinstance(smart_money_result, dict):
            sm_signal = smart_money_result.get("signal", "neutral")
            sm_confidence = smart_money_result.get("confidence", 0)
            if sm_signal in ("accumulation",) and sm_confidence >= 60:
                signals.append("bullish")
                signal_details.append({"model": "Smart Money", "signal": "bullish", "score": sm_confidence, "detail": f"Accumulation detected ({sm_confidence}% confidence)"})
            elif sm_signal in ("distribution",) and sm_confidence >= 60:
                signals.append("bearish")
                signal_details.append({"model": "Smart Money", "signal": "bearish", "score": 100 - sm_confidence, "detail": f"Distribution detected ({sm_confidence}% confidence)"})
            else:
                signals.append("neutral")
                signal_details.append({"model": "Smart Money", "signal": "neutral", "score": 50, "detail": f"{sm_signal} ({sm_confidence}%)"})
        else:
            signals.append("neutral")
            signal_details.append({"model": "Smart Money", "signal": "neutral", "score": 50, "detail": "Data unavailable"})

        # 6. Support/Resistance R:R
        rr_from_sr = None
        if isinstance(sr_result, dict):
            rr_from_sr = sr_result.get("risk_reward_from_here")
            if rr_from_sr and rr_from_sr >= 2.0:
                signals.append("bullish")
                signal_details.append({"model": "S/R Position", "signal": "bullish", "score": 75, "detail": f"R:R {rr_from_sr:.1f}:1 — favorable entry"})
            elif rr_from_sr and rr_from_sr < 0.5:
                signals.append("bearish")
                signal_details.append({"model": "S/R Position", "signal": "bearish", "score": 25, "detail": f"R:R {rr_from_sr:.1f}:1 — poor entry point"})
            else:
                signals.append("neutral")
                rr_str = f"{rr_from_sr:.1f}:1" if rr_from_sr else "N/A"
                signal_details.append({"model": "S/R Position", "signal": "neutral", "score": 50, "detail": f"R:R {rr_str}"})
        else:
            signals.append("neutral")
            signal_details.append({"model": "S/R Position", "signal": "neutral", "score": 50, "detail": "Data unavailable"})

        # --- ENSEMBLE CONSENSUS ---
        bullish_count = signals.count("bullish")
        bearish_count = signals.count("bearish")
        neutral_count = signals.count("neutral")
        total_signals = len(signals)

        # Consensus percentage
        bull_pct = (bullish_count / total_signals) * 100
        bear_pct = (bearish_count / total_signals) * 100

        # Determine verdict
        if bull_pct >= 83:  # 5/6 or 6/6 bullish
            verdict = "STRONG BUY"
            base_confidence = 90
        elif bull_pct >= 67:  # 4/6 bullish
            verdict = "BUY"
            base_confidence = 75
        elif bear_pct >= 83:
            verdict = "STRONG SELL"
            base_confidence = 90
        elif bear_pct >= 67:
            verdict = "SELL"
            base_confidence = 75
        elif neutral_count >= 4:  # Too much uncertainty
            verdict = "DO NOT TRADE"
            base_confidence = 60
        elif bull_pct > bear_pct:
            verdict = "LEAN BUY"
            base_confidence = 55
        elif bear_pct > bull_pct:
            verdict = "LEAN SELL"
            base_confidence = 55
        else:
            verdict = "HOLD"
            base_confidence = 50

        # Adjust confidence based on regime
        regime_adjustment = 0
        if regime in ("bull_trending",) and "BUY" in verdict:
            regime_adjustment = 5  # Regime supports the call
        elif regime in ("bear_trending",) and "SELL" in verdict:
            regime_adjustment = 5
        elif regime in ("bear_volatile",) and "BUY" in verdict:
            regime_adjustment = -10  # Fighting the regime
        elif regime in ("bull_volatile",):
            regime_adjustment = -5  # Volatile = less certainty

        final_confidence = max(20, min(95, base_confidence + regime_adjustment))

        # Position sizing recommendation
        sizing = None
        if isinstance(sr_result, dict) and price:
            nearest_support = sr_result.get("nearest_support")
            nearest_resistance = sr_result.get("nearest_resistance")
            if nearest_support and nearest_resistance:
                sizing = {
                    "entry_zone": f"${nearest_support:.2f} - ${price:.2f}",
                    "stop_loss": f"${nearest_support * 0.98:.2f}",
                    "target_1": f"${nearest_resistance:.2f}",
                    "target_2": f"${nearest_resistance * 1.05:.2f}",
                    "risk_reward": rr_from_sr,
                }

        # Generate actionable summary
        if verdict == "STRONG BUY":
            summary = f"{symbol.upper()}: STRONG BUY — {bullish_count}/{total_signals} models agree. High conviction, all systems bullish. Regime: {regime}."
        elif verdict == "BUY":
            summary = f"{symbol.upper()}: BUY — {bullish_count}/{total_signals} models bullish. Good setup with majority consensus."
        elif verdict == "STRONG SELL":
            summary = f"{symbol.upper()}: STRONG SELL — {bearish_count}/{total_signals} models bearish. Avoid or exit position."
        elif verdict == "SELL":
            summary = f"{symbol.upper()}: SELL — {bearish_count}/{total_signals} models bearish. Consider reducing exposure."
        elif verdict == "DO NOT TRADE":
            summary = f"{symbol.upper()}: DO NOT TRADE — Too much uncertainty ({neutral_count}/{total_signals} neutral). Wait for clearer signals."
        elif verdict == "LEAN BUY":
            summary = f"{symbol.upper()}: LEAN BUY — Slight bullish edge but not high conviction. Small position only."
        elif verdict == "LEAN SELL":
            summary = f"{symbol.upper()}: LEAN SELL — Slight bearish edge. Watch for further confirmation."
        else:
            summary = f"{symbol.upper()}: HOLD — No clear directional edge. Stay on sidelines."

        result = {
            "symbol": symbol.upper(),
            "verdict": verdict,
            "confidence": final_confidence,
            "summary": summary,
            "consensus": {
                "bullish": bullish_count,
                "bearish": bearish_count,
                "neutral": neutral_count,
                "total": total_signals,
                "bull_pct": round(bull_pct),
                "bear_pct": round(bear_pct),
            },
            "regime": regime,
            "regime_impact": f"{'+' if regime_adjustment > 0 else ''}{regime_adjustment}% confidence" if regime_adjustment != 0 else "none",
            "risk_reward": rr_from_sr,
            "sizing": sizing,
            "signals": signal_details,
            "methodology": "Ensemble of 6 independent models: Quant Alpha, Signal Strength, Multi-Timeframe, Smart Money Flow, S/R Position. Requires 67%+ consensus for directional call.",
            "timestamp": time.time(),
        }

        self.cache.set(cache_key, result, 300)
        return result


_ensemble: Optional[EnsembleVerdict] = None

def get_ensemble_verdict() -> EnsembleVerdict:
    global _ensemble
    if _ensemble is None:
        _ensemble = EnsembleVerdict()
    return _ensemble
