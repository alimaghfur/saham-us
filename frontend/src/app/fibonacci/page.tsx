"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Search } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function FibonacciPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const fib = useQuery({
    queryKey: ["fibonacci", searchSymbol],
    queryFn: () => api.fibonacci(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Fibonacci Retracement" description="Auto-detect swing high/low dan hitung level Fibonacci secara otomatis." badge="TA" />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Simbol saham" className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90">Analyze</button>
        </form>
      </Card>

      {fib.isLoading && <SkeletonCard className="h-64" />}

      {fib.data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><div className="text-center"><div className="text-lg font-bold">${formatPrice(fib.data.current_price)}</div><div className="text-[10px] text-muted-foreground">Current Price</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold text-bull">${formatPrice(fib.data.swing_high)}</div><div className="text-[10px] text-muted-foreground">Swing High</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold text-bear">${formatPrice(fib.data.swing_low)}</div><div className="text-[10px] text-muted-foreground">Swing Low</div></div></Card>
            <Card><div className="text-center"><Badge variant={fib.data.trend === "uptrend" ? "success" : "danger"} className="text-sm">{fib.data.trend.toUpperCase()}</Badge><div className="mt-1 text-[10px] text-muted-foreground">Trend</div></div></Card>
          </div>

          {/* Fibonacci Levels */}
          <Card title="Fibonacci Levels" icon={<GitBranch size={14} />}>
            <div className="space-y-2">
              {fib.data.levels?.map((lv: any, i: number) => {
                const pctFromPrice = ((lv.price - fib.data.current_price) / fib.data.current_price * 100);
                const isNearCurrent = Math.abs(pctFromPrice) < 2;
                return (
                  <div key={i} className={cn("flex items-center justify-between rounded-xl px-4 py-3 transition-colors", isNearCurrent ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-3 w-3 rounded-full", lv.type === "support" ? "bg-bull" : "bg-bear")} />
                      <div>
                        <span className="text-sm font-bold">{lv.level}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground uppercase">{lv.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold tabular">${formatPrice(lv.price)}</span>
                      <span className={cn("text-xs tabular font-medium", pctFromPrice > 0 ? "text-bull" : "text-bear")}>
                        {pctFromPrice > 0 ? "+" : ""}{pctFromPrice.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* Current price marker */}
              <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm font-bold text-primary">Harga Sekarang</span>
                </div>
                <span className="text-sm font-bold tabular text-primary">${formatPrice(fib.data.current_price)}</span>
              </div>
            </div>
          </Card>

          {/* Key Levels */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Nearest Support</div>
                <div className="mt-1 text-2xl font-bold text-bull">${formatPrice(fib.data.nearest_support)}</div>
                <div className="text-xs text-muted-foreground">({((fib.data.nearest_support - fib.data.current_price) / fib.data.current_price * 100).toFixed(1)}% dari harga)</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Nearest Resistance</div>
                <div className="mt-1 text-2xl font-bold text-bear">${formatPrice(fib.data.nearest_resistance)}</div>
                <div className="text-xs text-muted-foreground">(+{((fib.data.nearest_resistance - fib.data.current_price) / fib.data.current_price * 100).toFixed(1)}% dari harga)</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {!searchSymbol && !fib.isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><GitBranch size={28} className="text-primary" /></div>
            <h3 className="text-lg font-semibold">Fibonacci Retracement</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Auto-detect swing points dan level fibonacci (23.6%, 38.2%, 50%, 61.8%, 78.6%).</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["AAPL","NVDA","TSLA","AMZN","META"].map(s=>(
                <button key={s} onClick={()=>{setSymbol(s);setSearchSymbol(s);}} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5">{s}</button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
