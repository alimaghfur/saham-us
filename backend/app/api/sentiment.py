"""Sentiment Analysis endpoints."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.market_data import get_market_data_service
from app.services.sentiment import analyze_headlines, SentimentScore as SentimentScoreData

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


# --- Response Models ---

class HeadlineSentiment(BaseModel):
    text: str
    score: float = Field(description="-1.0 (very bearish) to +1.0 (very bullish)")
    label: str
    positive_words: List[str]
    negative_words: List[str]


class SentimentResponse(BaseModel):
    symbol: str
    overall_score: float
    overall_label: str
    news_count: int
    bullish_count: int
    bearish_count: int
    neutral_count: int
    headlines: List[HeadlineSentiment]
    confidence: float
    recommendation: str


@router.get("/{symbol}", response_model=SentimentResponse)
async def get_sentiment(
    symbol: str,
    limit: int = Query(20, ge=5, le=50, description="Number of news to analyze"),
):
    """
    Analyze news sentiment for a stock.

    Fetches recent news headlines and applies NLP-based sentiment analysis.
    Returns overall sentiment score, per-headline breakdown, and recommendation.
    """
    # Fetch news
    news_items = await get_market_data_service().news(symbol, limit=limit)

    # Extract headlines (title + summary for better analysis)
    headlines = []
    for item in news_items:
        text = item.title
        if item.summary:
            text += " " + item.summary[:100]
        headlines.append(text)

    # Analyze
    result = analyze_headlines(headlines, symbol)

    return SentimentResponse(
        symbol=result.symbol,
        overall_score=result.overall_score,
        overall_label=result.overall_label,
        news_count=result.news_count,
        bullish_count=result.bullish_count,
        bearish_count=result.bearish_count,
        neutral_count=result.neutral_count,
        headlines=[
            HeadlineSentiment(
                text=h.text,
                score=h.score,
                label=h.label,
                positive_words=h.positive_words,
                negative_words=h.negative_words,
            )
            for h in result.headlines
        ],
        confidence=result.confidence,
        recommendation=result.recommendation,
    )
