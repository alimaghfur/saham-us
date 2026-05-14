"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Search, Trophy, Star, Globe } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function ETFScreenerPage() {
  const [input, setInput] = useState("SPY, QQQ, VTI, IWM, DIA");
  const [symbols, setSymbols] = useState<string[]>(["SPY", "QQQ", "VTI"]);

  const { data, isLoading } = useQuery({
    queryKey: ["etf-compare", symbols],
    queryFn: () => api.etfCompare(symbols),
    enabled: symbols.length >= 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = input.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    if (parsed.length >= 1) setSymbols(parsed);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="ETF Screener"
        description="Compare ETFs side-by-side on expense ratios, returns, Sharpe, and risk metrics."
        badge="ETF"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Enter ETF symbols (e.g. SPY, QQQ, VTI)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Compare</button>
        </form>
      </Card>

      {isLoading && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} className="h-40" />)}</div>}

      {data && (
        <div className="space-y-6">
          {/* Recommendation */}
          {data.recommendation && (
            <Card variant="glass">
              <div className="flex items-start gap-3">
                <Trophy size={18} className="shrink-0 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold">Recommendation</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{data.recommendation}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Comparison Table */}
          {data.etfs?.length > 0 && (
            <Card title="ETF Comparison" icon={<BarChart3 size={14} />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Symbol</th>
                      <th className="pb-3 pr-4 text-right">Expense</th>
                      <th className="pb-3 pr-4 text-right">1Y Return</th>
                      <th className="pb-3 pr-4 text-right">Sharpe</th>
                      <th className="pb-3 pr-4 text-right">AUM</th>
                      <th className="pb-3 pr-4 text-right">Beta</th>
                      <th className="pb-3">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.etfs.map((etf: any) => (
                      <tr key={etf.symbol} className={cn("transition-colors hover:bg-muted/30", etf.best_performer && "bg-bull/5")}>
                        <td className="py-3 pr-4 font-semibold">
                          {etf.symbol}
                          {etf.best_performer && <Star size={12} className="ml-1 inline text-yellow-500" />}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{etf.expense_ratio != null ? `${(etf.expense_ratio * 100).toFixed(2)}%` : "—"}</td>
                        <td className={cn("py-3 pr-4 text-right tabular-nums", etf.return_1y > 0 ? "text-bull" : "text-bear")}>
                          {etf.return_1y != null ? `${(etf.return_1y * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{etf.sharpe?.toFixed(2) ?? "—"}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{etf.aum ? `$${(etf.aum / 1e9).toFixed(0)}B` : "—"}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{etf.beta?.toFixed(2) ?? "—"}</td>
                        <td className="py-3">
                          <Badge variant={etf.rating === "Strong Buy" ? "success" : etf.rating === "Sell" ? "danger" : "default"}>
                            {etf.rating ?? "—"}
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
