"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingUp, TrendingDown, BarChart3, AlertTriangle, Gauge } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function MarketBreadthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["market-breadth"],
    queryFn: () => api.marketBreadth(),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Market Breadth"
        description="S&P 500 breadth indicators — advance/decline, McClellan Oscillator, and sector participation."
        badge="Market"
      />

      {isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}</div>}

      {data && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.ad_ratio > 1 ? "text-bull" : "text-bear")}>
                  {data.ad_ratio?.toFixed(2) ?? "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">A/D Ratio</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.pct_above_200sma > 50 ? "text-bull" : "text-bear")}>
                  {data.pct_above_200sma?.toFixed(0) ?? "—"}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Above 200 SMA</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.mcclellan_oscillator > 0 ? "text-bull" : "text-bear")}>
                  {data.mcclellan_oscillator?.toFixed(0) ?? "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">McClellan Osc.</div>
                {data.mcclellan_interpretation && (
                  <div className="mt-1 text-[10px] text-muted-foreground">{data.mcclellan_interpretation}</div>
                )}
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-bull tabular-nums">{data.new_highs ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">New Highs</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-bear tabular-nums">{data.new_lows ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">New Lows</div>
              </div>
            </Card>
          </div>

          {/* Divergence Warning */}
          {data.breadth_divergence && (
            <Card variant="glass">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0 text-yellow-500" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-500">Breadth Divergence Detected</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{data.divergence_description ?? "Market is making new highs but breadth is deteriorating — caution advised."}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Sector Breadth Table */}
          {data.sector_breadth?.length > 0 && (
            <Card title="Sector Breadth" icon={<BarChart3 size={14} />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Sector</th>
                      <th className="pb-3 pr-4 text-right">A/D Ratio</th>
                      <th className="pb-3 pr-4 text-right">% Above 200 SMA</th>
                      <th className="pb-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.sector_breadth.map((s: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{s.sector}</td>
                        <td className={cn("py-3 pr-4 text-right tabular-nums", s.ad_ratio > 1 ? "text-bull" : "text-bear")}>
                          {s.ad_ratio?.toFixed(2)}
                        </td>
                        <td className={cn("py-3 pr-4 text-right tabular-nums", s.pct_above_200sma > 50 ? "text-bull" : "text-bear")}>
                          {s.pct_above_200sma?.toFixed(0)}%
                        </td>
                        <td className="py-3">
                          <Badge variant={s.trend === "Bullish" ? "success" : s.trend === "Bearish" ? "danger" : "default"}>
                            {s.trend ?? "Neutral"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
