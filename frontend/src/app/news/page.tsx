"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ExternalLink,
  Globe,
  Newspaper,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const POPULAR_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM"];

const CATEGORIES = [
  { id: "all", label: "All News" },
  { id: "tech", label: "Technology", tickers: ["AAPL", "MSFT", "GOOGL", "NVDA", "META", "AMZN"] },
  { id: "finance", label: "Finance", tickers: ["JPM", "BAC", "GS", "V", "MA", "BLK"] },
  { id: "health", label: "Healthcare", tickers: ["UNH", "JNJ", "LLY", "PFE", "ABBV"] },
  { id: "energy", label: "Energy", tickers: ["XOM", "CVX", "COP", "SLB"] },
  { id: "consumer", label: "Consumer", tickers: ["WMT", "COST", "NKE", "SBUX", "DIS"] },
];

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTicker, setSearchTicker] = useState("");
  const [customTicker, setCustomTicker] = useState("");

  // Determine which tickers to fetch news for
  const tickersToFetch = React.useMemo(() => {
    if (customTicker) return [customTicker];
    if (activeCategory === "all") return POPULAR_TICKERS;
    const cat = CATEGORIES.find((c) => c.id === activeCategory);
    return cat?.tickers ?? POPULAR_TICKERS;
  }, [activeCategory, customTicker]);

  // Fetch news for selected tickers (parallel)
  const newsQuery = useQuery({
    queryKey: ["news-feed", tickersToFetch.join(",")],
    queryFn: async () => {
      const results = await Promise.allSettled(
        tickersToFetch.map((s) => api.news(s, 5))
      );
      const allNews: Array<{
        title: string;
        publisher?: string | null;
        link: string;
        summary?: string | null;
        thumbnail?: string | null;
        ticker: string;
      }> = [];

      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          r.value.forEach((n) => {
            allNews.push({
              title: n.title,
              publisher: n.publisher,
              link: n.link,
              summary: n.summary,
              thumbnail: n.thumbnail,
              ticker: tickersToFetch[i],
            });
          });
        }
      });

      // Deduplicate by title and sort (newest first — approximate by order)
      const seen = new Set<string>();
      return allNews.filter((n) => {
        if (seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      });
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sym = searchTicker.trim().toUpperCase();
    if (sym) {
      setCustomTicker(sym);
      setActiveCategory("all");
    }
  }

  function clearSearch() {
    setCustomTicker("");
    setSearchTicker("");
  }

  const news = newsQuery.data ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="News & Research"
        description="Aggregated market news from multiple sources, organized by sector and ticker."
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} className={newsQuery.isFetching ? "animate-spin" : ""} />}
            onClick={() => newsQuery.refetch()}
          >
            Refresh
          </Button>
        }
      />

      {/* Search + Categories */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setCustomTicker("");
                setSearchTicker("");
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all",
                activeCategory === cat.id && !customTicker
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Ticker Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              className="w-40 rounded-xl border border-border/50 bg-muted/30 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary/50"
            />
          </div>
          <Button variant="outline" size="sm" type="submit">
            Go
          </Button>
          {customTicker && (
            <Button variant="ghost" size="sm" type="button" onClick={clearSearch}>
              <X size={14} />
            </Button>
          )}
        </form>
      </div>

      {/* Active Filter Badge */}
      {customTicker && (
        <div className="flex items-center gap-2">
          <Badge variant="primary" dot>
            Showing news for: {customTicker}
          </Badge>
          <button onClick={clearSearch} className="text-xs text-muted-foreground hover:text-foreground">
            Clear filter
          </button>
        </div>
      )}

      {/* News Feed */}
      {newsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} className="h-48" />
          ))}
        </div>
      ) : news.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item, idx) => (
            <NewsCard key={`${item.title}-${idx}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
            <Newspaper size={24} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No news found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {customTicker
              ? `No recent news available for ${customTicker}. Try a different ticker.`
              : "No news available at the moment. Try refreshing."}
          </p>
        </div>
      )}

      {/* Popular Tickers Quick Access */}
      <Card title="Quick Access" subtitle="Click to view news for specific tickers" icon={<Globe size={14} />}>
        <div className="flex flex-wrap gap-2">
          {[...POPULAR_TICKERS, "BA", "GS", "UNH", "XOM", "WMT", "NFLX", "AMD", "CRM"].map((ticker) => (
            <button
              key={ticker}
              onClick={() => {
                setCustomTicker(ticker);
                setSearchTicker(ticker);
                setActiveCategory("all");
              }}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                customTicker === ticker
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/30 bg-card hover:border-border hover:bg-card-hover"
              )}
            >
              {ticker}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NewsCard({
  item,
}: {
  item: {
    title: string;
    publisher?: string | null;
    link: string;
    summary?: string | null;
    thumbnail?: string | null;
    ticker: string;
  };
}) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-card-hover hover:-translate-y-0.5"
    >
      {/* Thumbnail */}
      {item.thumbnail && (
        <div className="relative h-36 w-full overflow-hidden bg-muted/30">
          <img
            src={item.thumbnail}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          <Badge variant="primary" className="absolute right-2 top-2">
            {item.ticker}
          </Badge>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {!item.thumbnail && (
          <Badge variant="primary" className="mb-2 self-start">
            {item.ticker}
          </Badge>
        )}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary">
          {item.title}
        </h3>
        {item.summary && (
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {item.summary}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-3 text-[10px] text-muted-foreground">
          {item.publisher && (
            <>
              <Globe size={10} />
              <span>{item.publisher}</span>
            </>
          )}
          <ExternalLink size={10} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </a>
  );
}
