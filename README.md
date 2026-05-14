# Saham-US — Professional US Stock Market Analysis Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8)
![Modules](https://img.shields.io/badge/modules-39-purple)
![License](https://img.shields.io/badge/license-MIT-green)

**Platform analisa saham US profesional** untuk membantu investor Indonesia membuat keputusan investasi yang lebih baik dan profit di pasar saham US.

[Features](#-features) · [Installation](#-quick-start) · [Tech Stack](#-tech-stack) · [Screenshots](#-ui-design)

</div>

---

## ✨ Highlights

- 🔮 **Prediksi Saham** — Prediksi harga 1 hari, 1 minggu, 1 bulan + entry point & risk management
- 🧠 **ML Prediction** — Ensemble 4 model Machine Learning (Momentum, Mean Reversion, Trend, Volatility)
- 📰 **Sentimen Berita** — NLP analisis sentimen dari berita real-time (bullish/bearish scoring)
- 📊 **Options Chain & Greeks** — Black-Scholes pricing + Delta, Gamma, Theta, Vega, IV Smile, Max Pain
- 🎲 **Monte Carlo Simulation** — 1000 skenario probabilistik + VaR, P(profit), distribusi harga
- 📐 **Fibonacci Auto-Detection** — Auto swing high/low + level retracement (23.6% - 78.6%)
- 📱 **Telegram Alerts** — Notifikasi otomatis ke Telegram (harga, RSI, % change)
- 🎯 **Stock Score 1-100** — Skor komprehensif per saham (Valuation + Quality + Growth + Momentum)
- 🤖 **AI Natural Language Screener** — Ketik "show me tech stocks with PE under 20" → hasil otomatis
- 🎨 **Modern Dark UI** — Premium trading terminal dengan glassmorphism & smooth animations
- 🏆 **Paper Trading** — Latihan dengan $100K virtual tanpa risiko

---

## 🚀 Features (32 Modules)

### 📊 Overview & Market
| Module | Description |
|--------|-------------|
| **Dashboard** | Market snapshot — indices, top movers, sector heatmap, quick actions |
| **Markets & Sectors** | Sector rotation, market breadth, expanded indices view |
| **Market Hours** | Jam trading US vs WIB (live clock), session indicator, tips investor Indonesia |
| **Macro Economy** | VIX, DXY, Gold, Oil, Treasury yields, Fear & Greed Index, yield curve |
| **Weekly Recap** | Auto-generated ringkasan mingguan — indices, sektor, top movers, key takeaways |

### 🔍 Analisa & Research
| Module | Description |
|--------|-------------|
| **Stock Score** | Skor 1-100 per saham dengan breakdown (Valuation, Quality, Growth, Momentum) + trading plan |
| **Rekomendasi Hari Ini** | Top 5 picks per gaya investasi (Conservative, Balanced, Aggressive) dengan Entry/SL/TP |
| **Buy the Dip** | Detector saham bagus (skor >50) yang turun >3% hari ini — peluang beli saat diskon |
| **Perbandingan Saham** | Compare hingga 5 saham side-by-side (10 metrik, highlight best/worst) |
| **Prediksi Saham** | Prediksi harga 1 hari / 1 minggu / 1 bulan + entry point, stop loss, target, dan confidence level |
| **ML Prediction** | Ensemble 4 model ML (Momentum LR, Mean Reversion, Trend Following, Volatility-adjusted) |
| **Sentimen Berita** | NLP sentiment analysis dari news headlines — scoring bullish/bearish per berita |
| **Stock Screener** | Filter multi-kriteria (PE, ROE, Growth, Dividend, Sector) + 5 presets |
| **AI Insights** | Natural language screener — ketik pertanyaan bahasa Inggris → filter otomatis |
| **Earnings Calendar** | Jadwal laporan keuangan saham populer, EPS estimates, tips earnings season |
| **News & Research** | Berita agregasi per sektor + ticker, thumbnail cards, quick-access buttons |
| **Stock Detail** | Chart candlestick, technicals (SMA/EMA/RSI/MACD/BB/ATR), fundamentals, profile, news |

### 📈 Trading Tools
| Module | Description |
|--------|-------------|
| **Swing Trading** | Scanner 4 setup: Breakout, Pullback SMA20, Oversold Bounce, Golden Cross |
| **Scalping** | Hot stocks scanner, momentum bars, volume spikes, auto-refresh 30s |
| **Backtesting** | Simulasi 4 strategi (SMA Cross, RSI, MACD, Breakout) dengan equity curve & trade log |
| **Options Chain** | Black-Scholes pricing + Greeks (Delta, Gamma, Theta, Vega, Rho) + IV Smile + Max Pain |
| **Fibonacci** | Auto swing detection + Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8%, 78.6%) |
| **Monte Carlo** | 1000 simulasi GBM — probabilitas profit, VaR 95%, expected return, path distribution |
| **Position Calculator** | Hitung jumlah saham aman berdasarkan budget, risk %, SL level — jangan overlot! |
| **DCA Planner** | Dollar Cost Averaging — rencana investasi berkala bulanan dengan proyeksi profit |

### 💼 Portfolio Management
| Module | Description |
|--------|-------------|
| **Watchlist + Auto-Score** | Track saham favorit dengan auto-scoring, sort by score, card + table view |
| **Paper Trading** | Simulasi $100K virtual — beli/jual tanpa risiko, P&L tracking real-time |
| **Portfolio Tracker** | Holdings, P&L per saham, allocation chart, transaction history |
| **Trading Journal** | Catat alasan setiap trade, emosi, strategi, rating ★, close as Win/Loss |
| **Alerts** | 6 kondisi alert (price, RSI, change%), auto-check 30 detik, localStorage persist |
| **Telegram Alerts** | Bot Telegram integration — notifikasi harga, RSI, % change ke HP otomatis |
| **Risk Dashboard** | Analisa diversifikasi sektor, skor 1-100, warning konsentrasi, saran rebalancing |
| **Goal Tracker** | Set target investasi, hitung savings bulanan, progress bar, preset goals |

### 📚 Edukasi
| Module | Description |
|--------|-------------|
| **Panduan Investasi** | Glossary istilah (Bahasa Indonesia), 3 template strategi, buy/sell checklist, risk calculator, 10 aturan emas |

### ⚙️ Settings
| Module | Description |
|--------|-------------|
| **Settings** | Theme preferences, data provider info, notifications, account |

---

## 🎨 UI Design

### Design System
- **Theme**: Premium dark mode — trading terminal aesthetic
- **Typography**: Inter + JetBrains Mono
- **Effects**: Glassmorphism, gradient borders, glow shadows, dot-pattern backgrounds
- **Animations**: Fade-in, slide-in, shimmer loading, pulse indicators
- **Colors**: Semantic palette (bull green, bear red, primary indigo, accent violet)
- **Components**: 12+ reusable (Card, Button, Badge, Skeleton, EmptyState, etc.)

---

## 🏗️ Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│     Frontend (Next.js 14)    │  HTTP   │      Backend (FastAPI)        │
│                              │ ───────▶│                              │
│  • App Router (33 pages)     │         │  • yfinance data adapter     │
│  • Tailwind CSS + Glassmorp  │         │  • Technical indicators      │
│  • React Query (caching)     │         │  • Screener engine           │
│  • Lightweight Charts        │         │  • Swing/Scalp scanners      │
│  • Lucide React icons       │         │  • Price prediction engine   │
│  • Framer Motion            │         │  • Stock scoring engine      │
│                              │         │  • Backtest simulator        │
│                              │         │  • Macro data (VIX, yields)  │
│                              │         │  • Buy-the-dip detector     │
│                              │         │  • Peer comparison           │
└─────────────────────────────┘         └──────────────────────────────┘
```

---

## 📁 Backend API Endpoints

| Prefix | Endpoints | Description |
|--------|-----------|-------------|
| `/stocks` | search, quote, profile, history, fundamentals, news | Stock data |
| `/market` | indices, movers, sectors | Market overview |
| `/technicals` | /{symbol} | SMA, EMA, RSI, MACD, BB, ATR, VWAP |
| `/prediction` | /{symbol} | Prediksi harga 1d/1w/1m + entry point & key levels |
| `/ml-prediction` | /{symbol} | ML ensemble prediction (4 models) |
| `/sentiment` | /{symbol} | NLP sentiment analysis dari berita |
| `/options` | /{symbol} | Options chain + Greeks + IV + Max Pain |
| `/quantitative` | correlation, monte-carlo/{symbol}, fibonacci/{symbol} | Korelasi, simulasi, Fib |
| `/telegram` | setup, check-alert, format-message | Telegram bot alerts |
| `/screener` | run (POST), presets | Multi-criteria screening |
| `/swing` | scan, setups | Swing trade scanner |
| `/scalping` | hot | Hot stocks scanner |
| `/macro` | treasury, indicators, fear-greed, yield-curve | Macro economy |
| `/backtest` | run (POST), strategies | Strategy backtesting |
| `/score` | analyze/{symbol}, recommendations/top | Stock scoring & recommendations |
| `/opportunities` | dips, compare | Buy-the-dip & peer comparison |

Full API docs: `http://localhost:8000/docs`

---

## 🚀 Quick Start

### Prerequisites
- **Python** 3.11+
- **Node.js** 20+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000 · Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### Docker Compose

```bash
docker-compose up --build
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript 5 |
| **Styling** | Tailwind CSS 3.4, tailwindcss-animate |
| **State** | React Query (TanStack), Zustand |
| **Charts** | Lightweight Charts (TradingView), Recharts |
| **Icons** | Lucide React |
| **Animation** | Framer Motion, CSS keyframes |
| **Backend** | FastAPI, Python 3.11, Pydantic |
| **Data** | yfinance, pandas, numpy |
| **Cache** | In-memory TTL dict (Redis optional) |
| **Deploy** | Docker, Docker Compose |

---

## 📈 Development Roadmap

- [x] Phase 1 — Modern UI/UX, core navigation, all page layouts
- [x] Phase 2 — Full backend integration, market data, charts
- [x] Phase 3 — Screener, Swing/Scalp scanners, Watchlist, Alerts
- [x] Phase 4 — Portfolio, News, Backtesting, Macro Economy
- [x] Phase 5 — Stock Score, Recommendations, AI Insights, Education
- [x] Phase 6 — Buy the Dip, Peer Comparison, Trading Journal, Position Calculator
- [x] Phase 7 — DCA Planner, Market Hours (WIB), ETF info
- [x] Phase 8 — Earnings Calendar, Mobile Bottom Navigation
- [x] Phase 9 — Weekly Recap, Risk Dashboard, Goal Tracker
- [ ] Phase 10 — Social Sentiment, Export PDF, Real-time WebSocket

---

## ⚠️ Disclaimer

This software is provided for **educational and informational purposes only**. It is NOT financial advice. Trading stocks involves risk; past performance does not guarantee future results. Data may be delayed or inaccurate. Always consult a licensed financial advisor before making investment decisions.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for Indonesian investors exploring US markets**

*39 modules · Real-time data · AI-powered · ML predictions · Mobile-ready · Beginner-friendly*

</div>
