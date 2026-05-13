# Saham-US — Professional US Stock Market Analysis Platform

<div align="center">

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8)
![License](https://img.shields.io/badge/license-MIT-green)

**Platform analisa saham US profesional** untuk membantu investor membuat keputusan investasi yang lebih baik.

[Demo](#quick-start) · [Features](#-features) · [Screenshots](#-ui-preview) · [Installation](#-quick-start)

</div>

---

## ✨ Highlights

- 🎨 **Modern Dark UI** — Premium trading terminal design dengan glassmorphism, gradients, dan smooth animations
- 📊 **14 Modul Lengkap** — Dashboard, Screener, Swing Trading, Scalping, AI Insights, dan banyak lagi
- ⚡ **Real-time Data** — Market indices, movers, dan sector performance via yfinance
- 🔍 **Advanced Screener** — Filter saham berdasarkan PE, ROE, Market Cap, Dividend Yield, dll
- 📈 **Trading Tools** — Swing trading scanner dengan Entry/Stop Loss/Target/Risk-Reward ratio
- 🤖 **AI-Powered** (Coming Soon) — Natural language screener, pattern recognition, anomaly detection

---

## 🚀 Features

### Overview & Market
| Module | Status | Description |
|--------|--------|-------------|
| **Dashboard** | ✅ Live | Market snapshot — indices, top movers, sector heatmap, quick actions |
| **Markets & Sectors** | ✅ Live | Sector rotation, market breadth, expanded indices view |
| **Macro / Economic** | 🔜 Soon | Fed rates, CPI, GDP, yield curve, Fear & Greed Index |

### Research & Analysis
| Module | Status | Description |
|--------|--------|-------------|
| **Stock Screener** | ✅ Live | Multi-criteria filter (fundamental + technical) with presets |
| **Stock Detail** | ✅ Live | Price, technicals (SMA/EMA/RSI/MACD), fundamentals, company profile |
| **News & Research** | 🔜 Soon | Aggregated news, analyst upgrades/downgrades, earnings calendar |
| **AI Insights** | 🆕 New | AI-powered analysis, NL screener, pattern detection |

### Trading Tools
| Module | Status | Description |
|--------|--------|-------------|
| **Swing Trading** | ✅ Live | Breakout/pullback/bounce scanners with Entry, SL, TP, R:R |
| **Scalping** | ✅ Live | Hot stocks, momentum bars, volume spikes, auto-refresh 30s |
| **Backtesting** | 🔜 Soon | Strategy simulation, win rate, profit factor, equity curve |

### Portfolio Management
| Module | Status | Description |
|--------|--------|-------------|
| **Watchlist** | ✅ Live | Custom watchlist with live quotes, quick-add suggestions |
| **My Portfolio** | 🔜 Soon | Holdings tracking, P&L, allocation, benchmark vs S&P 500 |
| **Alerts** | 🔜 Soon | Price/technical/earnings alerts via email & push |

### Settings
| Module | Status | Description |
|--------|--------|-------------|
| **Settings** | ✅ Live | Theme, data provider, notifications, account info |

---

## 🎨 UI Preview

### Design System
- **Theme**: Premium dark mode — trading terminal aesthetic
- **Typography**: Inter + JetBrains Mono
- **Effects**: Glassmorphism, gradient borders, glow shadows, dot-pattern backgrounds
- **Animations**: Fade-in, slide-in, shimmer loading, pulse indicators
- **Colors**: Semantic palette (bull green, bear red, primary indigo, accent violet)

### Key UI Components
- 🧩 **Card** — 4 variants: default, glass, gradient, outline
- 🔘 **Button** — 5 variants: primary, secondary, ghost, outline, danger
- 🏷️ **Badge** — 6 colors with dot indicator support
- 📊 **ChangeBadge** — Bull/bear with trend icons
- 💀 **Skeleton** — Card, table, and text loading states
- 📋 **Sidebar** — Collapsible with tooltips, active indicator bars

---

## 🏗️ Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│     Frontend (Next.js 14)    │  HTTP   │      Backend (FastAPI)        │
│                              │ ───────▶│                              │
│  • App Router (15 pages)     │         │  • yfinance data adapter     │
│  • Tailwind CSS + Glassmorp  │         │  • Technical indicators      │
│  • React Query (caching)     │         │  • Screener engine           │
│  • Recharts + LW Charts     │         │  • Swing/Scalp scanners      │
│  • Lucide React icons       │         │  • In-memory cache (TTL)     │
│  • Framer Motion            │         │  • Pydantic schemas          │
└─────────────────────────────┘         └──────────────────────────────┘
```

---

## 📁 Repository Structure

```
saham-us/
├── backend/                     # FastAPI service
│   ├── app/
│   │   ├── api/                 # Route handlers (6 routers)
│   │   │   ├── market.py        # Indices, sectors, movers
│   │   │   ├── stocks.py        # Quote, profile, history, news
│   │   │   ├── technicals.py    # Technical indicators
│   │   │   ├── screener.py      # Stock screener
│   │   │   ├── swing.py         # Swing trading scanner
│   │   │   └── scalping.py      # Hot stocks scanner
│   │   ├── services/            # Business logic
│   │   │   ├── market_data.py   # Market data service
│   │   │   ├── indicators.py    # TA calculations
│   │   │   ├── screener.py      # Screener logic
│   │   │   └── scanners.py      # Swing/scalp scanners
│   │   ├── adapters/            # External data providers
│   │   │   └── yfinance_adapter.py
│   │   ├── core/                # Config, cache, logging
│   │   ├── schemas/             # Pydantic response models
│   │   ├── utils/               # Constants & helpers
│   │   └── main.py              # FastAPI app entry
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                    # Next.js 14 application
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── markets/         # Markets & Sectors
│   │   │   ├── screener/        # Stock Screener
│   │   │   ├── stock/[symbol]/  # Stock Detail
│   │   │   ├── swing/           # Swing Trading
│   │   │   ├── scalping/        # Scalping / Day Trading
│   │   │   ├── watchlist/       # Watchlist
│   │   │   ├── ai/             # AI Insights
│   │   │   ├── settings/        # Settings
│   │   │   ├── macro/           # Macro (coming soon)
│   │   │   ├── news/            # News (coming soon)
│   │   │   ├── backtest/        # Backtesting (coming soon)
│   │   │   ├── portfolio/       # Portfolio (coming soon)
│   │   │   └── alerts/          # Alerts (coming soon)
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Sidebar.tsx      # Collapsible navigation
│   │   │   ├── TopBar.tsx       # Search & notifications
│   │   │   ├── Card.tsx         # Multi-variant card
│   │   │   ├── Button.tsx       # 5-variant button
│   │   │   ├── Badge.tsx        # Status badges
│   │   │   ├── ChangeBadge.tsx  # Price change indicator
│   │   │   ├── Skeleton.tsx     # Loading states
│   │   │   ├── EmptyState.tsx   # Empty placeholders
│   │   │   ├── PageHeader.tsx   # Page title component
│   │   │   ├── ComingSoon.tsx   # Coming soon template
│   │   │   ├── PriceChart.tsx   # Candlestick chart
│   │   │   └── QueryProvider.tsx # React Query setup
│   │   └── lib/                 # Utilities & types
│   │       ├── api.ts           # Typed API client
│   │       ├── types.ts         # TypeScript interfaces
│   │       ├── menu.ts          # Sidebar menu config
│   │       ├── format.ts        # Number formatters
│   │       └── cn.ts            # Class name utility
│   ├── tailwind.config.ts       # Extended Tailwind config
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml           # Full-stack deployment
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python** 3.11+
- **Node.js** 20+
- (Optional) Docker + Docker Compose

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:3000

### Docker Compose (All-in-One)

```bash
docker-compose up --build
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
# Optional — for enhanced data providers
POLYGON_API_KEY=your_key_here       # Real-time Level 2 data
FINNHUB_API_KEY=your_key_here       # Real-time quotes
ALPHA_VANTAGE_API_KEY=your_key_here # Alternative data
FRED_API_KEY=your_key_here          # Macro economic data

# Infrastructure (optional for MVP)
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saham_us
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📡 Data Sources

| Source | Usage | Tier | Status |
|--------|-------|------|--------|
| **yfinance** | Prices, fundamentals, history, news | Free (15m delay) | ✅ Active |
| **Finnhub** | Real-time quotes | Free + Paid | 🔜 Optional |
| **FRED** | Macro data (GDP, CPI, rates) | Free | 🔜 Planned |
| **SEC EDGAR** | Filings, insider trades | Free | 🔜 Planned |
| **Polygon.io** | Level 2, options, tick data | Paid | 🔜 Planned |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript 5 |
| **Styling** | Tailwind CSS 3.4, tailwindcss-animate |
| **State** | React Query (TanStack), Zustand |
| **Charts** | Lightweight Charts, Recharts |
| **Icons** | Lucide React |
| **Animation** | Framer Motion |
| **Backend** | FastAPI, Python 3.11 |
| **Data** | yfinance, pandas, numpy |
| **Cache** | In-memory TTL (Redis planned) |
| **Deploy** | Docker, Docker Compose |

---

## 📈 Development Roadmap

- [x] **Phase 0** — Project scaffold, specs, repository setup
- [x] **Phase 1** — Modern UI/UX redesign, all page layouts, navigation
- [ ] **Phase 2** — Full backend integration, real-time data, chart interactions
- [ ] **Phase 3** — Portfolio tracker, alerts, backtesting engine
- [ ] **Phase 4** — AI Insights, macro data, advanced analytics

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚠️ Disclaimer

This software is provided for **educational and informational purposes only**. It is NOT financial advice. Trading stocks involves risk; past performance does not guarantee future results. Data may be delayed or inaccurate. Always consult a licensed financial advisor before making investment decisions.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for Indonesian investors exploring US markets**

</div>
