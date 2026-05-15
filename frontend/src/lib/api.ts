// Typed API client. Uses relative URLs so Next.js rewrites proxy
// to the backend during dev. In production deploy both behind same host.

import type {
  CompanyProfile,
  Fundamentals,
  HistoryResponse,
  IndexSnapshot,
  MarketMover,
  NewsItem,
  Quote,
  ScreenerFilter,
  ScreenerResult,
  SearchResult,
  SectorPerformance,
  SwingSetup,
  TechnicalIndicators,
} from "./types";

const BASE = "/api/v1";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  // If 401, clear tokens and redirect to login
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

// --- stocks ---
export const api = {
  search: (q: string, limit = 10) =>
    fetchJson<SearchResult[]>(
      `${BASE}/stocks/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  quote: (symbol: string) =>
    fetchJson<Quote>(`${BASE}/stocks/${symbol}/quote`),

  profile: (symbol: string) =>
    fetchJson<CompanyProfile>(`${BASE}/stocks/${symbol}/profile`),

  history: (symbol: string, range = "1y", interval = "1d") =>
    fetchJson<HistoryResponse>(
      `${BASE}/stocks/${symbol}/history?range=${range}&interval=${interval}`,
    ),

  fundamentals: (symbol: string) =>
    fetchJson<Fundamentals>(`${BASE}/stocks/${symbol}/fundamentals`),

  news: (symbol: string, limit = 20) =>
    fetchJson<NewsItem[]>(`${BASE}/stocks/${symbol}/news?limit=${limit}`),

  // --- market ---
  indices: () => fetchJson<IndexSnapshot[]>(`${BASE}/market/indices`),

  movers: (type: "gainers" | "losers" | "active" = "gainers", limit = 10) =>
    fetchJson<MarketMover[]>(`${BASE}/market/movers?type=${type}&limit=${limit}`),

  sectors: () => fetchJson<SectorPerformance[]>(`${BASE}/market/sectors`),

  // --- technicals ---
  technicals: (symbol: string, range = "6mo", interval = "1d") =>
    fetchJson<TechnicalIndicators>(
      `${BASE}/technicals/${symbol}?range=${range}&interval=${interval}`,
    ),

  // --- screener ---
  runScreener: (filters: ScreenerFilter) =>
    fetchJson<ScreenerResult[]>(`${BASE}/screener/run`, {
      method: "POST",
      body: JSON.stringify(filters),
    }),

  screenerPreset: (name: string) =>
    fetchJson<ScreenerResult[]>(`${BASE}/screener/presets/${name}`),

  // --- swing ---
  swingScan: (setup: string, limit = 25) =>
    fetchJson<SwingSetup[]>(
      `${BASE}/swing/scan?setup=${setup}&limit=${limit}`,
    ),

  // --- scalping ---
  hotStocks: (limit = 25) =>
    fetchJson<MarketMover[]>(`${BASE}/scalping/hot?limit=${limit}`),

  // --- macro ---
  treasury: () => fetchJson<any[]>(`${BASE}/macro/treasury`),
  macroIndicators: () => fetchJson<any[]>(`${BASE}/macro/indicators`),
  fearGreed: () => fetchJson<any>(`${BASE}/macro/fear-greed`),
  yieldCurve: () => fetchJson<any[]>(`${BASE}/macro/yield-curve`),

  // --- backtest ---
  runBacktest: (params: any) =>
    fetchJson<any>(`${BASE}/backtest/run`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
  backtestStrategies: () => fetchJson<any[]>(`${BASE}/backtest/strategies`),

  // --- score & recommendations ---
  stockScore: (symbol: string) =>
    fetchJson<any>(`${BASE}/score/analyze/${symbol}`),
  recommendations: (style: string = "balanced", limit: number = 5) =>
    fetchJson<any[]>(`${BASE}/score/recommendations/top?style=${style}&limit=${limit}`),

  // --- opportunities ---
  buyTheDip: (minDrop: number = -3, minScore: number = 50) =>
    fetchJson<any[]>(`${BASE}/opportunities/dips?min_drop=${minDrop}&min_score=${minScore}`),
  comparePeers: (symbols: string[]) =>
    fetchJson<any[]>(`${BASE}/opportunities/compare?symbols=${symbols.join(",")}`),

  // --- advanced analytics ---
  multiTimeframe: (symbol: string) => fetchJson<any>(`${BASE}/advanced/multi-timeframe/${symbol}`),
  smartMoney: (symbol: string) => fetchJson<any>(`${BASE}/advanced/smart-money/${symbol}`),
  supportResistance: (symbol: string) => fetchJson<any>(`${BASE}/advanced/support-resistance/${symbol}`),
  sectorRotation: () => fetchJson<any>(`${BASE}/advanced/sector-rotation`),
  compositeSignal: (symbol: string) => fetchJson<any>(`${BASE}/advanced/composite/${symbol}`),

  // --- quant engine ---
  alphaScore: (symbol: string) => fetchJson<any>(`${BASE}/quant/alpha/${symbol}`),
  marketRegime: () => fetchJson<any>(`${BASE}/quant/regime`),
  signalStrength: (symbol: string) => fetchJson<any>(`${BASE}/quant/signal/${symbol}`),
  riskParitySizing: (symbol: string, portfolio: number = 10000, risk: number = 2) =>
    fetchJson<any>(`${BASE}/quant/sizing/${symbol}?portfolio=${portfolio}&risk=${risk}`),

  // --- final verdict (ensemble) ---
  finalVerdict: (symbol: string) => fetchJson<any>(`${BASE}/verdict/${symbol}`),

  // --- prediction ---
  prediction: (symbol: string, range = "1y") =>
    fetchJson<any>(`${BASE}/prediction/${symbol}?range=${range}`),

  // --- sentiment ---
  sentiment: (symbol: string, limit = 20) =>
    fetchJson<any>(`${BASE}/sentiment/${symbol}?limit=${limit}`),

  // --- ml prediction ---
  mlPrediction: (symbol: string) =>
    fetchJson<any>(`${BASE}/ml-prediction/${symbol}`),

  // --- options ---
  optionsChain: (symbol: string, expiryDays = 30) =>
    fetchJson<any>(`${BASE}/options/${symbol}?expiry_days=${expiryDays}`),

  // --- quantitative ---
  correlation: (symbols: string[]) =>
    fetchJson<any>(`${BASE}/quantitative/correlation?symbols=${symbols.join(",")}`),
  monteCarlo: (symbol: string, simulations = 1000, days = 30) =>
    fetchJson<any>(`${BASE}/quantitative/monte-carlo/${symbol}?simulations=${simulations}&days=${days}`),
  fibonacci: (symbol: string) =>
    fetchJson<any>(`${BASE}/quantitative/fibonacci/${symbol}`),

  // --- telegram ---
  telegramSetup: () => fetchJson<any>(`${BASE}/telegram/setup`),
  checkAlert: (data: any) =>
    fetchJson<any>(`${BASE}/telegram/check-alert`, { method: "POST", body: JSON.stringify(data) }),

  // --- pro features ---
  insiderTrading: (symbol: string) => fetchJson<any>(`${BASE}/pro/insider/${symbol}`),
  unusualOptions: (symbol: string) => fetchJson<any>(`${BASE}/pro/unusual-options/${symbol}`),
  earningsPredict: (symbol: string) => fetchJson<any>(`${BASE}/pro/earnings-predict/${symbol}`),
  portfolioOptimize: (symbols: string[]) =>
    fetchJson<any>(`${BASE}/pro/portfolio-optimize`, { method: "POST", body: JSON.stringify({ symbols }) }),
  economicCalendar: (daysAhead = 30, daysBack = 7) =>
    fetchJson<any>(`${BASE}/pro/economic-calendar?days_ahead=${daysAhead}&days_back=${daysBack}`),
  patterns: (symbol: string) => fetchJson<any>(`${BASE}/pro/patterns/${symbol}`),
  darkPool: (symbol: string) => fetchJson<any>(`${BASE}/pro/dark-pool/${symbol}`),
  socialSentiment: (symbol: string) => fetchJson<any>(`${BASE}/pro/social-sentiment/${symbol}`),
  dividends: (symbol: string) => fetchJson<any>(`${BASE}/pro/dividends/${symbol}`),
  dripSimulate: (symbol: string, initial = 10000, monthly = 500, years = 20) =>
    fetchJson<any>(`${BASE}/pro/drip-simulate/${symbol}?initial_investment=${initial}&monthly_contribution=${monthly}&years=${years}`),
  etfProfile: (symbol: string) => fetchJson<any>(`${BASE}/pro/etf/${symbol}`),
  etfCompare: (symbols: string[]) => fetchJson<any>(`${BASE}/pro/etf-compare?symbols=${symbols.join(",")}`),
  marketBreadth: (market = "S&P 500") => fetchJson<any>(`${BASE}/pro/market-breadth?market=${encodeURIComponent(market)}`),
  copyTradingTraders: (num = 10, sortBy = "return") =>
    fetchJson<any>(`${BASE}/pro/copy-trading/traders?num=${num}&sort_by=${sortBy}`),
  copyTradingSimulate: (traderId: string, allocation = 10000) =>
    fetchJson<any>(`${BASE}/pro/copy-trading/simulate/${traderId}?allocation=${allocation}`),
};
