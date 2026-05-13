"""Backtesting endpoints — simulate trading strategies on historical data."""
from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.adapters.yfinance_adapter import get_yfinance_adapter
from app.services.indicators import (
    _to_dataframe,
    sma,
    ema,
    rsi,
    macd,
    atr,
    bollinger_bands,
)

router = APIRouter(prefix="/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    symbol: str
    strategy: str  # sma_crossover, rsi_oversold, macd_crossover, breakout
    range: str = "2y"
    # Strategy params
    fast_period: int = 20
    slow_period: int = 50
    rsi_period: int = 14
    rsi_oversold: int = 30
    rsi_overbought: int = 70
    stop_loss_pct: float = 5.0
    take_profit_pct: float = 10.0


class Trade(BaseModel):
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    pnl_percent: float
    type: str  # win or loss
    holding_days: int


class BacktestResult(BaseModel):
    symbol: str
    strategy: str
    range: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_return: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    max_drawdown: float
    sharpe_ratio: Optional[float]
    trades: List[Trade]
    equity_curve: List[Dict[str, float]]


VALID_STRATEGIES = {"sma_crossover", "rsi_oversold", "macd_crossover", "breakout"}


@router.post("/run", response_model=BacktestResult)
async def run_backtest(req: BacktestRequest):
    """Run a backtest simulation for the given strategy and symbol."""
    if req.strategy not in VALID_STRATEGIES:
        return BacktestResult(
            symbol=req.symbol.upper(),
            strategy=req.strategy,
            range=req.range,
            total_trades=0,
            winning_trades=0,
            losing_trades=0,
            win_rate=0,
            total_return=0,
            avg_win=0,
            avg_loss=0,
            profit_factor=0,
            max_drawdown=0,
            sharpe_ratio=None,
            trades=[],
            equity_curve=[],
        )

    def _run():
        adapter = get_yfinance_adapter()
        hist = adapter.get_history(req.symbol, range_=req.range, interval="1d")
        if not hist.candles or len(hist.candles) < 60:
            return _empty_result(req)

        df = _to_dataframe(hist.candles)
        if df.empty or len(df) < 60:
            return _empty_result(req)

        # Add indicators
        df["sma_fast"] = sma(df["close"], req.fast_period)
        df["sma_slow"] = sma(df["close"], req.slow_period)
        df["rsi"] = rsi(df["close"], req.rsi_period)
        m = macd(df["close"])
        df["macd_line"] = m["macd"]
        df["macd_signal"] = m["signal"]
        df["atr"] = atr(df["high"], df["low"], df["close"], 14)

        trades: List[Trade] = []
        in_trade = False
        entry_price = 0.0
        entry_date = ""
        entry_idx = 0

        for i in range(max(req.slow_period, 26) + 1, len(df)):
            row = df.iloc[i]
            prev = df.iloc[i - 1]
            price = float(row["close"])
            date_str = str(df.index[i].date()) if hasattr(df.index[i], "date") else str(df.index[i])

            if not in_trade:
                # Entry signals
                enter = False
                if req.strategy == "sma_crossover":
                    enter = (
                        prev["sma_fast"] <= prev["sma_slow"]
                        and row["sma_fast"] > row["sma_slow"]
                    )
                elif req.strategy == "rsi_oversold":
                    enter = prev["rsi"] < req.rsi_oversold and row["rsi"] >= req.rsi_oversold
                elif req.strategy == "macd_crossover":
                    enter = (
                        prev["macd_line"] <= prev["macd_signal"]
                        and row["macd_line"] > row["macd_signal"]
                    )
                elif req.strategy == "breakout":
                    window = df["high"].iloc[max(0, i - 20):i]
                    if not window.empty:
                        prior_high = float(window.max())
                        enter = price > prior_high

                if enter:
                    in_trade = True
                    entry_price = price
                    entry_date = date_str
                    entry_idx = i
            else:
                # Exit conditions
                pnl_pct = ((price - entry_price) / entry_price) * 100
                holding_days = i - entry_idx

                exit_trade = False
                # Stop loss
                if pnl_pct <= -req.stop_loss_pct:
                    exit_trade = True
                # Take profit
                elif pnl_pct >= req.take_profit_pct:
                    exit_trade = True
                # Strategy-specific exit
                elif req.strategy == "sma_crossover":
                    exit_trade = row["sma_fast"] < row["sma_slow"]
                elif req.strategy == "rsi_oversold":
                    exit_trade = row["rsi"] > req.rsi_overbought
                elif req.strategy == "macd_crossover":
                    exit_trade = row["macd_line"] < row["macd_signal"]
                elif req.strategy == "breakout":
                    exit_trade = holding_days >= 10 or pnl_pct <= -req.stop_loss_pct

                if exit_trade:
                    in_trade = False
                    trades.append(Trade(
                        entry_date=entry_date,
                        exit_date=date_str,
                        entry_price=round(entry_price, 2),
                        exit_price=round(price, 2),
                        pnl_percent=round(pnl_pct, 2),
                        type="win" if pnl_pct > 0 else "loss",
                        holding_days=holding_days,
                    ))

        # Calculate metrics
        total_trades = len(trades)
        if total_trades == 0:
            return _empty_result(req)

        wins = [t for t in trades if t.pnl_percent > 0]
        losses = [t for t in trades if t.pnl_percent <= 0]
        win_rate = len(wins) / total_trades * 100

        avg_win = sum(t.pnl_percent for t in wins) / len(wins) if wins else 0
        avg_loss = sum(abs(t.pnl_percent) for t in losses) / len(losses) if losses else 0
        total_win_sum = sum(t.pnl_percent for t in wins)
        total_loss_sum = sum(abs(t.pnl_percent) for t in losses)
        profit_factor = total_win_sum / total_loss_sum if total_loss_sum > 0 else 999

        # Total return (compound)
        total_return = 0.0
        equity = 100.0
        equity_curve = [{"trade": 0, "equity": 100.0}]
        peak = 100.0
        max_dd = 0.0

        for idx, t in enumerate(trades):
            equity *= (1 + t.pnl_percent / 100)
            equity_curve.append({"trade": idx + 1, "equity": round(equity, 2)})
            if equity > peak:
                peak = equity
            dd = (peak - equity) / peak * 100
            if dd > max_dd:
                max_dd = dd

        total_return = equity - 100.0

        # Simple Sharpe approximation
        import statistics
        returns = [t.pnl_percent for t in trades]
        if len(returns) >= 2:
            avg_ret = statistics.mean(returns)
            std_ret = statistics.stdev(returns)
            sharpe = (avg_ret / std_ret) * (252 / max(1, sum(t.holding_days for t in trades) / total_trades)) ** 0.5 if std_ret > 0 else None
        else:
            sharpe = None

        return BacktestResult(
            symbol=req.symbol.upper(),
            strategy=req.strategy,
            range=req.range,
            total_trades=total_trades,
            winning_trades=len(wins),
            losing_trades=len(losses),
            win_rate=round(win_rate, 1),
            total_return=round(total_return, 2),
            avg_win=round(avg_win, 2),
            avg_loss=round(avg_loss, 2),
            profit_factor=round(profit_factor, 2),
            max_drawdown=round(max_dd, 2),
            sharpe_ratio=round(sharpe, 2) if sharpe else None,
            trades=trades,
            equity_curve=equity_curve,
        )

    return await asyncio.to_thread(_run)


@router.get("/strategies")
async def list_strategies():
    """Return available backtest strategies with descriptions."""
    return [
        {
            "id": "sma_crossover",
            "name": "SMA Crossover",
            "description": "Buy when fast SMA crosses above slow SMA, sell on cross below",
            "params": ["fast_period", "slow_period", "stop_loss_pct", "take_profit_pct"],
        },
        {
            "id": "rsi_oversold",
            "name": "RSI Oversold Bounce",
            "description": "Buy when RSI crosses above oversold level, sell at overbought",
            "params": ["rsi_period", "rsi_oversold", "rsi_overbought", "stop_loss_pct"],
        },
        {
            "id": "macd_crossover",
            "name": "MACD Crossover",
            "description": "Buy on MACD bullish crossover, sell on bearish crossover",
            "params": ["stop_loss_pct", "take_profit_pct"],
        },
        {
            "id": "breakout",
            "name": "20-Day Breakout",
            "description": "Buy when price breaks above 20-day high, hold max 10 days",
            "params": ["stop_loss_pct", "take_profit_pct"],
        },
    ]


def _empty_result(req: BacktestRequest) -> BacktestResult:
    return BacktestResult(
        symbol=req.symbol.upper(),
        strategy=req.strategy,
        range=req.range,
        total_trades=0,
        winning_trades=0,
        losing_trades=0,
        win_rate=0,
        total_return=0,
        avg_win=0,
        avg_loss=0,
        profit_factor=0,
        max_drawdown=0,
        sharpe_ratio=None,
        trades=[],
        equity_curve=[],
    )
