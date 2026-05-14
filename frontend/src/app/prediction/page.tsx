"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Crosshair,
  Minus,
  Search,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

// Types for prediction response
interface PredictionTimeframe {
  timeframe: string;
  direction: string;
  confidence: number;
  predicted_low: number;
  predicted_high: number;
  predicted_change_pct_low: number;
  predicted_change_pct_high: number;
  signals: string[];
}

interface EntryPoint {
  entry_price: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  risk_reward_ratio: number;
  entry_type: string;
  reasoning: string;
}

interface PredictionResponse {
  symbol: string;
  current_price: number;
  predictions: PredictionTimeframe[];
  entry_point: EntryPoint;
  overall_bias: string;
  overall_score: number;
  key_levels: Record<string, number>;
  disclaimer: string;
}

export default function PredictionPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const prediction = useQuery<PredictionResponse>({
    queryKey: ["prediction", searchSymbol],
    queryFn: () =>
      api.prediction(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      setSearchSymbol(symbol.trim().toUpperCase());
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Prediksi Saham"
        description="Prediksi pergerakan harga berdasarkan analisis teknikal — 1 hari, 1 minggu, 1 bulan."
        badge="AI-TA"
      />

      {/* Search Input */}
      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Masukkan simbol saham (contoh: AAPL, MSFT, NVDA)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:shadow-glow-sm active:scale-[0.98]"
          >
            Analisis
          </button>
        </form>
      </Card>

      {/* Loading */}
      {prediction.isLoading && (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-48" />
          ))}
        </div>
      )}

      {/* Error */}
      {prediction.isError && (
        <Card>
          <div className="flex items-center gap-3 text-bear">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">
              Gagal mengambil data untuk {searchSymbol}. Pastikan simbol saham benar.
            </span>
          </div>
        </Card>
      )}

      {/* Results */}
      {prediction.data && (
        <div className="space-y-6">
          {/* Overall Score */}
          <OverallScoreCard data={prediction.data} />

          {/* Predictions by Timeframe */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prediksi Per Timeframe
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {prediction.data.predictions.map((pred) => (
                <TimeframePredictionCard
                  key={pred.timeframe}
                  prediction={pred}
                  currentPrice={prediction.data!.current_price}
                />
              ))}
            </div>
          </section>

          {/* Entry Point */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Crosshair size={14} className="text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Entry Point & Risk Management
              </h2>
            </div>
            <EntryPointCard
              entry={prediction.data.entry_point}
              currentPrice={prediction.data.current_price}
            />
          </section>

          {/* Key Levels */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Level Penting
              </h2>
            </div>
            <KeyLevelsCard
              levels={prediction.data.key_levels}
              currentPrice={prediction.data.current_price}
            />
          </section>

          {/* Disclaimer */}
          <Card>
            <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {prediction.data.disclaimer}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!searchSymbol && !prediction.isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <TrendingUp size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Mulai Prediksi</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Masukkan simbol saham di atas untuk melihat prediksi harga 1 hari,
              1 minggu, dan 1 bulan beserta rekomendasi entry point.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSymbol(s);
                    setSearchSymbol(s);
                  }}
                  className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// --- Sub-components ---

function OverallScoreCard({ data }: { data: PredictionResponse }) {
  const biasColor =
    data.overall_bias === "bullish"
      ? "text-bull"
      : data.overall_bias === "bearish"
        ? "text-bear"
        : "text-muted-foreground";

  const biasIcon =
    data.overall_bias === "bullish" ? (
      <ArrowUpRight size={20} />
    ) : data.overall_bias === "bearish" ? (
      <ArrowDownRight size={20} />
    ) : (
      <Minus size={20} />
    );

  const biasLabel =
    data.overall_bias === "bullish"
      ? "BULLISH"
      : data.overall_bias === "bearish"
        ? "BEARISH"
        : "NETRAL";

  // Score bar position: score ranges from -100 to +100, normalize to 0-100%
  const scorePosition = ((data.overall_score + 100) / 200) * 100;

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl",
              data.overall_bias === "bullish"
                ? "bg-bull/10"
                : data.overall_bias === "bearish"
                  ? "bg-bear/10"
                  : "bg-muted/50",
            )}
          >
            <span className={biasColor}>{biasIcon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{data.symbol}</span>
              <Badge
                variant={
                  data.overall_bias === "bullish"
                    ? "success"
                    : data.overall_bias === "bearish"
                      ? "danger"
                      : "default"
                }
              >
                {biasLabel}
              </Badge>
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              Harga saat ini:{" "}
              <span className="font-semibold text-foreground">
                ${formatPrice(data.current_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Score gauge */}
        <div className="w-full max-w-[240px]">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Very Bearish</span>
            <span className="font-bold text-foreground">
              Score: {data.overall_score > 0 ? "+" : ""}
              {data.overall_score}
            </span>
            <span>Very Bullish</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-bear via-muted-foreground/20 to-bull">
            <div
              className="absolute top-0 h-full w-1 rounded-full bg-white shadow-md"
              style={{ left: `${scorePosition}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function TimeframePredictionCard({
  prediction,
  currentPrice,
}: {
  prediction: PredictionTimeframe;
  currentPrice: number;
}) {
  const timeframeLabel =
    prediction.timeframe === "1d"
      ? "1 Hari"
      : prediction.timeframe === "1w"
        ? "1 Minggu"
        : "1 Bulan";

  const dirColor =
    prediction.direction === "bullish"
      ? "text-bull"
      : prediction.direction === "bearish"
        ? "text-bear"
        : "text-muted-foreground";

  const dirBg =
    prediction.direction === "bullish"
      ? "bg-bull/5 border-bull/20"
      : prediction.direction === "bearish"
        ? "bg-bear/5 border-bear/20"
        : "bg-muted/30 border-border/50";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200 hover:shadow-card-hover",
        dirBg,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{timeframeLabel}</span>
        <Badge
          variant={
            prediction.direction === "bullish"
              ? "success"
              : prediction.direction === "bearish"
                ? "danger"
                : "default"
          }
        >
          {prediction.direction === "bullish"
            ? "NAIK"
            : prediction.direction === "bearish"
              ? "TURUN"
              : "NETRAL"}
        </Badge>
      </div>

      {/* Price Range */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Kisaran Harga</span>
          <span className="font-medium">
            Confidence: {prediction.confidence}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold tabular">
            ${formatPrice(prediction.predicted_low)}
          </span>
          <span className="text-xs text-muted-foreground">—</span>
          <span className="text-lg font-bold tabular">
            ${formatPrice(prediction.predicted_high)}
          </span>
        </div>

        {/* Percentage range */}
        <div className="flex items-center justify-between text-xs">
          <span
            className={cn(
              "font-medium tabular",
              prediction.predicted_change_pct_low >= 0
                ? "text-bull"
                : "text-bear",
            )}
          >
            {prediction.predicted_change_pct_low > 0 ? "+" : ""}
            {prediction.predicted_change_pct_low.toFixed(2)}%
          </span>
          <span className="text-muted-foreground">s/d</span>
          <span
            className={cn(
              "font-medium tabular",
              prediction.predicted_change_pct_high >= 0
                ? "text-bull"
                : "text-bear",
            )}
          >
            {prediction.predicted_change_pct_high > 0 ? "+" : ""}
            {prediction.predicted_change_pct_high.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Visual range bar */}
      <div className="mt-3">
        <div className="relative h-2 overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              "absolute h-full rounded-full",
              prediction.direction === "bullish"
                ? "bg-bull/60"
                : prediction.direction === "bearish"
                  ? "bg-bear/60"
                  : "bg-muted-foreground/40",
            )}
            style={{
              left: `${Math.max(0, 50 + prediction.predicted_change_pct_low * 5)}%`,
              width: `${Math.min(100, (prediction.predicted_change_pct_high - prediction.predicted_change_pct_low) * 5)}%`,
            }}
          />
          {/* Current price marker */}
          <div className="absolute left-1/2 top-0 h-full w-0.5 bg-foreground/50" />
        </div>
      </div>

      {/* Top 2 signals */}
      <div className="mt-3 space-y-1">
        {prediction.signals.slice(0, 3).map((signal, i) => (
          <div
            key={i}
            className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
          >
            <Zap size={10} className="mt-0.5 shrink-0 text-primary" />
            <span>{signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryPointCard({
  entry,
  currentPrice,
}: {
  entry: EntryPoint;
  currentPrice: number;
}) {
  const isBuy = entry.entry_type === "buy";

  return (
    <Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Entry details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                isBuy ? "bg-bull/10" : "bg-bear/10",
              )}
            >
              {isBuy ? (
                <ArrowUpRight size={18} className="text-bull" />
              ) : (
                <ArrowDownRight size={18} className="text-bear" />
              )}
            </div>
            <div>
              <span className="text-sm font-bold">
                Rekomendasi: {isBuy ? "BUY" : "SELL"}
              </span>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {entry.reasoning}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LevelBox
              label="Entry Price"
              value={entry.entry_price}
              color="primary"
              icon={<Crosshair size={12} />}
            />
            <LevelBox
              label="Stop Loss"
              value={entry.stop_loss}
              color="bear"
              icon={<Shield size={12} />}
            />
            <LevelBox
              label="Target 1"
              value={entry.target_1}
              color="bull"
              icon={<Target size={12} />}
            />
            <LevelBox
              label="Target 2"
              value={entry.target_2}
              color="bull"
              icon={<Target size={12} />}
            />
          </div>
        </div>

        {/* Right: Risk/Reward visual */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-6">
          <span className="text-xs font-medium text-muted-foreground">
            Risk/Reward Ratio
          </span>
          <span className="mt-2 text-4xl font-bold text-primary">
            1:{entry.risk_reward_ratio.toFixed(1)}
          </span>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-bear" />
              <span className="text-muted-foreground">
                Risk: ${formatPrice(Math.abs(entry.entry_price - entry.stop_loss))}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-bull" />
              <span className="text-muted-foreground">
                Reward: ${formatPrice(Math.abs(entry.target_1 - entry.entry_price))}
              </span>
            </div>
          </div>
          <div className="mt-4 w-full">
            <div className="relative flex h-4 overflow-hidden rounded-full">
              <div
                className="bg-bear/60"
                style={{
                  width: `${(1 / (1 + entry.risk_reward_ratio)) * 100}%`,
                }}
              />
              <div
                className="bg-bull/60"
                style={{
                  width: `${(entry.risk_reward_ratio / (1 + entry.risk_reward_ratio)) * 100}%`,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Risk</span>
              <span>Reward</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KeyLevelsCard({
  levels,
  currentPrice,
}: {
  levels: Record<string, number>;
  currentPrice: number;
}) {
  const sortedLevels = Object.entries(levels).sort(([, a], [, b]) => b - a);

  const labelMap: Record<string, string> = {
    resistance_2: "Resistance 2",
    resistance_1: "Resistance 1",
    support_1: "Support 1",
    support_2: "Support 2",
    sma_50: "SMA 50",
    sma_200: "SMA 200",
    bb_upper: "BB Upper",
    bb_lower: "BB Lower",
  };

  return (
    <Card>
      <div className="space-y-2">
        {sortedLevels.map(([key, value]) => {
          const isAbove = value > currentPrice;
          const pctDiff = ((value - currentPrice) / currentPrice) * 100;
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl px-4 py-2.5 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isAbove ? "bg-bull" : "bg-bear",
                  )}
                />
                <span className="text-sm font-medium">
                  {labelMap[key] || key}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular">
                  ${formatPrice(value)}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium tabular",
                    isAbove ? "text-bull" : "text-bear",
                  )}
                >
                  {pctDiff > 0 ? "+" : ""}
                  {pctDiff.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
        {/* Current price marker */}
        <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-bold text-primary">Harga Sekarang</span>
          </div>
          <span className="text-sm font-bold tabular text-primary">
            ${formatPrice(currentPrice)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function LevelBox({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "primary" | "bull" | "bear";
  icon: React.ReactNode;
}) {
  const colorClass =
    color === "bull"
      ? "text-bull bg-bull/10 border-bull/20"
      : color === "bear"
        ? "text-bear bg-bear/10 border-bear/20"
        : "text-primary bg-primary/10 border-primary/20";

  return (
    <div className={cn("rounded-xl border p-3", colorClass)}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
          {label}
        </span>
      </div>
      <div className="mt-1 text-lg font-bold tabular">${formatPrice(value)}</div>
    </div>
  );
}
