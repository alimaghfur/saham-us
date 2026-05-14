"""ML-based Prediction endpoint."""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.market_data import get_market_data_service
from app.services.ml_prediction import generate_ml_prediction

router = APIRouter(prefix="/ml-prediction", tags=["ml-prediction"])


class MLTimeframePrediction(BaseModel):
    predicted_price: float
    predicted_change_pct: float
    confidence: float
    direction: str


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class MLPredictionResponse(BaseModel):
    symbol: str
    current_price: float
    model: str
    predictions: Dict[str, MLTimeframePrediction]
    features_importance: List[FeatureImportance]
    model_accuracy: float
    backtest_hit_rate: float


@router.get("/{symbol}", response_model=MLPredictionResponse)
async def get_ml_prediction(symbol: str):
    """
    Generate ML-based price prediction using ensemble of 4 models:
    1. Momentum Linear Regression
    2. Mean Reversion (RSI + BB)
    3. Trend Following (MA + MACD)
    4. Volatility-adjusted Momentum

    Returns predictions for 1 day, 1 week, and 1 month.
    """
    history = await get_market_data_service().history(symbol, range_="1y", interval="1d")
    result = generate_ml_prediction(history.candles, symbol)

    return MLPredictionResponse(
        symbol=result.symbol,
        current_price=result.current_price,
        model=result.model,
        predictions={
            k: MLTimeframePrediction(**v)
            for k, v in result.predictions.items()
        },
        features_importance=[
            FeatureImportance(**f) for f in result.features_importance
        ],
        model_accuracy=result.model_accuracy,
        backtest_hit_rate=result.backtest_hit_rate,
    )
