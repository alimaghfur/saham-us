# Saham-US

> Comprehensive US stock market analysis platform for investors, swing traders, and scalpers.

A monorepo containing a FastAPI backend and a Next.js frontend delivering 14 feature modules covering fundamental, technical, swing, and scalping analysis.

## Features (14 Modules)

1. **Dashboard** — Market overview, indices, movers, sectors, news
2. **Stock Screener** — Fundamental & technical multi-criteria filter
3. **Stock Detail** — Overview, Chart, Fundamentals, Valuation, Earnings, Dividends, Ownership, News, Options, Peers
4. **Watchlist** — Multiple custom watchlists
5. **Portfolio Tracker** — Transactions, P&L, allocation, benchmarking
6. **Market & Sector Analysis** — Sector rotation, breadth, intermarket
7. **Economic Data / Macro** — GDP, CPI, rates, yield curve
8. **Backtesting** — Strategy simulation on historical data
9. **Alerts** — Price, technical, news, earnings alerts
10. **News & Research Hub** — Aggregated news, upgrades, IPO calendar
11. **AI Insights** — LLM summaries, NL screener, anomaly detection
12. **Swing Trading** — Setup scanners, multi-TF analysis, trade planner
13. **Scalping / Day Trading** — Hot stocks, Level 2, VWAP, momentum scanner
14. **Settings & Account** — Preferences, API keys, theme

See [`.kiro/specs/saham-us-app/requirements.md`](.kiro/specs/saham-us-app/requirements.md) for full functional spec.

## Architecture

```
┌───────────────┐    HTTPS     ┌─────────────────┐
│  Next.js 14   │ ────────────▶│  FastAPI (3.11) │
│  App Router   │              │  + yfinance     │
│  Tailwind     │              │  + pandas-ta    │
└───────────────┘              └────────┬────────┘
                                        │
                                   ┌────┴────┐
                                   │ Redis   │ (cache)
                                   │ Postgres│ (users, watchlist)
                                   └─────────┘
```

Full architecture in [`.kiro/specs/saham-us-app/design.md`](.kiro/specs/saham-us-app/design.md).

## Repository Layout

```
saham-us/
├── .kiro/specs/saham-us-app/   # Product specification
├── backend/                    # FastAPI service
│   ├── app/
│   │   ├── api/                # Routers per module
│   │   ├── services/           # Business logic
│   │   ├── adapters/           # External data providers
│   │   └── schemas/            # Pydantic models
│   └── requirements.txt
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/                # App Router pages (14 menus)
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- (Optional) Docker + Docker Compose

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API will be available at http://localhost:8000
Interactive docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:3000

### Docker Compose (all-in-one)

```bash
docker-compose up --build
```

## Environment Variables

Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories.

### Backend (`backend/.env`)

```
FINNHUB_API_KEY=your_key_here         # optional, for real-time quotes
ALPHA_VANTAGE_API_KEY=your_key_here   # optional
POLYGON_API_KEY=your_key_here         # optional, for Level 2 data
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saham_us
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Data Sources

MVP uses free providers. Real-time and Level 2 require paid upgrades:

| Source | Usage | Tier |
|--------|-------|------|
| yfinance | Prices, fundamentals, news | Free (delayed 15m) |
| Finnhub | Real-time quotes | Free tier + paid |
| FRED | Macro data | Free |
| SEC EDGAR | Filings | Free |
| Polygon.io | Level 2, options | Paid |

## Development Status

- [x] **Phase 0** — Project scaffold, spec docs
- [ ] **Phase 1 (MVP)** — Dashboard, Stock Detail basics, Screener, Watchlist, Swing scanner, Hot Stocks
- [ ] **Phase 2** — Valuation, Earnings, News, Portfolio
- [ ] **Phase 3** — Options, Backtesting, Alerts, full Scalping
- [ ] **Phase 4** — AI Insights, Macro, advanced analytics

See [`.kiro/specs/saham-us-app/tasks.md`](.kiro/specs/saham-us-app/tasks.md) for the full task board.

## Disclaimer

This software is provided for educational and informational purposes only. **It is not financial advice.** Trading stocks involves risk; past performance does not guarantee future results. Data may be delayed or inaccurate. Consult a licensed financial advisor before making investment decisions.

## License

MIT (TBD)
