"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  Crown,
  DollarSign,
  Flame,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

const STYLES = [
  {
    id: "conservative",
    label: "Konservatif",
    description: "Saham stabil, dividend tinggi, risiko rendah",
    icon: Shield,
    color: "info",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Kombinasi value + growth, risiko sedang",
    icon: Star,
    color: "primary",
  },
  {
    id: "aggressive",
    label: "Agresif",
    description: "Growth tinggi, momentum kuat, risiko tinggi",
    icon: Flame,
    color: "warning",
  },
];

export default function RecommendationsPage() {
  const [style, setStyle] = useState("balanced");

  const recs = useQuery({
    queryKey: ["recommendations", style],
    queryFn: () => api.recommendations(style),
  });

  const data = recs.data;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Rekomendasi Hari Ini"
        description="Saham terbaik yang direkomendasikan berdasarkan gaya investasi Anda. Update setiap hari."
        badge="AI"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} className={recs.isFetching ? "animate-spin" : ""} />}
            onClick={() => recs.refetch()}
          >
            Refresh
          </Button>
        }
      />

      {/* Style Selection */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pilih Gaya Investasi Anda
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {STYLES.map((s) => {
            const Icon = s.icon;
            const isActive = style === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "group flex flex-col items-start rounded-2xl border p-5 text-left transition-all duration-200",
                  isActive
                    ? "border-primary/50 bg-primary/10 shadow-glow-sm"
                    : "border-border/50 bg-card hover:border-border hover:bg-card-hover hover:-translate-y-0.5",
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground",
                )}>
                  <Icon size={20} />
                </div>
                <h3 className="mt-3 text-sm font-bold">{s.label}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">{s.description}</p>
                {isActive && <Badge variant="primary" className="mt-2">Selected</Badge>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Loading */}
      {recs.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {data && data.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Crown size={14} className="text-warning" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top {data.length} Picks — {STYLES.find((s) => s.id === style)?.label}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((rec: any, idx: number) => (
              <RecommendationCard key={rec.symbol} rec={rec} rank={idx + 1} />
            ))}
          </div>
        </section>
      )}

      {data && data.length === 0 && (
        <Card variant="glass">
          <div className="flex flex-col items-center py-12 text-center">
            <Sparkles size={32} className="text-muted-foreground" />
            <h3 className="mt-4 text-sm font-semibold">Tidak ada rekomendasi</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tidak ada saham yang memenuhi kriteria saat ini. Coba gaya investasi lain.
            </p>
          </div>
        </Card>
      )}

      {/* Guide */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">Cara Menggunakan Rekomendasi</h3>
        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span><strong className="text-foreground">Entry:</strong> Harga beli yang disarankan (harga saat ini)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bear" />
            <span><strong className="text-foreground">Stop Loss:</strong> Jual rugi di sini untuk batasi kerugian</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />
            <span><strong className="text-foreground">Target:</strong> Jual untung di sini (take profit)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            <span><strong className="text-foreground">R:R Ratio:</strong> Potensi untung vs rugi. Minimal 1.5:1 = bagus</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, rank }: { rec: any; rank: number }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1">
      {/* Rank badge */}
      <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-white shadow-glow-sm">
        {rank}
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link href={`/stock/${rec.symbol}`} className="text-lg font-bold text-primary hover:underline">
            {rec.symbol}
          </Link>
          <Badge variant={rec.rating.includes("Buy") ? "bull" : rec.rating === "Hold" ? "warning" : "bear"}>
            {rec.rating}
          </Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{rec.name}</p>
        {rec.sector && <Badge variant="default" className="mt-1">{rec.sector}</Badge>}

        {/* Price */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xl font-bold tabular">${formatPrice(rec.price)}</span>
          <ChangeBadge value={rec.change_percent} showIcon size="md" />
        </div>

        {/* Score */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${rec.score}%`, backgroundColor: getScoreColor(rec.score) }}
            />
          </div>
          <span className="text-xs font-bold tabular">{rec.score}</span>
        </div>

        {/* Why */}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {rec.why}
        </p>

        {/* Entry/SL/TP */}
        {rec.entry && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-info/10 px-2 py-1.5">
              <span className="text-[9px] text-info">Entry</span>
              <p className="text-[11px] font-bold tabular">${formatPrice(rec.entry)}</p>
            </div>
            <div className="rounded-lg bg-bear/10 px-2 py-1.5">
              <span className="text-[9px] text-bear">SL</span>
              <p className="text-[11px] font-bold tabular">${formatPrice(rec.stop_loss)}</p>
            </div>
            <div className="rounded-lg bg-bull/10 px-2 py-1.5">
              <span className="text-[9px] text-bull">Target</span>
              <p className="text-[11px] font-bold tabular">${formatPrice(rec.target)}</p>
            </div>
          </div>
        )}

        {/* R:R */}
        {rec.risk_reward && (
          <div className="mt-2 text-center">
            <Badge variant={rec.risk_reward >= 1.5 ? "bull" : "warning"}>
              Risk/Reward: {rec.risk_reward}:1
            </Badge>
          </div>
        )}
      </div>

      {/* View detail link */}
      <Link
        href={`/score?symbol=${rec.symbol}`}
        className="flex items-center justify-center gap-1 border-t border-border/30 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-primary"
      >
        Lihat Skor Detail <ArrowRight size={11} />
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
