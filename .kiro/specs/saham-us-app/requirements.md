# Saham-US — Requirements Document

## 1. Product Overview

**Saham-US** is a comprehensive US stock market analysis platform designed for three user personas:

1. **Long-term investors** — need fundamentals, valuation, dividends
2. **Swing traders** — need multi-timeframe TA, setup scanners, trade planning
3. **Scalpers / day traders** — need real-time data, Level 2, momentum scanners

The platform aggregates market data, fundamentals, news, and sentiment into one workflow-oriented dashboard.

## 2. Target Users

| Persona | Primary need | Key menus |
|--------|--------------|-----------|
| Investor | Find quality companies at fair prices | Fundamentals, Valuation, Dividends, Screener |
| Swing Trader | Identify 2-10 day trade setups | Swing Trading, Chart, Peer Comparison |
| Scalper | Real-time momentum & order flow | Scalping, Hot Stocks, Level 2 |
| Analyst | Research & macro context | Macro, Sector Analysis, News |

## 3. Functional Requirements

### 3.1 Core Modules (14 main menus)

#### FR-1. Dashboard
- Display major index snapshots (S&P 500, Nasdaq, Dow, Russell 2000, VIX, DXY)
- Show top gainers, losers, and most active stocks for the day
- Sector heatmap (11 GICS sectors)
- Economic calendar widget (next 7 days)
- Aggregated breaking news feed

#### FR-2. Stock Screener
- Fundamental filters: market cap, P/E, P/B, PEG, ROE, ROA, D/E, revenue growth, EPS growth, dividend yield
- Technical filters: price vs MA50/MA200, RSI range, volume spike, breakout
- Preset screens: Value, Growth, Dividend aristocrats, Momentum, Oversold
- Save/load custom screens per user

#### FR-3. Stock Detail (hierarchical tabs)

- **Overview**: quote, key stats, company profile, analyst consensus
- **Chart**: candlestick multi-TF, 20+ indicators, drawing tools, pattern detection
- **Fundamentals**: income statement, balance sheet, cash flow, ratios, growth
- **Valuation**: DCF, comparable analysis, DDM, Graham, fair value
- **Earnings**: history, estimates, surprises, upcoming dates, transcripts
- **Dividends**: history, growth, payout ratio, safety score
- **Ownership**: institutional holders, insider transactions, short interest
- **News & Sentiment**: headlines, social sentiment, SEC filings
- **Options Chain**: calls/puts, OI, volume, IV, unusual activity
- **Peer Comparison**: side-by-side with 5-10 competitors

#### FR-4. Watchlist
- Multiple watchlists with custom names
- Real-time (or delayed) quotes
- Custom columns, drag & drop reorder

#### FR-5. Portfolio Tracker
- Manual transaction entry + CSV import
- Realized & unrealized P&L
- Asset allocation breakdown
- Benchmark comparison (vs S&P 500)
- Risk metrics (Beta, Sharpe, Max Drawdown)
- Dividend income tracker

#### FR-6. Market & Sector Analysis
- Sector deep-dive with top-held ETF constituents
- Industry analysis
- Market breadth (A/D line, new highs/lows, McClellan)
- Intermarket correlation (bonds, commodities, FX, crypto)

#### FR-7. Economic Data / Macro
- GDP, CPI/PCE, unemployment, Fed Funds, yield curve
- Economic calendar with impact rating
- Macro-to-equity correlation heatmap

#### FR-8. Backtesting
- Preset strategies (Golden Cross, RSI Oversold, MA Crossover)
- Custom rule-based strategy builder
- Performance report: total return, CAGR, Sharpe, max DD, win rate

#### FR-9. Alerts
- Price alerts (above/below)
- Technical alerts (RSI threshold, MA cross, breakout)
- News & earnings alerts
- Email / in-app notification channels

#### FR-10. News & Research Hub
- Aggregated news by source, ticker, sector
- Analyst upgrades/downgrades
- IPO calendar
- Earnings season tracker

#### FR-11. AI Insights
- Auto-generated stock thesis summary
- Anomaly detection (unusual volume/price)
- Natural language screener ("Show me tech stocks with PE < 20 and growth > 15%")
- Automated signal detection

#### FR-12. Swing Trading
- Setup scanners: pullback to MA, breakout, oversold bounce, patterns
- Multi-timeframe analysis view (1W + 1D + 4H side-by-side)
- Support/resistance auto-detection
- Fibonacci auto-levels
- Relative strength vs SPY indicator
- Swing watchlist with trade-stage tagging (forming / ready / in-position / exit)
- Trade planner (entry, stop, target, R:R, position size)

#### FR-13. Scalping / Day Trading
- Hot stocks dashboard (real-time movers, pre-market, after-hours)
- Level 2 / Market Depth display
- Time & Sales tape
- VWAP & anchored VWAP
- Order flow / footprint chart
- Momentum & gap scanner
- Halted stock watcher
- Unusual options activity feed
- Position size & stop-loss (ATR-based) calculator

#### FR-14. Settings & Account
- User profile, theme (dark/light), currency, timezone
- API key management (Finnhub, Polygon, etc.)
- Subscription tier
- Data source preferences

### 3.2 Cross-cutting

- **Search**: global ticker search in header (company name or symbol)
- **Authentication**: email + OAuth (Google, GitHub)
- **Responsive**: desktop-first, usable on tablet
- **Accessibility**: WCAG 2.1 AA where feasible

## 4. Non-Functional Requirements

| Category | Requirement |
|---------|-------------|
| Performance | P95 API latency < 500ms (cached); chart render < 1s for 5y daily |
| Scalability | Support 10k concurrent users (horizontal scaling ready) |
| Reliability | 99.5% uptime; graceful degradation if upstream data fails |
| Security | HTTPS only; bcrypt/argon2 for passwords; API rate limiting |
| Data freshness | Dashboard: 1-min cache; Quote: 15s; Fundamentals: 24h |
| Observability | Structured logs, Prometheus metrics, Sentry for errors |
| Compliance | Respect data provider ToS; display data-source attribution |

## 5. Data Sources

| Source | Use | Tier |
|--------|-----|------|
| yfinance (Yahoo) | Prices, fundamentals, news | Free (unofficial) |
| Finnhub | Real-time quotes, news | Free tier + paid |
| Alpha Vantage | Technicals, FX, economic | Free tier |
| FRED | Macro economic data | Free |
| Polygon.io | Real-time, Level 2, options | Paid |
| SEC EDGAR | Filings (10-K, 10-Q, 13F, Form 4) | Free |

## 6. Out of Scope (V1)

- Mobile native apps (PWA only in V1)
- Direct brokerage integration / order routing
- Crypto & forex as primary asset class (only as correlation data)
- Paid subscription billing (structure exists but not monetized V1)

## 7. Release Phases

| Phase | Scope | Duration |
|-------|-------|----------|
| **MVP (Phase 1)** | Dashboard, Stock Detail (Overview, Chart, Fundamentals), Screener basic, Watchlist, Swing scanner, Hot Stocks | 2-3 weeks |
| **Phase 2** | Valuation, Earnings, News, Portfolio, Peer comparison | 2-3 weeks |
| **Phase 3** | Options, Insiders, Backtesting, Alerts, full Scalping suite | 3-4 weeks |
| **Phase 4** | AI Insights, Macro, advanced analytics | 2-3 weeks |
