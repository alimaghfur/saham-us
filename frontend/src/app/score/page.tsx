"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  DollarSign,
  Gauge,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function ScorePage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const score = useQuery({
    queryKey: ["stock-score", searchSymbol],
    queryFn: () => api.stockScore(searchSymbol),
    enabled: !!searchSymbol,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (sym) setSearchSymbol(sym);
  }

  const data = score.data;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Stock Score"
        description="Skor komprehensif 1-100 untuk setiap saham. Gabungan analisa fundamental + teknikal dalam satu angka."
        badge="AI"
      />

      {/* Search */}
      <Card variant="glass" padding="lg">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
              <Gauge size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Cek Skor Saham</h2>
              <p className="text-[11px] text-muted-foreground">
                Masukkan ticker saham US untuk melihat skor dan rekomendasi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Ketik ticker... (AAPL, NVDA, TSLA)"
                className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <Button type="submit" disabled={!symbol.trim() || score.isLoading}>
              {score.isLoading ? "Loading..." : "Analisa"}
            </Button>
          </div>
          {/* Quick picks */}
          <div className="flex flex-wrap gap-1.5">
            {["AAPL", "NVDA", "MSFT", "GOOGL", "TSLA", "AMZN", "META", "JPM"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSymbol(s); setSearchSymbol(s); }}
                className="rounded-lg bg-muted/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Loading */}
      {score.isLoading && (
        <div className="flex flex-col items-center py-16">
          <div className="h-32 w-32 animate-pulse rounded-full bg-muted/30" />
          <p className="mt-4 text-sm text-muted-foreground">Menganalisa {searchSymbol}...</p>
        </div>
      )}

      {/* Score Result */}
      {data && !score.isLoading && (
        <>
          {/* Main Score */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Score Gauge */}
            <Card variant="gradient" className="lg:col-span-1">
              <div className="flex flex-col items-center py-6">
                {/* SVG Gauge */}
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="rgb(var(--muted))" strokeWidth="10"
                      strokeDasharray="314" strokeDashoffset="78.5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={getScoreColor(data.overall_score)}
                      strokeWidth="10"
                      strokeDasharray="314"
                      strokeDashoffset={314 - (235.5 * data.overall_score) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-bold">{data.overall_score}</span>
                    <span className="text-[10px] text-muted-foreground">/ 100</span>
                  </div>
                </div>

                <Badge
                  variant={data.rating_color === "bull" ? "bull" : data.rating_color === "bear" ? "bear" : "warning"}
                  className="mt-4 text-sm"
                  dot
                >
                  {data.rating}
                </Badge>

                <h2 className="mt-3 text-lg font-bold">{data.symbol}</h2>
                <p className="text-xs text-muted-foreground">{data.name}</p>

                {/* Risk Level */}
                <div className="mt-4 flex items-center gap-2">
                  <Shield size={12} className="text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Risk Level:</span>
                  <Badge variant={data.risk_level === "Low" ? "bull" : data.risk_level === "High" ? "bear" : "warning"}>
                    {data.risk_level}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Sub-scores + Summary */}
            <Card className="lg:col-span-2">
              <div className="space-y-5 p-2">
                {/* Summary */}
                <div className="rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ringkasan Analisa
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed">{data.summary}</p>
                </div>

                {/* Sub-scores */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Breakdown Skor
                  </h3>
                  {data.sub_scores.map((sub: any) => (
                    <ScoreBar
                      key={sub.category}
                      icon={getCategoryIcon(sub.category)}
                      label={sub.category}
                      score={sub.score}
                      sublabel={sub.label}
                      details={sub.details}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Trading Plan */}
          {data.entry_zone && (
            <Card title="Trading Plan" icon={<Target size={14} />} subtitle="Berdasarkan ATR (Average True Range)">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-info">Entry Zone</span>
                  <p className="mt-2 text-lg font-bold text-info">{data.entry_zone}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Area beli yang disarankan</p>
                </div>
                <div className="rounded-xl border border-bear/30 bg-bear/5 p-4 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-bear">Stop Loss</span>
                  <p className="mt-2 text-lg font-bold text-bear">{data.stop_loss}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Jual jika turun ke sini</p>
                </div>
                <div className="rounded-xl border border-bull/30 bg-bull/5 p-4 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-bull">Target Profit</span>
                  <p className="mt-2 text-lg font-bold text-bull">{data.target}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Target take profit</p>
                </div>
              </div>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Link href={`/stock/${data.symbol}`}>
              <Button variant="outline" size="sm" icon={<BarChart3 size={14} />}>
                Lihat Detail {data.symbol}
              </Button>
            </Link>
            <Link href="/recommendations">
              <Button variant="ghost" size="sm" icon={<Sparkles size={14} />}>
                Lihat Rekomendasi Hari Ini
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Empty state */}
      {!data && !score.isLoading && !searchSymbol && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={<DollarSign size={18} />}
            title="Valuation Score"
            description="Seberapa murah/mahal saham berdasarkan PE, PB ratio"
          />
          <InfoCard
            icon={<Shield size={18} />}
            title="Quality Score"
            description="Kualitas bisnis: ROE, profit margin, utang"
          />
          <InfoCard
            icon={<TrendingUp size={18} />}
            title="Growth Score"
            description="Pertumbuhan revenue dan earnings perusahaan"
          />
          <InfoCard
            icon={<Activity size={18} />}
            title="Momentum Score"
            description="Arah trend harga: bullish, bearish, atau netral"
          />
        </div>
      )}
    </div>
  );
}

function ScoreBar({
  icon,
  label,
  score,
  sublabel,
  details,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  sublabel: string;
  details: string;
}) {
  return (
    <div className="rounded-xl bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs font-semibold">{label}</span>
          <Badge variant={score >= 65 ? "bull" : score >= 45 ? "warning" : "bear"} className="text-[9px]">
            {sublabel}
          </Badge>
        </div>
        <span className="text-sm font-bold tabular">{score}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreColor(score),
          }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">{details}</p>
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 transition-all hover:border-border hover:-translate-y-0.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Valuation": return <DollarSign size={14} />;
    case "Quality": return <Shield size={14} />;
    case "Growth": return <TrendingUp size={14} />;
    case "Momentum": return <Activity size={14} />;
    default: return <BarChart3 size={14} />;
  }
}

function getScoreColor(score: number): string {
  if (score >= 75) return "rgb(34, 197, 94)";
  if (score >= 60) return "rgb(132, 204, 22)";
  if (score >= 45) return "rgb(245, 158, 11)";
  if (score >= 30) return "rgb(249, 115, 22)";
  return "rgb(239, 68, 68)";
}
