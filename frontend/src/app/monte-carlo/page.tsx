"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search, TrendingUp } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function MonteCarloPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [days, setDays] = useState(30);

  const mc = useQuery({
    queryKey: ["monte-carlo", searchSymbol, days],
    queryFn: () => api.monteCarlo(searchSymbol, 1000, days),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Monte Carlo Simulation" description="Simulasi 1000 skenario harga — lihat probabilitas profit, VaR, dan distribusi harga." badge="Quant" />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Simbol saham" className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-sm outline-none">
            <option value={7}>7 hari</option><option value={30}>30 hari</option><option value={60}>60 hari</option><option value={90}>90 hari</option><option value={180}>180 hari</option>
          </select>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90">Simulate</button>
        </form>
      </Card>

      {mc.isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({length:6}).map((_,i)=><SkeletonCard key={i} className="h-24"/>)}</div>}

      {mc.data && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Card><div className="text-center"><div className="text-lg font-bold">${formatPrice(mc.data.current_price)}</div><div className="text-[10px] text-muted-foreground">Harga Saat Ini</div></div></Card>
            <Card><div className="text-center"><div className={cn("text-lg font-bold", mc.data.expected_return_pct > 0 ? "text-bull" : "text-bear")}>{mc.data.expected_return_pct > 0 ? "+" : ""}{mc.data.expected_return_pct}%</div><div className="text-[10px] text-muted-foreground">Expected Return</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold text-bull">{mc.data.probability_profit}%</div><div className="text-[10px] text-muted-foreground">Probabilitas Profit</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold text-bull">{mc.data.probability_10pct_gain}%</div><div className="text-[10px] text-muted-foreground">P(Naik &gt;10%)</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold text-bear">{mc.data.probability_10pct_loss}%</div><div className="text-[10px] text-muted-foreground">P(Turun &gt;10%)</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold text-bear">{mc.data.var_95}%</div><div className="text-[10px] text-muted-foreground">VaR 95%</div></div></Card>
          </div>

          {/* Percentiles */}
          <Card title="Distribusi Harga Akhir" subtitle={`${mc.data.simulations} simulasi, ${mc.data.days_ahead} hari`}>
            <div className="grid gap-3 sm:grid-cols-5">
              {Object.entries(mc.data.percentiles || {}).map(([key, val]: [string, any]) => (
                <div key={key} className="rounded-xl border border-border/30 p-3 text-center">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">{key}</div>
                  <div className="mt-1 text-lg font-bold tabular">${formatPrice(val)}</div>
                  <div className={cn("text-xs tabular", val > mc.data.current_price ? "text-bull" : "text-bear")}>
                    {((val - mc.data.current_price) / mc.data.current_price * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Path summary */}
          <Card title="Proyeksi Path (Cone)" subtitle="Percentile bands over time">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/30 text-muted-foreground">
                  <th className="py-2 text-left">Hari</th><th>P5 (Worst)</th><th>P25</th><th>P50 (Median)</th><th>P75</th><th>P95 (Best)</th>
                </tr></thead>
                <tbody>
                  {mc.data.paths_summary?.map((p: any) => (
                    <tr key={p.day} className="border-b border-border/10">
                      <td className="py-1.5 font-medium">D+{p.day}</td>
                      <td className="text-center tabular text-bear">${formatPrice(p.p5)}</td>
                      <td className="text-center tabular">${formatPrice(p.p25)}</td>
                      <td className="text-center tabular font-bold">${formatPrice(p.p50)}</td>
                      <td className="text-center tabular">${formatPrice(p.p75)}</td>
                      <td className="text-center tabular text-bull">${formatPrice(p.p95)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground">
              <strong>Catatan:</strong> Monte Carlo menggunakan Geometric Brownian Motion berdasarkan volatilitas historis. Hasil menunjukkan distribusi probabilistik, bukan prediksi pasti. Max Drawdown rata-rata: {mc.data.max_drawdown_avg}%.
            </div>
          </Card>
        </div>
      )}

      {!searchSymbol && !mc.isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Activity size={28} className="text-primary" /></div>
            <h3 className="text-lg font-semibold">Monte Carlo Simulation</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Simulasi ribuan skenario untuk melihat probabilitas profit & risiko.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
