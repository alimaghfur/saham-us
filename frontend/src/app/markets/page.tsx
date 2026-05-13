"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Globe,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonCard } from "@/components/Skeleton";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { formatLargeNumber, formatPrice, priceChangeClass } from "@/lib/format";

export default function MarketsPage() {
  const indices = useQuery({ queryKey: ["indices"], queryFn: api.indices });
  const sectors = useQuery({ queryKey: ["sectors"], queryFn: api.sectors });
  const gainers = useQuery({
    queryKey: ["movers", "gainers"],
    queryFn: () => api.movers("gainers", 15),
  });
  const losers = useQuery({
    queryKey: ["movers", "losers"],
    queryFn: () => api.movers("losers", 15),
  });
  const active = useQuery({
    queryKey: ["movers", "active"],
    queryFn: () => api.movers("active", 15),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Markets & Sectors"
        description="Comprehensive view of US market indices, sector rotation, and market breadth."
        badge="Live"
      />

      {/* Indices Section */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Globe size={14} className="text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Major Indices
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indices.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          {indices.data?.map((ix) => (
            <div
              key={ix.symbol}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-card-hover"
            >
              <div
                className={`absolute inset-0 opacity-[0.03] ${
                  (ix.change_percent ?? 0) >= 0
                    ? "bg-gradient-to-br from-bull to-transparent"
                    : "bg-gradient-to-br from-bear to-transparent"
                }`}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {ix.symbol}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold">{ix.name}</h3>
                  <p className="mt-2 text-2xl font-bold tabular">
                    {formatPrice(ix.price)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {(ix.change_percent ?? 0) >= 0 ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bull/10">
                      <ArrowUpRight size={16} className="text-bull" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bear/10">
                      <ArrowDownRight size={16} className="text-bear" />
                    </div>
                  )}
                </div>
              </div>
              <div className="relative mt-3 flex items-center gap-2">
                <span
                  className={
                    "text-sm font-semibold tabular " +
                    priceChangeClass(ix.change)
                  }
                >
                  {ix.change != null
                    ? (ix.change > 0 ? "+" : "") + formatPrice(ix.change)
                    : "—"}
                </span>
                <ChangeBadge value={ix.change_percent} showIcon />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sector Performance */}
      <section>
        <Card
          title="Sector Heatmap"
          subtitle="SPDR Sector ETFs — daily performance"
          icon={<Building2 size={14} />}
        >
          {sectors.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-muted/50"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sectors.data?.map((s) => {
                const cp = s.change_percent ?? 0;
                const intensity = Math.min(Math.abs(cp) / 3, 1);
                const bgColor =
                  cp >= 0
                    ? `rgba(34, 197, 94, ${intensity * 0.15})`
                    : `rgba(239, 68, 68, ${intensity * 0.15})`;
                return (
                  <Link
                    key={s.etf}
                    href={`/stock/${s.etf}`}
                    className="group flex flex-col justify-between rounded-xl border border-border/30 p-4 transition-all duration-200 hover:border-border hover:shadow-md hover:-translate-y-0.5"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div>
                      <span className="text-sm font-semibold">{s.sector}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {s.etf}
                      </span>
                    </div>
                    <span
                      className={
                        "mt-3 text-xl font-bold tabular " +
                        priceChangeClass(cp)
                      }
                    >
                      {cp > 0 ? "+" : ""}
                      {cp.toFixed(2)}%
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      {/* Movers Tables */}
      <section className="grid gap-4 lg:grid-cols-3">
        <MoverTable
          title="Top Gainers"
          data={gainers.data}
          loading={gainers.isLoading}
          variant="bull"
        />
        <MoverTable
          title="Top Losers"
          data={losers.data}
          loading={losers.isLoading}
          variant="bear"
        />
        <MoverTable
          title="Most Active"
          data={active.data}
          loading={active.isLoading}
          variant="info"
        />
      </section>
    </div>
  );
}

function MoverTable({
  title,
  data,
  loading,
  variant,
}: {
  title: string;
  data?: {
    symbol: string;
    name?: string | null;
    price?: number | null;
    change_percent?: number | null;
    volume?: number | null;
  }[];
  loading: boolean;
  variant: "bull" | "bear" | "info";
}) {
  return (
    <Card title={title}>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-lg bg-muted/50"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          {data?.slice(0, 10).map((m, idx) => (
            <Link
              key={m.symbol}
              href={`/stock/${m.symbol}`}
              className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <div>
                  <span className="text-xs font-semibold">{m.symbol}</span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {m.name?.slice(0, 15)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular text-muted-foreground">
                  ${formatPrice(m.price)}
                </span>
                <ChangeBadge value={m.change_percent} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
