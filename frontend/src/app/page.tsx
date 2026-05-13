"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Globe,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonCard } from "@/components/Skeleton";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import {
  formatLargeNumber,
  formatPrice,
  priceChangeClass,
} from "@/lib/format";

export default function DashboardPage() {
  const indices = useQuery({ queryKey: ["indices"], queryFn: api.indices });
  const gainers = useQuery({
    queryKey: ["movers", "gainers"],
    queryFn: () => api.movers("gainers", 8),
  });
  const losers = useQuery({
    queryKey: ["movers", "losers"],
    queryFn: () => api.movers("losers", 8),
  });
  const active = useQuery({
    queryKey: ["movers", "active"],
    queryFn: () => api.movers("active", 8),
  });
  const sectors = useQuery({ queryKey: ["sectors"], queryFn: api.sectors });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time US market snapshot — indices, movers, and sector performance."
        badge="Live"
      />

      {/* Market Indices */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Globe size={14} className="text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Market Indices
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {indices.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="h-24" />
            ))}
          {indices.data?.map((ix) => (
            <div
              key={ix.symbol}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:border-border hover:shadow-card-hover hover:-translate-y-0.5"
            >
              {/* Subtle gradient based on performance */}
              <div
                className={`absolute inset-0 opacity-[0.03] ${
                  (ix.change_percent ?? 0) >= 0
                    ? "bg-gradient-to-br from-bull to-transparent"
                    : "bg-gradient-to-br from-bear to-transparent"
                }`}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {ix.name}
                  </span>
                  {(ix.change_percent ?? 0) >= 0 ? (
                    <ArrowUpRight size={14} className="text-bull" />
                  ) : (
                    <ArrowDownRight size={14} className="text-bear" />
                  )}
                </div>
                <div className="mt-1.5 text-lg font-bold tabular">
                  {formatPrice(ix.price)}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={
                      "text-xs font-medium tabular " +
                      priceChangeClass(ix.change)
                    }
                  >
                    {ix.change != null
                      ? (ix.change > 0 ? "+" : "") + formatPrice(ix.change)
                      : "—"}
                  </span>
                  <ChangeBadge value={ix.change_percent} size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Movers Grid */}
      <section className="grid gap-4 lg:grid-cols-3">
        <MoverCard
          title="Top Gainers"
          icon={<ArrowUpRight size={14} />}
          color="bull"
          data={gainers.data}
          loading={gainers.isLoading}
        />
        <MoverCard
          title="Top Losers"
          icon={<ArrowDownRight size={14} />}
          color="bear"
          data={losers.data}
          loading={losers.isLoading}
        />
        <MoverCard
          title="Most Active"
          icon={<Activity size={14} />}
          color="info"
          data={active.data}
          loading={active.isLoading}
        />
      </section>

      {/* Sector Heatmap */}
      <section>
        <Card
          title="Sector Performance"
          subtitle="SPDR Sector ETFs · Daily Change"
          icon={<BarChart3 size={14} />}
        >
          {sectors.isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-muted/50"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {sectors.data?.map((s) => {
                const cp = s.change_percent ?? 0;
                const bgColor =
                  cp >= 2
                    ? "bg-bull/20 border-bull/30"
                    : cp >= 0.5
                      ? "bg-bull/10 border-bull/20"
                      : cp > -0.5
                        ? "bg-muted/50 border-border/30"
                        : cp > -2
                          ? "bg-bear/10 border-bear/20"
                          : "bg-bear/20 border-bear/30";
                return (
                  <Link
                    key={s.etf}
                    href={`/stock/${s.etf}`}
                    className={`flex flex-col rounded-xl border p-3 text-xs transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${bgColor}`}
                  >
                    <span className="font-semibold text-foreground">
                      {s.sector}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.etf}
                    </span>
                    <span
                      className={
                        "mt-auto pt-2 text-sm font-bold tabular " +
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

      {/* Quick Actions */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href="/screener"
          icon={<BarChart3 size={18} />}
          title="Run Screener"
          description="Filter stocks by fundamentals & technicals"
        />
        <QuickAction
          href="/swing"
          icon={<TrendingUp size={18} />}
          title="Swing Setups"
          description="Find breakout & pullback candidates"
        />
        <QuickAction
          href="/scalping"
          icon={<Zap size={18} />}
          title="Hot Stocks"
          description="Momentum plays & volume spikes"
        />
        <QuickAction
          href="/watchlist"
          icon={<Activity size={18} />}
          title="My Watchlist"
          description="Track your favorite picks"
        />
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
    </Link>
  );
}

function MoverCard({
  title,
  icon,
  color,
  data,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  color: "bull" | "bear" | "info";
  data?: {
    symbol: string;
    name?: string | null;
    price?: number | null;
    change_percent?: number | null;
    volume?: number | null;
  }[];
  loading: boolean;
}) {
  const colorClasses = {
    bull: "text-bull",
    bear: "text-bear",
    info: "text-info",
  };

  return (
    <Card
      title={title}
      icon={<span className={colorClasses[color]}>{icon}</span>}
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-lg bg-muted/50"
            />
          ))}
        </div>
      ) : (
        <ul className="space-y-0.5">
          {data?.slice(0, 8).map((m, idx) => (
            <li key={m.symbol}>
              <Link
                href={`/stock/${m.symbol}`}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 text-[10px] font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span>
                    <span className="font-semibold">{m.symbol}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {m.name?.slice(0, 20)}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs tabular text-muted-foreground">
                    ${formatPrice(m.price)}
                  </span>
                  <ChangeBadge value={m.change_percent} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
