"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Gauge,
  PieChart,
  Shield,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

interface WatchlistItem {
  symbol: string;
  name?: string;
  sector?: string;
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-500",
  Healthcare: "bg-emerald-500",
  "Financial Services": "bg-amber-500",
  "Consumer Cyclical": "bg-purple-500",
  "Communication Services": "bg-pink-500",
  Energy: "bg-orange-500",
  Industrials: "bg-cyan-500",
  "Consumer Defensive": "bg-teal-500",
  Utilities: "bg-lime-500",
  "Real Estate": "bg-rose-500",
  "Basic Materials": "bg-yellow-500",
  Other: "bg-gray-500",
};

export default function RiskPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("watchlist");
      if (stored) {
        const parsed = JSON.parse(stored);
        setWatchlist(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setWatchlist([]);
    }
  }, []);

  const symbols = watchlist.map((w) => w.symbol);

  // Fetch quotes for all watchlist stocks
  const quotesQuery = useQuery({
    queryKey: ["risk-quotes", symbols],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      const results = await Promise.allSettled(
        symbols.map((s) => api.profile(s))
      );
      return results
        .filter((r) => r.status === "fulfilled")
        .map((r: any) => r.value);
    },
    enabled: symbols.length > 0,
  });

  const profiles = quotesQuery.data ?? [];

  // Calculate sector concentration
  const sectorCounts: Record<string, number> = {};
  profiles.forEach((p: any) => {
    const sector = p?.sector || "Other";
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  });

  const totalStocks = profiles.length || 1;
  const sectorAllocation = Object.entries(sectorCounts)
    .map(([sector, count]) => ({
      sector,
      count,
      percent: Math.round((count / totalStocks) * 100),
    }))
    .sort((a, b) => b.percent - a.percent);

  // Calculate tech concentration
  const techCount = sectorCounts["Technology"] || 0;
  const techPercent = Math.round((techCount / totalStocks) * 100);
  const isTechHeavy = techPercent > 50;

  // Calculate diversification score (1-100)
  const uniqueSectors = Object.keys(sectorCounts).length;
  let diversificationScore = 0;
  if (profiles.length > 0) {
    // More sectors = better score
    const sectorScore = Math.min(uniqueSectors * 12, 50);
    // More even distribution = better score
    const maxConcentration = Math.max(...Object.values(sectorCounts)) / totalStocks;
    const concentrationScore = Math.round((1 - maxConcentration) * 50);
    diversificationScore = Math.min(100, sectorScore + concentrationScore);
  }

  // Risk level
  const riskLevel =
    diversificationScore >= 70 ? "Low" : diversificationScore >= 40 ? "Medium" : "High";
  const riskVariant =
    riskLevel === "Low" ? "bull" : riskLevel === "Medium" ? "warning" : "bear";

  // Suggestions
  const suggestions: string[] = [];
  const missingSectors = [
    "Energy",
    "Healthcare",
    "Financial Services",
    "Industrials",
    "Consumer Defensive",
    "Utilities",
  ].filter((s) => !sectorCounts[s]);

  if (isTechHeavy) {
    suggestions.push(
      `Tech stocks make up ${techPercent}% of your watchlist. Consider diversifying into other sectors.`
    );
  }
  if (missingSectors.length > 0 && profiles.length > 0) {
    const top3 = missingSectors.slice(0, 3).join(", ");
    suggestions.push(`Consider adding ${top3} stocks for better balance.`);
  }
  if (profiles.length < 5) {
    suggestions.push("Add more stocks to your watchlist for better diversification analysis.");
  }
  if (diversificationScore < 40 && profiles.length >= 3) {
    suggestions.push("Your portfolio is highly concentrated. Spread across more sectors to reduce risk.");
  }
  if (diversificationScore >= 70) {
    suggestions.push("Good diversification! Keep maintaining balance across sectors.");
  }

  const hasData = profiles.length > 0;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Risk Dashboard"
        description="Analisa diversifikasi dan konsentrasi sektor dari watchlist kamu."
        badge="Portfolio"
      />

      {/* Score Cards */}
      {symbols.length === 0 ? (
        <Card title="No Watchlist Data" icon={<ShieldAlert size={14} />}>
          <div className="flex flex-col items-center py-12 text-center">
            <ShieldAlert size={48} className="text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Add stocks to your Watchlist first to see risk analysis.
            </p>
            <a
              href="/watchlist"
              className="mt-4 rounded-xl bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              Go to Watchlist
            </a>
          </div>
        </Card>
      ) : quotesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Diversification Score"
              value={`${diversificationScore}`}
              change={`${riskLevel} Risk`}
              changeType={riskLevel === "Low" ? "bull" : riskLevel === "High" ? "bear" : "neutral"}
              icon={<Gauge size={16} />}
            />
            <StatCard
              label="Unique Sectors"
              value={`${uniqueSectors}`}
              change={`of 11 sectors`}
              changeType="neutral"
              icon={<PieChart size={16} />}
            />
            <StatCard
              label="Total Stocks"
              value={`${profiles.length}`}
              change="in watchlist"
              changeType="neutral"
              icon={<BarChart3 size={16} />}
            />
            <StatCard
              label="Tech Concentration"
              value={`${techPercent}%`}
              change={isTechHeavy ? "Over-concentrated!" : "Within range"}
              changeType={isTechHeavy ? "bear" : "bull"}
              icon={<Shield size={16} />}
            />
          </div>

          {/* Main content */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Sector Allocation Chart */}
            <Card
              title="Sector Allocation"
              subtitle="Distribution of stocks by sector"
              icon={<PieChart size={14} />}
            >
              {hasData ? (
                <div className="space-y-3">
                  {sectorAllocation.map((item) => (
                    <div key={item.sector} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.sector}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.count} stock{item.count > 1 ? "s" : ""}
                          </span>
                          <Badge
                            variant={
                              item.percent > 50
                                ? "bear"
                                : item.percent > 30
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {item.percent}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            SECTOR_COLORS[item.sector] || "bg-gray-500"
                          )}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No allocation data available.
                </p>
              )}
            </Card>

            {/* Diversification Score Gauge */}
            <Card
              title="Diversification Gauge"
              subtitle="Overall portfolio balance score"
              icon={<Gauge size={14} />}
            >
              <div className="flex flex-col items-center py-6">
                {/* Gauge Visual */}
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="rgb(var(--muted))"
                      strokeWidth="10"
                      strokeDasharray="314"
                      strokeDashoffset="78.5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={getDiversificationColor(diversificationScore)}
                      strokeWidth="10"
                      strokeDasharray="314"
                      strokeDashoffset={314 - (235.5 * diversificationScore) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-bold">{diversificationScore}</span>
                    <span className="text-[10px] text-muted-foreground">/ 100</span>
                  </div>
                </div>

                <Badge variant={riskVariant as any} className="mt-4" dot>
                  {riskLevel} Risk
                </Badge>

                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {diversificationScore >= 70
                    ? "Your portfolio is well-diversified across sectors."
                    : diversificationScore >= 40
                      ? "Moderate diversification. Room for improvement."
                      : "Low diversification. Consider adding different sectors."}
                </p>
              </div>
            </Card>
          </section>

          {/* Warnings & Suggestions */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Warnings */}
            {(isTechHeavy || diversificationScore < 40) && (
              <Card
                title="Warnings"
                subtitle="Issues requiring attention"
                icon={<AlertTriangle size={14} />}
              >
                <div className="space-y-2">
                  {isTechHeavy && (
                    <div className="flex items-start gap-3 rounded-xl border border-bear/20 bg-bear/5 px-4 py-3">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-bear" />
                      <div>
                        <p className="text-sm font-medium text-bear">Tech Over-Concentration</p>
                        <p className="text-xs text-muted-foreground">
                          {techPercent}% of your watchlist is in Technology. If the tech sector
                          corrects, your entire portfolio would be significantly impacted.
                        </p>
                      </div>
                    </div>
                  )}
                  {diversificationScore < 40 && (
                    <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                      <div>
                        <p className="text-sm font-medium text-warning">Low Diversification</p>
                        <p className="text-xs text-muted-foreground">
                          Your portfolio is concentrated in {uniqueSectors} sector
                          {uniqueSectors > 1 ? "s" : ""}. Consider spreading across 5+ sectors.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Suggestions */}
            <Card
              title="Suggestions"
              subtitle="Recommendations for better balance"
              icon={<CheckCircle size={14} />}
              className={!isTechHeavy && diversificationScore >= 40 ? "lg:col-span-2" : ""}
            >
              <div className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3"
                  >
                    <TrendingUp size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}

      {/* Info Footer */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">About Risk Analysis</h3>
        <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />
            <span><strong className="text-foreground">Score 70-100:</strong> Well diversified — lower risk exposure</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            <span><strong className="text-foreground">Score 40-69:</strong> Moderate — some concentration risk</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bear" />
            <span><strong className="text-foreground">Score 0-39:</strong> High risk — portfolio heavily concentrated</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span><strong className="text-foreground">Ideal:</strong> 5+ sectors with no single sector &gt;30%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDiversificationColor(score: number): string {
  if (score >= 70) return "rgb(34, 197, 94)";
  if (score >= 50) return "rgb(132, 204, 22)";
  if (score >= 40) return "rgb(245, 158, 11)";
  if (score >= 20) return "rgb(249, 115, 22)";
  return "rgb(239, 68, 68)";
}
