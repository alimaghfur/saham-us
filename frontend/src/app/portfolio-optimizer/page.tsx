"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Search, BarChart3, Calculator, Target } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function PortfolioOptimizerPage() {
  const [input, setInput] = useState("AAPL, MSFT, NVDA, GOOGL, AMZN");
  const [symbols, setSymbols] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["portfolio-optimize", symbols],
    queryFn: () => api.portfolioOptimize(symbols),
    enabled: symbols.length >= 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = input.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    if (parsed.length >= 2) setSymbols(parsed);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Portfolio Optimizer"
        description="Find optimal portfolio weights using Modern Portfolio Theory — maximize Sharpe or minimize variance."
        badge="Quant"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Enter symbols comma-separated (e.g. AAPL, MSFT, NVDA)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Optimize</button>
        </form>
      </Card>

      {isLoading && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-40" />)}</div>}

      {data && (
        <div className="space-y-6">
          {/* Max Sharpe */}
          {data.max_sharpe_portfolio && (
            <Card title="Max Sharpe Portfolio" icon={<Target size={14} />} subtitle={`Sharpe: ${data.max_sharpe_portfolio.sharpe_ratio?.toFixed(2)} | Return: ${(data.max_sharpe_portfolio.expected_return * 100).toFixed(1)}% | Risk: ${(data.max_sharpe_portfolio.volatility * 100).toFixed(1)}%`}>
              <div className="space-y-2">
                {data.max_sharpe_portfolio.weights && Object.entries(data.max_sharpe_portfolio.weights).map(([sym, weight]: [string, any]) => (
                  <div key={sym} className="flex items-center gap-3">
                    <span className="w-14 text-sm font-semibold">{sym}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${weight * 100}%` }} />
                    </div>
                    <span className="w-14 text-right text-sm tabular-nums">{(weight * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Min Variance */}
          {data.min_variance_portfolio && (
            <Card title="Min Variance Portfolio" icon={<Calculator size={14} />} subtitle={`Sharpe: ${data.min_variance_portfolio.sharpe_ratio?.toFixed(2)} | Return: ${(data.min_variance_portfolio.expected_return * 100).toFixed(1)}% | Risk: ${(data.min_variance_portfolio.volatility * 100).toFixed(1)}%`}>
              <div className="space-y-2">
                {data.min_variance_portfolio.weights && Object.entries(data.min_variance_portfolio.weights).map(([sym, weight]: [string, any]) => (
                  <div key={sym} className="flex items-center gap-3">
                    <span className="w-14 text-sm font-semibold">{sym}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${weight * 100}%` }} />
                    </div>
                    <span className="w-14 text-right text-sm tabular-nums">{(weight * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Correlation Matrix */}
          {data.correlation_matrix && (
            <Card title="Correlation Matrix" icon={<BarChart3 size={14} />}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="pb-2 pr-3 text-left font-semibold"></th>
                      {symbols.map(s => <th key={s} className="pb-2 px-2 text-center font-semibold">{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map((row, ri) => (
                      <tr key={row} className="border-b border-border/10">
                        <td className="py-2 pr-3 font-semibold">{row}</td>
                        {symbols.map((col) => {
                          const val = data.correlation_matrix?.[row]?.[col] ?? 0;
                          return (
                            <td key={col} className={cn("py-2 px-2 text-center tabular-nums", val > 0.7 ? "text-bear" : val < 0.3 ? "text-bull" : "text-muted-foreground")}>
                              {typeof val === "number" ? val.toFixed(2) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Individual Stats */}
          {data.individual_stats?.length > 0 && (
            <Card title="Individual Asset Stats" icon={<PieChart size={14} />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Symbol</th>
                      <th className="pb-3 pr-4 text-right">Return</th>
                      <th className="pb-3 pr-4 text-right">Volatility</th>
                      <th className="pb-3 text-right">Sharpe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.individual_stats.map((s: any) => (
                      <tr key={s.symbol} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 pr-4 font-semibold">{s.symbol}</td>
                        <td className={cn("py-3 pr-4 text-right tabular-nums", s.expected_return > 0 ? "text-bull" : "text-bear")}>{(s.expected_return * 100).toFixed(1)}%</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{(s.volatility * 100).toFixed(1)}%</td>
                        <td className="py-3 text-right tabular-nums">{s.sharpe_ratio?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {symbols.length < 2 && !isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <PieChart size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Portfolio Optimizer</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter at least 2 symbols (comma-separated) to find optimal portfolio weights.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
