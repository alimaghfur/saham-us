"""Economic calendar service.

Generates realistic economic calendar events (FOMC, CPI, NFP, GDP,
Retail Sales, etc.) with recurring schedules, impact levels, and
previous/forecast/actual values.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np


@dataclass
class EconomicEvent:
    """A single economic calendar event."""
    event_id: str
    name: str
    category: str  # "Interest Rate", "Employment", "Inflation", "GDP", "Consumer"
    date: str  # ISO date
    time: str  # e.g., "08:30 ET"
    impact: str  # "High", "Medium", "Low"
    country: str
    currency: str
    previous: Optional[float] = None
    forecast: Optional[float] = None
    actual: Optional[float] = None
    unit: str = ""  # "%", "K", "B", etc.
    description: str = ""
    is_upcoming: bool = True


@dataclass
class EconomicCalendarResult:
    """Complete economic calendar for a date range."""
    start_date: str
    end_date: str
    events: List[EconomicEvent]
    high_impact_count: int
    medium_impact_count: int
    low_impact_count: int
    next_fomc: Optional[EconomicEvent] = None
    next_nfp: Optional[EconomicEvent] = None
    next_cpi: Optional[EconomicEvent] = None
    summary: str = ""


# Recurring economic events with their schedules
_ECONOMIC_EVENTS = [
    {
        "name": "FOMC Interest Rate Decision",
        "category": "Interest Rate",
        "impact": "High",
        "time": "14:00 ET",
        "frequency": "6_weeks",  # ~8 times per year
        "unit": "%",
        "base_value": 5.25,
        "volatility": 0.25,
        "description": "Federal Reserve interest rate decision and policy statement",
    },
    {
        "name": "Non-Farm Payrolls (NFP)",
        "category": "Employment",
        "impact": "High",
        "time": "08:30 ET",
        "frequency": "monthly_first_friday",
        "unit": "K",
        "base_value": 200.0,
        "volatility": 50.0,
        "description": "Monthly change in non-farm employment",
    },
    {
        "name": "Consumer Price Index (CPI) m/m",
        "category": "Inflation",
        "impact": "High",
        "time": "08:30 ET",
        "frequency": "monthly_mid",
        "unit": "%",
        "base_value": 0.3,
        "volatility": 0.1,
        "description": "Monthly change in consumer prices",
    },
    {
        "name": "CPI Year-over-Year",
        "category": "Inflation",
        "impact": "High",
        "time": "08:30 ET",
        "frequency": "monthly_mid",
        "unit": "%",
        "base_value": 3.2,
        "volatility": 0.3,
        "description": "Annual change in consumer prices",
    },
    {
        "name": "GDP Growth Rate (Quarterly)",
        "category": "GDP",
        "impact": "High",
        "time": "08:30 ET",
        "frequency": "quarterly",
        "unit": "%",
        "base_value": 2.5,
        "volatility": 0.8,
        "description": "Annualized quarterly GDP growth rate",
    },
    {
        "name": "Retail Sales m/m",
        "category": "Consumer",
        "impact": "High",
        "time": "08:30 ET",
        "frequency": "monthly_mid",
        "unit": "%",
        "base_value": 0.4,
        "volatility": 0.3,
        "description": "Monthly change in retail sales",
    },
    {
        "name": "Unemployment Rate",
        "category": "Employment",
        "impact": "High",
        "time": "08:30 ET",
        "frequency": "monthly_first_friday",
        "unit": "%",
        "base_value": 3.7,
        "volatility": 0.1,
        "description": "Percentage of labor force that is unemployed",
    },
    {
        "name": "ISM Manufacturing PMI",
        "category": "Manufacturing",
        "impact": "High",
        "time": "10:00 ET",
        "frequency": "monthly_first",
        "unit": "",
        "base_value": 49.5,
        "volatility": 2.0,
        "description": "Institute for Supply Management manufacturing index",
    },
    {
        "name": "ISM Services PMI",
        "category": "Services",
        "impact": "Medium",
        "time": "10:00 ET",
        "frequency": "monthly_third",
        "unit": "",
        "base_value": 52.0,
        "volatility": 1.5,
        "description": "Institute for Supply Management services index",
    },
    {
        "name": "Producer Price Index (PPI) m/m",
        "category": "Inflation",
        "impact": "Medium",
        "time": "08:30 ET",
        "frequency": "monthly_mid",
        "unit": "%",
        "base_value": 0.2,
        "volatility": 0.2,
        "description": "Monthly change in producer prices",
    },
    {
        "name": "Initial Jobless Claims",
        "category": "Employment",
        "impact": "Medium",
        "time": "08:30 ET",
        "frequency": "weekly_thursday",
        "unit": "K",
        "base_value": 220.0,
        "volatility": 15.0,
        "description": "Weekly new unemployment insurance claims",
    },
    {
        "name": "Consumer Confidence Index",
        "category": "Consumer",
        "impact": "Medium",
        "time": "10:00 ET",
        "frequency": "monthly_last_tuesday",
        "unit": "",
        "base_value": 105.0,
        "volatility": 5.0,
        "description": "Conference Board consumer confidence survey",
    },
    {
        "name": "Housing Starts",
        "category": "Housing",
        "impact": "Medium",
        "time": "08:30 ET",
        "frequency": "monthly_mid",
        "unit": "M",
        "base_value": 1.4,
        "volatility": 0.1,
        "description": "Annualized rate of new residential construction",
    },
    {
        "name": "Durable Goods Orders m/m",
        "category": "Manufacturing",
        "impact": "Medium",
        "time": "08:30 ET",
        "frequency": "monthly_last",
        "unit": "%",
        "base_value": 0.5,
        "volatility": 1.5,
        "description": "Monthly change in durable goods orders",
    },
    {
        "name": "Fed Chair Speech",
        "category": "Interest Rate",
        "impact": "High",
        "time": "Various",
        "frequency": "irregular",
        "unit": "",
        "base_value": 0,
        "volatility": 0,
        "description": "Federal Reserve Chair public remarks",
    },
    {
        "name": "Core PCE Price Index m/m",
        "category": "Inflation",
        "impact": "High",
        "time": "08:30 ET",
        "frequency": "monthly_last",
        "unit": "%",
        "base_value": 0.3,
        "volatility": 0.1,
        "description": "Fed's preferred inflation measure (excluding food & energy)",
    },
]


def _generate_event_dates(
    frequency: str,
    start_date: datetime,
    end_date: datetime,
    rng: random.Random,
) -> List[datetime]:
    """Generate dates for an event based on its frequency pattern."""
    dates = []
    current = start_date

    while current <= end_date:
        if frequency == "monthly_first_friday":
            # First Friday of each month
            first_day = current.replace(day=1)
            days_until_friday = (4 - first_day.weekday()) % 7
            event_date = first_day + timedelta(days=days_until_friday)
            if start_date <= event_date <= end_date:
                dates.append(event_date)
            current = (current.replace(day=28) + timedelta(days=4)).replace(day=1)

        elif frequency == "monthly_mid":
            event_date = current.replace(day=min(rng.randint(10, 15), 28))
            if start_date <= event_date <= end_date:
                dates.append(event_date)
            current = (current.replace(day=28) + timedelta(days=4)).replace(day=1)

        elif frequency == "monthly_first":
            event_date = current.replace(day=rng.randint(1, 3))
            if start_date <= event_date <= end_date:
                dates.append(event_date)
            current = (current.replace(day=28) + timedelta(days=4)).replace(day=1)

        elif frequency == "monthly_third":
            event_date = current.replace(day=rng.randint(3, 6))
            if start_date <= event_date <= end_date:
                dates.append(event_date)
            current = (current.replace(day=28) + timedelta(days=4)).replace(day=1)

        elif frequency == "monthly_last":
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            event_date = next_month - timedelta(days=rng.randint(2, 5))
            if start_date <= event_date <= end_date:
                dates.append(event_date)
            current = next_month

        elif frequency == "monthly_last_tuesday":
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            last_day = next_month - timedelta(days=1)
            days_back = (last_day.weekday() - 1) % 7
            event_date = last_day - timedelta(days=days_back)
            if start_date <= event_date <= end_date:
                dates.append(event_date)
            current = next_month

        elif frequency == "weekly_thursday":
            days_until_thursday = (3 - current.weekday()) % 7
            event_date = current + timedelta(days=days_until_thursday)
            if start_date <= event_date <= end_date:
                dates.append(event_date)
            current = event_date + timedelta(days=7)

        elif frequency == "6_weeks":
            dates.append(current)
            current += timedelta(weeks=6)

        elif frequency == "quarterly":
            dates.append(current)
            month = current.month + 3
            year = current.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            current = current.replace(year=year, month=month)

        elif frequency == "irregular":
            dates.append(current + timedelta(days=rng.randint(20, 60)))
            current += timedelta(days=rng.randint(30, 90))

        else:
            break

    return [d for d in dates if start_date <= d <= end_date]


def get_economic_calendar(
    days_ahead: int = 30,
    days_back: int = 7,
    impact_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> EconomicCalendarResult:
    """Generate economic calendar events for a date range.

    Args:
        days_ahead: Number of days to look forward.
        days_back: Number of days to look back.
        impact_filter: Filter by impact level ("High", "Medium", "Low").
        category_filter: Filter by category.

    Returns:
        EconomicCalendarResult with all events in the date range.
    """
    rng = random.Random(42)
    np_rng = np.random.default_rng(42)

    today = datetime.now()
    start_date = today - timedelta(days=days_back)
    end_date = today + timedelta(days=days_ahead)

    events: List[EconomicEvent] = []
    event_counter = 0

    for event_def in _ECONOMIC_EVENTS:
        if impact_filter and event_def["impact"] != impact_filter:
            continue
        if category_filter and event_def["category"] != category_filter:
            continue

        dates = _generate_event_dates(
            event_def["frequency"], start_date, end_date, rng
        )

        for event_date in dates:
            event_counter += 1
            is_upcoming = event_date >= today

            # Generate values
            base = event_def["base_value"]
            vol = event_def["volatility"]

            if base != 0:
                previous = round(base + np_rng.normal(0, vol * 0.5), 2)
                forecast = round(base + np_rng.normal(0, vol * 0.3), 2)
                actual = None if is_upcoming else round(
                    forecast + np_rng.normal(0, vol * 0.4), 2
                )
            else:
                previous = None
                forecast = None
                actual = None

            events.append(EconomicEvent(
                event_id=f"eco_{event_counter:04d}",
                name=event_def["name"],
                category=event_def["category"],
                date=event_date.strftime("%Y-%m-%d"),
                time=event_def["time"],
                impact=event_def["impact"],
                country="US",
                currency="USD",
                previous=previous,
                forecast=forecast,
                actual=actual,
                unit=event_def["unit"],
                description=event_def["description"],
                is_upcoming=is_upcoming,
            ))

    # Sort by date
    events.sort(key=lambda e: e.date)

    # Count by impact
    high_count = sum(1 for e in events if e.impact == "High")
    medium_count = sum(1 for e in events if e.impact == "Medium")
    low_count = sum(1 for e in events if e.impact == "Low")

    # Find next key events
    upcoming = [e for e in events if e.is_upcoming]
    next_fomc = next((e for e in upcoming if "FOMC" in e.name), None)
    next_nfp = next((e for e in upcoming if "Non-Farm" in e.name), None)
    next_cpi = next((e for e in upcoming if e.name == "Consumer Price Index (CPI) m/m"), None)

    summary = (
        f"{len(events)} economic events from {start_date.strftime('%Y-%m-%d')} "
        f"to {end_date.strftime('%Y-%m-%d')}. "
        f"{high_count} high-impact, {medium_count} medium-impact events. "
    )
    if next_fomc:
        summary += f"Next FOMC: {next_fomc.date}. "
    if next_nfp:
        summary += f"Next NFP: {next_nfp.date}."

    return EconomicCalendarResult(
        start_date=start_date.strftime("%Y-%m-%d"),
        end_date=end_date.strftime("%Y-%m-%d"),
        events=events,
        high_impact_count=high_count,
        medium_impact_count=medium_count,
        low_impact_count=low_count,
        next_fomc=next_fomc,
        next_nfp=next_nfp,
        next_cpi=next_cpi,
        summary=summary,
    )
