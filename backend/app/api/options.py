"""Options Chain & Greeks endpoint."""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.market_data import get_market_data_service
from app.services.options import generate_options_chain, OptionsChain

router = APIRouter(prefix="/options", tags=["options"])


class GreeksResponse(BaseModel):
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float


class OptionContractResponse(BaseModel):
    strike: float
    expiry_days: int
    option_type: str
    price: float
    bid: float
    ask: float
    iv: float
    volume: int
    open_interest: int
    greeks: GreeksResponse
    itm: bool
    moneyness: str


class OptionsChainResponse(BaseModel):
    symbol: str
    stock_price: float
    expiry_days: int
    risk_free_rate: float
    calls: List[OptionContractResponse]
    puts: List[OptionContractResponse]
    max_pain: float
    put_call_ratio: float
    iv_rank: float


@router.get("/{symbol}", response_model=OptionsChainResponse)
async def get_options_chain(
    symbol: str,
    expiry_days: int = Query(30, ge=7, le=365, description="Days to expiration"),
):
    """
    Get options chain with Greeks for a stock.

    Generates call/put options at multiple strikes with:
    - Black-Scholes pricing
    - Full Greeks (Delta, Gamma, Theta, Vega, Rho)
    - IV skew/smile
    - Max Pain, Put/Call ratio, IV Rank
    """
    # Get current price and historical volatility
    quote = await get_market_data_service().quote(symbol)
    history = await get_market_data_service().history(symbol, range_="3mo", interval="1d")

    stock_price = quote.price or 100.0

    # Calculate historical volatility
    if history.candles and len(history.candles) > 20:
        import numpy as np
        closes = [c.close for c in history.candles]
        returns = np.diff(np.log(closes))
        hist_vol = float(np.std(returns) * np.sqrt(252))
    else:
        hist_vol = 0.30

    chain = generate_options_chain(
        stock_price=stock_price,
        symbol=symbol,
        historical_volatility=hist_vol,
        expiry_days=expiry_days,
    )

    return OptionsChainResponse(
        symbol=chain.symbol,
        stock_price=chain.stock_price,
        expiry_days=chain.expiry_days,
        risk_free_rate=chain.risk_free_rate,
        calls=[
            OptionContractResponse(
                strike=c.strike, expiry_days=c.expiry_days, option_type=c.option_type,
                price=c.price, bid=c.bid, ask=c.ask, iv=c.iv, volume=c.volume,
                open_interest=c.open_interest, greeks=GreeksResponse(**vars(c.greeks)),
                itm=c.itm, moneyness=c.moneyness,
            ) for c in chain.calls
        ],
        puts=[
            OptionContractResponse(
                strike=p.strike, expiry_days=p.expiry_days, option_type=p.option_type,
                price=p.price, bid=p.bid, ask=p.ask, iv=p.iv, volume=p.volume,
                open_interest=p.open_interest, greeks=GreeksResponse(**vars(p.greeks)),
                itm=p.itm, moneyness=p.moneyness,
            ) for p in chain.puts
        ],
        max_pain=chain.max_pain,
        put_call_ratio=chain.put_call_ratio,
        iv_rank=chain.iv_rank,
    )
