"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BarChart3,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Card } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice, formatPercent, formatRatio } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRESETS = [
  { name: "FAANG", symbols: ["META", "AAPL", "AMZN", "NFLX", "GOOGL"] },
  { name: "Banks", symbols: ["JPM", "BAC", "GS", "MS", "C"] },
  { name: "Chips", symbols: ["NVDA", "AMD", "INTC", "AVGO", "QCOM"] },
];

interface MetricDef {
  key: string;
  label: string;
  format: (v: any) => string;
  higherIsBetter: boolean;
}

const METRICS: MetricDef[] = [
  { key: "price", label: "Price", format: (v) => `$${formatPrice(v)}`, higherIsBetter: false },
  { key: "pe_ratio", label: "P/E", format: (v) => formatRatio(v), higherIsBetter: false },
  { key: "pb_ratio", label: "P/B", format: (v) => formatRatio(v), higherIsBetter: false },
  { key: "roe", label: "ROE", format: (v) => v != null ? formatPercent(v) : "—", higherIsBetter: true },
  { key: "profit_margin", label: "Margin", format: (v) => v != null ? formatPercent(v) : "—", higherIsBetter: true },
  { key: "revenue_growth", label: "Growth", format: (v) => v != null ? formatPercent(v) : "—", higherIsBetter: true },
  { key: "dividend_yield", label: "Dividend", format: (v) => v != null ? formatPercent(v) : "—", higherIsBetter: true },
  { key: "rsi", label: "RSI", format: (v) => v != null ? v.toFixed(1) : "—", higherIsBetter: false },
  { key: "trend", label: "Trend", format: (v) => v ?? "—", higherIsBetter: true },
  { key: "score", label: "Score", format: (v) => v != null ? `${v}` : "—", higherIsBetter: true },
];

function getScoreColor(score: number): string {
  if (score >= 75) return "rgb(34, 197, 94)";
  if (score >= 60) return "rgb(132, 204, 22)";
  if (score >= 45) return "rgb(245, 158, 11)";
  if (score >= 30) return "rgb(249, 115, 22)";
  return "rgb(239, 68, 68)";
}

export default function ComparePage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const comparison = useQuery({
    queryKey: ["compare-peers", symbols],
    queryFn: () => api.comparePeers(symbols),
    enabled: symbols.length >= 2,
  });

  const data = comparison.data;

  function addSymbol() {
    const sym = input.trim().toUpperCase();
    if (sym && symbols.length < 5 && !symbols.includes(sym)) {
      setSymbols([...symbols, sym]);
    }
    setInput("");
  }

  function removeSymbol(sym: string) {
    setSymbols(symbols.filter((s) => s !== sym));
  }

  function applyPreset(preset: typeof PRESETS[number]) {
    setSymbols(preset.symbols);
  }

  function getBestWorst(metric: MetricDef, items: any[]) {
    const values = items
      .map((item) => ({ symbol: item.symbol, value: item[metric.key] }))
      .filter((v) => v.value != null && Number.isFinite(v.value));

    if (values.length === 0) return { best: null, worst: null };

    let best: string | null = null;
    let worst: string | null = null;

    if (metric.key === "trend") {
      // Trend is text — skip numeric comparison
      return { best: null, worst: null };
    }

    const sorted = [...values].sort((a, b) => a.value - b.value);
    if (metric.higherIsBetter) {
      best = sorted[sorted.length - 1]?.symbol ?? null;
      worst = sorted[0]?.symbol ?? null;
    } else {
      // For PE/PB/RSI, lower is generally better (except RSI extremes)
      if (metric.key === "price") return { best: null, worst: null }; // price is neutral
      best = sorted[0]?.symbol ?? null;
      worst = sorted[sorted.length - 1]?.symbol ?? null;
    }

    // Don't highlight if only 1 unique value
    if (best === worst) return { best: null, worst: null };
    return { best, worst };
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Perbandingan Saham"
        description="Compare saham side-by-side. Pilih hingga 5 saham untuk dibandingkan."
        actions={
          symbols.length >= 2 ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} className={comparison.isFetching ? "animate-spin" : ""} />}
              onClick={() => comparison.refetch()}
            >
              Refresh
            </Button>
          ) : undefined
        }
      />

      {/* Input & Presets */}
      <Card title="Pilih Saham" icon={<BarChart3 size={16} />}>
        <div className="space-y-4">
          {/* Symbol input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              placeholder="Ketik simbol saham, e.g. AAPL"
              className="h-9 flex-1 rounded-xl border border-border/50 bg-muted/30 px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              maxLength={10}
            />
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={addSymbol}
              disabled={symbols.length >= 5 || !input.trim()}
            >
              Add
            </Button>
          </div>

          {/* Selected symbols */}
          {symbols.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {symbols.map((sym) => (
                <span
                  key={sym}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  {sym}
                  <button
                    onClick={() => removeSymbol(sym)}
                    className="ml-0.5 rounded p-0.5 transition-colors hover:bg-primary/20"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {symbols.length > 0 && (
                <button
                  onClick={() => setSymbols([])}
                  className="text-[11px] text-muted-foreground hover:text-bear"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "rounded-xl border border-border/50 px-3 py-1.5 text-xs font-medium transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                    JSON.stringify(symbols) === JSON.stringify(preset.symbols) &&
                      "border-primary/50 bg-primary/10 text-primary",
                  )}
                >
                  {preset.name}
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    ({preset.symbols.join(", ")})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Loading */}
      {comparison.isLoading && symbols.length >= 2 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-48" />
          ))}
        </div>
      )}

      {/* Prompt to add more */}
      {symbols.length < 2 && (
        <Card variant="glass">
          <div className="flex flex-col items-center py-12 text-center">
            <Sparkles size={32} className="text-muted-foreground" />
            <h3 className="mt-4 text-sm font-semibold">Pilih minimal 2 saham</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ketik simbol atau gunakan preset untuk mulai membandingkan.
            </p>
          </div>
        </Card>
      )}

      {/* Comparison Table */}
      {data && data.length > 0 && (
        <section className="space-y-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comparison Table
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground">
                    Metric
                  </th>
                  {data.map((item: any) => (
                    <th
                      key={item.symbol}
                      className="px-4 py-3 text-center text-xs font-bold text-primary"
                    >
                      {item.symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const { best, worst } = getBestWorst(metric, data);
                  return (
                    <tr key={metric.key} className="border-b border-border/20 last:border-0">
                      <td className="px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
                        {metric.label}
                      </td>
                      {data.map((item: any) => {
                        const isBest = item.symbol === best;
                        const isWorst = item.symbol === worst;
                        return (
                          <td
                            key={item.symbol}
                            className={cn(
                              "px-4 py-2.5 text-center text-xs font-medium tabular",
                              isBest && "text-bull bg-bull/5",
                              isWorst && "text-bear bg-bear/5",
                              !isBest && !isWorst && "text-foreground",
                            )}
                          >
                            {metric.format(item[metric.key])}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Score Bar Chart */}
      {data && data.length > 0 && (
        <Card title="Score Comparison" icon={<BarChart3 size={16} />} subtitle="Higher is better">
          <div className="space-y-3">
            {data.map((item: any) => (
              <div key={item.symbol} className="flex items-center gap-3">
                <span className="w-14 text-xs font-bold text-primary">{item.symbol}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-lg bg-muted/50">
                  <div
                    className="flex h-full items-center rounded-lg px-2 transition-all duration-700"
                    style={{
                      width: `${Math.max(item.score ?? 0, 5)}%`,
                      backgroundColor: getScoreColor(item.score ?? 0),
                    }}
                  >
                    <span className="text-[10px] font-bold text-white drop-shadow-sm">
                      {item.score ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Error state */}
      {comparison.isError && symbols.length >= 2 && (
        <Card variant="glass">
          <div className="flex flex-col items-center py-8 text-center">
            <Sparkles size={32} className="text-bear" />
            <h3 className="mt-4 text-sm font-semibold">Gagal memuat data</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Pastikan simbol saham valid. Coba lagi nanti.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => comparison.refetch()}
            >
              Coba Lagi
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
