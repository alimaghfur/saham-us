"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Search, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function MLPredictionPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const ml = useQuery({
    queryKey: ["ml-prediction", searchSymbol],
    queryFn: () => api.mlPrediction(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  const tfLabel: Record<string,string> = { "1d": "1 Hari", "1w": "1 Minggu", "1m": "1 Bulan" };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="ML Prediction" description="Prediksi berbasis Machine Learning — ensemble 4 model (Momentum, Mean Reversion, Trend, Volatility)." badge="AI" />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Masukkan simbol saham"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90">Predict</button>
        </form>
      </Card>

      {ml.isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({length:3}).map((_,i)=><SkeletonCard key={i} className="h-40"/>)}</div>}

      {ml.data && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold">{ml.data.symbol}</span>
                <span className="ml-3 text-sm text-muted-foreground">Model: {ml.data.model}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">${formatPrice(ml.data.current_price)}</div>
                <div className="text-xs text-muted-foreground">Akurasi backtest: {ml.data.backtest_hit_rate}%</div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(ml.data.predictions || {}).map(([tf, pred]: [string, any]) => (
              <div key={tf} className={cn("rounded-2xl border p-5", pred.direction === "bullish" ? "bg-bull/5 border-bull/20" : pred.direction === "bearish" ? "bg-bear/5 border-bear/20" : "bg-muted/30 border-border/50")}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{tfLabel[tf] || tf}</span>
                  <Badge variant={pred.direction === "bullish" ? "success" : pred.direction === "bearish" ? "danger" : "default"}>
                    {pred.direction.toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-3 text-2xl font-bold tabular">${formatPrice(pred.predicted_price)}</div>
                <div className={cn("mt-1 text-sm font-medium tabular", pred.predicted_change_pct > 0 ? "text-bull" : pred.predicted_change_pct < 0 ? "text-bear" : "text-muted-foreground")}>
                  {pred.predicted_change_pct > 0 ? "+" : ""}{pred.predicted_change_pct}%
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Confidence: {pred.confidence}%</div>
              </div>
            ))}
          </div>

          <Card title="Feature Importance" icon={<Sparkles size={14} />}>
            <div className="space-y-3">
              {ml.data.features_importance?.map((f: any) => (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="w-48 text-xs font-medium">{f.feature}</span>
                  <div className="flex-1 h-3 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70" style={{width: `${f.importance*100}%`}} />
                  </div>
                  <span className="text-xs tabular font-medium">{(f.importance*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {!searchSymbol && !ml.isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Sparkles size={28} className="text-primary" /></div>
            <h3 className="text-lg font-semibold">Machine Learning Prediction</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Gunakan ensemble 4 model ML untuk memprediksi pergerakan harga saham.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["AAPL","MSFT","GOOG","NVDA","TSLA"].map(s=>(
                <button key={s} onClick={()=>{setSymbol(s);setSearchSymbol(s);}} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5">{s}</button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
