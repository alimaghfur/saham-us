"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  DollarSign,
  Minus,
  PieChart,
  Plus,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { formatLargeNumber, formatPrice, priceChangeClass } from "@/lib/format";
import { cn } from "@/lib/cn";

const INITIAL_CASH = 100000;

interface PaperTrade {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  date: string;
}

function getPaperTrades(): PaperTrade[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("paper_trades") ?? "[]"); } catch { return []; }
}
function savePaperTrades(t: PaperTrade[]) { localStorage.setItem("paper_trades", JSON.stringify(t)); }

function computeHoldings(trades: PaperTrade[]) {
  const map: Record<string, { shares: number; cost: number }> = {};
  let cashUsed = 0;
  for (const t of trades) {
    if (!map[t.symbol]) map[t.symbol] = { shares: 0, cost: 0 };
    if (t.type === "buy") {
      map[t.symbol].shares += t.shares;
      map[t.symbol].cost += t.shares * t.price;
      cashUsed += t.shares * t.price;
    } else {
      map[t.symbol].shares -= t.shares;
      map[t.symbol].cost -= t.shares * t.price;
      cashUsed -= t.shares * t.price;
    }
  }
  const holdings = Object.entries(map)
    .filter(([, v]) => v.shares > 0)
    .map(([symbol, v]) => ({ symbol, shares: v.shares, avgCost: v.cost / v.shares, totalCost: v.cost }));
  return { holdings, cashUsed };
}

export default function PaperTradingPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [showBuy, setShowBuy] = useState(false);
  const [form, setForm] = useState({ symbol: "", shares: "", price: "" });

  React.useEffect(() => { setTrades(getPaperTrades()); }, []);

  const { holdings, cashUsed } = useMemo(() => computeHoldings(trades), [trades]);
  const cashRemaining = INITIAL_CASH - cashUsed;

  const symbols = holdings.map((h) => h.symbol);
  const quotes = useQuery({
    queryKey: ["paper-quotes", symbols.join(",")],
    queryFn: async () => {
      const results = await Promise.allSettled(symbols.map((s) => api.quote(s)));
      const map: Record<string, number> = {};
      results.forEach((r, i) => { if (r.status === "fulfilled" && r.value.price) map[symbols[i]] = r.value.price; });
      return map;
    },
    enabled: symbols.length > 0,
    refetchInterval: 60000,
  });

  const liveData = quotes.data ?? {};
  const portfolioValue = useMemo(() => {
    let val = cashRemaining;
    for (const h of holdings) {
      val += h.shares * (liveData[h.symbol] ?? h.avgCost);
    }
    return val;
  }, [holdings, liveData, cashRemaining]);

  const totalPnL = portfolioValue - INITIAL_CASH;
  const totalPnLPct = (totalPnL / INITIAL_CASH) * 100;

  function addTrade(e: React.FormEvent) {
    e.preventDefault();
    const sym = form.symbol.trim().toUpperCase();
    const shares = parseFloat(form.shares);
    const price = parseFloat(form.price);
    if (!sym || isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) return;
    if (shares * price > cashRemaining) { alert("Not enough cash!"); return; }
    const trade: PaperTrade = { id: Date.now().toString(), symbol: sym, type: "buy", shares, price, date: new Date().toISOString().slice(0, 10) };
    const updated = [...trades, trade];
    setTrades(updated);
    savePaperTrades(updated);
    setForm({ symbol: "", shares: "", price: "" });
    setShowBuy(false);
  }

  function sellAll(symbol: string) {
    const h = holdings.find((x) => x.symbol === symbol);
    if (!h) return;
    const price = liveData[symbol] ?? h.avgCost;
    const trade: PaperTrade = { id: Date.now().toString(), symbol, type: "sell", shares: h.shares, price, date: new Date().toISOString().slice(0, 10) };
    const updated = [...trades, trade];
    setTrades(updated);
    savePaperTrades(updated);
  }

  function resetPortfolio() {
    if (confirm("Reset paper trading? Semua data akan dihapus.")) {
      setTrades([]);
      savePaperTrades([]);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Paper Trading"
        description="Latihan trading dengan uang virtual $100,000. Tidak ada risiko, belajar dulu!"
        badge="Virtual"
        actions={
          <div className="flex gap-2">
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowBuy(true)}>Beli Saham</Button>
            <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={resetPortfolio}>Reset</Button>
          </div>
        }
      />

      {/* Summary */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Portfolio Value" value={`$${formatPrice(portfolioValue)}`} icon={<DollarSign size={16} />} />
        <StatCard
          label="Total P&L"
          value={`${totalPnL >= 0 ? "+" : ""}$${formatPrice(Math.abs(totalPnL))}`}
          change={`${totalPnLPct >= 0 ? "+" : ""}${totalPnLPct.toFixed(2)}%`}
          changeType={totalPnL >= 0 ? "bull" : "bear"}
          icon={totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <StatCard label="Cash Available" value={`$${formatPrice(cashRemaining)}`} icon={<DollarSign size={16} />} />
        <StatCard label="Positions" value={holdings.length.toString()} icon={<PieChart size={16} />} />
      </section>

      {/* Buy Form */}
      {showBuy && (
        <Card variant="glass" title="Beli Saham (Virtual)" icon={<Plus size={14} />}>
          <form onSubmit={addTrade} className="grid gap-3 sm:grid-cols-4">
            <input type="text" placeholder="Ticker (AAPL)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50" />
            <input type="number" placeholder="Jumlah saham" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50" />
            <input type="number" step="0.01" placeholder="Harga ($)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">Beli</Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowBuy(false)}><X size={14} /></Button>
            </div>
          </form>
          <p className="mt-2 text-[10px] text-muted-foreground">Cash tersedia: ${formatPrice(cashRemaining)}</p>
        </Card>
      )}

      {/* Holdings */}
      {holdings.length > 0 ? (
        <Card title="Holdings" icon={<PieChart size={14} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4 text-right">Shares</th>
                  <th className="pb-3 pr-4 text-right">Avg Cost</th>
                  <th className="pb-3 pr-4 text-right">Current</th>
                  <th className="pb-3 pr-4 text-right">P&L</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {holdings.map((h) => {
                  const current = liveData[h.symbol] ?? h.avgCost;
                  const pnl = (current - h.avgCost) * h.shares;
                  const pnlPct = ((current - h.avgCost) / h.avgCost) * 100;
                  return (
                    <tr key={h.symbol} className="hover:bg-muted/20">
                      <td className="py-3 pr-4 font-semibold text-primary">{h.symbol}</td>
                      <td className="py-3 pr-4 text-right tabular">{h.shares}</td>
                      <td className="py-3 pr-4 text-right tabular text-muted-foreground">${formatPrice(h.avgCost)}</td>
                      <td className="py-3 pr-4 text-right tabular">${formatPrice(current)}</td>
                      <td className={cn("py-3 pr-4 text-right tabular font-medium", pnl >= 0 ? "text-bull" : "text-bear")}>
                        {pnl >= 0 ? "+" : ""}${formatPrice(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => sellAll(h.symbol)}>Jual</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<Trophy size={28} />}
          title="Mulai Paper Trading!"
          description="Beli saham pertama Anda dengan uang virtual. Tidak ada risiko — ini simulasi untuk belajar."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setShowBuy(true)}>Beli Saham Pertama</Button>}
        />
      )}

      {/* Tips */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">Tips Paper Trading</h3>
        <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Perlakukan seperti uang sungguhan — jangan asal beli</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Catat alasan setiap pembelian — review nanti</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Coba berbagai strategi dan bandingkan hasilnya</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Target: profit konsisten 3 bulan sebelum pakai uang real</li>
        </ul>
      </div>
    </div>
  );
}
