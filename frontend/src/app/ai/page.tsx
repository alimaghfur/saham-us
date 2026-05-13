"use client";

import {
  BrainCircuit,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

const AI_FEATURES = [
  {
    icon: MessageSquare,
    title: "Natural Language Screener",
    description: "Ask in plain English: \"Show me tech stocks with PE under 20 and growing revenue\"",
    status: "coming",
  },
  {
    icon: BrainCircuit,
    title: "AI Market Summary",
    description: "Daily AI-generated market recap with key events, sector movements, and outlook",
    status: "coming",
  },
  {
    icon: TrendingUp,
    title: "Pattern Recognition",
    description: "AI detects chart patterns (head & shoulders, cup & handle, flags) automatically",
    status: "coming",
  },
  {
    icon: Zap,
    title: "Anomaly Detection",
    description: "Get notified when unusual price/volume activity occurs in your watchlist",
    status: "coming",
  },
  {
    icon: Sparkles,
    title: "Trade Idea Generator",
    description: "AI suggests trade ideas based on your style, risk tolerance, and market conditions",
    status: "coming",
  },
];

export default function AIPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="AI Insights"
        description="AI-powered market analysis, pattern detection, and natural language stock screening."
        badge="New"
        gradient
      />

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8">
        <div className="absolute right-0 top-0 h-64 w-64 bg-gradient-radial from-primary/10 to-transparent" />
        <div className="absolute bottom-0 left-0 h-32 w-32 bg-gradient-radial from-accent/10 to-transparent" />
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles size={24} className="text-white" />
          </div>
          <h2 className="mt-4 text-xl font-bold">
            AI-Powered Analysis Coming Soon
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            We&apos;re building cutting-edge AI features to help you make
            smarter investment decisions. Natural language queries, pattern
            detection, and predictive insights — all powered by machine learning.
          </p>
          <Badge variant="primary" className="mt-4">
            In Development
          </Badge>
        </div>
      </div>

      {/* Feature Grid */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Planned AI Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon size={20} />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <Badge variant="default" className="mt-3">
                  Coming Soon
                </Badge>
              </div>
            );
          })}
        </div>
      </section>

      {/* Example Queries */}
      <Card
        title="Example AI Queries"
        subtitle="What you'll be able to ask"
        icon={<MessageSquare size={14} />}
        variant="glass"
      >
        <div className="space-y-2">
          {[
            "What are the best value stocks in technology sector right now?",
            "Show me stocks with RSI below 30 that are near their 52-week low",
            "Find dividend stocks with yield above 4% and growing earnings",
            "Which stocks in my watchlist have bullish MACD crossovers?",
            "Summarize today's market: what sectors are leading and why?",
          ].map((query) => (
            <div
              key={query}
              className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3 text-sm"
            >
              <Sparkles size={14} className="shrink-0 text-primary" />
              <span className="text-muted-foreground">{query}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
