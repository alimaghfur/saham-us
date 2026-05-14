"""Stock price prediction endpoint."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.market_data import get_market_data_service
from app.services.prediction import generate_prediction

router = APIRouter(prefix="/prediction", tags=["prediction"])


# --- Response Models ---

class PredictionTimeframe(BaseModel):
    timeframe: str = Field(description="1d, 1w, or 1m")
    direction: str = Field(description="bullish, bearish, or neutral")
    confidence: float = Field(description="Confidence level 0-100")
    predicted_low: float
    predicted_high: float
    predicted_change_pct_low: float
    predicted_change_pct_high: float
    signals: List[str]


class EntryPointResponse(BaseModel):
    entry_price: float
    stop_loss: float
    target_1: float
    target_2: float
    risk_reward_ratio: float
    entry_type: str = Field(description="buy or sell")
    reasoning: str


class PredictionResponse(BaseModel):
    symbol: str
    current_price: float
    predictions: List[PredictionTimeframe]
    entry_point: EntryPointResponse
    overall_bias: str
    overall_score: float = Field(description="Score from -100 (very bearish) to +100 (very bullish)")
    key_levels: Dict[str, float]
    disclaimer: str


@router.get("/{symbol}", response_model=PredictionResponse)
async def get_prediction(
    symbol: str,
    range_: str = Query("1y", alias="range", description="Data range for analysis"),
):
    """
    Generate stock price prediction for 1 day, 1 week, and 1 month.

    Uses technical analysis (RSI, MACD, Bollinger Bands, Moving Averages, ATR,
    Volume) to predict price movement direction and range.

    Also provides entry point with stop loss and profit targets.
    """
    # Fetch historical data (1 year daily for best indicator accuracy)
    history = await get_market_data_service().history(
        symbol, range_=range_, interval="1d"
    )

    # Generate prediction
    report = generate_prediction(history.candles, symbol)

    # Convert dataclass to response model
    return PredictionResponse(
        symbol=report.symbol,
        current_price=report.current_price,
        predictions=[
            PredictionTimeframe(
                timeframe=p.timeframe,
                direction=p.direction,
                confidence=p.confidence,
                predicted_low=p.predicted_low,
                predicted_high=p.predicted_high,
                predicted_change_pct_low=p.predicted_change_pct_low,
                predicted_change_pct_high=p.predicted_change_pct_high,
                signals=p.signals,
            )
            for p in report.predictions
        ],
        entry_point=EntryPointResponse(
            entry_price=report.entry_point.entry_price,
            stop_loss=report.entry_point.stop_loss,
            target_1=report.entry_point.target_1,
            target_2=report.entry_point.target_2,
            risk_reward_ratio=report.entry_point.risk_reward_ratio,
            entry_type=report.entry_point.entry_type,
            reasoning=report.entry_point.reasoning,
        ),
        overall_bias=report.overall_bias,
        overall_score=report.overall_score,
        key_levels=report.key_levels,
        disclaimer=report.disclaimer,
    )
