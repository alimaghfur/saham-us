"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

interface EarningsEntry {
  symbol: string;
  company: string;
  date: string;
  estimatedEPS: string;
  previousEPS: string;
  timing: "This Week" | "Next Week" | "Later";
}

// Static earnings data for popular stocks with estimated dates
function getEarningsData(): EarningsEntry[] {
  const now = new Date();
  const thisWeekEnd = new Date(now);
  thisWeekEnd.setDate(now.getDate() + (7 - now.getDay()));
  const nextWeekEnd = new Date(thisWeekEnd);
  nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  const entries: EarningsEntry[] = [
    {
      symbol: "AAPL",
      company: "Apple Inc.",
      date: getUpcomingDate(now, 5),
      estimatedEPS: "$1.58",
      previousEPS: "$1.52",
      timing: "This Week",
    },
    {
      symbol: "MSFT",
      company: "Microsoft Corporation",
      date: getUpcomingDate(now, 3),
      estimatedEPS: "$2.82",
      previousEPS: "$2.69",
      timing: "This Week",
    },
    {
      symbol: "NVDA",
      company: "NVIDIA Corporation",
      date: getUpcomingDate(now, 8),
      estimatedEPS: "$0.64",
      previousEPS: "$0.57",
      timing: "Next Week",
    },
    {
      symbol: "GOOGL",
      company: "Alphabet Inc.",
      date: getUpcomingDate(now, 10),
      estimatedEPS: "$1.85",
      previousEPS: "$1.55",
      timing: "Next Week",
    },
    {
      symbol: "AMZN",
      company: "Amazon.com Inc.",
      date: getUpcomingDate(now, 12),
      estimatedEPS: "$1.14",
      previousEPS: "$0.98",
      timing: "Next Week",
    },
    {
      symbol: "META",
      company: "Meta Platforms Inc.",
      date: getUpcomingDate(now, 15),
      estimatedEPS: "$4.71",
      previousEPS: "$4.39",
      timing: "Later",
    },
    {
      symbol: "TSLA",
      company: "Tesla Inc.",
      date: getUpcomingDate(now, 18),
      estimatedEPS: "$0.73",
      previousEPS: "$0.66",
      timing: "Later",
    },
    {
      symbol: "JPM",
      company: "JPMorgan Chase & Co.",
      date: getUpcomingDate(now, 20),
      estimatedEPS: "$4.17",
      previousEPS: "$4.01",
      timing: "Later",
    },
  ];

  return entries;
}

function getUpcomingDate(from: Date, daysAhead: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + daysAhead);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EarningsPage() {
  const earningsQuery = useQuery({
    queryKey: ["earnings-calendar"],
    queryFn: async () => {
      // Static data — in production, this would call the backend
      return getEarningsData();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const earnings = earningsQuery.data ?? [];

  const thisWeek = earnings.filter((e) => e.timing === "This Week");
  const nextWeek = earnings.filter((e) => e.timing === "Next Week");
  const later = earnings.filter((e) => e.timing === "Later");

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Earnings Calendar"
        description="Jadwal laporan keuangan (earnings) saham-saham populer. Pantau EPS estimates dan tanggal rilis."
        badge="New"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={12} />
            <span>This Week</span>
          </div>
          <div className="mt-1 text-lg font-bold">{thisWeek.length}</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>Next Week</span>
          </div>
          <div className="mt-1 text-lg font-bold">{nextWeek.length}</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp size={12} />
            <span>Beat Expected</span>
          </div>
          <div className="mt-1 text-lg font-bold text-bull">~70%</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign size={12} />
            <span>Avg Move</span>
          </div>
          <div className="mt-1 text-lg font-bold">±5.2%</div>
        </div>
      </div>

      {/* This Week */}
      {thisWeek.length > 0 && (
        <EarningsSection
          title="This Week"
          entries={thisWeek}
          badgeVariant="primary"
        />
      )}

      {/* Next Week */}
      {nextWeek.length > 0 && (
        <EarningsSection
          title="Next Week"
          entries={nextWeek}
          badgeVariant="info"
        />
      )}

      {/* Later */}
      {later.length > 0 && (
        <EarningsSection
          title="Later"
          entries={later}
          badgeVariant="default"
        />
      )}

      {/* Tips Section */}
      <Card
        title="Tips: How Earnings Affect Stock Prices"
        icon={<Info size={14} />}
        subtitle="Panduan memahami musim earnings"
      >
        <div className="space-y-3">
          <TipItem
            title="Beat vs Miss"
            description="Jika EPS aktual > estimasi (beat), saham cenderung naik. Jika miss, saham bisa turun tajam. Namun, guidance (proyeksi ke depan) sering lebih penting dari angka aktual."
          />
          <TipItem
            title="Buy the Rumor, Sell the News"
            description="Saham sering naik sebelum earnings (antisipasi positif) lalu turun setelah rilis meski hasilnya bagus. Ini karena profit-taking."
          />
          <TipItem
            title="Implied Move & IV Crush"
            description="Options market memprediksi pergerakan harga (implied move). Setelah earnings, implied volatility turun drastis (IV crush), membuat opsi kehilangan nilai waktu."
          />
          <TipItem
            title="Pre-Market vs After-Hours"
            description="Perhatikan kapan earnings dirilis. BMO (Before Market Open) vs AMC (After Market Close) menentukan kapan reaksi harga terjadi."
          />
          <TipItem
            title="Sector Correlation"
            description="Earnings satu perusahaan besar bisa mempengaruhi seluruh sektor. Contoh: jika NVDA beat, saham chip lain (AMD, AVGO) sering ikut naik."
          />
        </div>
      </Card>
    </div>
  );
}

function EarningsSection({
  title,
  entries,
  badgeVariant,
}: {
  title: string;
  entries: EarningsEntry[];
  badgeVariant: "default" | "primary" | "info";
}) {
  return (
    <Card
      title={title}
      icon={<Calendar size={14} />}
      action={
        <Badge variant={badgeVariant}>
          {entries.length} {entries.length === 1 ? "stock" : "stocks"}
        </Badge>
      }
    >
      <div className="space-y-2">
        {entries.map((entry) => (
          <EarningsRow key={entry.symbol} entry={entry} />
        ))}
      </div>
    </Card>
  );
}

function EarningsRow({ entry }: { entry: EarningsEntry }) {
  const epsGrowth =
    parseFloat(entry.estimatedEPS.replace("$", "")) >
    parseFloat(entry.previousEPS.replace("$", ""));

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/20 px-4 py-3 transition-all hover:border-border/50 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {entry.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="text-sm font-semibold">{entry.symbol}</div>
          <div className="text-[11px] text-muted-foreground">
            {entry.company}
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-6 sm:flex">
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Date</div>
          <div className="text-xs font-medium">{entry.date}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Est. EPS</div>
          <div className="text-xs font-medium">{entry.estimatedEPS}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Prev. EPS</div>
          <div className="text-xs font-medium">{entry.previousEPS}</div>
        </div>
        <div>
          {epsGrowth ? (
            <TrendingUp size={14} className="text-bull" />
          ) : (
            <TrendingDown size={14} className="text-bear" />
          )}
        </div>
      </div>

      {/* Mobile view */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Est.</div>
          <div className="text-xs font-medium">{entry.estimatedEPS}</div>
        </div>
        {epsGrowth ? (
          <TrendingUp size={14} className="text-bull" />
        ) : (
          <TrendingDown size={14} className="text-bear" />
        )}
      </div>
    </div>
  );
}

function TipItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
      <div className="text-xs font-semibold">{title}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
