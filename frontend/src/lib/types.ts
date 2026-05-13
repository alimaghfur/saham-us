// Types mirroring backend Pydantic schemas.
// Keep in sync with backend/app/schemas/stock.py.

export interface Quote {
  symbol: string;
  name?: string | null;
  price?: number | null;
  change?: number | null;
  change_percent?: number | null;
  previous_close?: number | null;
  open?: number | null;
  day_high?: number | null;
  day_low?: number | null;
  volume?: number | null;
  avg_volume?: number | null;
  market_cap?: number | null;
  pe_ratio?: number | null;
  eps?: number | null;
  dividend_yield?: number | null;
  beta?: number | null;
  week52_high?: number | null;
  week52_low?: number | null;
  currency?: string | null;
  exchange?: string | null;
}

export interface CompanyProfile {
  symbol: string;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  website?: string | null;
  description?: string | null;
  employees?: number | null;
  ceo?: string | null;
  logo_url?: string | null;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoryResponse {
  symbol: string;
  interval: string;
  range: string;
  candles: OHLCV[];
}

export interface Fundamentals {
  symbol: string;
  market_cap?: number | null;
  enterprise_value?: number | null;
  pe_ratio?: number | null;
  forward_pe?: number | null;
  peg_ratio?: number | null;
  price_to_book?: number | null;
  price_to_sales?: number | null;
  ev_to_ebitda?: number | null;
  gross_margin?: number | null;
  operating_margin?: number | null;
  profit_margin?: number | null;
  roe?: number | null;
  roa?: number | null;
  debt_to_equity?: number | null;
  current_ratio?: number | null;
  quick_ratio?: number | null;
  revenue_growth?: number | null;
  earnings_growth?: number | null;
  dividend_rate?: number | null;
  dividend_yield?: number | null;
  payout_ratio?: number | null;
  shares_outstanding?: number | null;
  float_shares?: number | null;
  short_ratio?: number | null;
}

export interface NewsItem {
  title: string;
  publisher?: string | null;
  link: string;
  published_at?: number | null;
  summary?: string | null;
  thumbnail?: string | null;
  related_tickers: string[];
}

export interface IndexSnapshot {
  symbol: string;
  name: string;
  price?: number | null;
  change?: number | null;
  change_percent?: number | null;
}

export interface MarketMover {
  symbol: string;
  name?: string | null;
  price?: number | null;
  change?: number | null;
  change_percent?: number | null;
  volume?: number | null;
}

export interface SectorPerformance {
  sector: string;
  etf: string;
  change_percent?: number | null;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string | null;
  type?: string | null;
}

export interface ScreenerFilter {
  market_cap_min?: number | null;
  market_cap_max?: number | null;
  pe_min?: number | null;
  pe_max?: number | null;
  pb_min?: number | null;
  pb_max?: number | null;
  roe_min?: number | null;
  dividend_yield_min?: number | null;
  revenue_growth_min?: number | null;
  sectors?: string[] | null;
  symbols?: string[] | null;
  limit?: number;
}

export interface ScreenerResult {
  symbol: string;
  name?: string | null;
  sector?: string | null;
  price?: number | null;
  market_cap?: number | null;
  pe_ratio?: number | null;
  pb_ratio?: number | null;
  roe?: number | null;
  dividend_yield?: number | null;
  revenue_growth?: number | null;
}

export interface TechnicalIndicators {
  symbol: string;
  interval: string;
  last_price?: number | null;
  sma_20?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  ema_9?: number | null;
  ema_21?: number | null;
  rsi_14?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  macd_histogram?: number | null;
  bb_upper?: number | null;
  bb_middle?: number | null;
  bb_lower?: number | null;
  atr_14?: number | null;
  vwap?: number | null;
  trend?: "bullish" | "bearish" | "neutral" | null;
}

export interface SwingSetup {
  symbol: string;
  name?: string | null;
  setup_type: string;
  price?: number | null;
  entry?: number | null;
  stop_loss?: number | null;
  target?: number | null;
  risk_reward?: number | null;
  notes?: string | null;
}
