"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
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

interface TopPrediction {
  symbol: string;
  current_price: number;
  overall_bias: string;
  overall_score: number;
  prediction_1d: {
    timeframe: string;
    direction: string;
    confidence: number;
    predicted_low: number;
    predicted_high: number;
    predicted_change_pct_low: number;
    predicted_change_pct_high: number;
    signals: string[];
  } | null;
  prediction_1w: {
    timeframe: string;
    direction: string;
    confidence: number;
    predicted_low: number;
    predicted_high: number;
    predicted_change_pct_low: number;
    predicted_change_pct_high: number;
    signals: string[];
  } | null;
  entry_point: {
    entry_price: number;
    stop_loss: number;
    target_1: number;
    target_2: number;
    risk_reward_ratio: number;
    entry_type: string;
    reasoning: string;
  } | null;
}

function BiasIcon({ bias }: { bias: string }) {
  if (bias === "bullish") return <ArrowUpRight className="h-4 w-4 text-green-400" />;
  if (bias === "bearish") return <ArrowDownRight className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

function BiasColor(bias: string) {
  if (bias === "bullish") return "text-green-400";
  if (bias === "bearish") return "text-red-400";
  return "text-slate-400";
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, (score + 100) / 2));
  const color = score > 30 ? "bg-green-500" : score < -30 ? "bg-red-500" : "bg-yellow-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PredictionPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { data: predictions, isLoading, error } = useQuery<TopPrediction[]>({
    queryKey: ["top-predictions"],
    queryFn: () => api.topPredictions(15),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const selectedPrediction = predictions?.find((p) => p.symbol === selectedSymbol);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Prediksi Saham"
        description="Prediksi otomatis untuk saham-saham US populer berdasarkan analisa teknikal (RSI, MACD, Bollinger Bands, Moving Averages, Volume)"
      />

      {/* Disclaimer */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
          <p className="text-xs text-yellow-300/80">
            <strong>Disclaimer:</strong> Prediksi ini berdasarkan analisa teknikal otomatis dan BUKAN saran investasi. Selalu lakukan riset sendiri sebelum trading.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-red-400">
          Gagal memuat prediksi. Pastikan backend sudah berjalan.
        </Card>
      )}

      {predictions && predictions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {predictions.map((p) => (
            <button
              key={p.symbol}
              onClick={() => setSelectedSymbol(p.symbol === selectedSymbol ? null : p.symbol)}
              className={cn(
                "rounded-xl border bg-slate-900/50 p-4 text-left transition-all hover:border-indigo-500/30 hover:bg-slate-800/50",
                selectedSymbol === p.symbol
                  ? "border-indigo-500/50 ring-1 ring-indigo-500/20"
                  : "border-slate-800",
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{p.symbol}</span>
                  <BiasIcon bias={p.overall_bias} />
                </div>
                <span className="text-sm font-semibold text-white">
                  ${p.current_price.toFixed(2)}
                </span>
              </div>

              {/* Bias & Score */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-medium capitalize", BiasColor(p.overall_bias))}>
                    {p.overall_bias}
                  </span>
                  <span className="text-xs text-slate-400">
                    Skor: {p.overall_score > 0 ? "+" : ""}{p.overall_score.toFixed(0)}
                  </span>
                </div>
                <ScoreBar score={p.overall_score} />
              </div>

              {/* 1D Prediction */}
              {p.prediction_1d && (
                <div className="mt-3 rounded-lg bg-slate-800/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase text-slate-500">1 Hari</span>
                    <span className={cn("text-xs font-medium", BiasColor(p.prediction_1d.direction))}>
                      {p.prediction_1d.confidence.toFixed(0)}% confidence
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      ${p.prediction_1d.predicted_low.toFixed(2)} - ${p.prediction_1d.predicted_high.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Entry Point hint */}
              {p.entry_point && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Crosshair className="h-3 w-3 text-indigo-400" />
                  <span className="text-[10px] text-indigo-300">
                    Entry: ${p.entry_point.entry_price.toFixed(2)} | RR: {p.entry_point.risk_reward_ratio.toFixed(1)}x
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedPrediction && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <Target className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{selectedPrediction.symbol} — Detail Prediksi</h3>
              <p className="text-xs text-slate-400">Harga saat ini: ${selectedPrediction.current_price.toFixed(2)}</p>
            </div>
          </div>

          {/* Predictions Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedPrediction.prediction_1d && (
              <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Prediksi 1 Hari</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Arah</span>
                    <span className={cn("text-xs font-medium capitalize", BiasColor(selectedPrediction.prediction_1d.direction))}>
                      {selectedPrediction.prediction_1d.direction}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Range</span>
                    <span className="text-xs text-white">
                      ${selectedPrediction.prediction_1d.predicted_low.toFixed(2)} - ${selectedPrediction.prediction_1d.predicted_high.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Confidence</span>
                    <span className="text-xs text-white">{selectedPrediction.prediction_1d.confidence.toFixed(0)}%</span>
                  </div>
                  {selectedPrediction.prediction_1d.signals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedPrediction.prediction_1d.signals.map((s, i) => (
                        <span key={i} className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedPrediction.prediction_1w && (
              <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Prediksi 1 Minggu</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Arah</span>
                    <span className={cn("text-xs font-medium capitalize", BiasColor(selectedPrediction.prediction_1w.direction))}>
                      {selectedPrediction.prediction_1w.direction}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Range</span>
                    <span className="text-xs text-white">
                      ${selectedPrediction.prediction_1w.predicted_low.toFixed(2)} - ${selectedPrediction.prediction_1w.predicted_high.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Confidence</span>
                    <span className="text-xs text-white">{selectedPrediction.prediction_1w.confidence.toFixed(0)}%</span>
                  </div>
                  {selectedPrediction.prediction_1w.signals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedPrediction.prediction_1w.signals.map((s, i) => (
                        <span key={i} className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Entry Point */}
          {selectedPrediction.entry_point && (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-indigo-300">
                <Crosshair className="h-3.5 w-3.5" />
                Entry Point
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-slate-500">Entry</p>
                  <p className="text-sm font-semibold text-white">${selectedPrediction.entry_point.entry_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Stop Loss</p>
                  <p className="text-sm font-semibold text-red-400">${selectedPrediction.entry_point.stop_loss.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Target 1</p>
                  <p className="text-sm font-semibold text-green-400">${selectedPrediction.entry_point.target_1.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Target 2</p>
                  <p className="text-sm font-semibold text-green-400">${selectedPrediction.entry_point.target_2.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-xs text-slate-400">Risk/Reward: <strong className="text-white">{selectedPrediction.entry_point.risk_reward_ratio.toFixed(1)}x</strong></span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  selectedPrediction.entry_point.entry_type === "buy"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400",
                )}>
                  {selectedPrediction.entry_point.entry_type}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{selectedPrediction.entry_point.reasoning}</p>
            </div>
          )}
        </Card>
      )}

      {predictions && predictions.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-slate-400">Tidak ada prediksi tersedia saat ini. Coba lagi nanti.</p>
        </Card>
      )}
    </div>
  );
}
