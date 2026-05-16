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


# Popular US stocks for auto-prediction
TOP_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD",
    "NFLX", "JPM", "V", "JNJ", "WMT", "DIS", "PYPL", "BA", "INTC",
    "CRM", "UBER", "COIN",
]


class TopPredictionItem(BaseModel):
    symbol: str
    current_price: float
    overall_bias: str
    overall_score: float
    prediction_1d: PredictionTimeframe | None = None
    prediction_1w: PredictionTimeframe | None = None
    entry_point: EntryPointResponse | None = None


@router.get("/top", response_model=List[TopPredictionItem])
async def get_top_predictions(
    limit: int = Query(10, ge=1, le=20, description="Number of predictions to return"),
):
    """
    Auto-generate predictions for top US stocks.
    Returns pre-analyzed predictions without needing user input.
    Sorted by strongest signal (highest absolute score).
    """
    import asyncio
    import logging

    log = logging.getLogger(__name__)
    service = get_market_data_service()
    results: List[TopPredictionItem] = []

    async def analyze_symbol(sym: str):
        try:
            history = await service.history(sym, range_="1y", interval="1d")
            if not history.candles or len(history.candles) < 50:
                return None
            report = generate_prediction(history.candles, sym)

            pred_1d = None
            pred_1w = None
            for p in report.predictions:
                if p.timeframe == "1d":
                    pred_1d = PredictionTimeframe(
                        timeframe=p.timeframe, direction=p.direction,
                        confidence=p.confidence, predicted_low=p.predicted_low,
                        predicted_high=p.predicted_high,
                        predicted_change_pct_low=p.predicted_change_pct_low,
                        predicted_change_pct_high=p.predicted_change_pct_high,
                        signals=p.signals,
                    )
                elif p.timeframe == "1w":
                    pred_1w = PredictionTimeframe(
                        timeframe=p.timeframe, direction=p.direction,
                        confidence=p.confidence, predicted_low=p.predicted_low,
                        predicted_high=p.predicted_high,
                        predicted_change_pct_low=p.predicted_change_pct_low,
                        predicted_change_pct_high=p.predicted_change_pct_high,
                        signals=p.signals,
                    )

            return TopPredictionItem(
                symbol=report.symbol,
                current_price=report.current_price,
                overall_bias=report.overall_bias,
                overall_score=report.overall_score,
                prediction_1d=pred_1d,
                prediction_1w=pred_1w,
                entry_point=EntryPointResponse(
                    entry_price=report.entry_point.entry_price,
                    stop_loss=report.entry_point.stop_loss,
                    target_1=report.entry_point.target_1,
                    target_2=report.entry_point.target_2,
                    risk_reward_ratio=report.entry_point.risk_reward_ratio,
                    entry_type=report.entry_point.entry_type,
                    reasoning=report.entry_point.reasoning,
                ),
            )
        except Exception as e:
            log.debug("Prediction failed for %s: %s", sym, e)
            return None

    # Analyze symbols concurrently (batch of 5 at a time to avoid rate limits)
    for i in range(0, len(TOP_SYMBOLS), 5):
        batch = TOP_SYMBOLS[i:i + 5]
        batch_results = await asyncio.gather(*[analyze_symbol(s) for s in batch])
        results.extend([r for r in batch_results if r is not None])
        if len(results) >= limit:
            break

    # Sort by strongest signal (highest absolute score)
    results.sort(key=lambda x: abs(x.overall_score), reverse=True)
    return results[:limit]


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
