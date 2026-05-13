"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";

import { Card } from "@/components/Card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

function getSeverity(change: number): { label: string; variant: "warning" | "bear" | "info" } {
  const drop = Math.abs(change);
  if (drop >= 7) return { label: "Heavy Dip", variant: "bear" };
  if (drop >= 5) return { label: "Moderate Dip", variant: "warning" };
  return { label: "Light Dip", variant: "info" };
}

function getScoreColor(score: number): string {
  if (score >= 75) return "rgb(34, 197, 94)";
  if (score >= 60) return "rgb(132, 204, 22)";
  if (score >= 45) return "rgb(245, 158, 11)";
  if (score >= 30) return "rgb(249, 115, 22)";
  return "rgb(239, 68, 68)";
}

export default function OpportunitiesPage() {
  const dips = useQuery({
    queryKey: ["buy-the-dip"],
    queryFn: () => api.buyTheDip(-3, 50),
    refetchInterval: 60_000,
  });

  const data = dips.data;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Buy the Dip Detector"
        description="Saham bagus yang lagi turun — peluang beli saat diskon. Auto-refresh setiap 60 detik."
        badge="New"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} className={dips.isFetching ? "animate-spin" : ""} />}
            onClick={() => dips.refetch()}
          >
            Refresh
          </Button>
        }
      />

      {/* Loading */}
      {dips.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && data.length === 0 && (
        <Card variant="glass">
          <div className="flex flex-col items-center py-12 text-center">
            <ShieldCheck size={32} className="text-bull" />
            <h3 className="mt-4 text-sm font-semibold">Market is calm today</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tidak ada saham bagus yang turun signifikan hari ini. Cek lagi nanti!
            </p>
          </div>
        </Card>
      )}

      {/* Dip Cards */}
      {data && data.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown size={14} className="text-bear" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {data.length} Dip Opportunities Found
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((dip: any) => (
              <DipCard key={dip.symbol} dip={dip} />
            ))}
          </div>
        </section>
      )}

      {/* Tips Section */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle size={14} className="text-warning" />
          Tips Buy the Dip yang Aman
        </h3>
        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">Cek Fundamental:</strong> Pastikan penurunan bukan karena masalah fundamental perusahaan
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />
            <span>
              <strong className="text-foreground">Score Tinggi:</strong> Prioritaskan saham dengan skor &gt; 70 — artinya fundamental & teknikal masih bagus
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            <span>
              <strong className="text-foreground">Dollar Cost Average:</strong> Jangan all-in. Beli bertahap untuk kurangi risiko
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bear" />
            <span>
              <strong className="text-foreground">Gunakan Stop Loss:</strong> Selalu pasang SL untuk batasi kerugian jika harga terus turun
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DipCard({ dip }: { dip: any }) {
  const severity = getSeverity(dip.change_percent);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={`/stock/${dip.symbol}`} className="text-lg font-bold text-primary hover:underline">
              {dip.symbol}
            </Link>
            <Badge variant={severity.variant}>{severity.label}</Badge>
          </div>
          <TrendingDown size={16} className="text-bear" />
        </div>
        {dip.name && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{dip.name}</p>
        )}

        {/* Price & Change */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xl font-bold tabular">${formatPrice(dip.price)}</span>
          <ChangeBadge value={dip.change_percent} showIcon size="md" />
        </div>

        {/* Score Bar */}
        {dip.score != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Quality Score</span>
              <span className="font-bold tabular">{dip.score}/100</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${dip.score}%`, backgroundColor: getScoreColor(dip.score) }}
              />
            </div>
          </div>
        )}

        {/* Reason */}
        {dip.reason && (
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {dip.reason}
          </p>
        )}

        {/* Entry / SL / Target */}
        {dip.entry && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-info/10 px-2 py-1.5">
              <span className="text-[9px] text-info">Entry</span>
              <p className="text-[11px] font-bold tabular">${formatPrice(dip.entry)}</p>
            </div>
            <div className="rounded-lg bg-bear/10 px-2 py-1.5">
              <span className="text-[9px] text-bear">SL</span>
              <p className="text-[11px] font-bold tabular">${formatPrice(dip.stop_loss)}</p>
            </div>
            <div className="rounded-lg bg-bull/10 px-2 py-1.5">
              <span className="text-[9px] text-bull">Target</span>
              <p className="text-[11px] font-bold tabular">${formatPrice(dip.target)}</p>
            </div>
          </div>
        )}
      </div>

      {/* View detail link */}
      <Link
        href={`/score?symbol=${dip.symbol}`}
        className="flex items-center justify-center gap-1 border-t border-border/30 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-primary"
      >
        Lihat Skor Detail <ArrowRight size={11} />
      </Link>
    </div>
  );
}
