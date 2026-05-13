"""yfinance adapter — thin wrapper that normalizes yfinance output
into our Pydantic schemas. All I/O here is synchronous (yfinance is
not async) but wrapped in a thread executor at the service layer.
"""
from __future__ import annotations

import logging
import math
import time
from typing import Any, Dict, List, Optional

import yfinance as yf

from app.schemas.stock import (
    CompanyProfile,
    Fundamentals,
    HistoryResponse,
    NewsItem,
    OHLCV,
    Quote,
)

log = logging.getLogger(__name__)

# Retry config for rate-limited requests
MAX_RETRIES = 2
RETRY_DELAY = 1.0  # seconds between retries


def _safe_float(value: Any) -> Optional[float]:
    """Convert to float, returning None for NaN / invalid."""
    if value is None:
        return None
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _safe_int(value: Any) -> Optional[int]:
    f = _safe_float(value)
    return int(f) if f is not None else None


class YFinanceAdapter:
    """Wraps yfinance with error handling + schema normalization."""

    def get_quote(self, symbol: str) -> Quote:
        """Return the current quote for `symbol`.

        yfinance's `fast_info` is fastest; falls back to `info` for
        some metadata if missing. Retries on failure.
        """
        for attempt in range(MAX_RETRIES + 1):
            try:
                ticker = yf.Ticker(symbol)
                fast = ticker.fast_info
                info: Dict[str, Any] = {}
                try:
                    info = ticker.info or {}
                except Exception:  # pragma: no cover - info is flaky
                    info = {}

                last_price = _safe_float(getattr(fast, "last_price", None))
                prev_close = _safe_float(getattr(fast, "previous_close", None))
                change = None
                change_pct = None
                if last_price is not None and prev_close not in (None, 0):
                    change = last_price - prev_close
                    change_pct = (change / prev_close) * 100

                return Quote(
                    symbol=symbol.upper(),
                    name=info.get("longName") or info.get("shortName"),
                    price=last_price,
                    change=change,
                    change_percent=change_pct,
                    previous_close=prev_close,
                    open=_safe_float(getattr(fast, "open", None)),
                    day_high=_safe_float(getattr(fast, "day_high", None)),
                    day_low=_safe_float(getattr(fast, "day_low", None)),
                    volume=_safe_int(getattr(fast, "last_volume", None)),
                    avg_volume=_safe_int(info.get("averageVolume")),
                    market_cap=_safe_float(
                        getattr(fast, "market_cap", None) or info.get("marketCap")
                    ),
                    pe_ratio=_safe_float(info.get("trailingPE")),
                    eps=_safe_float(info.get("trailingEps")),
                    dividend_yield=_safe_float(info.get("dividendYield")),
                    beta=_safe_float(info.get("beta")),
                    week52_high=_safe_float(
                        getattr(fast, "year_high", None) or info.get("fiftyTwoWeekHigh")
                    ),
                    week52_low=_safe_float(
                        getattr(fast, "year_low", None) or info.get("fiftyTwoWeekLow")
                    ),
                    currency=info.get("currency") or getattr(fast, "currency", None),
                    exchange=info.get("exchange") or getattr(fast, "exchange", None),
                )
            except Exception as exc:
                if attempt < MAX_RETRIES:
                    log.debug("yfinance get_quote(%s) attempt %d failed: %s, retrying...", symbol, attempt + 1, exc)
                    time.sleep(RETRY_DELAY)
                else:
                    log.warning("yfinance get_quote(%s) failed after %d attempts: %s", symbol, MAX_RETRIES + 1, exc)
                    return Quote(symbol=symbol.upper())

    def get_profile(self, symbol: str) -> CompanyProfile:
        try:
            info = yf.Ticker(symbol).info or {}
            return CompanyProfile(
                symbol=symbol.upper(),
                name=info.get("longName") or info.get("shortName"),
                sector=info.get("sector"),
                industry=info.get("industry"),
                country=info.get("country"),
                website=info.get("website"),
                description=info.get("longBusinessSummary"),
                employees=_safe_int(info.get("fullTimeEmployees")),
                ceo=None,  # yfinance 'companyOfficers' has it; skip for brevity
                logo_url=None,
            )
        except Exception as exc:
            log.warning("yfinance get_profile(%s) failed: %s", symbol, exc)
            return CompanyProfile(symbol=symbol.upper())

    def get_history(
        self, symbol: str, range_: str = "1y", interval: str = "1d"
    ) -> HistoryResponse:
        """Return OHLCV history.

        Accepts yfinance-compatible range/interval strings.
        """
        try:
            df = yf.Ticker(symbol).history(period=range_, interval=interval)
            candles: List[OHLCV] = []
            if df is not None and not df.empty:
                df = df.reset_index()
                date_col = "Datetime" if "Datetime" in df.columns else "Date"
                for row in df.itertuples(index=False):
                    row_dict = row._asdict()
                    dt = row_dict.get(date_col)
                    candles.append(
                        OHLCV(
                            date=str(dt),
                            open=_safe_float(row_dict.get("Open")) or 0.0,
                            high=_safe_float(row_dict.get("High")) or 0.0,
                            low=_safe_float(row_dict.get("Low")) or 0.0,
                            close=_safe_float(row_dict.get("Close")) or 0.0,
                            volume=_safe_int(row_dict.get("Volume")) or 0,
                        )
                    )
            return HistoryResponse(
                symbol=symbol.upper(),
                interval=interval,
                range=range_,
                candles=candles,
            )
        except Exception as exc:
            log.warning("yfinance get_history(%s) failed: %s", symbol, exc)
            return HistoryResponse(
                symbol=symbol.upper(), interval=interval, range=range_, candles=[]
            )

    def get_fundamentals(self, symbol: str) -> Fundamentals:
        try:
            info = yf.Ticker(symbol).info or {}
            return Fundamentals(
                symbol=symbol.upper(),
                market_cap=_safe_float(info.get("marketCap")),
                enterprise_value=_safe_float(info.get("enterpriseValue")),
                pe_ratio=_safe_float(info.get("trailingPE")),
                forward_pe=_safe_float(info.get("forwardPE")),
                peg_ratio=_safe_float(info.get("pegRatio")),
                price_to_book=_safe_float(info.get("priceToBook")),
                price_to_sales=_safe_float(info.get("priceToSalesTrailing12Months")),
                ev_to_ebitda=_safe_float(info.get("enterpriseToEbitda")),
                gross_margin=_safe_float(info.get("grossMargins")),
                operating_margin=_safe_float(info.get("operatingMargins")),
                profit_margin=_safe_float(info.get("profitMargins")),
                roe=_safe_float(info.get("returnOnEquity")),
                roa=_safe_float(info.get("returnOnAssets")),
                debt_to_equity=_safe_float(info.get("debtToEquity")),
                current_ratio=_safe_float(info.get("currentRatio")),
                quick_ratio=_safe_float(info.get("quickRatio")),
                revenue_growth=_safe_float(info.get("revenueGrowth")),
                earnings_growth=_safe_float(info.get("earningsGrowth")),
                dividend_rate=_safe_float(info.get("dividendRate")),
                dividend_yield=_safe_float(info.get("dividendYield")),
                payout_ratio=_safe_float(info.get("payoutRatio")),
                shares_outstanding=_safe_float(info.get("sharesOutstanding")),
                float_shares=_safe_float(info.get("floatShares")),
                short_ratio=_safe_float(info.get("shortRatio")),
            )
        except Exception as exc:
            log.warning("yfinance get_fundamentals(%s) failed: %s", symbol, exc)
            return Fundamentals(symbol=symbol.upper())

    def get_news(self, symbol: str, limit: int = 20) -> List[NewsItem]:
        try:
            raw = yf.Ticker(symbol).news or []
            items: List[NewsItem] = []
            for n in raw[:limit]:
                # yfinance schema changed — support both old and new shapes
                content = n.get("content") if isinstance(n, dict) else None
                if content:
                    items.append(
                        NewsItem(
                            title=content.get("title", ""),
                            publisher=(content.get("provider") or {}).get(
                                "displayName"
                            ),
                            link=(content.get("canonicalUrl") or {}).get("url", "")
                            or (content.get("clickThroughUrl") or {}).get("url", ""),
                            published_at=None,
                            summary=content.get("summary"),
                            thumbnail=(
                                (content.get("thumbnail") or {})
                                .get("resolutions", [{}])[0]
                                .get("url")
                                if content.get("thumbnail")
                                else None
                            ),
                            related_tickers=[symbol.upper()],
                        )
                    )
                else:
                    items.append(
                        NewsItem(
                            title=n.get("title", ""),
                            publisher=n.get("publisher"),
                            link=n.get("link", ""),
                            published_at=n.get("providerPublishTime"),
                            summary=None,
                            thumbnail=None,
                            related_tickers=n.get("relatedTickers", []) or [
                                symbol.upper()
                            ],
                        )
                    )
            return items
        except Exception as exc:
            log.warning("yfinance get_news(%s) failed: %s", symbol, exc)
            return []

    def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Ticker / company search using yfinance.Search (if available).

        Falls back to empty list on any error.
        """
        try:
            search = yf.Search(query, max_results=limit, news_count=0)
            quotes = getattr(search, "quotes", None) or []
            return quotes[:limit]
        except Exception as exc:
            log.warning("yfinance search(%s) failed: %s", query, exc)
            return []


_adapter: Optional[YFinanceAdapter] = None


def get_yfinance_adapter() -> YFinanceAdapter:
    global _adapter
    if _adapter is None:
        _adapter = YFinanceAdapter()
    return _adapter
