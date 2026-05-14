"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Search, TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function PatternsPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["patterns", searchSymbol],
    queryFn: () => api.patterns(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Pattern Recognition"
        description="AI-detected chart patterns with entry, target, and stop-loss levels."
        badge="Technical"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. AAPL, TSLA, NVDA)"
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

      {isLoading && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="text-center">
                <Badge variant={data.overall_bias === "Bullish" ? "success" : data.overall_bias === "Bearish" ? "danger" : "default"} className="text-base px-4 py-2">
                  {data.overall_bias ?? "Neutral"}
                </Badge>
                <div className="mt-2 text-xs text-muted-foreground">Overall Bias</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-lg font-semibold">{data.dominant_pattern?.pattern_name ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Dominant Pattern</div>
                {data.dominant_pattern?.confidence != null && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${data.dominant_pattern.confidence}%` }} />
                    </div>
                    <span className="text-xs tabular-nums">{data.dominant_pattern.confidence.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Patterns List */}
          {data.patterns?.length > 0 && (
            <Card title="Detected Patterns" icon={<Crosshair size={14} />} subtitle={`${data.patterns.length} patterns found`}>
              <div className="space-y-3">
                {data.patterns.map((p: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-border/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.pattern_name}</span>
                        <Badge variant={p.direction === "bullish" ? "success" : p.direction === "bearish" ? "danger" : "default"}>
                          {p.direction}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{p.confidence?.toFixed(0)}% confidence</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
                      <div className={cn("h-full rounded-full", p.direction === "bullish" ? "bg-bull" : "bg-bear")} style={{ width: `${p.confidence}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-4 text-xs">
                      <div><span className="text-muted-foreground">Entry</span><div className="font-semibold tabular-nums">${formatPrice(p.entry_price)}</div></div>
                      <div><span className="text-muted-foreground">Target</span><div className="font-semibold text-bull tabular-nums">${formatPrice(p.target_price)}</div></div>
                      <div><span className="text-muted-foreground">Stop</span><div className="font-semibold text-bear tabular-nums">${formatPrice(p.stop_loss)}</div></div>
                      <div><span className="text-muted-foreground">R:R</span><div className="font-semibold tabular-nums">{p.risk_reward?.toFixed(1) ?? "—"}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {!searchSymbol && !isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Crosshair size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Technical Pattern Recognition</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter a symbol to detect chart patterns with AI-powered confidence scoring.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
