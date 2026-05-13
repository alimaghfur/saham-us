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
};
