"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search, Shield, Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function DarkPoolPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dark-pool", searchSymbol],
    queryFn: () => api.darkPool(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dark Pool Flow"
        description="Track institutional dark pool activity, short volume, and whale accumulation signals."
        badge="Institutional"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. AAPL, MSFT, NVDA)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Analyze</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"].map(s => (
            <button key={s} onClick={() => { setSymbol(s); setSearchSymbol(s); }} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5">{s}</button>
          ))}
        </div>
      </Card>

      {isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>}

      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums text-primary">{data.dark_pool_volume_pct?.toFixed(1) ?? "—"}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Dark Pool Volume</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.short_volume_ratio > 0.5 ? "text-bear" : "text-bull")}>
                  {(data.short_volume_ratio * 100).toFixed(1)}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Short Volume Ratio</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.accumulation_score > 60 ? "text-bull" : data.accumulation_score < 40 ? "text-bear" : "text-muted-foreground")}>
                  {data.accumulation_score?.toFixed(0) ?? "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Accumulation Score</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <Badge variant={data.smart_money_signal === "Bullish" ? "success" : data.smart_money_signal === "Bearish" ? "danger" : "default"} className="text-sm">
                  {data.smart_money_signal ?? "Neutral"}
                </Badge>
                <div className="mt-2 text-xs text-muted-foreground">Smart Money Signal</div>
              </div>
            </Card>
          </div>

          {/* Whale Alerts */}
          {data.whale_alerts?.length > 0 && (
            <Card title="Whale Alerts" icon={<AlertTriangle size={14} />}>
              <div className="space-y-2">
                {data.whale_alerts.slice(0, 8).map((w: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={w.type === "Buy" ? "success" : "danger"}>{w.type}</Badge>
                      <span className="text-sm">{w.description ?? `${w.shares?.toLocaleString()} shares`}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">${w.value?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Institutional Holders */}
          {data.top_holders?.length > 0 && (
            <Card title="Top Institutional Holders" icon={<Shield size={14} />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Institution</th>
                      <th className="pb-3 pr-4 text-right">Shares</th>
                      <th className="pb-3 pr-4 text-right">Value</th>
                      <th className="pb-3 text-right">% Portfolio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.top_holders.slice(0, 10).map((h: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{h.name}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{h.shares?.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">${h.value?.toLocaleString()}</td>
                        <td className="py-3 text-right tabular-nums text-muted-foreground">{h.pct_portfolio?.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {!searchSymbol && !isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Eye size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Dark Pool Flow</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter a symbol to track dark pool volume, short interest, and institutional accumulation.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
