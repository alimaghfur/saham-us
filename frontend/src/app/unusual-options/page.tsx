"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, Search, TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function UnusualOptionsPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["unusual-options", searchSymbol],
    queryFn: () => api.unusualOptions(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Unusual Options Activity"
        description="Detect unusual volume spikes, sweeps, and large premium flow in the options market."
        badge="Options"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. AAPL, SPY, TSLA)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Scan</button>
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
                <div className="text-3xl font-bold tabular-nums">{data.put_call_ratio?.toFixed(2) ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Put/Call Ratio</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums text-primary">{data.iv_rank?.toFixed(0) ?? "—"}%</div>
                <div className="mt-1 text-xs text-muted-foreground">IV Rank</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-bull tabular-nums">{data.bullish_flow_pct?.toFixed(0) ?? "—"}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Bullish Flow</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-bear tabular-nums">{data.bearish_flow_pct?.toFixed(0) ?? "—"}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Bearish Flow</div>
              </div>
            </Card>
          </div>

          {data.net_premium != null && (
            <Card>
              <div className="text-center">
                <div className={cn("text-2xl font-bold tabular-nums", data.net_premium > 0 ? "text-bull" : "text-bear")}>
                  ${Math.abs(data.net_premium).toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Net Premium ({data.net_premium > 0 ? "Bullish" : "Bearish"})</div>
              </div>
            </Card>
          )}

          {/* Unusual Activities Table */}
          {data.unusual_activities?.length > 0 && (
            <Card title="Unusual Activity" icon={<Zap size={14} />} subtitle={`${data.unusual_activities.length} unusual trades`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Strike</th>
                      <th className="pb-3 pr-4">Expiry</th>
                      <th className="pb-3 pr-4 text-right">Vol Multiple</th>
                      <th className="pb-3 pr-4 text-right">Premium</th>
                      <th className="pb-3 pr-4">Sentiment</th>
                      <th className="pb-3">Trade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.unusual_activities.slice(0, 15).map((a: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 pr-4">
                          <Badge variant={a.contract_type === "Call" ? "success" : "danger"}>{a.contract_type}</Badge>
                        </td>
                        <td className="py-3 pr-4 tabular-nums">${a.strike}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{a.expiration}</td>
                        <td className="py-3 pr-4 text-right font-semibold tabular-nums">{a.volume_multiple?.toFixed(1)}x</td>
                        <td className="py-3 pr-4 text-right tabular-nums">${a.premium_total?.toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={a.sentiment === "Bullish" ? "success" : a.sentiment === "Bearish" ? "danger" : "default"}>{a.sentiment}</Badge>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{a.trade_type}</td>
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
              <Zap size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Unusual Options Activity</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter a symbol to detect unusual options flow and smart money positioning.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
