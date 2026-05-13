# Saham-US — Implementation Tasks

Tasks are organized by release phase. Check off as completed.

## Phase 0 — Foundation (this PR)

- [x] Create spec docs (requirements, design, tasks)
- [x] Create monorepo structure `backend/` + `frontend/`
- [x] Backend: FastAPI scaffold with routers
- [x] Backend: yfinance adapter
- [x] Backend: MVP endpoints (quote, history, fundamentals, search, movers, screener, swing scan, scalping hot)
- [x] Frontend: Next.js 14 scaffold with App Router + Tailwind
- [x] Frontend: Layout with sidebar for 14 menus
- [x] Frontend: MVP pages (Dashboard, Stock Detail, Screener, Watchlist, Swing, Scalping)
- [x] API client with typed functions
- [x] README with setup instructions
- [x] Docker Compose for local dev

## Phase 1 — MVP polish

- [ ] Implement lightweight-charts candlestick component
- [ ] Connect RSI/MACD indicators to chart
- [ ] Persist watchlist to localStorage (client-only V1)
- [ ] Add loading/error states across pages
- [ ] Dark mode toggle
- [ ] Search ticker autocomplete in header
- [ ] Responsive layout for tablet

## Phase 2 — Deeper analysis

- [ ] Valuation tab: DCF calculator with editable assumptions
- [ ] Earnings tab: history + estimates (Finnhub integration)
- [ ] Dividends tab: history + safety score
- [ ] News tab: aggregated feed + sentiment score
- [ ] Peer comparison tab
- [ ] Portfolio: transaction CRUD, P&L calc, CSV import
- [ ] User auth (NextAuth + FastAPI JWT)
- [ ] PostgreSQL schema for users/watchlist/portfolio

## Phase 3 — Pro features

- [ ] Options chain UI (Polygon or Tradier integration)
- [ ] Insider transactions (SEC Form 4)
- [ ] Institutional holders (13F)
- [ ] Short interest data
- [ ] Backtesting engine + UI
- [ ] Alert system (DB + scheduler + email)
- [ ] Scalping: Level 2 placeholder, Time & Sales, VWAP
- [ ] WebSocket streaming quotes
- [ ] Background scanners (APScheduler / Celery)

## Phase 4 — Differentiation

- [ ] AI Insights (LLM summaries, NL screener)
- [ ] Macro dashboard (FRED integration)
- [ ] Market breadth indicators
- [ ] Intermarket correlation
- [ ] Anomaly detection
- [ ] Pattern recognition (H&S, Cup & Handle, etc.)
- [ ] Mobile PWA polish
- [ ] Production deployment (Vercel + Fly.io)

## Technical Debt Log
(empty for now — track items here as they arise)
