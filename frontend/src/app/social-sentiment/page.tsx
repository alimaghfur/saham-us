"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Search, TrendingUp, Zap, Sparkles, Activity } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function SocialSentimentPage() {
  const [symbol, setSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["social-sentiment", searchSymbol],
    queryFn: () => api.socialSentiment(searchSymbol),
    enabled: !!searchSymbol,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) setSearchSymbol(symbol.trim().toUpperCase());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Social Sentiment"
        description="Real-time sentiment from Reddit, Twitter & StockTwits — detect buzz before it hits price."
        badge="Live"
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. AAPL, TSLA, GME)"
              className="w-full rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90">Analyze</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"].map(s => (
            <button key={s} onClick={() => { setSymbol(s); setSearchSymbol(s); }} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5">{s}</button>
          ))}
        </div>
      </Card>

      {isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>}

      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary tabular-nums">{data.buzz_score?.toFixed(0) ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Buzz Score</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.trending_score > 50 ? "text-bull" : "text-muted-foreground")}>{data.trending_score?.toFixed(0) ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Trending Score</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", data.overall_sentiment > 0.1 ? "text-bull" : data.overall_sentiment < -0.1 ? "text-bear" : "text-muted-foreground")}>
                  {data.overall_sentiment != null ? `${(data.overall_sentiment * 100).toFixed(0)}%` : "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Overall Sentiment</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <Badge variant={data.contrarian_signal ? "danger" : "default"} className="text-sm">
                  {data.contrarian_signal ? "CONTRARIAN" : "Normal"}
                </Badge>
                <div className="mt-2 text-xs text-muted-foreground">Contrarian Signal</div>
              </div>
            </Card>
          </div>

          {/* Platform Breakdown */}
          <Card title="Platform Breakdown" icon={<Globe size={14} />}>
            <div className="space-y-3">
              {data.platform_breakdown?.map((p: any) => (
                <div key={p.platform} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                  <span className="text-sm font-medium">{p.platform}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{p.mention_count} mentions</span>
                    <Badge variant={p.sentiment_score > 0.1 ? "success" : p.sentiment_score < -0.1 ? "danger" : "default"}>
                      {(p.sentiment_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Mentions */}
          {data.top_mentions?.length > 0 && (
            <Card title="Top Mentions" icon={<Activity size={14} />}>
              <div className="space-y-2">
                {data.top_mentions.slice(0, 10).map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border/30 p-3">
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    <p className="flex-1 text-xs">{m.content_preview?.slice(0, 120)}</p>
                    <Badge variant={m.sentiment_score > 0 ? "success" : m.sentiment_score < 0 ? "danger" : "default"}>
                      {m.platform}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {!searchSymbol && !isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Globe size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Social Media Sentiment</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Enter a symbol to analyze social media buzz across Reddit, Twitter, and StockTwits.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
