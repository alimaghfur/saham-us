"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  DollarSign,
  ExternalLink,
  Globe,
  LineChart,
  PieChart,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import {
  formatLargeNumber,
  formatPrice,
  formatPercent,
  formatRatio,
  formatFractionPercent,
  priceChangeClass,
} from "@/lib/format";
import { cn } from "@/lib/cn";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string)?.toUpperCase() ?? "";

  const quote = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => api.quote(symbol),
    enabled: !!symbol,
  });

  const profile = useQuery({
    queryKey: ["profile", symbol],
    queryFn: () => api.profile(symbol),
    enabled: !!symbol,
  });

  const fundamentals = useQuery({
    queryKey: ["fundamentals", symbol],
    queryFn: () => api.fundamentals(symbol),
    enabled: !!symbol,
  });

  const technicals = useQuery({
    queryKey: ["technicals", symbol],
    queryFn: () => api.technicals(symbol),
    enabled: !!symbol,
  });

  const q = quote.data;
  const p = profile.data;
  const f = fundamentals.data;
  const t = technicals.data;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{symbol}</span>
      </div>

      {/* Header with Price */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{symbol}</h1>
            {t?.trend && (
              <Badge
                variant={
                  t.trend === "bullish"
                    ? "bull"
                    : t.trend === "bearish"
                      ? "bear"
                      : "default"
                }
                dot
              >
                {t.trend}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p?.name ?? q?.name ?? symbol} · {p?.sector ?? "—"} ·{" "}
            {p?.industry ?? "—"}
          </p>
        </div>

        {q && (
          <div className="text-right">
            <div className="text-3xl font-bold tabular">
              ${formatPrice(q.price)}
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <span
                className={cn(
                  "text-sm font-semibold tabular",
                  priceChangeClass(q.change),
                )}
              >
                {q.change != null
                  ? (q.change > 0 ? "+" : "") + formatPrice(q.change)
                  : "—"}
              </span>
              <ChangeBadge value={q.change_percent} showIcon size="md" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {quote.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
      ) : (
        q && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Open" value={`$${formatPrice(q.open)}`} />
            <MiniStat label="Day High" value={`$${formatPrice(q.day_high)}`} />
            <MiniStat label="Day Low" value={`$${formatPrice(q.day_low)}`} />
            <MiniStat label="Prev Close" value={`$${formatPrice(q.previous_close)}`} />
            <MiniStat label="Volume" value={formatLargeNumber(q.volume)} />
            <MiniStat label="Avg Volume" value={formatLargeNumber(q.avg_volume)} />
            <MiniStat label="Market Cap" value={formatLargeNumber(q.market_cap)} />
            <MiniStat label="52W High / Low" value={`$${formatPrice(q.week52_high)} / $${formatPrice(q.week52_low)}`} />
          </div>
        )
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Technical Indicators */}
        <Card
          title="Technical Indicators"
          icon={<LineChart size={14} />}
          className="lg:col-span-2"
        >
          {technicals.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-muted/50"
                />
              ))}
            </div>
          ) : t ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TechItem label="SMA 20" value={formatPrice(t.sma_20)} price={q?.price} />
              <TechItem label="SMA 50" value={formatPrice(t.sma_50)} price={q?.price} />
              <TechItem label="SMA 200" value={formatPrice(t.sma_200)} price={q?.price} />
              <TechItem label="EMA 9" value={formatPrice(t.ema_9)} price={q?.price} />
              <TechItem label="EMA 21" value={formatPrice(t.ema_21)} price={q?.price} />
              <TechItem
                label="RSI (14)"
                value={t.rsi_14?.toFixed(1) ?? "—"}
                rsi={t.rsi_14}
              />
              <TechItem label="MACD" value={t.macd?.toFixed(3) ?? "—"} />
              <TechItem label="ATR (14)" value={t.atr_14?.toFixed(2) ?? "—"} />
              <TechItem label="VWAP" value={formatPrice(t.vwap)} price={q?.price} />
            </div>
          ) : null}
        </Card>

        {/* Fundamentals */}
        <Card title="Fundamentals" icon={<PieChart size={14} />}>
          {fundamentals.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 animate-pulse rounded bg-muted/50"
                />
              ))}
            </div>
          ) : f ? (
            <div className="space-y-2">
              <FundRow label="P/E Ratio" value={formatRatio(f.pe_ratio)} />
              <FundRow label="Forward P/E" value={formatRatio(f.forward_pe)} />
              <FundRow label="PEG Ratio" value={formatRatio(f.peg_ratio)} />
              <FundRow label="P/B Ratio" value={formatRatio(f.price_to_book)} />
              <FundRow
                label="Gross Margin"
                value={formatFractionPercent(f.gross_margin)}
              />
              <FundRow
                label="Profit Margin"
                value={formatFractionPercent(f.profit_margin)}
              />
              <FundRow label="ROE" value={formatFractionPercent(f.roe)} />
              <FundRow
                label="Debt/Equity"
                value={formatRatio(f.debt_to_equity)}
              />
              <FundRow
                label="Dividend Yield"
                value={formatFractionPercent(f.dividend_yield)}
              />
              <FundRow label="Short Ratio" value={formatRatio(f.short_ratio)} />
            </div>
          ) : null}
        </Card>
      </div>

      {/* Company Profile */}
      {p && (
        <Card title="Company Profile" icon={<Building2 size={14} />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {p.description?.slice(0, 500) ?? "No description available."}
                {(p.description?.length ?? 0) > 500 && "..."}
              </p>
            </div>
            <div className="space-y-3">
              <ProfileRow icon={<Building2 size={13} />} label="Sector" value={p.sector} />
              <ProfileRow icon={<BarChart3 size={13} />} label="Industry" value={p.industry} />
              <ProfileRow icon={<Globe size={13} />} label="Country" value={p.country} />
              <ProfileRow icon={<Users size={13} />} label="Employees" value={p.employees?.toLocaleString()} />
              {p.website && (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink size={11} />
                  {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tabular">{value}</div>
    </div>
  );
}

function TechItem({
  label,
  value,
  price,
  rsi,
}: {
  label: string;
  value: string;
  price?: number | null;
  rsi?: number | null;
}) {
  let signal: "bullish" | "bearish" | "neutral" = "neutral";
  if (price && value !== "—") {
    const numVal = parseFloat(value.replace(/,/g, ""));
    if (!isNaN(numVal) && label.includes("MA") || label.includes("EMA") || label === "VWAP") {
      signal = price > numVal ? "bullish" : "bearish";
    }
  }
  if (rsi != null) {
    signal = rsi > 70 ? "bearish" : rsi < 30 ? "bullish" : "neutral";
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tabular">{value}</span>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            signal === "bullish" && "bg-bull",
            signal === "bearish" && "bg-bear",
            signal === "neutral" && "bg-muted-foreground/30",
          )}
        />
      </div>
    </div>
  );
}

function FundRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-1.5 text-xs transition-colors hover:bg-muted/30">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular">{value}</span>
    </div>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
