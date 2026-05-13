"""Swing + Scalping scanners.

Each scanner walks the DEFAULT_UNIVERSE, pulls a small history window,
computes indicators, and emits setup rows. Results are cached for a
few minutes to keep cost bounded.
"""
from __future__ import annotations

import asyncio
from typing import List, Optional

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.core.cache import get_cache
from app.schemas.stock import MarketMover, SwingSetup
from app.services.indicators import get_dataframe_with_indicators
from app.utils.constants import DEFAULT_UNIVERSE


class ScannerService:
    """Periodic scanners for swing + scalping setups."""

    def __init__(self) -> None:
        self.adapter = get_yfinance_adapter()
        self.cache = get_cache()

    # ---- helpers ----
    async def _get_setup_row(self, symbol: str, setup: str) -> Optional[SwingSetup]:
        def _compute() -> Optional[SwingSetup]:
            hist = self.adapter.get_history(symbol, range_="1y", interval="1d")
            if not hist.candles or len(hist.candles) < 60:
                return None
            df = get_dataframe_with_indicators(hist.candles)
            last = df.iloc[-1]
            last_price = float(last["close"])
            atr_val = float(last["atr_14"]) if not _isnan(last["atr_14"]) else None

            matched = False
            notes = ""

            if setup == "breakout":
                # Close > highest close of last 20 days and volume > 1.5x avg
                window = df.tail(21).iloc[:-1]
                prior_high = float(window["high"].max())
                avg_vol = float(df["volume"].tail(20).mean())
                if (
                    last_price > prior_high
                    and float(last["volume"]) > 1.5 * avg_vol
                ):
                    matched = True
                    notes = (
                        f"Breakout above 20d high {prior_high:.2f} on "
                        f"{last['volume']/avg_vol:.1f}x volume"
                    )
            elif setup == "pullback":
                # Uptrend (close > sma_50) and price within 2% of sma_20 from above
                sma20 = float(last["sma_20"]) if not _isnan(last["sma_20"]) else None
                sma50 = float(last["sma_50"]) if not _isnan(last["sma_50"]) else None
                if (
                    sma20
                    and sma50
                    and last_price > sma50
                    and abs(last_price - sma20) / sma20 <= 0.02
                ):
                    matched = True
                    notes = f"Pullback to SMA20 ({sma20:.2f}) in uptrend"
            elif setup == "oversold_bounce":
                rsi_val = float(last["rsi_14"]) if not _isnan(last["rsi_14"]) else None
                if rsi_val is not None and rsi_val < 35:
                    matched = True
                    notes = f"RSI oversold at {rsi_val:.1f}"
            elif setup == "golden_cross":
                # SMA50 crosses above SMA200 within last 5 bars
                recent = df.tail(6)
                if len(recent) >= 6:
                    prev = recent.iloc[0]
                    cur = recent.iloc[-1]
                    if (
                        not _isnan(prev["sma_50"])
                        and not _isnan(prev["sma_200"])
                        and not _isnan(cur["sma_50"])
                        and not _isnan(cur["sma_200"])
                        and prev["sma_50"] <= prev["sma_200"]
                        and cur["sma_50"] > cur["sma_200"]
                    ):
                        matched = True
                        notes = "Golden cross within last 5 sessions"
            else:
                return None

            if not matched:
                return None

            entry = last_price
            stop = entry - (2 * atr_val) if atr_val else entry * 0.95
            target = entry + (4 * atr_val) if atr_val else entry * 1.10
            rr = (target - entry) / (entry - stop) if entry > stop else None

            return SwingSetup(
                symbol=symbol.upper(),
                setup_type=setup,
                price=entry,
                entry=entry,
                stop_loss=round(stop, 2),
                target=round(target, 2),
                risk_reward=round(rr, 2) if rr else None,
                notes=notes,
            )

        try:
            return await asyncio.to_thread(_compute)
        except Exception:
            return None

    # ---- public ----
    async def swing_scan(self, setup: str = "breakout", limit: int = 25) -> List[SwingSetup]:
        key = f"swing_scan:{setup}"
        cached = self.cache.get(key)
        if cached:
            return [SwingSetup(**x) for x in cached[:limit]]
        rows = await asyncio.gather(
            *(self._get_setup_row(s, setup) for s in DEFAULT_UNIVERSE),
            return_exceptions=True,
        )
        results: List[SwingSetup] = [
            r for r in rows if isinstance(r, SwingSetup)
        ]
        results.sort(key=lambda r: r.risk_reward or 0, reverse=True)
        self.cache.set(key, [r.model_dump() for r in results], 300)
        return results[:limit]

    async def hot_stocks(self, limit: int = 25) -> List[MarketMover]:
        """Top intraday movers from universe — %|change| sorted desc."""
        key = "scalp_hot"
        cached = self.cache.get(key)
        if cached:
            return [MarketMover(**x) for x in cached[:limit]]

        async def _one(symbol: str) -> Optional[MarketMover]:
            def _load():
                q = self.adapter.get_quote(symbol)
                if q.change_percent is None:
                    return None
                return MarketMover(
                    symbol=q.symbol,
                    name=q.name,
                    price=q.price,
                    change=q.change,
                    change_percent=q.change_percent,
                    volume=q.volume,
                )

            try:
                return await asyncio.to_thread(_load)
            except Exception:
                return None

        rows = await asyncio.gather(*(_one(s) for s in DEFAULT_UNIVERSE))
        movers = [r for r in rows if r is not None]
        movers.sort(key=lambda r: abs(r.change_percent or 0), reverse=True)
        self.cache.set(key, [m.model_dump() for m in movers], 60)
        return movers[:limit]


def _isnan(v) -> bool:
    try:
        return v != v  # NaN != NaN
    except Exception:
        return True


_service: ScannerService | None = None


def get_scanner_service() -> ScannerService:
    global _service
    if _service is None:
        _service = ScannerService()
    return _service
