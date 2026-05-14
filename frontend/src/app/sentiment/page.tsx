"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, MessageCircle, Search, ThumbsDown, ThumbsUp, Minus } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function SentimentPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const sentiment = useQuery({
    queryKey: ["sentiment", searchSymbol],
    queryFn: () => api.sentiment(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Sentimen Berita"
        description="Analisis sentimen dari berita terbaru — deteksi apakah market optimis atau pesimis."
        badge="NLP"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Masukkan simbol saham (contoh: AAPL, TSLA, NVDA)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Analisis</button>
        </form>
      </Card>

      {sentiment.isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({length:3}).map((_,i)=><SkeletonCard key={i} className="h-32"/>)}</div>}

      {sentiment.data && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold", sentiment.data.overall_score > 0.1 ? "text-bull" : sentiment.data.overall_score < -0.1 ? "text-bear" : "text-muted-foreground")}>
                  {(sentiment.data.overall_score * 100).toFixed(0)}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Overall Score</div>
                <Badge variant={sentiment.data.overall_label.includes("bullish") ? "success" : sentiment.data.overall_label.includes("bearish") ? "danger" : "default"} className="mt-2">
                  {sentiment.data.overall_label.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-bull">{sentiment.data.bullish_count}</div>
                <div className="mt-1 text-xs text-muted-foreground">Berita Bullish</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-bear">{sentiment.data.bearish_count}</div>
                <div className="mt-1 text-xs text-muted-foreground">Berita Bearish</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-muted-foreground">{sentiment.data.neutral_count}</div>
                <div className="mt-1 text-xs text-muted-foreground">Netral</div>
              </div>
            </Card>
          </div>

          {/* Recommendation */}
          <Card title="Rekomendasi" icon={<MessageCircle size={14} />}>
            <p className="text-sm leading-relaxed text-muted-foreground">{sentiment.data.recommendation}</p>
            <div className="mt-2 text-xs text-muted-foreground">Confidence: {sentiment.data.confidence}%</div>
          </Card>

          {/* Headlines */}
          <Card title="Detail Per Berita" subtitle={`${sentiment.data.news_count} berita dianalisis`}>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {sentiment.data.headlines?.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border/30 p-3">
                  <div className={cn("mt-0.5 shrink-0", h.score > 0.1 ? "text-bull" : h.score < -0.1 ? "text-bear" : "text-muted-foreground")}>
                    {h.score > 0.1 ? <ThumbsUp size={14}/> : h.score < -0.1 ? <ThumbsDown size={14}/> : <Minus size={14}/>}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs leading-relaxed">{h.text.slice(0, 150)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {h.positive_words?.slice(0,3).map((w:string) => <span key={w} className="rounded bg-bull/10 px-1.5 py-0.5 text-[9px] text-bull">{w}</span>)}
                      {h.negative_words?.slice(0,3).map((w:string) => <span key={w} className="rounded bg-bear/10 px-1.5 py-0.5 text-[9px] text-bear">{w}</span>)}
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold tabular", h.score > 0 ? "text-bull" : h.score < 0 ? "text-bear" : "text-muted-foreground")}>
                    {(h.score*100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {!searchSymbol && !sentiment.isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageCircle size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Analisis Sentimen Berita</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Masukkan simbol untuk menganalisis sentimen dari berita terbaru menggunakan NLP.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["AAPL","TSLA","NVDA","META","AMZN"].map(s=>(
                <button key={s} onClick={()=>{setSymbol(s);setSearchSymbol(s);}} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5">{s}</button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
