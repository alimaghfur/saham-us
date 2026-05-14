"""Dividend calendar and DRIP simulation service.

Generates dividend data including ex-dates, pay-dates, amounts,
yields, frequency, and computes DRIP (Dividend Reinvestment Plan)
compound growth simulations.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np


@dataclass
class DividendEvent:
    """A single dividend event."""
    symbol: str
    ex_date: str
    record_date: str
    pay_date: str
    amount: float
    frequency: str  # "Quarterly", "Monthly", "Semi-Annual", "Annual"
    dividend_type: str  # "Regular", "Special", "Preferred"
    yield_on_cost: float  # Yield based on price at declaration


@dataclass
class DividendHistory:
    """Historical dividend data for a symbol."""
    symbol: str
    current_annual_dividend: float
    current_yield: float
    payout_ratio: float
    dividend_growth_rate_5y: float  # 5-year CAGR
    dividend_growth_rate_3y: float
    years_of_growth: int  # Consecutive years of dividend increases
    frequency: str
    next_ex_date: Optional[str] = None
    next_pay_date: Optional[str] = None
    next_amount: Optional[float] = None
    history: List[DividendEvent] = field(default_factory=list)
    is_dividend_aristocrat: bool = False
    is_dividend_king: bool = False


@dataclass
class DRIPYearResult:
    """DRIP simulation result for a single year."""
    year: int
    starting_shares: float
    dividends_received: float
    shares_purchased: float
    ending_shares: float
    share_price: float
    portfolio_value: float
    yield_on_cost: float
    total_invested: float
    total_return_pct: float


@dataclass
class DRIPSimulation:
    """Complete DRIP compound growth simulation."""
    symbol: str
    initial_investment: float
    monthly_contribution: float
    initial_price: float
    initial_shares: float
    years: int
    # Final results
    final_shares: float
    final_price: float
    final_portfolio_value: float
    total_invested: float
    total_dividends_reinvested: float
    total_return_pct: float
    annualized_return_pct: float
    # Comparison
    value_without_drip: float  # Same investment but no reinvestment
    drip_advantage_pct: float  # How much DRIP added
    # Year by year
    yearly_results: List[DRIPYearResult]
    summary: str


def _symbol_seed(symbol: str) -> int:
    """Generate a deterministic seed from symbol."""
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)


def get_dividend_data(
    symbol: str,
    current_price: float = 150.0,
    eps: float = 6.0,
    years_back: int = 5,
) -> DividendHistory:
    """Generate dividend history and upcoming data for a symbol.

    Args:
        symbol: Stock ticker.
        current_price: Current stock price.
        eps: Earnings per share.
        years_back: Years of dividend history to generate.

    Returns:
        DividendHistory with past events and next payment info.
    """
    seed = _symbol_seed(symbol)
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    today = datetime.now()

    # Determine dividend characteristics
    frequencies = ["Quarterly", "Quarterly", "Quarterly", "Monthly", "Semi-Annual"]
    frequency = rng.choice(frequencies)

    # Base annual yield (1.5-4.5% for most dividend payers)
    annual_yield = np_rng.uniform(0.015, 0.045)
    annual_dividend = round(current_price * annual_yield, 2)

    if frequency == "Quarterly":
        per_payment = round(annual_dividend / 4, 4)
        payments_per_year = 4
    elif frequency == "Monthly":
        per_payment = round(annual_dividend / 12, 4)
        payments_per_year = 12
    elif frequency == "Semi-Annual":
        per_payment = round(annual_dividend / 2, 4)
        payments_per_year = 2
    else:
        per_payment = annual_dividend
        payments_per_year = 1

    # Payout ratio
    payout_ratio = round(annual_dividend / max(eps, 0.01) * 100, 1)
    payout_ratio = min(95, max(10, payout_ratio))

    # Growth rates
    growth_5y = np_rng.uniform(0.03, 0.12)  # 3-12% CAGR
    growth_3y = np_rng.uniform(0.02, 0.15)

    # Years of consecutive growth
    years_of_growth = rng.randint(3, 30)
    is_aristocrat = years_of_growth >= 25
    is_king = years_of_growth >= 50

    # Generate history
    history: List[DividendEvent] = []
    payment_amount = per_payment

    for year_offset in range(years_back, 0, -1):
        # Dividend grows each year
        year_amount = payment_amount * (1 + growth_5y) ** (years_back - year_offset)

        for p in range(payments_per_year):
            if frequency == "Quarterly":
                month_offset = p * 3 + 1
            elif frequency == "Monthly":
                month_offset = p + 1
            elif frequency == "Semi-Annual":
                month_offset = p * 6 + 3
            else:
                month_offset = 6

            try:
                ex_date = datetime(today.year - year_offset, min(12, month_offset), 15)
            except ValueError:
                ex_date = datetime(today.year - year_offset, min(12, month_offset), 28)

            if ex_date > today:
                continue

            record_date = ex_date + timedelta(days=1)
            pay_date = ex_date + timedelta(days=rng.randint(14, 30))

            # Historical price estimate
            hist_price = current_price * (0.7 + year_offset * 0.05)

            history.append(DividendEvent(
                symbol=symbol,
                ex_date=ex_date.strftime("%Y-%m-%d"),
                record_date=record_date.strftime("%Y-%m-%d"),
                pay_date=pay_date.strftime("%Y-%m-%d"),
                amount=round(year_amount, 4),
                frequency=frequency,
                dividend_type="Regular",
                yield_on_cost=round(year_amount * payments_per_year / hist_price * 100, 2),
            ))

    history.sort(key=lambda d: d.ex_date, reverse=True)

    # Next payment
    if frequency == "Quarterly":
        next_ex = today + timedelta(days=rng.randint(15, 75))
    elif frequency == "Monthly":
        next_ex = today + timedelta(days=rng.randint(5, 25))
    else:
        next_ex = today + timedelta(days=rng.randint(30, 150))

    next_pay = next_ex + timedelta(days=rng.randint(14, 30))

    return DividendHistory(
        symbol=symbol,
        current_annual_dividend=annual_dividend,
        current_yield=round(annual_yield * 100, 2),
        payout_ratio=payout_ratio,
        dividend_growth_rate_5y=round(growth_5y * 100, 2),
        dividend_growth_rate_3y=round(growth_3y * 100, 2),
        years_of_growth=years_of_growth,
        frequency=frequency,
        next_ex_date=next_ex.strftime("%Y-%m-%d"),
        next_pay_date=next_pay.strftime("%Y-%m-%d"),
        next_amount=round(per_payment * (1 + growth_5y), 4),
        history=history[:20],  # Last 20 payments
        is_dividend_aristocrat=is_aristocrat,
        is_dividend_king=is_king,
    )


def simulate_drip(
    symbol: str,
    initial_investment: float = 10000.0,
    monthly_contribution: float = 500.0,
    years: int = 20,
    current_price: float = 150.0,
    annual_dividend_yield: float = 0.03,
    dividend_growth_rate: float = 0.07,
    stock_appreciation_rate: float = 0.08,
) -> DRIPSimulation:
    """Simulate DRIP compound growth over multiple years.

    Models dividend reinvestment with regular monthly contributions,
    dividend growth, and stock price appreciation.

    Args:
        symbol: Stock ticker.
        initial_investment: Starting lump sum investment.
        monthly_contribution: Monthly recurring investment.
        years: Number of years to simulate.
        current_price: Current stock price.
        annual_dividend_yield: Current annual dividend yield (decimal).
        dividend_growth_rate: Annual dividend growth rate (decimal).
        stock_appreciation_rate: Expected annual stock price growth (decimal).

    Returns:
        DRIPSimulation with year-by-year compound growth results.
    """
    seed = _symbol_seed(symbol)
    np_rng = np.random.default_rng(seed)

    # Initial state
    shares = initial_investment / current_price
    price = current_price
    total_invested = initial_investment
    total_dividends = 0.0
    annual_div_per_share = current_price * annual_dividend_yield

    yearly_results: List[DRIPYearResult] = []

    for year in range(1, years + 1):
        starting_shares = shares

        # Monthly contributions
        for month in range(12):
            # Price appreciation (monthly)
            monthly_appreciation = (1 + stock_appreciation_rate) ** (1/12) - 1
            price_noise = np_rng.normal(0, 0.02)
            price *= (1 + monthly_appreciation + price_noise)
            price = max(price * 0.5, price)  # Floor at 50% of current

            # Monthly contribution
            new_shares = monthly_contribution / price
            shares += new_shares
            total_invested += monthly_contribution

        # Annual dividend (paid quarterly but computed annually for simplicity)
        annual_div_per_share *= (1 + dividend_growth_rate)
        dividends_received = shares * annual_div_per_share
        total_dividends += dividends_received

        # DRIP: reinvest dividends
        drip_shares = dividends_received / price
        shares += drip_shares

        portfolio_value = shares * price
        yield_on_cost = annual_div_per_share * shares / total_invested * 100
        total_return = (portfolio_value - total_invested) / total_invested * 100

        yearly_results.append(DRIPYearResult(
            year=year,
            starting_shares=round(starting_shares, 4),
            dividends_received=round(dividends_received, 2),
            shares_purchased=round(drip_shares + (monthly_contribution * 12 / price), 4),
            ending_shares=round(shares, 4),
            share_price=round(price, 2),
            portfolio_value=round(portfolio_value, 2),
            yield_on_cost=round(yield_on_cost, 2),
            total_invested=round(total_invested, 2),
            total_return_pct=round(total_return, 2),
        ))

    # Final calculations
    final_value = shares * price
    total_return_pct = (final_value - total_invested) / total_invested * 100
    annualized_return = ((final_value / total_invested) ** (1 / years) - 1) * 100

    # Value without DRIP (just price appreciation, no dividend reinvestment)
    value_no_drip = total_invested * (1 + stock_appreciation_rate) ** years * 0.85  # Rough estimate
    drip_advantage = (final_value - value_no_drip) / value_no_drip * 100

    summary = (
        f"DRIP simulation for {symbol} over {years} years: "
        f"${initial_investment:,.0f} initial + ${monthly_contribution:,.0f}/mo. "
        f"Final value: ${final_value:,.0f} ({total_return_pct:.1f}% total return). "
        f"Annualized: {annualized_return:.1f}%. "
        f"Total dividends reinvested: ${total_dividends:,.0f}. "
        f"DRIP advantage: {drip_advantage:.1f}% over no reinvestment."
    )

    return DRIPSimulation(
        symbol=symbol,
        initial_investment=initial_investment,
        monthly_contribution=monthly_contribution,
        initial_price=current_price,
        initial_shares=round(initial_investment / current_price, 4),
        years=years,
        final_shares=round(shares, 4),
        final_price=round(price, 2),
        final_portfolio_value=round(final_value, 2),
        total_invested=round(total_invested, 2),
        total_dividends_reinvested=round(total_dividends, 2),
        total_return_pct=round(total_return_pct, 2),
        annualized_return_pct=round(annualized_return, 2),
        value_without_drip=round(value_no_drip, 2),
        drip_advantage_pct=round(drip_advantage, 2),
        yearly_results=yearly_results,
        summary=summary,
    )
