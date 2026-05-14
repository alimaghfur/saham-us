"""Sentiment Analysis service.

Analyzes news headlines and text to determine market sentiment
using keyword-based NLP (no external ML library needed).
Provides sentiment scores for individual stocks and overall market.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import re
import math


# --- Sentiment Lexicon ---
# Positive words commonly found in financial news
POSITIVE_WORDS = {
    "surge", "soar", "rally", "jump", "gain", "rise", "climb", "boost",
    "bullish", "upgrade", "beat", "exceed", "outperform", "strong", "growth",
    "profit", "revenue", "record", "high", "breakout", "momentum", "optimism",
    "confident", "recovery", "rebound", "upside", "innovation", "expand",
    "dividend", "buyback", "acquisition", "partnership", "launch", "approve",
    "positive", "impressive", "robust", "accelerate", "dominate", "success",
    "breakthrough", "opportunity", "upbeat", "stellar", "solid", "exceed",
    "surprise", "strength", "winner", "hot", "boom", "explosive", "skyrocket",
    "milestone", "double", "triple", "overweight", "buy", "accumulate",
}

# Negative words commonly found in financial news
NEGATIVE_WORDS = {
    "crash", "plunge", "drop", "fall", "decline", "loss", "sink", "tumble",
    "bearish", "downgrade", "miss", "disappoint", "underperform", "weak",
    "recession", "deficit", "debt", "default", "bankruptcy", "layoff",
    "cut", "slash", "warning", "concern", "risk", "volatile", "uncertainty",
    "sell", "dump", "panic", "fear", "crisis", "inflation", "tariff",
    "lawsuit", "investigation", "fraud", "scandal", "recall", "delay",
    "negative", "struggle", "slump", "worst", "low", "collapse", "threat",
    "overvalued", "bubble", "correction", "downside", "headwind", "pressure",
    "underweight", "reduce", "avoid", "caution", "trouble", "fail",
}

# Intensifiers
INTENSIFIERS = {
    "very", "extremely", "significantly", "sharply", "dramatically",
    "massive", "huge", "major", "substantial", "considerable",
}

# Negators
NEGATORS = {
    "not", "no", "never", "neither", "nor", "hardly", "barely",
    "despite", "although", "however", "but", "yet",
}


@dataclass
class SentimentScore:
    """Sentiment score for a single text."""
    text: str
    score: float  # -1.0 to +1.0
    label: str  # "very_bullish", "bullish", "neutral", "bearish", "very_bearish"
    positive_words: List[str] = field(default_factory=list)
    negative_words: List[str] = field(default_factory=list)


@dataclass
class StockSentiment:
    """Overall sentiment analysis for a stock."""
    symbol: str
    overall_score: float  # -1.0 to +1.0
    overall_label: str
    news_count: int
    bullish_count: int
    bearish_count: int
    neutral_count: int
    headlines: List[SentimentScore]
    confidence: float  # 0-100
    recommendation: str


def _tokenize(text: str) -> List[str]:
    """Simple tokenization."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return text.split()


def _analyze_text(text: str) -> SentimentScore:
    """Analyze sentiment of a single text."""
    tokens = _tokenize(text)
    if not tokens:
        return SentimentScore(text=text, score=0.0, label="neutral")

    positive_found = []
    negative_found = []
    score = 0.0

    # Window-based analysis for negation handling
    for i, token in enumerate(tokens):
        # Check for negator in previous 3 words
        negated = False
        for j in range(max(0, i - 3), i):
            if tokens[j] in NEGATORS:
                negated = True
                break

        # Check for intensifier in previous 2 words
        intensified = False
        for j in range(max(0, i - 2), i):
            if tokens[j] in INTENSIFIERS:
                intensified = True
                break

        multiplier = 1.5 if intensified else 1.0

        if token in POSITIVE_WORDS:
            if negated:
                score -= 0.5 * multiplier
                negative_found.append(f"not {token}")
            else:
                score += 1.0 * multiplier
                positive_found.append(token)
        elif token in NEGATIVE_WORDS:
            if negated:
                score += 0.5 * multiplier
                positive_found.append(f"not {token}")
            else:
                score -= 1.0 * multiplier
                negative_found.append(token)

    # Normalize score to -1.0 to +1.0
    # Use sigmoid-like normalization
    if score != 0:
        normalized = score / (abs(score) + 3.0)  # soft normalization
    else:
        normalized = 0.0

    # Clamp
    normalized = max(-1.0, min(1.0, normalized))

    # Determine label
    if normalized >= 0.4:
        label = "very_bullish"
    elif normalized >= 0.15:
        label = "bullish"
    elif normalized <= -0.4:
        label = "very_bearish"
    elif normalized <= -0.15:
        label = "bearish"
    else:
        label = "neutral"

    return SentimentScore(
        text=text,
        score=round(normalized, 4),
        label=label,
        positive_words=positive_found,
        negative_words=negative_found,
    )


def analyze_headlines(headlines: List[str], symbol: str) -> StockSentiment:
    """
    Analyze multiple news headlines for a stock.
    Returns aggregated sentiment with recommendation.
    """
    if not headlines:
        return StockSentiment(
            symbol=symbol.upper(),
            overall_score=0.0,
            overall_label="neutral",
            news_count=0,
            bullish_count=0,
            bearish_count=0,
            neutral_count=0,
            headlines=[],
            confidence=0.0,
            recommendation="Tidak ada data berita untuk dianalisis.",
        )

    scores = [_analyze_text(h) for h in headlines]

    bullish = sum(1 for s in scores if s.score > 0.1)
    bearish = sum(1 for s in scores if s.score < -0.1)
    neutral = len(scores) - bullish - bearish

    # Weighted average (recent news weighted more)
    total_score = 0.0
    total_weight = 0.0
    for i, s in enumerate(scores):
        # More recent = higher weight (index 0 = most recent)
        weight = 1.0 / (1.0 + i * 0.1)
        total_score += s.score * weight
        total_weight += weight

    overall = total_score / total_weight if total_weight > 0 else 0.0
    overall = max(-1.0, min(1.0, overall))

    # Confidence based on agreement and sample size
    if len(scores) >= 10:
        size_factor = 1.0
    elif len(scores) >= 5:
        size_factor = 0.8
    else:
        size_factor = 0.5

    agreement = max(bullish, bearish, neutral) / len(scores)
    confidence = round(agreement * size_factor * 100, 1)

    # Overall label
    if overall >= 0.3:
        overall_label = "very_bullish"
    elif overall >= 0.1:
        overall_label = "bullish"
    elif overall <= -0.3:
        overall_label = "very_bearish"
    elif overall <= -0.1:
        overall_label = "bearish"
    else:
        overall_label = "neutral"

    # Generate recommendation
    recommendation = _generate_recommendation(overall, confidence, bullish, bearish, len(scores))

    return StockSentiment(
        symbol=symbol.upper(),
        overall_score=round(overall, 4),
        overall_label=overall_label,
        news_count=len(scores),
        bullish_count=bullish,
        bearish_count=bearish,
        neutral_count=neutral,
        headlines=scores[:20],  # Limit to top 20
        confidence=confidence,
        recommendation=recommendation,
    )


def _generate_recommendation(score: float, confidence: float, bullish: int, bearish: int, total: int) -> str:
    """Generate human-readable recommendation based on sentiment."""
    if total == 0:
        return "Tidak ada data berita."

    pct_bullish = (bullish / total) * 100
    pct_bearish = (bearish / total) * 100

    if score >= 0.3 and confidence >= 60:
        return (
            f"Sentimen SANGAT POSITIF — {pct_bullish:.0f}% berita bullish. "
            f"Market optimis terhadap saham ini. Pertimbangkan untuk entry/hold."
        )
    elif score >= 0.1 and confidence >= 40:
        return (
            f"Sentimen POSITIF — {pct_bullish:.0f}% berita bullish. "
            f"Ada optimisme moderat. Monitor untuk konfirmasi teknikal."
        )
    elif score <= -0.3 and confidence >= 60:
        return (
            f"Sentimen SANGAT NEGATIF — {pct_bearish:.0f}% berita bearish. "
            f"Market pesimis. Hindari entry baru, pertimbangkan cut loss."
        )
    elif score <= -0.1 and confidence >= 40:
        return (
            f"Sentimen NEGATIF — {pct_bearish:.0f}% berita bearish. "
            f"Ada tekanan jual dari berita. Tunggu sentimen membaik."
        )
    else:
        return (
            f"Sentimen NETRAL — sentimen berita campur aduk. "
            f"Gunakan analisis teknikal untuk keputusan trading."
        )


def analyze_market_sentiment(news_by_sector: Dict[str, List[str]]) -> Dict[str, float]:
    """Analyze overall market sentiment by sector."""
    results = {}
    for sector, headlines in news_by_sector.items():
        if headlines:
            scores = [_analyze_text(h).score for h in headlines]
            results[sector] = round(sum(scores) / len(scores), 4)
        else:
            results[sector] = 0.0
    return results
