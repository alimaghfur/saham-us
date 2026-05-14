"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Flame,
  Gauge,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function RecapPage() {
  const indices = useQuery({ queryKey: ["recap-indices"], queryFn: api.indices });
  const sectors = useQuery({ queryKey: ["recap-sectors"], queryFn: api.sectors });
  const gainers = useQuery({
    queryKey: ["recap-gainers"],
    queryFn: () => api.movers("gainers", 5),
  });
  const losers = useQuery({
    queryKey: ["recap-losers"],
    queryFn: () => api.movers("losers", 5),
  });
  const fearGreed = useQuery({ queryKey: ["recap-fear-greed"], queryFn: api.fearGreed });

  const isLoading =
    indices.isLoading || sectors.isLoading || gainers.isLoading || losers.isLoading || fearGreed.isLoading;

  // Derive key data
  const spIndex = indices.data?.find(
    (i: any) => i.symbol === "^GSPC" || i.name?.toLowerCase().includes("s&p")
  );
  const nasdaqIndex = indices.data?.find(
    (i: any) => i.symbol === "^IXIC" || i.name?.toLowerCase().includes("nasdaq")
  );
  const dowIndex = indices.data?.find(
    (i: any) => i.symbol === "^DJI" || i.name?.toLowerCase().includes("dow")
  );

  const sortedSectors = sectors.data
    ? [...sectors.data].sort((a: any, b: any) => (b.change_percent ?? 0) - (a.change_percent ?? 0))
    : [];
  const bestSector = sortedSectors[0];
  const worstSector = sortedSectors[sortedSectors.length - 1];

  const topGainer = gainers.data?.[0];
  const topLoser = losers.data?.[0];

  const fg = fearGreed.data;
  const spChange = spIndex?.change_percent ?? 0;

  // Generate takeaways
  const takeaways: string[] = [];
  if (spChange > 0) {
    takeaways.push(`Market bullish this week — S&P 500 up ${spChange.toFixed(2)}%`);
  } else if (spChange < 0) {
    takeaways.push(`Market bearish this week — S&P 500 down ${spChange.toFixed(2)}%`);
  } else {
    takeaways.push("Market flat this week — S&P 500 unchanged");
  }
  if (bestSector) {
    takeaways.push(
      `Best performing sector: ${bestSector.name ?? bestSector.sector} (+${(bestSector.change_percent ?? 0).toFixed(2)}%)`
    );
  }
  if (topGainer) {
    takeaways.push(
      `Biggest gainer: ${topGainer.symbol} (+${(topGainer.change_percent ?? 0).toFixed(2)}%)`
    );
  }
  if (topLoser) {
    takeaways.push(
      `Biggest loser: ${topLoser.symbol} (${(topLoser.change_percent ?? 0).toFixed(2)}%)`
    );
  }
  if (fg) {
    takeaways.push(`Fear & Greed Index at ${fg.score} — ${fg.label}`);
  }

  // Weekly tips based on conditions
  const tips: string[] = [];
  if (spChange > 2) {
    tips.push("Market is running hot — consider taking partial profits on winning positions");
    tips.push("Be cautious of FOMO; stick to your strategy");
  } else if (spChange > 0) {
    tips.push("Moderate bullish conditions — good for adding quality stocks on pullbacks");
    tips.push("Review your watchlist for entries near support levels");
  } else if (spChange < -2) {
    tips.push("Significant pullback — look for oversold quality stocks (Buy the Dip page)");
    tips.push("Don't panic sell; check fundamentals before making decisions");
  } else if (spChange < 0) {
    tips.push("Mild weakness — stay patient and wait for clearer signals");
    tips.push("Use this time to research and build your watchlist");
  } else {
    tips.push("Market is indecisive — focus on individual stock setups rather than broad market");
    tips.push("Review your portfolio allocation for balance");
  }
  if (fg && fg.score < 30) {
    tips.push("Extreme fear in market — historically a contrarian buying opportunity");
  }
  if (fg && fg.score > 75) {
    tips.push("Extreme greed — consider tightening stop-losses");
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Weekly Market Recap"
        description="Ringkasan pasar mingguan — indices, sektor, top movers, dan aksi yang perlu dilakukan."
        badge="New"
      />

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="S&P 500"
            value={spIndex ? `${(spIndex.price ?? 0).toLocaleString()}` : "—"}
            change={spIndex ? `${spChange > 0 ? "+" : ""}${spChange.toFixed(2)}%` : undefined}
            changeType={spChange > 0 ? "bull" : spChange < 0 ? "bear" : "neutral"}
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Nasdaq"
            value={nasdaqIndex ? `${(nasdaqIndex.price ?? 0).toLocaleString()}` : "—"}
            change={
              nasdaqIndex
                ? `${(nasdaqIndex.change_percent ?? 0) > 0 ? "+" : ""}${(nasdaqIndex.change_percent ?? 0).toFixed(2)}%`
                : undefined
            }
            changeType={
              (nasdaqIndex?.change_percent ?? 0) > 0
                ? "bull"
                : (nasdaqIndex?.change_percent ?? 0) < 0
                  ? "bear"
                  : "neutral"
            }
            icon={<BarChart3 size={16} />}
          />
          <StatCard
            label="Dow Jones"
            value={dowIndex ? `${(dowIndex.price ?? 0).toLocaleString()}` : "—"}
            change={
              dowIndex
                ? `${(dowIndex.change_percent ?? 0) > 0 ? "+" : ""}${(dowIndex.change_percent ?? 0).toFixed(2)}%`
                : undefined
            }
            changeType={
              (dowIndex?.change_percent ?? 0) > 0
                ? "bull"
                : (dowIndex?.change_percent ?? 0) < 0
                  ? "bear"
                  : "neutral"
            }
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Fear & Greed"
            value={fg ? `${fg.score}` : "—"}
            change={fg ? fg.label : undefined}
            changeType={
              fg
                ? fg.score >= 55
                  ? "bull"
                  : fg.score <= 45
                    ? "bear"
                    : "neutral"
                : "neutral"
            }
            icon={<Gauge size={16} />}
          />
        </div>
      )}

      {/* This Week's Summary */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Sector Performance */}
        <Card
          title="Sector Performance"
          subtitle="Best and worst sectors this week"
          icon={<Flame size={14} />}
        >
          {sectors.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : sortedSectors.length > 0 ? (
            <div className="space-y-2">
              {sortedSectors.map((sector: any, idx: number) => (
                <div
                  key={sector.sector ?? sector.name ?? idx}
                  className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/10 px-4 py-2.5 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{sector.name ?? sector.sector}</span>
                  </div>
                  <ChangeBadge value={sector.change_percent} showIcon size="md" />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No sector data available</p>
          )}
        </Card>

        {/* Fear & Greed Gauge */}
        <Card
          title="Market Sentiment"
          subtitle="CNN Fear & Greed Index"
          icon={<Gauge size={14} />}
        >
          {fearGreed.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-32 w-32 animate-pulse rounded-full bg-muted/50" />
            </div>
          ) : fg ? (
            <div className="flex flex-col items-center py-4">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
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
                variant={fg.score >= 55 ? "bull" : fg.score <= 45 ? "bear" : "default"}
                className="mt-3"
                dot
              >
                {fg.label}
              </Badge>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {fg.description}
              </p>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Unable to load sentiment data.
            </p>
          )}
        </Card>
      </section>

      {/* Top Movers */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Top Winners */}
        <Card
          title="Top 5 Winners"
          subtitle="Biggest gainers this week"
          icon={<Trophy size={14} />}
        >
          {gainers.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : gainers.data && gainers.data.length > 0 ? (
            <div className="space-y-2">
              {gainers.data.map((stock: any, idx: number) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between rounded-xl border border-bull/10 bg-bull/5 px-4 py-3 transition-colors hover:bg-bull/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bull/20 text-xs font-bold text-bull">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold">{stock.symbol}</span>
                      <p className="text-[10px] text-muted-foreground">{stock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">
                      ${(stock.price ?? 0).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 text-bull">
                      <ArrowUpRight size={10} />
                      <span className="text-xs font-semibold tabular">
                        +{(stock.change_percent ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No data available</p>
          )}
        </Card>

        {/* Top Losers */}
        <Card
          title="Top 5 Losers"
          subtitle="Biggest decliners this week"
          icon={<TrendingDown size={14} />}
        >
          {losers.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : losers.data && losers.data.length > 0 ? (
            <div className="space-y-2">
              {losers.data.map((stock: any, idx: number) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between rounded-xl border border-bear/10 bg-bear/5 px-4 py-3 transition-colors hover:bg-bear/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bear/20 text-xs font-bold text-bear">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold">{stock.symbol}</span>
                      <p className="text-[10px] text-muted-foreground">{stock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">
                      ${(stock.price ?? 0).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 text-bear">
                      <ArrowDownRight size={10} />
                      <span className="text-xs font-semibold tabular">
                        {(stock.change_percent ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No data available</p>
          )}
        </Card>
      </section>

      {/* Key Takeaways */}
      <section>
        <Card
          title="Key Takeaways"
          subtitle="Auto-generated insights from this week's data"
          icon={<Lightbulb size={14} />}
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-muted/50" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {takeaways.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-border/20 bg-muted/10 px-4 py-3"
                >
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">{point}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Weekly Action Items */}
      <section>
        <Card
          title="What To Do This Week"
          subtitle="Action items based on current market conditions"
          icon={<CalendarDays size={14} />}
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-muted/50" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3"
                >
                  <Lightbulb size={14} className="mt-0.5 shrink-0 text-primary" />
                  <span className="text-sm">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Footer note */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Note:</strong> This recap is auto-generated from live market data.
          Past performance does not guarantee future results. Always do your own research before making investment decisions.
        </p>
      </div>
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
