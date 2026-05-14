"""Quantitative Analysis API — hedge fund grade endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Query
from app.services.quant_engine import get_quant_engine

router = APIRouter(prefix="/quant", tags=["quant"])


@router.get("/alpha/{symbol}")
async def alpha_score(symbol: str):
    """Statistical alpha model: z-score, Sharpe, mean reversion probability."""
    return await get_quant_engine().alpha_score(symbol)


@router.get("/regime")
async def regime_detection():
    """Market regime detection: bull/bear trending/volatile/sideways."""
    return await get_quant_engine().regime_detection()


@router.get("/signal/{symbol}")
async def signal_strength(symbol: str):
    """Composite signal strength (0-100) with decay-weighted technicals."""
    return await get_quant_engine().signal_strength(symbol)


@router.get("/sizing/{symbol}")
async def risk_parity_sizing(
    symbol: str,
    portfolio: float = Query(10000, description="Portfolio value in USD"),
    risk: float = Query(2.0, description="Max risk per trade (%)"),
):
    """Risk-parity position sizing using ATR volatility normalization."""
    return await get_quant_engine().risk_parity_sizing(symbol, portfolio, risk)
