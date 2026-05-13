"""Stock-related Pydantic schemas."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    symbol: str
    name: str
    exchange: Optional[str] = None
    type: Optional[str] = None


class Quote(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    previous_close: Optional[float] = None
    open: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    volume: Optional[int] = None
    avg_volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    beta: Optional[float] = None
    week52_high: Optional[float] = Field(default=None, alias="52w_high")
    week52_low: Optional[float] = Field(default=None, alias="52w_low")
    currency: Optional[str] = None
    exchange: Optional[str] = None
    timestamp: Optional[int] = None

    model_config = {"populate_by_name": True}


class CompanyProfile(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    employees: Optional[int] = None
    ceo: Optional[str] = None
    logo_url: Optional[str] = None


class OHLCV(BaseModel):
    date: str  # ISO date / datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoryResponse(BaseModel):
    symbol: str
    interval: str
    range: str
    candles: List[OHLCV]


class Fundamentals(BaseModel):
    symbol: str
    # Valuation
    market_cap: Optional[float] = None
    enterprise_value: Optional[float] = None
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
    peg_ratio: Optional[float] = None
    price_to_book: Optional[float] = None
    price_to_sales: Optional[float] = None
    ev_to_ebitda: Optional[float] = None
    # Profitability
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    profit_margin: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    # Financial strength
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    # Growth
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    # Dividend
    dividend_rate: Optional[float] = None
    dividend_yield: Optional[float] = None
    payout_ratio: Optional[float] = None
    # Share data
    shares_outstanding: Optional[float] = None
    float_shares: Optional[float] = None
    short_ratio: Optional[float] = None


class NewsItem(BaseModel):
    title: str
    publisher: Optional[str] = None
    link: str
    published_at: Optional[int] = None
    summary: Optional[str] = None
    thumbnail: Optional[str] = None
    related_tickers: List[str] = Field(default_factory=list)


class MarketMover(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    volume: Optional[int] = None


class IndexSnapshot(BaseModel):
    symbol: str
    name: str
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None


class SectorPerformance(BaseModel):
    sector: str
    etf: str
    change_percent: Optional[float] = None


class ScreenerFilter(BaseModel):
    """Filter criteria for screener."""

    market_cap_min: Optional[float] = None
    market_cap_max: Optional[float] = None
    pe_min: Optional[float] = None
    pe_max: Optional[float] = None
    pb_min: Optional[float] = None
    pb_max: Optional[float] = None
    roe_min: Optional[float] = None
    dividend_yield_min: Optional[float] = None
    revenue_growth_min: Optional[float] = None
    sectors: Optional[List[str]] = None
    symbols: Optional[List[str]] = Field(
        default=None,
        description="Universe override. If None, use default S&P 500 sample.",
    )
    limit: int = 50


class ScreenerResult(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    price: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    dividend_yield: Optional[float] = None
    revenue_growth: Optional[float] = None


class TechnicalIndicators(BaseModel):
    symbol: str
    interval: str
    last_price: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_9: Optional[float] = None
    ema_21: Optional[float] = None
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    atr_14: Optional[float] = None
    vwap: Optional[float] = None
    trend: Optional[str] = None  # "bullish" | "bearish" | "neutral"


class SwingSetup(BaseModel):
    symbol: str
    name: Optional[str] = None
    setup_type: str  # breakout | pullback | oversold_bounce | etc.
    price: Optional[float] = None
    entry: Optional[float] = None
    stop_loss: Optional[float] = None
    target: Optional[float] = None
    risk_reward: Optional[float] = None
    notes: Optional[str] = None
