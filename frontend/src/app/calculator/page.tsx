"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  DollarSign,
  Info,
  PieChart,
  Shield,
  Target,
  TrendingDown,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export default function CalculatorPage() {
  const [budget, setBudget] = useState("5000");
  const [riskPercent, setRiskPercent] = useState("2");
  const [stockPrice, setStockPrice] = useState("150");
  const [stopLoss, setStopLoss] = useState("142");
  const [targetPrice, setTargetPrice] = useState("165");

  const result = useMemo(() => {
    const b = parseFloat(budget) || 0;
    const riskPct = parseFloat(riskPercent) || 0;
    const price = parseFloat(stockPrice) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(targetPrice) || 0;

    if (!b || !price || !sl || price <= 0) {
      return null;
    }

    const maxRiskDollar = (b * riskPct) / 100;
    const riskPerShare = Math.abs(price - sl);
    const shares = riskPerShare > 0 ? Math.floor(maxRiskDollar / riskPerShare) : 0;
    const totalCost = shares * price;
    const actualRisk = shares * riskPerShare;
    const portfolioAllocation = b > 0 ? (totalCost / b) * 100 : 0;

    // Risk/Reward
    const rewardPerShare = tp > price ? tp - price : 0;
    const riskReward = riskPerShare > 0 && rewardPerShare > 0 ? rewardPerShare / riskPerShare : 0;
    const potentialProfit = shares * rewardPerShare;
    const slPercent = price > 0 ? ((price - sl) / price) * 100 : 0;
    const tpPercent = price > 0 ? ((tp - price) / price) * 100 : 0;

    return {
      shares,
      totalCost,
      maxRiskDollar,
      actualRisk,
      riskPerShare,
      portfolioAllocation,
      riskReward,
      potentialProfit,
      slPercent,
      tpPercent,
      affordable: totalCost <= b,
    };
  }, [budget, riskPercent, stockPrice, stopLoss, targetPrice]);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Position Size Calculator"
        description="Hitung berapa saham yang boleh dibeli berdasarkan budget dan toleransi risiko Anda. Jangan pernah overlot!"
        badge="Tool"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card title="Input Parameters" icon={<Calculator size={14} />}>
          <div className="space-y-5">
            {/* Budget */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <DollarSign size={12} />
                Total Budget / Portfolio ($)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Total uang yang Anda alokasikan untuk investasi</p>
            </div>

            {/* Risk % */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Shield size={12} />
                Risk Per Trade (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.5"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="w-20 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-center text-sm font-bold outline-none focus:border-primary/50"
                />
                <span className="text-sm font-bold">%</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setRiskPercent(v.toString())}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all",
                      parseFloat(riskPercent) === v ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {v}%{v === 1 ? " (safe)" : v === 2 ? " (recommended)" : v === 5 ? " (aggressive)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Price */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Target size={12} />
                Harga Saham Saat Ini ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={stockPrice}
                onChange={(e) => setStockPrice(e.target.value)}
                placeholder="150.00"
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <TrendingDown size={12} className="text-bear" />
                Stop Loss Level ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="142.00"
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none focus:border-bear/50 focus:ring-1 focus:ring-bear/20"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Harga di mana Anda akan cut loss (jual rugi)</p>
            </div>

            {/* Target Price */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Target size={12} className="text-bull" />
                Target Profit ($) - Optional
              </label>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="165.00"
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none focus:border-bull/50 focus:ring-1 focus:ring-bull/20"
              />
            </div>
          </div>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {result && result.shares > 0 ? (
            <>
              {/* Main Result */}
              <Card variant="gradient">
                <div className="flex flex-col items-center py-6 text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Jumlah Saham yang Boleh Dibeli
                  </span>
                  <span className="mt-2 text-5xl font-bold text-primary">
                    {result.shares}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">shares</span>
                  <div className="mt-4 flex items-center gap-4 text-xs">
                    <span>Total: <strong>${formatPrice(result.totalCost)}</strong></span>
                    <span>Max Loss: <strong className="text-bear">-${formatPrice(result.actualRisk)}</strong></span>
                  </div>
                  {!result.affordable && (
                    <Badge variant="bear" className="mt-3">⚠️ Melebihi budget! Kurangi jumlah saham.</Badge>
                  )}
                </div>
              </Card>

              {/* Details */}
              <Card title="Detail Perhitungan" icon={<Info size={14} />}>
                <div className="space-y-3">
                  <DetailRow label="Budget Total" value={`$${formatPrice(parseFloat(budget))}`} />
                  <DetailRow label="Risk Per Trade" value={`${riskPercent}% = $${formatPrice(result.maxRiskDollar)}`} color="warning" />
                  <DetailRow label="Risk Per Share" value={`$${formatPrice(result.riskPerShare)}`} />
                  <DetailRow label="Max Shares" value={`$${formatPrice(result.maxRiskDollar)} ÷ $${formatPrice(result.riskPerShare)} = ${result.shares} shares`} color="primary" />
                  <div className="border-t border-border/30 pt-3">
                    <DetailRow label="Total Cost" value={`$${formatPrice(result.totalCost)}`} />
                    <DetailRow label="Portfolio Allocation" value={`${result.portfolioAllocation.toFixed(1)}%`} color={result.portfolioAllocation > 25 ? "bear" : "bull"} />
                    <DetailRow label="Actual Max Loss" value={`-$${formatPrice(result.actualRisk)}`} color="bear" />
                    <DetailRow label="Stop Loss %" value={`-${result.slPercent.toFixed(1)}%`} color="bear" />
                  </div>
                  {result.riskReward > 0 && (
                    <div className="border-t border-border/30 pt-3">
                      <DetailRow label="Target Profit %" value={`+${result.tpPercent.toFixed(1)}%`} color="bull" />
                      <DetailRow label="Potential Profit" value={`+$${formatPrice(result.potentialProfit)}`} color="bull" />
                      <DetailRow
                        label="Risk:Reward Ratio"
                        value={`1:${result.riskReward.toFixed(1)}`}
                        color={result.riskReward >= 2 ? "bull" : result.riskReward >= 1.5 ? "warning" : "bear"}
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Visual Risk Bar */}
              <Card title="Portfolio Allocation Visual" icon={<PieChart size={14} />}>
                <div className="space-y-3">
                  <div className="h-6 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", result.portfolioAllocation > 25 ? "bg-bear" : result.portfolioAllocation > 15 ? "bg-warning" : "bg-bull")}
                      style={{ width: `${Math.min(result.portfolioAllocation, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{result.portfolioAllocation.toFixed(1)}% dari portfolio</span>
                    <Badge variant={result.portfolioAllocation > 25 ? "bear" : result.portfolioAllocation > 15 ? "warning" : "bull"}>
                      {result.portfolioAllocation > 25 ? "Terlalu besar!" : result.portfolioAllocation > 15 ? "Cukup besar" : "Aman"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Rekomendasi: jangan alokasikan lebih dari 20% portfolio di satu saham.
                  </p>
                </div>
              </Card>
            </>
          ) : (
            <Card variant="glass">
              <div className="flex flex-col items-center py-12 text-center">
                <Calculator size={32} className="text-muted-foreground" />
                <h3 className="mt-4 text-sm font-semibold">Isi parameter di sebelah kiri</h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Masukkan budget, risk %, harga saham, dan stop loss untuk menghitung jumlah saham yang aman dibeli.
                </p>
              </div>
            </Card>
          )}

          {/* Rules */}
          <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-4">
            <h3 className="text-xs font-semibold">Aturan Position Sizing</h3>
            <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Risk 1-2% per trade = paling aman untuk pemula</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />Jangan pernah risk lebih dari 5% portfolio di satu trade</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />R:R minimal 1:1.5 — potensi untung harus lebih besar dari risiko</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bear" />Kalau hitung menunjukkan 0 shares = risiko terlalu besar, jangan beli!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: "primary" | "bull" | "bear" | "warning" }) {
  const colorClass = color === "bull" ? "text-bull" : color === "bear" ? "text-bear" : color === "warning" ? "text-warning" : color === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular", colorClass)}>{value}</span>
    </div>
  );
}
