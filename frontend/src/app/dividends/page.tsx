"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Search, TrendingUp, Star, CalendarDays, LineChart } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function DividendsPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dividends", searchSymbol],
    queryFn: () => api.dividends(searchSymbol),
    enabled: !!searchSymbol,
  });

  const { data: drip } = useQuery({
    queryKey: ["drip-simulate", searchSymbol],
    queryFn: () => api.dripSimulate(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dividends & DRIP"
        description="Dividend analysis with yield, payout ratio, growth rate, and DRIP compound simulation."
        badge="Income"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. JNJ, KO, PG, VZ)"
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

      {isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}</div>}

      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-bull tabular-nums">{data.current_yield != null ? `${(data.current_yield).toFixed(2)}%` : "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Current Yield</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold tabular-nums">${data.current_annual_dividend?.toFixed(2) ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Annual Dividend</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-2xl font-bold tabular-nums", data.payout_ratio > 80 ? "text-bear" : "text-bull")}>
                  {data.payout_ratio != null ? `${(data.payout_ratio).toFixed(0)}%` : "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Payout Ratio</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary tabular-nums">{data.growth_rate != null ? `${(data.dividend_growth_rate_5y).toFixed(1)}%` : "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Growth Rate</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-lg font-semibold">{data.next_ex_date ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Next Ex-Date</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                {data.is_dividend_aristocrat ? (
                  <Badge variant="success" className="text-sm"><Star size={12} className="mr-1 inline" />Aristocrat</Badge>
                ) : (
                  <Badge variant="default">Standard</Badge>
                )}
                <div className="mt-2 text-xs text-muted-foreground">Status</div>
              </div>
            </Card>
          </div>

          {/* DRIP Simulation */}
          {drip && (
            <Card title="DRIP Simulation (20yr)" icon={<LineChart size={14} />} subtitle="$10k initial + $500/mo">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center rounded-xl border border-border/30 p-4">
                  <div className="text-2xl font-bold text-bull tabular-nums">${drip.final_portfolio_value?.toLocaleString() ?? "—"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Final Value</div>
                </div>
                <div className="text-center rounded-xl border border-border/30 p-4">
                  <div className="text-2xl font-bold tabular-nums">{drip.total_return != null ? `${(drip.total_return_pct).toFixed(0)}%` : "—"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Total Return</div>
                </div>
                <div className="text-center rounded-xl border border-border/30 p-4">
                  <div className="text-2xl font-bold text-primary tabular-nums">{drip.annualized_return != null ? `${(drip.annualized_return_pct).toFixed(1)}%` : "—"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Annualized Return</div>
                </div>
              </div>
            </Card>
          )}

          {/* Dividend History */}
          {data.history?.length > 0 && (
            <Card title="Dividend History" icon={<CalendarDays size={14} />}>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4 text-right">Amount</th>
                      <th className="pb-3 text-right">Yield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.history.slice(0, 20).map((h: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-muted/30">
                        <td className="py-2 pr-4 text-xs text-muted-foreground">{h.date}</td>
                        <td className="py-2 pr-4 text-right tabular-nums font-medium">${h.amount?.toFixed(4)}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{h.yield != null ? `${(h.yield * 100).toFixed(2)}%` : "—"}</td>
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
              <Calendar size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Dividends & DRIP</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter a symbol to view dividend yield, history, and compound growth simulation.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
