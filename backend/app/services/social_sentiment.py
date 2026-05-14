"""Social media sentiment simulation service.

Simulates social media sentiment data including Reddit mentions,
Twitter/X buzz scores, trending scores, and sentiment analysis
from social platforms. All data is synthetically generated.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np


@dataclass
class SocialMention:
    """A single social media mention/post."""
    platform: str  # "Reddit", "Twitter/X", "StockTwits", "YouTube"
    content_preview: str  # First 200 chars of post
    sentiment: str  # "Bullish", "Bearish", "Neutral"
    sentiment_score: float  # -1 to 1
    engagement: int  # Likes/upvotes
    comments: int
    shares: int
    timestamp: str
    author_credibility: float  # 0-1 (based on account age, karma, etc.)
    source_url: str


@dataclass
class SentimentTimeSeries:
    """Sentiment data point for time series."""
    date: str
    sentiment_score: float  # -1 to 1
    mention_count: int
    bullish_pct: float
    bearish_pct: float
    neutral_pct: float
    volume_change_pct: float  # Change in mentions vs prior period


@dataclass
class PlatformBreakdown:
    """Sentiment breakdown for a single platform."""
    platform: str
    mention_count: int
    sentiment_score: float
    bullish_pct: float
    bearish_pct: float
    trending_rank: Optional[int] = None  # Position in trending list
    top_posts: List[SocialMention] = field(default_factory=list)


@dataclass
class SocialSentimentReport:
    """Complete social sentiment report for a symbol."""
    symbol: str
    timestamp: str
    # Aggregate scores
    overall_sentiment: float  # -1 to 1
    overall_label: str  # "Very Bullish", "Bullish", "Neutral", "Bearish", "Very Bearish"
    buzz_score: float  # 0-100 (how much attention)
    trending_score: float  # 0-100 (how fast mentions are growing)
    # Volume
    total_mentions_24h: int
    total_mentions_7d: int
    mention_change_24h: float  # % change vs prior 24h
    mention_change_7d: float  # % change vs prior 7d
    # Breakdowns
    platform_breakdown: List[PlatformBreakdown]
    sentiment_history: List[SentimentTimeSeries]
    # Key metrics
    reddit_wsb_mentions: int
    twitter_impressions: int
    influencer_sentiment: float  # -1 to 1 (weighted by follower count)
    # Signals
    sentiment_divergence: float  # Sentiment vs price direction mismatch
    contrarian_signal: Optional[str]  # "Buy" or "Sell" when extreme sentiment
    # Top mentions
    top_mentions: List[SocialMention]
    summary: str


# Simulated post templates
_BULLISH_TEMPLATES = [
    "{symbol} breaking out! Target ${target}. Loading up more shares 🚀",
    "Earnings whisper on {symbol} looking STRONG. Beat incoming. 💪",
    "{symbol} institutional accumulation detected. Smart money buying.",
    "Technical breakout on {symbol} above key resistance. Bullish AF",
    "{symbol} fundamentals are insane at this valuation. Easy double.",
    "Just added more {symbol}. This dip is a gift. Strong buy.",
    "{symbol} short squeeze potential. 30% SI and rising. 🔥",
]

_BEARISH_TEMPLATES = [
    "{symbol} looks toppy here. Taking profits at this level.",
    "Bearish divergence on {symbol} RSI. Expecting pullback to ${support}.",
    "{symbol} insider selling accelerating. Red flag. 🚩",
    "Overvalued: {symbol} at 40x forward earnings? Pass.",
    "{symbol} revenue growth decelerating. Growth trap.",
    "Short {symbol}. Competition eating their lunch. Puts printing.",
]

_NEUTRAL_TEMPLATES = [
    "{symbol} consolidating. Waiting for direction before entry.",
    "Mixed signals on {symbol}. Both bull and bear case valid here.",
    "{symbol} trading in a range. Need catalyst to break out.",
    "Holding {symbol} but not adding. Waiting for earnings clarity.",
]

_PLATFORMS = ["Reddit", "Twitter/X", "StockTwits", "YouTube"]

_SUBREDDITS = ["r/wallstreetbets", "r/stocks", "r/investing", "r/options", "r/ValueInvesting"]


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def _generate_mentions(
    symbol: str,
    current_price: float,
    num_mentions: int = 20,
) -> List[SocialMention]:
    """Generate synthetic social media mentions.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price.
        num_mentions: Number of mentions to generate.

    Returns:
        List of SocialMention objects.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    mentions: List[SocialMention] = []
    today = datetime.now()

    for i in range(num_mentions):
        # Random platform
        platform = rng.choice(_PLATFORMS)

        # Sentiment with slight bullish bias (realistic for social media)
        sentiment_roll = rng.random()
        if sentiment_roll < 0.45:
            sentiment = "Bullish"
            templates = _BULLISH_TEMPLATES
            score = np_rng.uniform(0.3, 1.0)
        elif sentiment_roll < 0.75:
            sentiment = "Bearish"
            templates = _BEARISH_TEMPLATES
            score = np_rng.uniform(-1.0, -0.3)
        else:
            sentiment = "Neutral"
            templates = _NEUTRAL_TEMPLATES
            score = np_rng.uniform(-0.3, 0.3)

        template = rng.choice(templates)
        content = template.format(
            symbol=symbol,
            target=round(current_price * rng.uniform(1.1, 1.5), 2),
            support=round(current_price * rng.uniform(0.85, 0.95), 2),
        )

        # Engagement metrics (power law distribution)
        engagement = int(np_rng.pareto(1.5) * 50)
        comments = int(engagement * np_rng.uniform(0.1, 0.5))
        shares = int(engagement * np_rng.uniform(0.05, 0.2))

        # Timestamp within last 24 hours
        hours_ago = rng.uniform(0, 24)
        ts = today - timedelta(hours=hours_ago)

        # Author credibility
        credibility = np_rng.beta(2, 3)  # Most accounts are medium credibility

        # Source URL
        if platform == "Reddit":
            sub = rng.choice(_SUBREDDITS)
            source_url = f"https://reddit.com/{sub}/comments/{hashlib.md5(content.encode()).hexdigest()[:6]}"
        elif platform == "Twitter/X":
            source_url = f"https://x.com/user_{rng.randint(1000, 9999)}/status/{rng.randint(10**17, 10**18)}"
        elif platform == "StockTwits":
            source_url = f"https://stocktwits.com/symbol/{symbol}?id={rng.randint(100000, 999999)}"
        else:
            source_url = f"https://youtube.com/watch?v={hashlib.md5(content.encode()).hexdigest()[:11]}"

        mentions.append(SocialMention(
            platform=platform,
            content_preview=content[:200],
            sentiment=sentiment,
            sentiment_score=round(float(score), 3),
            engagement=engagement,
            comments=comments,
            shares=shares,
            timestamp=ts.strftime("%Y-%m-%dT%H:%M:%S"),
            author_credibility=round(float(credibility), 3),
            source_url=source_url,
        ))

    # Sort by engagement
    mentions.sort(key=lambda m: m.engagement, reverse=True)
    return mentions


def get_social_sentiment(
    symbol: str,
    current_price: float = 150.0,
) -> SocialSentimentReport:
    """Get comprehensive social media sentiment report for a symbol.

    Analyzes simulated social media data across platforms to generate
    sentiment scores, buzz metrics, and trending indicators.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price for context.

    Returns:
        SocialSentimentReport with all sentiment data.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    today = datetime.now()

    # Generate mentions
    mentions = _generate_mentions(symbol, current_price, num_mentions=50)

    # Overall sentiment calculation
    scores = [m.sentiment_score for m in mentions]
    # Weight by engagement and credibility
    weights = [m.engagement * m.author_credibility for m in mentions]
    total_weight = sum(weights) or 1
    weighted_sentiment = sum(s * w for s, w in zip(scores, weights)) / total_weight

    # Label
    if weighted_sentiment > 0.5:
        overall_label = "Very Bullish"
    elif weighted_sentiment > 0.2:
        overall_label = "Bullish"
    elif weighted_sentiment < -0.5:
        overall_label = "Very Bearish"
    elif weighted_sentiment < -0.2:
        overall_label = "Bearish"
    else:
        overall_label = "Neutral"

    # Buzz and trending scores
    total_mentions_24h = len(mentions)
    total_mentions_7d = int(total_mentions_24h * np_rng.uniform(5, 8))
    mention_change_24h = round(float(np_rng.normal(15, 30)), 1)
    mention_change_7d = round(float(np_rng.normal(10, 40)), 1)

    buzz_score = round(min(100, max(0, 30 + total_mentions_24h * 0.5 + abs(mention_change_24h) * 0.3)), 1)
    trending_score = round(min(100, max(0, mention_change_24h * 1.5 + 30)), 1)

    # Platform breakdown
    platform_breakdown: List[PlatformBreakdown] = []
    for platform in _PLATFORMS:
        p_mentions = [m for m in mentions if m.platform == platform]
        if p_mentions:
            p_scores = [m.sentiment_score for m in p_mentions]
            p_sentiment = float(np.mean(p_scores))
            bullish = sum(1 for m in p_mentions if m.sentiment == "Bullish")
            bearish = sum(1 for m in p_mentions if m.sentiment == "Bearish")
            total_p = len(p_mentions)

            platform_breakdown.append(PlatformBreakdown(
                platform=platform,
                mention_count=total_p,
                sentiment_score=round(p_sentiment, 3),
                bullish_pct=round(bullish / total_p * 100, 1),
                bearish_pct=round(bearish / total_p * 100, 1),
                trending_rank=rng.randint(1, 50) if platform in ("Reddit", "Twitter/X") else None,
                top_posts=p_mentions[:3],
            ))

    # Sentiment time series (last 7 days)
    sentiment_history: List[SentimentTimeSeries] = []
    for days_ago in range(7, -1, -1):
        date = today - timedelta(days=days_ago)
        day_seed = seed + days_ago
        day_rng = np.random.default_rng(day_seed)

        day_sentiment = float(day_rng.normal(weighted_sentiment, 0.15))
        day_mentions = int(total_mentions_24h * day_rng.uniform(0.7, 1.3))
        bullish_pct = float(day_rng.uniform(30, 70))
        bearish_pct = float(day_rng.uniform(15, 50))
        neutral_pct = 100 - bullish_pct - bearish_pct

        sentiment_history.append(SentimentTimeSeries(
            date=date.strftime("%Y-%m-%d"),
            sentiment_score=round(day_sentiment, 3),
            mention_count=day_mentions,
            bullish_pct=round(bullish_pct, 1),
            bearish_pct=round(bearish_pct, 1),
            neutral_pct=round(max(0, neutral_pct), 1),
            volume_change_pct=round(float(day_rng.normal(0, 20)), 1),
        ))

    # Reddit WSB mentions
    wsb_mentions = sum(1 for m in mentions if m.platform == "Reddit") * rng.randint(2, 5)

    # Twitter impressions
    twitter_mentions = [m for m in mentions if m.platform == "Twitter/X"]
    twitter_impressions = sum(m.engagement * rng.randint(50, 200) for m in twitter_mentions)

    # Influencer sentiment (heavier weight to high-credibility authors)
    high_cred = [m for m in mentions if m.author_credibility > 0.7]
    influencer_sentiment = float(np.mean([m.sentiment_score for m in high_cred])) if high_cred else 0.0

    # Sentiment divergence (random for simulation)
    sentiment_divergence = round(float(np_rng.normal(0, 0.3)), 3)

    # Contrarian signal
    contrarian_signal = None
    if weighted_sentiment > 0.7:
        contrarian_signal = "Sell"  # Extreme bullishness = contrarian sell
    elif weighted_sentiment < -0.7:
        contrarian_signal = "Buy"  # Extreme bearishness = contrarian buy

    summary = (
        f"Social sentiment for {symbol}: {overall_label} "
        f"(score: {weighted_sentiment:.2f}). "
        f"Buzz score: {buzz_score}/100. "
        f"{total_mentions_24h} mentions in 24h ({mention_change_24h:+.1f}% change). "
        f"WSB mentions: {wsb_mentions}. "
    )
    if contrarian_signal:
        summary += f"Contrarian signal: {contrarian_signal} (extreme sentiment detected)."

    return SocialSentimentReport(
        symbol=symbol,
        timestamp=today.strftime("%Y-%m-%dT%H:%M:%S"),
        overall_sentiment=round(float(weighted_sentiment), 3),
        overall_label=overall_label,
        buzz_score=buzz_score,
        trending_score=trending_score,
        total_mentions_24h=total_mentions_24h,
        total_mentions_7d=total_mentions_7d,
        mention_change_24h=mention_change_24h,
        mention_change_7d=mention_change_7d,
        platform_breakdown=platform_breakdown,
        sentiment_history=sentiment_history,
        reddit_wsb_mentions=wsb_mentions,
        twitter_impressions=twitter_impressions,
        influencer_sentiment=round(float(influencer_sentiment), 3),
        sentiment_divergence=sentiment_divergence,
        contrarian_signal=contrarian_signal,
        top_mentions=mentions[:10],
        summary=summary,
    )
