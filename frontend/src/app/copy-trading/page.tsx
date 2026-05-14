"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Trophy, TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function CopyTradingPage() {
  const [sortBy, setSortBy] = useState("return");

  const { data, isLoading } = useQuery({
    queryKey: ["copy-trading", sortBy],
    queryFn: () => api.copyTradingTraders(10, sortBy),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Copy Trading"
        description="Follow top virtual traders — track their performance and simulate copying their trades."
        badge="Pro"
      />

      {/* Sort Controls */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
          {[
            { id: "return", label: "Return" },
            { id: "win_rate", label: "Win Rate" },
            { id: "sharpe", label: "Sharpe" },
            { id: "followers", label: "Followers" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                sortBy === opt.id
                  ? "bg-primary text-white"
                  : "border border-border/50 hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-48" />
          ))}
        </div>
      )}

      {data?.top_traders?.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.top_traders.map((trader: any) => (
            <div
              key={trader.trader_id}
              className="rounded-2xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:shadow-card-hover"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    #{trader.rank}
                  </div>
                  <div>
                    <div className="font-semibold">{trader.display_name}</div>
                    <div className="text-xs text-muted-foreground">{trader.strategy_name}</div>
                  </div>
                </div>
                <Badge variant={trader.risk_level === "Conservative" ? "success" : trader.risk_level === "Aggressive" ? "danger" : "default"}>
                  {trader.risk_level}
                </Badge>
              </div>

              {/* Description */}
              <p className="mt-2 text-xs text-muted-foreground">{trader.strategy_description}</p>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className={cn("text-lg font-bold tabular-nums", trader.performance?.total_return_pct > 0 ? "text-bull" : "text-bear")}>
                    {trader.performance?.total_return_pct > 0 ? "+" : ""}{trader.performance?.total_return_pct?.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">Return</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums">{trader.performance?.win_rate?.toFixed(0)}%</div>
                  <div className="text-[10px] text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums">{trader.performance?.sharpe_ratio?.toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground">Sharpe</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums">{trader.copiers_count}</div>
                  <div className="text-[10px] text-muted-foreground">Copiers</div>
                </div>
              </div>

              {/* Badges */}
              {trader.badges?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {trader.badges.map((badge: string) => (
                    <span key={badge} className="rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
                <span className="text-[10px] text-muted-foreground">
                  {trader.performance?.total_trades} trades · {trader.followers_count} followers
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Since {trader.since_date}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!data?.top_traders || data.top_traders.length === 0) && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Trophy size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Copy Trading</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Follow top virtual traders and simulate copying their trades with paper money.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
