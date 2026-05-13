// Formatting helpers for prices, percentages, and large numbers.

export function formatPrice(value?: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(
  value?: number | null,
  digits = 2,
  withSign = true,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatLargeNumber(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

export function formatRatio(value?: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** Pct is sometimes fraction (0.15) and sometimes already %. Normalize. */
export function formatFractionPercent(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  // yfinance returns fractions for margins/yields — multiply.
  return formatPercent(value * 100);
}

export function priceChangeClass(value?: number | null): string {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "text-bull";
  if (value < 0) return "text-bear";
  return "text-muted-foreground";
}
