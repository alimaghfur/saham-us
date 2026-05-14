"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowUpDown,
  Eye,
  Gauge,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { Card } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { formatPrice, formatLargeNumber, priceChangeClass } from "@/lib/format";
import { cn } from "@/lib/cn";

function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("watchlist") ?? "[]"); } catch { return []; }
}
function saveWatchlist(list: string[]) { localStorage.setItem("watchlist", JSON.stringify(list)); }

type SortKey = "symbol" | "score" | "change" | "price";

export default function WatchlistPage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  React.useEffect(() => { setSymbols(getWatchlist()); }, []);

  // Fetch scores for all watchlist symbols
  const scoresQuery = useQuery({
    queryKey: ["watchlist-scores", symbols.join(",")],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      const results = await Promise.allSettled(
        symbols.map(async (sym) => {
          const [quote, scoreData] = await Promise.allSettled([
            api.quote(sym),
            api.stockScore(sym),
          ]);
          return {
            symbol: sym,
            quote: quote.status === "fulfilled" ? quote.value : null,
            score: scoreData.status === "fulfilled" ? scoreData.value : null,
          };
        })
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);
    },
    enabled: symbols.length > 0,
    refetchInterval: 120000, // refresh every 2 min
  });

  const data = scoresQuery.data ?? [];

  // Sort
  const sorted = [...data].sort((a, b) => {
    if (sortBy === "score") return (b.score?.overall_score ?? 0) - (a.score?.overall_score ?? 0);
    if (sortBy === "change") return (b.quote?.change_percent ?? 0) - (a.quote?.change_percent ?? 0);
    if (sortBy === "price") return (b.quote?.price ?? 0) - (a.quote?.price ?? 0);
    return a.symbol.localeCompare(b.symbol);
  });

  function addSymbol(e: React.FormEvent) {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (!sym || symbols.includes(sym)) return;
    const updated = [...symbols, sym];
    setSymbols(updated);
    saveWatchlist(updated);
    setInput("");
    setShowAdd(false);
  }

  function removeSymbol(sym: string) {
    const updated = symbols.filter((s) => s !== sym);
    setSymbols(updated);
    saveWatchlist(updated);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Watchlist"
        description="Track saham favorit dengan auto-scoring. Saham dengan skor tertinggi di atas."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} className={scoresQuery.isFetching ? "animate-spin" : ""} />} onClick={() => scoresQuery.refetch()}>
              Refresh
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(!showAdd)}>
              Add
            </Button>
          </div>
        }
      />

      {/* Add Stock Input */}
      {showAdd && (
        <Card variant="glass" padding="sm">
          <form onSubmit={addSymbol} className="flex items-center gap-3 px-2">
            <input
              type="text"
              placeholder="Ticker (e.g. AAPL, NVDA)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              className="flex-1 rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
            <Button size="sm" type="submit">Add</Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}><X size={14} /></Button>
          </form>
        </Card>
      )}

      {/* Controls */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Sort:</span>
            {(["score", "change", "price", "symbol"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn("rounded-lg px-2 py-1 text-[10px] font-medium transition-all", sortBy === key ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
              >
                {key === "score" ? "Skor" : key === "change" ? "% Change" : key === "price" ? "Harga" : "A-Z"}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex gap-1">
            <button onClick={() => setViewMode("cards")} className={cn("rounded-lg px-2.5 py-1 text-[10px] font-medium", viewMode === "cards" ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground")}>Cards</button>
            <button onClick={() => setViewMode("table")} className={cn("rounded-lg px-2.5 py-1 text-[10px] font-medium", viewMode === "table" ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground")}>Table</button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {symbols.length === 0 ? (
        <EmptyState
          icon={<Eye size={28} />}
          title="Watchlist kosong"
          description="Tambah saham untuk di-track. Setiap saham akan otomatis di-score!"
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Tambah Saham</Button>}
        />
      ) : viewMode === "cards" ? (
        /* Card View */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <WatchlistScoreCard key={item.symbol} item={item} onRemove={() => removeSymbol(item.symbol)} />
          ))}
        </div>
      ) : (
        /* Table View */
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Rating</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-center">Risk</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {sorted.map((item) => (
                  <tr key={item.symbol} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/stock/${item.symbol}`} className="font-bold text-primary hover:underline">{item.symbol}</Link>
                      {item.quote?.name && <p className="text-[10px] text-muted-foreground">{item.quote.name.slice(0, 25)}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold" style={{ color: getScoreColor(item.score?.overall_score ?? 0) }}>
                        {item.score?.overall_score ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.score?.rating ? (
                        <Badge variant={item.score.rating_color === "bull" ? "bull" : item.score.rating_color === "bear" ? "bear" : "warning"}>
                          {item.score.rating}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular font-medium">
                      ${formatPrice(item.quote?.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChangeBadge value={item.quote?.change_percent} showIcon />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.score?.risk_level && (
                        <Badge variant={item.score.risk_level === "Low" ? "bull" : item.score.risk_level === "High" ? "bear" : "warning"}>
                          {item.score.risk_level}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeSymbol(item.symbol)} className="rounded p-1 text-muted-foreground hover:bg-bear/10 hover:text-bear"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quick Add Suggestions */}
      {symbols.length > 0 && symbols.length < 10 && (
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Tambah saham populer:</h3>
          <div className="flex flex-wrap gap-1.5">
            {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM", "V", "JNJ"]
              .filter((s) => !symbols.includes(s))
              .map((s) => (
                <button key={s} onClick={() => { const u = [...symbols, s]; setSymbols(u); saveWatchlist(u); }} className="rounded-lg bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">+ {s}</button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WatchlistScoreCard({ item, onRemove }: { item: any; onRemove: () => void }) {
  const q = item.quote;
  const s = item.score;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-card-hover hover:-translate-y-0.5">
      {q && (
        <div className={cn("absolute inset-0 opacity-[0.03]", (q.change_percent ?? 0) >= 0 ? "bg-gradient-to-br from-bull to-transparent" : "bg-gradient-to-br from-bear to-transparent")} />
      )}
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <Link href={`/stock/${item.symbol}`} className="flex-1">
            <div className="flex items-center gap-2">
              <Star size={12} className="text-warning" />
              <span className="font-bold">{item.symbol}</span>
            </div>
            {q?.name && <p className="mt-0.5 text-[11px] text-muted-foreground">{q.name.slice(0, 28)}</p>}
          </Link>
          <button onClick={onRemove} className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-bear/10 hover:text-bear group-hover:opacity-100"><Trash2 size={13} /></button>
        </div>

        {/* Price */}
        {q ? (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xl font-bold tabular">${formatPrice(q.price)}</span>
            <ChangeBadge value={q.change_percent} showIcon />
          </div>
        ) : (
          <div className="mt-3 h-6 w-24 animate-pulse rounded bg-muted/50" />
        )}

        {/* Score */}
        {s ? (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gauge size={11} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Score</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.rating_color === "bull" ? "bull" : s.rating_color === "bear" ? "bear" : "warning"} className="text-[9px]">
                  {s.rating}
                </Badge>
                <span className="text-sm font-bold tabular" style={{ color: getScoreColor(s.overall_score) }}>
                  {s.overall_score}
                </span>
              </div>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.overall_score}%`, backgroundColor: getScoreColor(s.overall_score) }} />
            </div>
            {/* Risk */}
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Risk: <Badge variant={s.risk_level === "Low" ? "bull" : s.risk_level === "High" ? "bear" : "warning"} className="text-[8px]">{s.risk_level}</Badge></span>
              {s.entry_zone && <span className="text-muted-foreground">Entry: {s.entry_zone}</span>}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
            <div className="h-1.5 w-full animate-pulse rounded-full bg-muted/50" />
          </div>
        )}
      </div>

      {/* Quick link */}
      <Link href={`/score?symbol=${item.symbol}`} className="flex items-center justify-center border-t border-border/30 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-primary">
        Detail Score →
      </Link>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 75) return "rgb(34, 197, 94)";
  if (score >= 60) return "rgb(132, 204, 22)";
  if (score >= 45) return "rgb(245, 158, 11)";
  if (score >= 30) return "rgb(249, 115, 22)";
  return "rgb(239, 68, 68)";
}
