"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Eye,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { Card } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { formatPrice, priceChangeClass } from "@/lib/format";
import { cn } from "@/lib/cn";

// Simple local storage watchlist
function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("watchlist") ?? "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(list: string[]) {
  localStorage.setItem("watchlist", JSON.stringify(list));
}

export default function WatchlistPage() {
  const [symbols, setSymbols] = useState<string[]>(getWatchlist);
  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);

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
        description="Track your favorite stocks and monitor their performance."
        actions={
          <Button
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setShowAdd(!showAdd)}
          >
            Add Stock
          </Button>
        }
      />

      {/* Add Stock Input */}
      {showAdd && (
        <Card variant="glass" padding="sm">
          <form onSubmit={addSymbol} className="flex items-center gap-3 px-2">
            <input
              type="text"
              placeholder="Enter ticker symbol (e.g. AAPL)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              className="flex-1 rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
            <Button size="sm" type="submit">
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setShowAdd(false)}
            >
              <X size={14} />
            </Button>
          </form>
        </Card>
      )}

      {/* Watchlist */}
      {symbols.length === 0 ? (
        <EmptyState
          icon={<Eye size={28} />}
          title="Your watchlist is empty"
          description="Start adding stocks to track their performance. Use the + button above or search for tickers."
          action={
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowAdd(true)}
            >
              Add your first stock
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {symbols.map((sym) => (
            <WatchlistCard
              key={sym}
              symbol={sym}
              onRemove={() => removeSymbol(sym)}
            />
          ))}
        </div>
      )}

      {/* Quick Add Suggestions */}
      {symbols.length > 0 && symbols.length < 10 && (
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
            Popular stocks to add:
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM", "V", "JNJ"]
              .filter((s) => !symbols.includes(s))
              .map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const updated = [...symbols, s];
                    setSymbols(updated);
                    saveWatchlist(updated);
                  }}
                  className="rounded-lg bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  + {s}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
  symbol,
  onRemove,
}: {
  symbol: string;
  onRemove: () => void;
}) {
  const quote = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => api.quote(symbol),
    refetchInterval: 60000,
  });

  const q = quote.data;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-card-hover hover:-translate-y-0.5">
      {/* Performance gradient overlay */}
      {q && (
        <div
          className={cn(
            "absolute inset-0 opacity-[0.03]",
            (q.change_percent ?? 0) >= 0
              ? "bg-gradient-to-br from-bull to-transparent"
              : "bg-gradient-to-br from-bear to-transparent",
          )}
        />
      )}

      <div className="relative p-4">
        <div className="flex items-start justify-between">
          <Link href={`/stock/${symbol}`} className="flex-1">
            <div className="flex items-center gap-2">
              <Star size={12} className="text-warning" />
              <span className="font-bold">{symbol}</span>
            </div>
            {q?.name && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {q.name.slice(0, 30)}
              </p>
            )}
          </Link>
          <button
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-bear/10 hover:text-bear group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {quote.isLoading ? (
          <div className="mt-3 space-y-2">
            <div className="h-6 w-24 animate-pulse rounded bg-muted/50" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted/50" />
          </div>
        ) : q ? (
          <div className="mt-3">
            <div className="text-xl font-bold tabular">
              ${formatPrice(q.price)}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-medium tabular",
                  priceChangeClass(q.change),
                )}
              >
                {q.change != null
                  ? (q.change > 0 ? "+" : "") + formatPrice(q.change)
                  : "—"}
              </span>
              <ChangeBadge value={q.change_percent} showIcon />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Failed to load</p>
        )}
      </div>
    </div>
  );
}
