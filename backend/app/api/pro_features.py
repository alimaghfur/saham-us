"""Pro features API router.

Exposes all premium/pro-tier services as FastAPI endpoints under /pro.
"""
from __future__ import annotations

import dataclasses
from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.market_data import get_market_data_service

from app.services.insider_trading import compute_insider_signal
from app.services.unusual_options import detect_unusual_activity
from app.services.earnings_predictor import predict_earnings
from app.services.portfolio_optimizer import optimize_portfolio
from app.services.economic_calendar import get_economic_calendar
from app.services.pattern_recognition import recognize_patterns
from app.services.dark_pool import get_dark_pool_report
from app.services.social_sentiment import get_social_sentiment
from app.services.dividend_calendar import get_dividend_data, simulate_drip
from app.services.etf_screener import get_etf_profile, compare_etfs
from app.services.market_breadth import get_market_breadth
from app.services.copy_trading import get_top_traders, simulate_copy

router = APIRouter(prefix="/pro", tags=["pro-features"])


def _to_dict(obj):
    """Convert dataclass (possibly nested) to dict for JSON response."""
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {k: _to_dict(v) for k, v in dataclasses.asdict(obj).items()}
    elif isinstance(obj, list):
        return [_to_dict(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: _to_dict(v) for k, v in obj.items()}
    return obj


# --- Request body models ---

class PortfolioOptimizeRequest(BaseModel):
    symbols: List[str]


# --- Endpoints ---

@router.get("/insider/{symbol}")
async def insider_signal(symbol: str):
    """Get insider trading signal for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    current_price = quote.price or 150.0
    result = compute_insider_signal(symbol, current_price)
    return _to_dict(result)


@router.get("/unusual-options/{symbol}")
async def unusual_options(symbol: str):
    """Detect unusual options activity for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    current_price = quote.price or 150.0
    result = detect_unusual_activity(symbol, current_price)
    return _to_dict(result)


@router.get("/earnings-predict/{symbol}")
async def earnings_predict(symbol: str):
    """Predict earnings surprise probability for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    current_price = quote.price or 150.0
    result = predict_earnings(symbol, current_price)
    return _to_dict(result)


@router.post("/portfolio-optimize")
async def portfolio_optimize(body: PortfolioOptimizeRequest):
    """Optimize portfolio allocation using Modern Portfolio Theory."""
    result = optimize_portfolio(body.symbols)
    return _to_dict(result)


@router.get("/economic-calendar")
async def economic_calendar(
    days_ahead: int = Query(default=30, ge=1, le=90),
    days_back: int = Query(default=7, ge=0, le=30),
):
    """Get upcoming and recent economic calendar events."""
    result = get_economic_calendar(days_ahead=days_ahead, days_back=days_back)
    return _to_dict(result)


@router.get("/patterns/{symbol}")
async def patterns(symbol: str):
    """Detect technical chart patterns for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    history = await mds.history(symbol, range_="6mo", interval="1d")
    result = recognize_patterns(symbol, history.candles)
    return _to_dict(result)


@router.get("/dark-pool/{symbol}")
async def dark_pool(symbol: str):
    """Get dark pool / institutional flow report for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    current_price = quote.price or 150.0
    result = get_dark_pool_report(symbol, current_price)
    return _to_dict(result)


@router.get("/social-sentiment/{symbol}")
async def social_sentiment(symbol: str):
    """Get social media sentiment report for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    current_price = quote.price or 150.0
    result = get_social_sentiment(symbol, current_price)
    return _to_dict(result)


@router.get("/dividends/{symbol}")
async def dividends(symbol: str):
    """Get dividend history and upcoming payments for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    current_price = quote.price or 150.0
    result = get_dividend_data(symbol, current_price)
    return _to_dict(result)


@router.get("/drip-simulate/{symbol}")
async def drip_simulate(
    symbol: str,
    initial_investment: float = Query(default=10000.0, ge=100),
    monthly_contribution: float = Query(default=500.0, ge=0),
    years: int = Query(default=20, ge=1, le=50),
):
    """Simulate DRIP compound growth for a stock."""
    mds = get_market_data_service()
    quote = await mds.quote(symbol)
    current_price = quote.price or 150.0
    result = simulate_drip(
        symbol=symbol,
        initial_investment=initial_investment,
        monthly_contribution=monthly_contribution,
        years=years,
        current_price=current_price,
    )
    return _to_dict(result)


@router.get("/etf/{symbol}")
async def etf_profile(symbol: str):
    """Get comprehensive ETF profile data."""
    result = get_etf_profile(symbol)
    return _to_dict(result)


@router.get("/etf-compare")
async def etf_compare(
    symbols: str = Query(..., description="Comma-separated ETF symbols"),
):
    """Compare multiple ETFs side by side."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    result = compare_etfs(symbol_list)
    return _to_dict(result)


@router.get("/market-breadth")
async def market_breadth(
    market: str = Query(default="S&P 500", description="Market: NYSE, NASDAQ, or S&P 500"),
):
    """Get market breadth indicators."""
    result = get_market_breadth(market=market)
    return _to_dict(result)


@router.get("/copy-trading/traders")
async def copy_trading_traders(
    num: int = Query(default=10, ge=1, le=50),
    sort_by: str = Query(default="return", description="Sort by: return, win_rate, sharpe, followers"),
):
    """Get top virtual traders leaderboard."""
    result = get_top_traders(num_traders=num, sort_by=sort_by)
    return _to_dict(result)


@router.get("/copy-trading/simulate/{trader_id}")
async def copy_trading_simulate(
    trader_id: str,
    allocation: float = Query(default=10000.0, ge=100),
):
    """Simulate copying a trader's trades with paper money."""
    result = simulate_copy(trader_id=trader_id, allocation=allocation)
    return _to_dict(result)
