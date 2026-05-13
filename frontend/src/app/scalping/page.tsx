"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  Flame,
  RefreshCw,
  TrendingUp,
  Volume2,
  Zap,
} from "lucide-react";

import { Card } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonTable } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatLargeNumber, formatPrice, priceChangeClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function ScalpingPage() {
  const hotStocks = useQuery({
    queryKey: ["scalping", "hot"],
    queryFn: () => api.hotStocks(30),
    refetchInterval: 30000, // refresh every 30s
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Scalping / Day Trading"
        description="Real-time momentum scanner — hot stocks with unusual volume and price action."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="bull" dot>
              Auto-refresh 30s
            </Badge>
          </div>
        }
      />

      {/* Stats Row */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox
          icon={<Flame size={16} />}
          label="Hot Stocks"
          value={hotStocks.data?.length?.toString() ?? "—"}
          color="bear"
        />
        <StatBox
          icon={<Volume2 size={16} />}
          label="Avg Volume"
          value={
            hotStocks.data
              ? formatLargeNumber(
                  hotStocks.data.reduce(
                    (a, b) => a + (b.volume ?? 0),
                    0,
                  ) / hotStocks.data.length,
                )
              : "—"
          }
          color="info"
        />
        <StatBox
          icon={<TrendingUp size={16} />}
          label="Biggest Gainer"
          value={
            hotStocks.data && hotStocks.data.length > 0
              ? `${hotStocks.data.reduce((max, s) =>
                  (s.change_percent ?? 0) > (max.change_percent ?? 0) ? s : max,
                ).symbol}`
              : "—"
          }
          color="bull"
        />
        <StatBox
          icon={<Activity size={16} />}
          label="Market Pulse"
          value="Active"
          color="primary"
        />
      </section>

      {/* Hot Stocks Table */}
      <Card
        title="Hot Stocks — Momentum Scanner"
        subtitle="Sorted by volume activity & price change"
        icon={<Zap size={14} className="text-warning" />}
      >
        {hotStocks.isLoading ? (
          <SkeletonTable rows={10} />
        ) : hotStocks.data && hotStocks.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4 text-right">Price</th>
                  <th className="pb-3 pr-4 text-right">Change</th>
                  <th className="pb-3 pr-4 text-right">Volume</th>
                  <th className="pb-3 text-right">Momentum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {hotStocks.data.map((stock, idx) => {
                  const momentum = Math.abs(stock.change_percent ?? 0);
                  const momentumLevel =
                    momentum >= 10
                      ? "extreme"
                      : momentum >= 5
                        ? "high"
                        : momentum >= 2
                          ? "medium"
                          : "low";
                  return (
                    <tr
                      key={stock.symbol}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/stock/${stock.symbol}`}
                          className="flex items-center gap-2"
                        >
                          <span className="font-semibold text-primary hover:underline">
                            {stock.symbol}
                          </span>
                          {idx < 3 && (
                            <Flame
                              size={12}
                              className="text-warning animate-pulse-slow"
                            />
                          )}
                        </Link>
                        {stock.name && (
                          <p className="text-[10px] text-muted-foreground">
                            {stock.name.slice(0, 30)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right tabular font-medium">
                        ${formatPrice(stock.price)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <ChangeBadge
                          value={stock.change_percent}
                          showIcon
                          size="md"
                        />
                      </td>
                      <td className="py-3 pr-4 text-right tabular text-muted-foreground">
                        {formatLargeNumber(stock.volume)}
                      </td>
                      <td className="py-3 text-right">
                        <MomentumBar level={momentumLevel} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Zap size={32} className="text-muted-foreground" />
            <h3 className="mt-4 text-sm font-semibold">No hot stocks</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Market might be slow. Check back during active hours.
            </p>
          </div>
        )}
      </Card>

      {/* Tips Card */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">Scalping Tips</h3>
        <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Focus on stocks with &gt;2x average volume
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Set tight stop losses (0.5-1% max risk)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Trade during first & last hour of market
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Use VWAP as dynamic support/resistance
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "bull" | "bear" | "info" | "primary";
}) {
  const colors = {
    bull: "bg-bull/10 text-bull",
    bear: "bg-bear/10 text-bear",
    info: "bg-info/10 text-info",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl",
            colors[color],
          )}
        >
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold tabular">{value}</p>
    </div>
  );
}

function MomentumBar({ level }: { level: "low" | "medium" | "high" | "extreme" }) {
  const levels = {
    low: { width: "25%", color: "bg-muted-foreground/50", label: "Low" },
    medium: { width: "50%", color: "bg-info", label: "Med" },
    high: { width: "75%", color: "bg-warning", label: "High" },
    extreme: { width: "100%", color: "bg-bear", label: "Extreme" },
  };
  const config = levels[level];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn("h-full rounded-full transition-all", config.color)}
          style={{ width: config.width }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{config.label}</span>
    </div>
  );
}
