"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Search } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function OptionsPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [expiry, setExpiry] = useState(30);

  const options = useQuery({
    queryKey: ["options", searchSymbol, expiry],
    queryFn: () => api.optionsChain(searchSymbol, expiry),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Options Chain & Greeks" description="Data opsi lengkap — Delta, Gamma, Theta, Vega, IV Smile, Max Pain." badge="Pro" />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Simbol saham (AAPL, TSLA, SPY)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}
            className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-sm outline-none">
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
            <option value={60}>60 hari</option>
            <option value={90}>90 hari</option>
          </select>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90">Load</button>
        </form>
      </Card>

      {options.isLoading && <SkeletonCard className="h-64" />}

      {options.data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><div className="text-center"><div className="text-lg font-bold">${formatPrice(options.data.stock_price)}</div><div className="text-[10px] text-muted-foreground">Stock Price</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold">${formatPrice(options.data.max_pain)}</div><div className="text-[10px] text-muted-foreground">Max Pain</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold">{options.data.put_call_ratio}</div><div className="text-[10px] text-muted-foreground">Put/Call Ratio</div></div></Card>
            <Card><div className="text-center"><div className="text-lg font-bold">{options.data.iv_rank}%</div><div className="text-[10px] text-muted-foreground">IV Rank</div></div></Card>
          </div>

          {/* Calls Table */}
          <Card title="CALLS" icon={<BarChart3 size={14}/>}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/30 text-muted-foreground">
                  <th className="py-2 text-left">Strike</th><th>Price</th><th>IV%</th><th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th><th>Vol</th><th>OI</th>
                </tr></thead>
                <tbody>
                  {options.data.calls?.slice(0, 17).map((c: any) => (
                    <tr key={c.strike} className={cn("border-b border-border/10 hover:bg-muted/30", c.moneyness === "ATM" && "bg-primary/5")}>
                      <td className="py-1.5 font-medium">${c.strike} <span className="text-[9px] text-muted-foreground">{c.moneyness}</span></td>
                      <td className="text-center tabular">${c.price}</td>
                      <td className="text-center tabular">{c.iv}%</td>
                      <td className="text-center tabular">{c.greeks.delta}</td>
                      <td className="text-center tabular">{c.greeks.gamma}</td>
                      <td className="text-center tabular text-bear">{c.greeks.theta}</td>
                      <td className="text-center tabular">{c.greeks.vega}</td>
                      <td className="text-center tabular">{c.volume}</td>
                      <td className="text-center tabular">{c.open_interest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Puts Table */}
          <Card title="PUTS" icon={<BarChart3 size={14}/>}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/30 text-muted-foreground">
                  <th className="py-2 text-left">Strike</th><th>Price</th><th>IV%</th><th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th><th>Vol</th><th>OI</th>
                </tr></thead>
                <tbody>
                  {options.data.puts?.slice(0, 17).map((p: any) => (
                    <tr key={p.strike} className={cn("border-b border-border/10 hover:bg-muted/30", p.moneyness === "ATM" && "bg-primary/5")}>
                      <td className="py-1.5 font-medium">${p.strike} <span className="text-[9px] text-muted-foreground">{p.moneyness}</span></td>
                      <td className="text-center tabular">${p.price}</td>
                      <td className="text-center tabular">{p.iv}%</td>
                      <td className="text-center tabular">{p.greeks.delta}</td>
                      <td className="text-center tabular">{p.greeks.gamma}</td>
                      <td className="text-center tabular text-bear">{p.greeks.theta}</td>
                      <td className="text-center tabular">{p.greeks.vega}</td>
                      <td className="text-center tabular">{p.volume}</td>
                      <td className="text-center tabular">{p.open_interest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!searchSymbol && !options.isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><BarChart3 size={28} className="text-primary" /></div>
            <h3 className="text-lg font-semibold">Options Chain</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Lihat data opsi lengkap dengan Greeks, IV Smile, dan Max Pain.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
