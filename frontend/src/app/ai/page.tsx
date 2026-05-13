"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Lightbulb,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ChangeBadge } from "@/components/ChangeBadge";
import { api } from "@/lib/api";
import { formatLargeNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ScreenerFilter, ScreenerResult } from "@/lib/types";

// --- Natural Language Parsing ---
interface ParsedQuery {
  description: string;
  filters: ScreenerFilter;
  confidence: "high" | "medium" | "low";
}

function parseNaturalLanguage(query: string): ParsedQuery {
  const q = query.toLowerCase();
  const filters: ScreenerFilter = { limit: 25 };
  const descriptions: string[] = [];
  let confidence: "high" | "medium" | "low" = "medium";

  // PE ratio
  const peMatch = q.match(/pe\s*(?:ratio)?\s*(?:under|below|<|less than)\s*(\d+)/);
  if (peMatch) {
    filters.pe_max = parseInt(peMatch[1]);
    descriptions.push(`PE < ${peMatch[1]}`);
    confidence = "high";
  }
  const peMinMatch = q.match(/pe\s*(?:ratio)?\s*(?:above|over|>|greater than)\s*(\d+)/);
  if (peMinMatch) {
    filters.pe_min = parseInt(peMinMatch[1]);
    descriptions.push(`PE > ${peMinMatch[1]}`);
  }

  // Market cap
  if (q.includes("large cap") || q.includes("large-cap") || q.includes("mega cap")) {
    filters.market_cap_min = 100e9;
    descriptions.push("Large cap (>$100B)");
    confidence = "high";
  } else if (q.includes("mid cap") || q.includes("mid-cap")) {
    filters.market_cap_min = 10e9;
    filters.market_cap_max = 100e9;
    descriptions.push("Mid cap ($10B-$100B)");
  } else if (q.includes("small cap") || q.includes("small-cap")) {
    filters.market_cap_min = 1e9;
    filters.market_cap_max = 10e9;
    descriptions.push("Small cap ($1B-$10B)");
  }

  // ROE
  const roeMatch = q.match(/roe\s*(?:above|over|>|greater than|more than)\s*(\d+)/);
  if (roeMatch) {
    filters.roe_min = parseInt(roeMatch[1]) / 100;
    descriptions.push(`ROE > ${roeMatch[1]}%`);
    confidence = "high";
  }
  if (q.includes("high roe") || q.includes("profitable")) {
    filters.roe_min = 0.15;
    descriptions.push("ROE > 15%");
  }

  // Dividend
  const divMatch = q.match(/(?:dividend|yield)\s*(?:above|over|>|greater than)\s*(\d+)/);
  if (divMatch) {
    filters.dividend_yield_min = parseInt(divMatch[1]) / 100;
    descriptions.push(`Div Yield > ${divMatch[1]}%`);
    confidence = "high";
  }
  if (q.includes("dividend") || q.includes("income") || q.includes("yield")) {
    if (!filters.dividend_yield_min) {
      filters.dividend_yield_min = 0.02;
      descriptions.push("Dividend yield > 2%");
    }
  }

  // Revenue growth
  const growthMatch = q.match(/(?:revenue|growth)\s*(?:above|over|>|greater than|more than)\s*(\d+)/);
  if (growthMatch) {
    filters.revenue_growth_min = parseInt(growthMatch[1]) / 100;
    descriptions.push(`Revenue growth > ${growthMatch[1]}%`);
    confidence = "high";
  }
  if (q.includes("growth") || q.includes("growing")) {
    if (!filters.revenue_growth_min) {
      filters.revenue_growth_min = 0.1;
      descriptions.push("Revenue growth > 10%");
    }
  }

  // Value keywords
  if (q.includes("value") || q.includes("cheap") || q.includes("undervalued")) {
    if (!filters.pe_max) filters.pe_max = 20;
    descriptions.push("Value stocks (PE < 20)");
    confidence = "high";
  }

  // Sectors
  const sectorMap: Record<string, string> = {
    tech: "Technology",
    technology: "Technology",
    healthcare: "Healthcare",
    health: "Healthcare",
    finance: "Financial Services",
    financial: "Financial Services",
    bank: "Financial Services",
    energy: "Energy",
    oil: "Energy",
    consumer: "Consumer Cyclical",
    retail: "Consumer Cyclical",
    industrial: "Industrials",
  };

  for (const [keyword, sector] of Object.entries(sectorMap)) {
    if (q.includes(keyword)) {
      filters.sectors = [sector];
      descriptions.push(`Sector: ${sector}`);
      confidence = "high";
      break;
    }
  }

  // If nothing parsed, try keyword-based defaults
  if (descriptions.length === 0) {
    if (q.includes("best") || q.includes("top")) {
      filters.market_cap_min = 10e9;
      filters.roe_min = 0.1;
      descriptions.push("Top quality stocks (ROE > 10%, cap > $10B)");
      confidence = "low";
    } else {
      descriptions.push("Showing all stocks in universe");
      confidence = "low";
    }
  }

  return {
    description: descriptions.join(" · "),
    filters,
    confidence,
  };
}

// --- Example Queries ---
const EXAMPLE_QUERIES = [
  "Show me tech stocks with PE under 25",
  "Find dividend stocks with yield above 4%",
  "Large cap value stocks with high ROE",
  "Growing companies with revenue growth above 20%",
  "Healthcare stocks with PE below 30",
  "Undervalued energy stocks",
  "Top quality stocks with ROE above 20%",
  "Mid cap growth stocks in technology",
];

export default function AIPage() {
  const [query, setQuery] = useState("");
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; resultCount: number }>>([]);

  const screenerMutation = useMutation({
    mutationFn: (filters: ScreenerFilter) => api.runScreener(filters),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    runQuery(query.trim());
  }

  function runQuery(q: string) {
    const result = parseNaturalLanguage(q);
    setParsed(result);
    screenerMutation.mutate(result.filters, {
      onSuccess: (data) => {
        setHistory((prev) => [{ query: q, resultCount: data.length }, ...prev.slice(0, 9)]);
      },
    });
  }

  const results = screenerMutation.data;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="AI Insights"
        description="Ask questions in plain English to screen stocks. Powered by natural language understanding."
        badge="Live"
        gradient
      />

      {/* Search Input */}
      <Card variant="glass" padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Natural Language Screener</h2>
              <p className="text-[11px] text-muted-foreground">
                Describe what you&apos;re looking for in plain English
              </p>
            </div>
          </div>

          <div className="relative">
            <MessageSquare
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Show me tech stocks with PE under 20 and growing revenue..."
              className="w-full rounded-2xl border border-border/50 bg-muted/30 py-3.5 pl-11 pr-24 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:shadow-glow-sm focus:ring-1 focus:ring-primary/20"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setParsed(null); screenerMutation.reset(); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={screenerMutation.isPending || !query.trim()}
                icon={screenerMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Example queries */}
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUERIES.slice(0, 4).map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => { setQuery(eq); runQuery(eq); }}
                className="rounded-xl bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
              >
                <Lightbulb size={9} className="mr-1 inline" />
                {eq}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Parsed Query Explanation */}
      {parsed && (
        <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card/50 px-4 py-3">
          <BrainCircuit size={16} className="shrink-0 text-primary" />
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">Interpreted as: </span>
            <span className="text-xs font-medium">{parsed.description}</span>
          </div>
          <Badge
            variant={
              parsed.confidence === "high"
                ? "bull"
                : parsed.confidence === "medium"
                  ? "warning"
                  : "default"
            }
          >
            {parsed.confidence} confidence
          </Badge>
        </div>
      )}

      {/* Results */}
      {screenerMutation.isPending && (
        <div className="flex flex-col items-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Searching stocks...</p>
        </div>
      )}

      {results && results.length > 0 && (
        <Card
          title="Results"
          subtitle={`${results.length} stocks match your criteria`}
          icon={<Search size={14} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Sector</th>
                  <th className="pb-3 pr-4 text-right">Price</th>
                  <th className="pb-3 pr-4 text-right">Mkt Cap</th>
                  <th className="pb-3 pr-4 text-right">PE</th>
                  <th className="pb-3 pr-4 text-right">ROE</th>
                  <th className="pb-3 text-right">Div Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {results.map((r: ScreenerResult, idx: number) => (
                  <tr key={r.symbol} className="transition-colors hover:bg-muted/30">
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/stock/${r.symbol}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {r.symbol}
                      </Link>
                      {r.name && (
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {r.name.slice(0, 20)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="default">{r.sector ?? "—"}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-right tabular">
                      ${formatPrice(r.price)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular text-muted-foreground">
                      {formatLargeNumber(r.market_cap)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular">
                      {r.pe_ratio?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-right tabular">
                      {r.roe != null ? `${(r.roe * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-3 text-right tabular">
                      {r.dividend_yield != null
                        ? `${(r.dividend_yield * 100).toFixed(2)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {results && results.length === 0 && !screenerMutation.isPending && (
        <Card variant="glass">
          <div className="flex flex-col items-center py-12 text-center">
            <Search size={32} className="text-muted-foreground" />
            <h3 className="mt-4 text-sm font-semibold">No stocks found</h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              No stocks in our universe match your criteria. Try broadening your search
              or use different keywords.
            </p>
          </div>
        </Card>
      )}

      {/* Query History */}
      {history.length > 0 && (
        <Card title="Recent Queries" icon={<MessageSquare size={14} />}>
          <div className="space-y-1">
            {history.map((h, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(h.query); runQuery(h.query); }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/30"
              >
                <span className="flex items-center gap-2 text-xs">
                  <Sparkles size={11} className="text-primary" />
                  {h.query}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {h.resultCount} results
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* More Examples */}
      {!results && !screenerMutation.isPending && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Try These Queries
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMPLE_QUERIES.map((eq) => (
              <button
                key={eq}
                onClick={() => { setQuery(eq); runQuery(eq); }}
                className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-card p-4 text-left transition-all duration-200 hover:border-primary/30 hover:bg-card-hover hover:-translate-y-0.5"
              >
                <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {eq}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Supported Keywords */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">Supported Keywords</h3>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <div><strong className="text-foreground">PE ratio:</strong> "PE under 20", "PE below 30"</div>
          <div><strong className="text-foreground">Market cap:</strong> "large cap", "mid cap", "small cap"</div>
          <div><strong className="text-foreground">ROE:</strong> "ROE above 15", "high ROE", "profitable"</div>
          <div><strong className="text-foreground">Dividend:</strong> "dividend above 3%", "yield", "income"</div>
          <div><strong className="text-foreground">Growth:</strong> "revenue growth above 10%", "growing"</div>
          <div><strong className="text-foreground">Sectors:</strong> "tech", "healthcare", "energy", "finance"</div>
          <div><strong className="text-foreground">Style:</strong> "value", "cheap", "undervalued"</div>
          <div><strong className="text-foreground">Quality:</strong> "best", "top", "quality"</div>
        </div>
      </div>
    </div>
  );
}
