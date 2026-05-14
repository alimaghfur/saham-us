"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, Search, TrendingUp, TrendingDown, Zap, BarChart3 } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function EarningsPredictPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["earnings-predict", searchSymbol],
    queryFn: () => api.earningsPredict(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Earnings Prediction"
        description="ML-powered earnings beat/miss probability with contributing factors analysis."
        badge="AI"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. AAPL, MSFT, GOOGL)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Predict</button>
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
                <div className="text-4xl font-bold text-bull tabular-nums">{(data.beat_probability * 100).toFixed(0)}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Beat Probability</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-bear tabular-nums">{(data.miss_probability * 100).toFixed(0)}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Miss Probability</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.expected_surprise > 0 ? "text-bull" : "text-bear")}>
                  {data.expected_surprise > 0 ? "+" : ""}{(data.expected_surprise * 100).toFixed(1)}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Expected Surprise</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums">{(data.historical_beat_rate * 100).toFixed(0)}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Historical Beat Rate</div>
              </div>
            </Card>
          </div>

          {/* Recommendation & Implied Move */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Recommendation" icon={<Target size={14} />}>
              <div className="flex items-center gap-3">
                <Badge variant={data.recommendation?.includes("Buy") ? "success" : data.recommendation?.includes("Sell") ? "danger" : "default"} className="text-base px-4 py-2">
                  {data.recommendation ?? "Hold"}
                </Badge>
                {data.implied_move != null && (
                  <span className="text-sm text-muted-foreground">
                    Implied move: <span className="font-semibold">{data.implied_move > 0 ? "+" : ""}{(data.implied_move * 100).toFixed(1)}%</span>
                  </span>
                )}
              </div>
            </Card>
            <Card title="Confidence" icon={<BarChart3 size={14} />}>
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted/50">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(data.confidence ?? 0.5) * 100}%` }} />
                </div>
                <span className="text-sm font-semibold tabular-nums">{((data.confidence ?? 0.5) * 100).toFixed(0)}%</span>
              </div>
            </Card>
          </div>

          {/* Contributing Factors */}
          {data.factors?.length > 0 && (
            <Card title="Contributing Factors" icon={<Zap size={14} />}>
              <div className="space-y-2">
                {data.factors.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                    <span className="text-sm">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted/50">
                        <div className={cn("h-full rounded-full", f.impact > 0 ? "bg-bull" : "bg-bear")} style={{ width: `${Math.abs(f.impact) * 100}%` }} />
                      </div>
                      <Badge variant={f.impact > 0 ? "success" : "danger"}>
                        {f.impact > 0 ? "+" : ""}{(f.impact * 100).toFixed(0)}%
                      </Badge>
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
              <Target size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Earnings Prediction</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter a symbol to predict upcoming earnings beat/miss probability using machine learning.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
