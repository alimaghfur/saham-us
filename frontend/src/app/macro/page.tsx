"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Gauge,
  Globe,
  LineChart,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice, priceChangeClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function MacroPage() {
  const treasury = useQuery({ queryKey: ["macro-treasury"], queryFn: api.treasury });
  const indicators = useQuery({ queryKey: ["macro-indicators"], queryFn: api.macroIndicators });
  const fearGreed = useQuery({ queryKey: ["macro-fear-greed"], queryFn: api.fearGreed });
  const yieldCurve = useQuery({ queryKey: ["macro-yield-curve"], queryFn: api.yieldCurve });

  const fg = fearGreed.data;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Macro Economy"
        description="Key economic indicators, treasury yields, and market sentiment that drive equity markets."
        badge="Live"
      />

      {/* Fear & Greed Gauge */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Fear & Greed Index"
          icon={<Gauge size={14} />}
          className="lg:col-span-1"
        >
          {fearGreed.isLoading ? (
            <div className="flex flex-col items-center py-8">
              <div className="h-32 w-32 animate-pulse rounded-full bg-muted/50" />
            </div>
          ) : fg ? (
            <div className="flex flex-col items-center py-4">
              {/* Gauge Circle */}
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  {/* Background track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgb(var(--muted))"
                    strokeWidth="10"
                    strokeDasharray="314"
                    strokeDashoffset="78.5"
                    strokeLinecap="round"
                  />
                  {/* Value arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={getGaugeColor(fg.score)}
                    strokeWidth="10"
                    strokeDasharray="314"
                    strokeDashoffset={314 - (235.5 * fg.score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold">{fg.score}</span>
                  <span className="text-[10px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <Badge
                variant={
                  fg.score >= 55
                    ? "bull"
                    : fg.score <= 45
                      ? "bear"
                      : "default"
                }
                className="mt-3"
                dot
              >
                {fg.label}
              </Badge>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {fg.description}
              </p>

              {/* Component scores */}
              <div className="mt-4 w-full space-y-2">
                <ScoreBar label="VIX Score" value={fg.vix_score} />
                <ScoreBar label="Momentum Score" value={fg.momentum_score} />
              </div>
            </div>
          ) : null}
        </Card>

        {/* Market Indicators */}
        <Card
          title="Market Indicators"
          icon={<Globe size={14} />}
          className="lg:col-span-2"
        >
          {indicators.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : indicators.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {indicators.data.map((ind: any) => (
                <div
                  key={ind.symbol}
                  className="group relative overflow-hidden rounded-xl border border-border/30 bg-muted/20 p-4 transition-all hover:border-border hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {ind.name}
                    </span>
                    {(ind.change_percent ?? 0) >= 0 ? (
                      <ArrowUpRight size={12} className="text-bull" />
                    ) : (
                      <ArrowDownRight size={12} className="text-bear" />
                    )}
                  </div>
                  <p className="mt-2 text-lg font-bold tabular">
                    {ind.price != null ? formatPrice(ind.price) : "—"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn("text-xs tabular", priceChangeClass(ind.change))}>
                      {ind.change != null ? (ind.change > 0 ? "+" : "") + formatPrice(ind.change) : "—"}
                    </span>
                    <ChangeBadge value={ind.change_percent} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </section>

      {/* Treasury Yields */}
      <section>
        <Card
          title="US Treasury Yields"
          subtitle="Key maturity rates — updated in real-time"
          icon={<DollarSign size={14} />}
        >
          {treasury.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : treasury.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {treasury.data.map((t: any) => (
                <div
                  key={t.symbol}
                  className="rounded-xl border border-border/30 bg-gradient-to-br from-muted/20 to-transparent p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t.name}
                    </span>
                    <Badge variant="default">{t.maturity}</Badge>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular">
                    {t.yield_percent != null ? `${formatPrice(t.yield_percent)}%` : "—"}
                  </p>
                  <div className="mt-1">
                    <ChangeBadge value={t.change_percent} showIcon />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </section>

      {/* Yield Curve */}
      <section>
        <Card
          title="Yield Curve"
          subtitle="Treasury yields across maturities — normal curve slopes upward"
          icon={<LineChart size={14} />}
        >
          {yieldCurve.isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-muted/30" />
          ) : yieldCurve.data && yieldCurve.data.length > 0 ? (
            <div className="space-y-4">
              {/* Visual curve */}
              <div className="flex items-end justify-between gap-4 px-4 py-6">
                {yieldCurve.data.map((point: any, idx: number) => {
                  const maxYield = Math.max(...yieldCurve.data.map((p: any) => p.yield_percent ?? 0));
                  const height = maxYield > 0 ? ((point.yield_percent ?? 0) / maxYield) * 120 : 40;
                  return (
                    <div key={point.maturity} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-semibold tabular text-primary">
                        {point.yield_percent != null ? `${point.yield_percent.toFixed(2)}%` : "—"}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary/60 to-primary/20 transition-all duration-700"
                        style={{ height: `${Math.max(20, height)}px` }}
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {point.maturity}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Spread Analysis */}
              {yieldCurve.data.length >= 3 && (() => {
                const short = yieldCurve.data[0]?.yield_percent ?? 0;
                const long = yieldCurve.data[yieldCurve.data.length - 1]?.yield_percent ?? 0;
                const spread = long - short;
                const inverted = spread < 0;
                return (
                  <div className={cn(
                    "rounded-xl border p-4",
                    inverted ? "border-bear/30 bg-bear/5" : "border-bull/30 bg-bull/5"
                  )}>
                    <div className="flex items-center gap-2">
                      {inverted ? (
                        <TrendingDown size={14} className="text-bear" />
                      ) : (
                        <TrendingUp size={14} className="text-bull" />
                      )}
                      <span className="text-xs font-semibold">
                        {inverted ? "Inverted Yield Curve" : "Normal Yield Curve"}
                      </span>
                      <Badge variant={inverted ? "bear" : "bull"}>
                        Spread: {spread > 0 ? "+" : ""}{spread.toFixed(2)}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {inverted
                        ? "An inverted yield curve historically signals potential recession within 12-18 months."
                        : "A normal upward-sloping curve indicates healthy economic expectations."}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Unable to load yield curve data.
            </p>
          )}
        </Card>
      </section>

      {/* Market Interpretation Guide */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">How to Read These Indicators</h3>
        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bear" />
            <span><strong className="text-foreground">VIX &gt; 30:</strong> Market fear is high — potential buying opportunity for contrarians</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />
            <span><strong className="text-foreground">VIX &lt; 15:</strong> Market complacency — potential risk of correction</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            <span><strong className="text-foreground">Inverted Curve:</strong> Short-term yields above long-term — recession signal</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span><strong className="text-foreground">Rising DXY:</strong> Strong dollar pressures multinational earnings</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
            <span><strong className="text-foreground">Gold Rising:</strong> Flight to safety — uncertainty in markets</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />
            <span><strong className="text-foreground">Oil Rising:</strong> Economic growth signal — bullish for energy sector</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-[10px] text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            value >= 55 ? "bg-bull" : value <= 45 ? "bg-bear" : "bg-warning"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] font-semibold tabular">{value}</span>
    </div>
  );
}

function getGaugeColor(score: number): string {
  if (score >= 75) return "rgb(34, 197, 94)";
  if (score >= 55) return "rgb(132, 204, 22)";
  if (score >= 45) return "rgb(245, 158, 11)";
  if (score >= 25) return "rgb(249, 115, 22)";
  return "rgb(239, 68, 68)";
}
