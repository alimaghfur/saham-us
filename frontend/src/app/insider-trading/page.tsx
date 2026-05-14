"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search, TrendingUp, TrendingDown, ShieldAlert, Gauge } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function InsiderTradingPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["insider-trading", searchSymbol],
    queryFn: () => api.insiderTrading(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Insider Trading"
        description="Track insider buys & sells — detect cluster buying and smart money moves."
        badge="Pro"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. AAPL, MSFT, NVDA)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Track</button>
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
          {/* Signal Gauge */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.signal_strength > 0.2 ? "text-bull" : data.signal_strength < -0.2 ? "text-bear" : "text-muted-foreground")}>
                  {data.signal_strength?.toFixed(2) ?? "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Signal Strength</div>
                <Badge variant={data.signal_label?.includes("Bull") ? "success" : data.signal_label?.includes("Bear") ? "danger" : "default"} className="mt-2">
                  {data.signal_label ?? "Neutral"}
                </Badge>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <Badge variant={data.cluster_buy ? "success" : "default"} className="text-sm">
                  {data.cluster_buy ? "YES" : "NO"}
                </Badge>
                <div className="mt-2 text-xs text-muted-foreground">Cluster Buy</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold tabular-nums">${data.net_value_30d?.toLocaleString() ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Net Value 30d</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-bull tabular-nums">{data.buy_count ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">Buys</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-bear tabular-nums">{data.sell_count ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">Sells</div>
              </div>
            </Card>
          </div>

          {/* Recent Transactions */}
          {data.transactions?.length > 0 && (
            <Card title="Recent Transactions" icon={<Eye size={14} />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Title</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4 text-right">Shares</th>
                      <th className="pb-3 pr-4 text-right">Price</th>
                      <th className="pb-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.transactions.slice(0, 15).map((t: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{t.name}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{t.title}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={t.type === "Buy" ? "success" : "danger"}>{t.type}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{t.shares?.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">${formatPrice(t.price)}</td>
                        <td className="py-3 text-right text-xs text-muted-foreground">{t.date}</td>
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
              <ShieldAlert size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Insider Trading Tracker</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter a symbol to track insider buying and selling activity with signal analysis.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
