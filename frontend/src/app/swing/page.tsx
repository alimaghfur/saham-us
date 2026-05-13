"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  Crosshair,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { SkeletonTable } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

const SETUPS = [
  {
    id: "breakout",
    label: "Breakout",
    description: "Breaking above resistance with volume",
    icon: TrendingUp,
  },
  {
    id: "pullback",
    label: "Pullback to Support",
    description: "Retracing to key moving averages",
    icon: ArrowRight,
  },
  {
    id: "bounce",
    label: "Bounce Play",
    description: "Reversal from oversold conditions",
    icon: Target,
  },
  {
    id: "consolidation",
    label: "Consolidation Break",
    description: "Tightening range ready to expand",
    icon: Crosshair,
  },
];

export default function SwingPage() {
  const [activeSetup, setActiveSetup] = useState("breakout");

  const results = useQuery({
    queryKey: ["swing", activeSetup],
    queryFn: () => api.swingScan(activeSetup, 25),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Swing Trading"
        description="Scanner for swing trade setups — breakouts, pullbacks, and momentum plays."
        actions={
          <Badge variant="primary" dot>
            Auto-scan daily
          </Badge>
        }
      />

      {/* Setup Types */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SETUPS.map((setup) => {
          const Icon = setup.icon;
          const isActive = activeSetup === setup.id;
          return (
            <button
              key={setup.id}
              onClick={() => setActiveSetup(setup.id)}
              className={cn(
                "group flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200",
                isActive
                  ? "border-primary/50 bg-primary/10 shadow-glow-sm"
                  : "border-border/50 bg-card hover:border-border hover:bg-card-hover hover:-translate-y-0.5",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon size={18} />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{setup.label}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {setup.description}
              </p>
            </button>
          );
        })}
      </section>

      {/* Results */}
      <Card
        title={`${SETUPS.find((s) => s.id === activeSetup)?.label ?? "Swing"} Setups`}
        subtitle={
          results.data
            ? `${results.data.length} candidates found`
            : "Scanning..."
        }
        icon={<TrendingUp size={14} />}
      >
        {results.isLoading ? (
          <SkeletonTable rows={8} />
        ) : results.data && results.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Setup</th>
                  <th className="pb-3 pr-4 text-right">Price</th>
                  <th className="pb-3 pr-4 text-right">Entry</th>
                  <th className="pb-3 pr-4 text-right">Stop Loss</th>
                  <th className="pb-3 pr-4 text-right">Target</th>
                  <th className="pb-3 text-right">R:R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {results.data.map((r) => (
                  <tr
                    key={r.symbol}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/stock/${r.symbol}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {r.symbol}
                      </Link>
                      {r.name && (
                        <p className="text-[10px] text-muted-foreground">
                          {r.name.slice(0, 25)}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          r.setup_type === "breakout"
                            ? "bull"
                            : r.setup_type === "pullback"
                              ? "info"
                              : "primary"
                        }
                      >
                        {r.setup_type}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right tabular">
                      ${formatPrice(r.price)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular text-info">
                      ${formatPrice(r.entry)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular text-bear">
                      ${formatPrice(r.stop_loss)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular text-bull">
                      ${formatPrice(r.target)}
                    </td>
                    <td className="py-3 text-right">
                      {r.risk_reward != null ? (
                        <Badge
                          variant={r.risk_reward >= 2 ? "bull" : "warning"}
                        >
                          {r.risk_reward.toFixed(1)}:1
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Shield size={32} className="text-muted-foreground" />
            <h3 className="mt-4 text-sm font-semibold">No setups found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              No qualifying swing setups in the current market. Try a different
              setup type.
            </p>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/30 bg-card/50 px-4 py-3 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-info" /> Entry Zone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bear" /> Stop Loss
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bull" /> Target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" /> R:R &lt; 2
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bull" /> R:R &ge; 2
        </span>
      </div>
    </div>
  );
}
