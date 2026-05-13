"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowUpDown,
  Filter,
  Layers,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Card } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { SkeletonTable } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatLargeNumber, formatPrice, formatPercent } from "@/lib/format";
import type { ScreenerFilter } from "@/lib/types";

const PRESETS = [
  { name: "value", label: "Value Stocks", description: "Low PE < 15, P/B < 2" },
  { name: "growth", label: "Growth Stars", description: "Revenue growth > 15%" },
  { name: "dividend", label: "Dividend Kings", description: "Yield > 3%, stable" },
  { name: "quality", label: "Quality", description: "ROE > 15%, large cap" },
  { name: "large_cap", label: "Large Cap", description: "Market cap > $100B" },
];

const SECTORS = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Cyclical",
  "Communication Services",
  "Industrials",
  "Consumer Defensive",
  "Energy",
  "Real Estate",
  "Utilities",
  "Basic Materials",
];

export default function ScreenerPage() {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ScreenerFilter>({});
  const [runCount, setRunCount] = useState(0);

  const results = useQuery({
    queryKey: ["screener", activePreset, filters, runCount],
    queryFn: () =>
      activePreset
        ? api.screenerPreset(activePreset)
        : api.runScreener(filters),
    enabled: !!(activePreset || runCount > 0),
  });

  function handlePreset(name: string) {
    setActivePreset(name === activePreset ? null : name);
    setFilters({});
  }

  function resetFilters() {
    setActivePreset(null);
    setFilters({});
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Stock Screener"
        description="Filter and discover stocks using fundamental & technical criteria."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<SlidersHorizontal size={14} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
        }
      />

      {/* Quick Presets */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Layers size={14} className="text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Presets
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePreset(p.name)}
              className={`group flex flex-col rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                activePreset === p.name
                  ? "border-primary/50 bg-primary/10 shadow-glow-sm"
                  : "border-border/50 bg-card hover:border-border hover:bg-card-hover"
              }`}
            >
              <span className="text-xs font-semibold">{p.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {p.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card
          title="Advanced Filters"
          icon={<Filter size={14} />}
          variant="glass"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterInput
              label="Min Market Cap"
              placeholder="e.g. 1000000000"
              value={filters.market_cap_min?.toString() ?? ""}
              onChange={(v) =>
                setFilters({ ...filters, market_cap_min: v ? Number(v) : null })
              }
            />
            <FilterInput
              label="Max PE Ratio"
              placeholder="e.g. 25"
              value={filters.pe_max?.toString() ?? ""}
              onChange={(v) =>
                setFilters({ ...filters, pe_max: v ? Number(v) : null })
              }
            />
            <FilterInput
              label="Min ROE (%)"
              placeholder="e.g. 15"
              value={filters.roe_min?.toString() ?? ""}
              onChange={(v) =>
                setFilters({ ...filters, roe_min: v ? Number(v) : null })
              }
            />
            <FilterInput
              label="Min Dividend Yield (%)"
              placeholder="e.g. 2"
              value={filters.dividend_yield_min?.toString() ?? ""}
              onChange={(v) =>
                setFilters({
                  ...filters,
                  dividend_yield_min: v ? Number(v) : null,
                })
              }
            />
            <FilterInput
              label="Min Revenue Growth (%)"
              placeholder="e.g. 10"
              value={filters.revenue_growth_min?.toString() ?? ""}
              onChange={(v) =>
                setFilters({
                  ...filters,
                  revenue_growth_min: v ? Number(v) : null,
                })
              }
            />
            <FilterInput
              label="Min PB Ratio"
              placeholder="e.g. 0.5"
              value={filters.pb_min?.toString() ?? ""}
              onChange={(v) =>
                setFilters({ ...filters, pb_min: v ? Number(v) : null })
              }
            />
          </div>

          {/* Sector filter */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Sectors
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SECTORS.map((s) => {
                const selected = filters.sectors?.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => {
                      const current = filters.sectors ?? [];
                      setFilters({
                        ...filters,
                        sectors: selected
                          ? current.filter((x) => x !== s)
                          : [...current, s],
                      });
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      selected
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              icon={<Play size={12} />}
              onClick={() => {
                setActivePreset(null);
                setRunCount((c) => c + 1);
              }}
            >
              Run Screener
            </Button>
          </div>
        </Card>
      )}

      {/* Results Table */}
      <Card title="Results" subtitle={results.data ? `${results.data.length} stocks found` : undefined}>
        {results.isLoading ? (
          <SkeletonTable rows={8} />
        ) : results.data && results.data.length > 0 ? (
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
                  <th className="pb-3 pr-4 text-right">PB</th>
                  <th className="pb-3 pr-4 text-right">ROE</th>
                  <th className="pb-3 text-right">Div Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {results.data.map((r, idx) => (
                  <tr
                    key={r.symbol}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/stock/${r.symbol}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {r.symbol}
                      </Link>
                      {r.name && (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {r.name.slice(0, 25)}
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
                      {r.pb_ratio?.toFixed(2) ?? "—"}
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
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
              <Search size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No results yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a preset or configure custom filters to find stocks.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function FilterInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
      />
    </div>
  );
}
