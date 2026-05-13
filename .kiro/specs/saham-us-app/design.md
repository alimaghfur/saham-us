# Saham-US — Design Document

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (Next.js SSR/CSR)                │
│  - React 18 + Tailwind + shadcn/ui                           │
│  - TanStack Query (data fetching/caching)                    │
│  - Zustand (UI state)                                        │
│  - Lightweight-Charts / Recharts (charting)                  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTPS / JSON
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                  FastAPI (Python 3.11)                       │
│  - REST + WebSocket                                          │
│  - Routers: stocks, screener, technicals, fundamentals,      │
│             news, portfolio, alerts, scanners (swing/scalp)  │
│  - Service layer: MarketDataService, IndicatorService,       │
│                   ScreenerService, ValuationService          │
│  - Adapters: yfinance, Finnhub, AlphaVantage, FRED, EDGAR    │
└───────┬──────────────────────────────────────────────┬───────┘
        │                                              │
        ▼                                              ▼
┌─────────────────────┐                   ┌────────────────────┐
│  PostgreSQL         │                   │  Redis             │
│  + TimescaleDB      │                   │  - hot cache       │
│  - users, watchlist │                   │  - rate-limit      │
│  - portfolio        │                   │  - pubsub (WS)     │
│  - alerts, prefs    │                   └────────────────────┘
│  - OHLCV history    │
└─────────────────────┘
```

### Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR for SEO, mature ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Fast dev, consistent |
| Charts | `lightweight-charts` (TradingView) + Recharts | Pro-grade candlesticks + simple bars |
| State | TanStack Query + Zustand | Server/client state separation |
| Backend | FastAPI (Python 3.11) | Async, typed, huge ecosystem for finance |
| Data libs | `yfinance`, `pandas`, `numpy`, `pandas-ta` | Industry standard |
| DB | PostgreSQL 16 + TimescaleDB | Relational + time-series hypertables |
| Cache | Redis 7 | Low-latency hot data, pub/sub |
| Auth | NextAuth.js + FastAPI JWT | OAuth + session |
| Deploy | Docker Compose (dev), Fly.io/Railway (prod) | Simple start, scales later |

## 2. Repository Structure

```
saham-us/
├── .kiro/
│   └── specs/saham-us-app/     # This spec
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/               # config, logging, deps
│   │   ├── api/                # FastAPI routers per module
│   │   │   ├── stocks.py
│   │   │   ├── screener.py
│   │   │   ├── technicals.py
│   │   │   ├── fundamentals.py
│   │   │   ├── news.py
│   │   │   ├── market.py
│   │   │   ├── swing.py
│   │   │   ├── scalping.py
│   │   │   └── portfolio.py
│   │   ├── services/           # business logic
│   │   │   ├── market_data.py
│   │   │   ├── indicators.py
│   │   │   ├── screener.py
│   │   │   └── scanners.py
│   │   ├── adapters/           # external data providers
│   │   │   ├── yfinance_adapter.py
│   │   │   └── finnhub_adapter.py
│   │   ├── schemas/            # Pydantic models
│   │   └── utils/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   │   ├── (dashboard)/
│   │   │   ├── stock/[symbol]/
│   │   │   ├── screener/
│   │   │   ├── watchlist/
│   │   │   ├── swing/
│   │   │   ├── scalping/
│   │   │   └── ...
│   │   ├── components/
│   │   ├── lib/                # API client, utils
│   │   └── hooks/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 3. Key API Endpoints (REST)

### Stocks
- `GET /api/v1/stocks/search?q=AAPL` — ticker autocomplete
- `GET /api/v1/stocks/{symbol}/quote` — current quote + key stats
- `GET /api/v1/stocks/{symbol}/profile` — company profile
- `GET /api/v1/stocks/{symbol}/history?range=1y&interval=1d` — OHLCV
- `GET /api/v1/stocks/{symbol}/fundamentals` — financials
- `GET /api/v1/stocks/{symbol}/news` — news
- `GET /api/v1/stocks/{symbol}/peers` — peer list

### Technicals
- `GET /api/v1/technicals/{symbol}?indicators=rsi,macd,sma20&range=6mo`

### Market
- `GET /api/v1/market/indices` — SPX, NDX, DJI, VIX
- `GET /api/v1/market/movers?type=gainers|losers|active`
- `GET /api/v1/market/sectors` — sector performance

### Screener
- `POST /api/v1/screener/run` — body: filter criteria

### Scanners
- `GET /api/v1/swing/scan?setup=breakout`
- `GET /api/v1/scalping/hot` — real-time movers

### Portfolio (auth required)
- `GET /api/v1/portfolio`
- `POST /api/v1/portfolio/transactions`

### WebSocket
- `WS /ws/quotes?symbols=AAPL,TSLA` — streaming quotes (Phase 3)

## 4. Data Flow Patterns

### Read-heavy path (quote, chart)
```
Client → CDN → Next.js → FastAPI → Redis (hit) → JSON
                              └→ (miss) → yfinance adapter → Redis SET → JSON
```

TTL strategy:
- Quote: 15s
- Intraday OHLCV: 60s
- Daily OHLCV: 1h
- Fundamentals: 24h
- News list: 5min

### Scanner path (heavy batch)
Background task (Celery or APScheduler) refreshes scanner results every 1-5 min into Redis. API just reads from Redis.

## 5. Frontend Information Architecture

```
Layout: [Sidebar navigation] [Top search bar + user menu] [Main content]

Sidebar sections:
  MARKETS
    - Dashboard
    - Markets & Sectors
    - Macro
  RESEARCH
    - Screener
    - News
    - AI Insights
  TRADING
    - Swing Trading
    - Scalping / Day
    - Backtesting
  PERSONAL
    - Watchlist
    - Portfolio
    - Alerts
  SETTINGS
    - Account
```

Stock detail uses **tabbed sub-layout**:
`Overview | Chart | Fundamentals | Valuation | Earnings | Dividends | Ownership | News | Options | Peers`

## 6. Indicator Calculation

Use `pandas-ta` for most; custom code only when missing:

| Indicator | Library |
|-----------|---------|
| SMA, EMA, WMA | pandas-ta |
| RSI, MACD, Stoch | pandas-ta |
| Bollinger Bands | pandas-ta |
| VWAP | custom (needs intraday volume) |
| ATR | pandas-ta |
| Ichimoku | pandas-ta |
| Candlestick patterns | TA-Lib (optional) |
| Chart patterns (H&S, Triangle) | custom rule-based |

## 7. Screener Engine

Two-stage pipeline:
1. **Universe builder**: all US common stocks from SEC tickers file (~9k)
2. **Filter chain**: evaluate each criterion; short-circuit on fail

For performance: pre-compute key fundamentals into PostgreSQL nightly, so screener is a SQL query not per-stock API calls.

```sql
SELECT symbol, name, market_cap, pe, roe
FROM stock_snapshots_daily
WHERE pe BETWEEN 5 AND 20
  AND roe > 15
  AND market_cap > 2e9
ORDER BY market_cap DESC
LIMIT 100;
```

## 8. Security

- HTTPS enforced
- JWT (access 15min, refresh 7d)
- Bcrypt hashed passwords
- CORS whitelist for frontend domain only
- Rate-limit: 60 req/min anonymous, 600 req/min authenticated
- Secrets via environment variables only (never committed)

## 9. Deployment

### Development
```bash
docker-compose up      # starts postgres, redis, backend, frontend
```

### Production (Phase later)
- Frontend → Vercel (Next.js native)
- Backend → Fly.io or Railway (FastAPI container)
- Postgres → managed (Supabase/Neon) with TimescaleDB extension
- Redis → Upstash

## 10. Observability

- Backend: structured JSON logs via `structlog`
- Errors: Sentry (both FE & BE)
- Metrics: Prometheus `/metrics` endpoint on FastAPI
- Frontend: Web Vitals → analytics endpoint

## 11. Open Questions / Assumptions

- **Real-time data**: MVP uses 15-min delayed yfinance; upgrade to Polygon.io WebSocket in Phase 3.
- **Level 2**: Requires paid feed; placeholder UI in MVP.
- **AI Insights**: LLM choice (OpenAI vs local) decided in Phase 4 based on cost.
- **Monetization**: free forever vs freemium TBD with product owner.
