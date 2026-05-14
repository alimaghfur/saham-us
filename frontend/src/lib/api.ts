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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
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
};
