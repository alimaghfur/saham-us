"use client";

import React, { useState, useMemo } from "react";
import { Calendar, DollarSign, Repeat, TrendingUp } from "lucide-react";
import { Card, StatCard } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export default function DCAPage() {
  const [amount, setAmount] = useState("500");
  const [months, setMonths] = useState("12");
  const [currentPrice, setCurrentPrice] = useState("150");
  const [expectedReturn, setExpectedReturn] = useState("10");

  const result = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const mo = parseInt(months) || 0;
    const price = parseFloat(currentPrice) || 0;
    const retPct = parseFloat(expectedReturn) || 0;
    if (!amt || !mo || !price) return null;

    const totalInvested = amt * mo;
    const monthlyReturn = retPct / 12 / 100;
    let totalShares = 0;
    let portfolioValue = 0;

    for (let i = 1; i <= mo; i++) {
      const priceAtMonth = price * (1 + monthlyReturn * i);
      totalShares += amt / priceAtMonth;
      portfolioValue = totalShares * priceAtMonth;
    }

    const profit = portfolioValue - totalInvested;
    const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const avgPrice = totalShares > 0 ? totalInvested / totalShares : 0;

    return { totalInvested, totalShares: +totalShares.toFixed(2), portfolioValue: +portfolioValue.toFixed(2), profit: +profit.toFixed(2), profitPct: +profitPct.toFixed(2), avgPrice: +avgPrice.toFixed(2) };
  }, [amount, months, currentPrice, expectedReturn]);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="DCA Planner" description="Dollar Cost Averaging — rencana investasi berkala. Invest rutin setiap bulan untuk kurangi risiko timing." badge="Tool" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Parameter DCA" icon={<Repeat size={14} />}>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 text-xs font-medium text-muted-foreground">Investasi Per Bulan ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none focus:border-primary/50" />
              <div className="mt-2 flex gap-1.5">{[100,250,500,1000,2000].map(v=><button key={v} onClick={()=>setAmount(v.toString())} className={cn("rounded-lg px-2.5 py-1 text-[10px] font-medium",+amount===v?"bg-primary/20 text-primary":"bg-muted/50 text-muted-foreground hover:bg-muted")}>${v}</button>)}</div>
            </div>
            <div>
              <label className="mb-1.5 text-xs font-medium text-muted-foreground">Durasi (bulan)</label>
              <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none focus:border-primary/50" />
              <div className="mt-2 flex gap-1.5">{[6,12,24,36,60].map(v=><button key={v} onClick={()=>setMonths(v.toString())} className={cn("rounded-lg px-2.5 py-1 text-[10px] font-medium",+months===v?"bg-primary/20 text-primary":"bg-muted/50 text-muted-foreground hover:bg-muted")}>{v}mo</button>)}</div>
            </div>
            <div>
              <label className="mb-1.5 text-xs font-medium text-muted-foreground">Harga Saham Saat Ini ($)</label>
              <input type="number" step="0.01" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="mb-1.5 text-xs font-medium text-muted-foreground">Expected Annual Return (%)</label>
              <input type="number" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-lg font-bold outline-none focus:border-primary/50" />
              <div className="mt-2 flex gap-1.5">{[7,10,15,20].map(v=><button key={v} onClick={()=>setExpectedReturn(v.toString())} className={cn("rounded-lg px-2.5 py-1 text-[10px] font-medium",+expectedReturn===v?"bg-primary/20 text-primary":"bg-muted/50 text-muted-foreground hover:bg-muted")}>{v}%{v===10?" (S&P avg)":""}</button>)}</div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Total Investasi" value={`$${formatPrice(result.totalInvested)}`} icon={<DollarSign size={16} />} />
                <StatCard label="Estimasi Nilai" value={`$${formatPrice(result.portfolioValue)}`} icon={<TrendingUp size={16} />} />
                <StatCard label="Estimasi Profit" value={`+$${formatPrice(result.profit)}`} change={`+${result.profitPct}%`} changeType="bull" icon={<TrendingUp size={16} />} />
                <StatCard label="Total Saham" value={`${result.totalShares}`} change={`Avg: $${formatPrice(result.avgPrice)}`} changeType="neutral" icon={<Repeat size={16} />} />
              </div>
              <div className="rounded-xl bg-muted/20 p-4 text-xs text-muted-foreground">
                <p>Jika invest <strong className="text-primary">${amount}/bulan</strong> selama <strong className="text-primary">{months} bulan</strong> dengan return {expectedReturn}%/tahun, estimasi portfolio: <strong className="text-bull">${formatPrice(result.portfolioValue)}</strong> (profit <strong className="text-bull">+${formatPrice(result.profit)}</strong>).</p>
              </div>
            </>
          ) : (
            <Card variant="glass"><div className="flex flex-col items-center py-12 text-center"><Repeat size={32} className="text-muted-foreground" /><h3 className="mt-4 text-sm font-semibold">Isi parameter DCA</h3></div></Card>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">Kenapa DCA Cocok untuk Pemula?</h3>
        <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />Kurangi risiko timing — tidak perlu tebak harga terendah</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />Disiplin otomatis — invest rutin tanpa emosi</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />Average down — beli lebih banyak saat harga murah</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />S&P 500 historically +10%/tahun selama 30+ tahun</li>
        </ul>
      </div>
    </div>
  );
}
