"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Briefcase,
  DollarSign,
  Minus,
  PieChart,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
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

// --- Types ---
interface Transaction {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  date: string;
}

interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  totalCost: number;
}

// --- Local Storage ---
function getTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("portfolio_txns") ?? "[]");
  } catch {
    return [];
  }
}

function saveTransactions(txns: Transaction[]) {
  localStorage.setItem("portfolio_txns", JSON.stringify(txns));
}

// --- Compute Holdings from Transactions ---
function computeHoldings(txns: Transaction[]): Holding[] {
  const map: Record<string, { shares: number; totalCost: number }> = {};
  for (const tx of txns) {
    if (!map[tx.symbol]) map[tx.symbol] = { shares: 0, totalCost: 0 };
    if (tx.type === "buy") {
      map[tx.symbol].shares += tx.shares;
      map[tx.symbol].totalCost += tx.shares * tx.price;
    } else {
      map[tx.symbol].shares -= tx.shares;
      map[tx.symbol].totalCost -= tx.shares * tx.price;
    }
  }
  return Object.entries(map)
    .filter(([, v]) => v.shares > 0)
    .map(([symbol, v]) => ({
      symbol,
      shares: v.shares,
      avgCost: v.totalCost / v.shares,
      totalCost: v.totalCost,
    }));
}

export default function PortfolioPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    type: "buy" as "buy" | "sell",
    shares: "",
    price: "",
    date: new Date().toISOString().slice(0, 10),
  });

  React.useEffect(() => {
    setTransactions(getTransactions());
  }, []);

  const holdings = useMemo(() => computeHoldings(transactions), [transactions]);

  // Fetch live quotes for all holdings
  const symbols = holdings.map((h) => h.symbol);
  const quotes = useQuery({
    queryKey: ["portfolio-quotes", symbols.join(",")],
    queryFn: async () => {
      const results = await Promise.allSettled(
        symbols.map((s) => api.quote(s))
      );
      const map: Record<string, { price: number; change_percent: number }> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value.price != null) {
          map[symbols[i]] = {
            price: r.value.price,
            change_percent: r.value.change_percent ?? 0,
          };
        }
      });
      return map;
    },
    enabled: symbols.length > 0,
    refetchInterval: 60000,
  });

  const liveData = quotes.data ?? {};

  // Portfolio summary
  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    for (const h of holdings) {
      const live = liveData[h.symbol];
      const currentPrice = live?.price ?? h.avgCost;
      totalValue += h.shares * currentPrice;
      totalCost += h.totalCost;
    }
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalPnL, totalPnLPercent };
  }, [holdings, liveData]);

  function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    const sym = form.symbol.trim().toUpperCase();
    const shares = parseFloat(form.shares);
    const price = parseFloat(form.price);
    if (!sym || isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) return;

    const tx: Transaction = {
      id: Date.now().toString(),
      symbol: sym,
      type: form.type,
      shares,
      price,
      date: form.date,
    };
    const updated = [...transactions, tx];
    setTransactions(updated);
    saveTransactions(updated);
    setForm({ symbol: "", type: "buy", shares: "", price: "", date: new Date().toISOString().slice(0, 10) });
    setShowAdd(false);
  }

  function removeTransaction(id: string) {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    saveTransactions(updated);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="My Portfolio"
        description="Track your holdings, P&L, and portfolio performance."
        actions={
          <Button
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setShowAdd(!showAdd)}
          >
            Add Transaction
          </Button>
        }
      />

      {/* Add Transaction Form */}
      {showAdd && (
        <Card variant="glass" title="New Transaction" icon={<DollarSign size={14} />}>
          <form onSubmit={addTransaction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Symbol</label>
              <input
                type="text"
                placeholder="e.g. AAPL"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "buy" })}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                    form.type === "buy"
                      ? "bg-bull/20 text-bull ring-1 ring-bull/30"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "sell" })}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                    form.type === "sell"
                      ? "bg-bear/20 text-bear ring-1 ring-bear/30"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  Sell
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Shares</label>
              <input
                type="number"
                step="any"
                placeholder="100"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: e.target.value })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Price ($)</label>
              <input
                type="number"
                step="any"
                placeholder="150.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" type="submit" className="flex-1">
                Save
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}>
                <X size={14} />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Portfolio Summary */}
      {holdings.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Value"
            value={`$${formatPrice(summary.totalValue)}`}
            icon={<Briefcase size={16} />}
          />
          <StatCard
            label="Total Cost"
            value={`$${formatPrice(summary.totalCost)}`}
            icon={<DollarSign size={16} />}
          />
          <StatCard
            label="Total P&L"
            value={`${summary.totalPnL >= 0 ? "+" : ""}$${formatPrice(Math.abs(summary.totalPnL))}`}
            change={`${summary.totalPnLPercent >= 0 ? "+" : ""}${summary.totalPnLPercent.toFixed(2)}%`}
            changeType={summary.totalPnL >= 0 ? "bull" : "bear"}
            icon={summary.totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          />
          <StatCard
            label="Holdings"
            value={holdings.length.toString()}
            icon={<PieChart size={16} />}
          />
        </section>
      )}

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={28} />}
          title="No holdings yet"
          description="Add your first transaction to start tracking your portfolio performance."
          action={
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
              Add Transaction
            </Button>
          }
        />
      ) : (
        <Card title="Holdings" icon={<PieChart size={14} />} subtitle={`${holdings.length} positions`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4 text-right">Shares</th>
                  <th className="pb-3 pr-4 text-right">Avg Cost</th>
                  <th className="pb-3 pr-4 text-right">Current</th>
                  <th className="pb-3 pr-4 text-right">Value</th>
                  <th className="pb-3 pr-4 text-right">P&L</th>
                  <th className="pb-3 text-right">P&L %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {holdings.map((h) => {
                  const live = liveData[h.symbol];
                  const currentPrice = live?.price ?? h.avgCost;
                  const value = h.shares * currentPrice;
                  const pnl = value - h.totalCost;
                  const pnlPct = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;
                  return (
                    <tr key={h.symbol} className="transition-colors hover:bg-muted/30">
                      <td className="py-3 pr-4">
                        <Link href={`/stock/${h.symbol}`} className="font-semibold text-primary hover:underline">
                          {h.symbol}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-right tabular">{h.shares}</td>
                      <td className="py-3 pr-4 text-right tabular text-muted-foreground">
                        ${formatPrice(h.avgCost)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular">
                        ${formatPrice(currentPrice)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular">
                        ${formatPrice(value)}
                      </td>
                      <td className={cn("py-3 pr-4 text-right tabular font-medium", priceChangeClass(pnl))}>
                        {pnl >= 0 ? "+" : ""}${formatPrice(Math.abs(pnl))}
                      </td>
                      <td className="py-3 text-right">
                        <ChangeBadge value={pnlPct} showIcon />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Allocation Chart (Simple Bar) */}
      {holdings.length > 0 && (
        <Card title="Portfolio Allocation" icon={<PieChart size={14} />}>
          <div className="space-y-3">
            {holdings
              .sort((a, b) => {
                const aVal = a.shares * (liveData[a.symbol]?.price ?? a.avgCost);
                const bVal = b.shares * (liveData[b.symbol]?.price ?? b.avgCost);
                return bVal - aVal;
              })
              .map((h) => {
                const currentPrice = liveData[h.symbol]?.price ?? h.avgCost;
                const value = h.shares * currentPrice;
                const pct = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
                return (
                  <div key={h.symbol} className="flex items-center gap-3">
                    <span className="w-12 text-xs font-semibold">{h.symbol}</span>
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-20 text-right text-xs tabular text-muted-foreground">
                      {pct.toFixed(1)}% · ${formatLargeNumber(value)}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <Card title="Recent Transactions" subtitle={`${transactions.length} total`}>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            <div className="space-y-1">
              {[...transactions].reverse().slice(0, 20).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={tx.type === "buy" ? "bull" : "bear"}>
                      {tx.type.toUpperCase()}
                    </Badge>
                    <div>
                      <span className="text-xs font-semibold">{tx.symbol}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {tx.shares} shares @ ${formatPrice(tx.price)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{tx.date}</span>
                    <button
                      onClick={() => removeTransaction(tx.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-bear/10 hover:text-bear"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
