"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  ChevronDown,
  Filter,
  Plus,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

interface JournalEntry {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  date: string;
  reason: string;
  emotion: "confident" | "neutral" | "fearful" | "greedy";
  strategy: string;
  outcome?: "win" | "loss" | "open";
  exitPrice?: number;
  exitDate?: string;
  lesson?: string;
  rating?: number; // 1-5 self-rating of the trade
}

const STRATEGIES = [
  "Value Investing",
  "Growth Investing",
  "Swing Trade",
  "Buy the Dip",
  "Momentum",
  "Dividend",
  "Breakout",
  "Other",
];

const EMOTIONS = [
  { value: "confident", label: "Confident", emoji: "😊" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "fearful", label: "Fearful", emoji: "😰" },
  { value: "greedy", label: "Greedy", emoji: "🤑" },
];

function getJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("trading_journal") ?? "[]"); } catch { return []; }
}
function saveJournal(entries: JournalEntry[]) {
  localStorage.setItem("trading_journal", JSON.stringify(entries));
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "open">("all");
  const [form, setForm] = useState({
    symbol: "", type: "buy" as "buy" | "sell", shares: "", price: "",
    date: new Date().toISOString().slice(0, 10), reason: "",
    emotion: "neutral" as JournalEntry["emotion"], strategy: "Value Investing",
    outcome: "open" as "win" | "loss" | "open", exitPrice: "", exitDate: "",
    lesson: "", rating: 3,
  });

  React.useEffect(() => { setEntries(getJournal()); }, []);

  // Stats
  const stats = useMemo(() => {
    const closed = entries.filter((e) => e.outcome !== "open");
    const wins = closed.filter((e) => e.outcome === "win");
    const losses = closed.filter((e) => e.outcome === "loss");
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

    let totalPnL = 0;
    closed.forEach((e) => {
      if (e.exitPrice) {
        const pnl = e.type === "buy"
          ? (e.exitPrice - e.price) * e.shares
          : (e.price - e.exitPrice) * e.shares;
        totalPnL += pnl;
      }
    });

    const avgRating = entries.length > 0
      ? entries.reduce((s, e) => s + (e.rating ?? 3), 0) / entries.length
      : 0;

    return { total: entries.length, wins: wins.length, losses: losses.length, winRate, totalPnL, avgRating };
  }, [entries]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.outcome === filter);
  }, [entries, filter]);

  function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const sym = form.symbol.trim().toUpperCase();
    if (!sym || !form.reason) return;
    const entry: JournalEntry = {
      id: Date.now().toString(), symbol: sym, type: form.type,
      shares: parseFloat(form.shares) || 0, price: parseFloat(form.price) || 0,
      date: form.date, reason: form.reason, emotion: form.emotion,
      strategy: form.strategy, outcome: form.outcome,
      exitPrice: form.exitPrice ? parseFloat(form.exitPrice) : undefined,
      exitDate: form.exitDate || undefined, lesson: form.lesson || undefined,
      rating: form.rating,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveJournal(updated);
    setForm({ symbol: "", type: "buy", shares: "", price: "", date: new Date().toISOString().slice(0, 10), reason: "", emotion: "neutral", strategy: "Value Investing", outcome: "open", exitPrice: "", exitDate: "", lesson: "", rating: 3 });
    setShowAdd(false);
  }

  function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveJournal(updated);
  }

  function updateOutcome(id: string, outcome: "win" | "loss", exitPrice: string) {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, outcome, exitPrice: parseFloat(exitPrice) || e.price, exitDate: new Date().toISOString().slice(0, 10) } : e
    );
    setEntries(updated);
    saveJournal(updated);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Trading Journal"
        description="Catat setiap keputusan trading Anda. Review untuk belajar dari kesalahan dan tingkatkan win rate."
        badge="New"
        actions={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(!showAdd)}>
            Catat Trade
          </Button>
        }
      />

      {/* Stats */}
      {entries.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Trades" value={stats.total.toString()} icon={<BookOpen size={16} />} />
          <StatCard
            label="Win Rate"
            value={`${stats.winRate.toFixed(0)}%`}
            change={`${stats.wins}W / ${stats.losses}L`}
            changeType={stats.winRate >= 50 ? "bull" : "bear"}
            icon={stats.winRate >= 50 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          />
          <StatCard
            label="Total P&L"
            value={`${stats.totalPnL >= 0 ? "+" : ""}$${formatPrice(Math.abs(stats.totalPnL))}`}
            changeType={stats.totalPnL >= 0 ? "bull" : "bear"}
            icon={stats.totalPnL >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          />
          <StatCard
            label="Avg Trade Rating"
            value={`${stats.avgRating.toFixed(1)}/5`}
            icon={<Star size={16} />}
          />
        </section>
      )}

      {/* Add Form */}
      {showAdd && (
        <Card variant="glass" title="Catat Trade Baru" icon={<Plus size={14} />}>
          <form onSubmit={addEntry} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Symbol</label>
                <input type="text" placeholder="AAPL" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({ ...form, type: "buy" })} className={cn("flex-1 rounded-xl px-3 py-2 text-xs font-medium", form.type === "buy" ? "bg-bull/20 text-bull ring-1 ring-bull/30" : "bg-muted/50 text-muted-foreground")}>Buy</button>
                  <button type="button" onClick={() => setForm({ ...form, type: "sell" })} className={cn("flex-1 rounded-xl px-3 py-2 text-xs font-medium", form.type === "sell" ? "bg-bear/20 text-bear ring-1 ring-bear/30" : "bg-muted/50 text-muted-foreground")}>Sell</button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Shares</label>
                <input type="number" placeholder="10" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Price ($)</label>
                <input type="number" step="0.01" placeholder="150.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Strategy</label>
                <select value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50">
                  {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Emosi Saat Beli</label>
                <div className="flex gap-1">
                  {EMOTIONS.map((em) => (
                    <button key={em.value} type="button" onClick={() => setForm({ ...form, emotion: em.value as any })} className={cn("flex-1 rounded-lg px-2 py-1.5 text-center text-[10px]", form.emotion === em.value ? "bg-primary/20 ring-1 ring-primary/30" : "bg-muted/50")}>
                      {em.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Self Rating (1-5)</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} className={cn("flex-1 rounded-lg py-1.5 text-xs font-bold", form.rating >= n ? "bg-warning/20 text-warning" : "bg-muted/50 text-muted-foreground")}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Alasan Beli/Jual (WAJIB)</label>
              <textarea rows={3} placeholder="Kenapa Anda beli saham ini? Apa analisa Anda? Ini penting untuk review nanti!" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!form.symbol || !form.reason}>Simpan</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Batal</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Tabs */}
      {entries.length > 0 && (
        <div className="flex gap-2">
          {(["all", "open", "win", "loss"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all", filter === f ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {f === "all" ? "Semua" : f === "open" ? "Open" : f === "win" ? "✅ Win" : "❌ Loss"} ({f === "all" ? entries.length : entries.filter((e) => e.outcome === f).length})
            </button>
          ))}
        </div>
      )}

      {/* Journal Entries */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <JournalCard key={entry.id} entry={entry} onDelete={() => deleteEntry(entry.id)} onClose={(outcome, price) => updateOutcome(entry.id, outcome, price)} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="Mulai Trading Journal"
          description="Catat setiap keputusan trading Anda. Investor yang punya journal punya win rate 23% lebih tinggi (riset)."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Catat Trade Pertama</Button>}
        />
      ) : (
        <Card variant="glass">
          <div className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada trade dengan filter &quot;{filter}&quot;
          </div>
        </Card>
      )}

      {/* Tips */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">Kenapa Trading Journal Penting?</h3>
        <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Review bulanan: lihat pattern kesalahan Anda</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Track emosi: apakah Anda sering beli karena FOMO?</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Strategi mana yang paling menguntungkan untuk Anda?</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Self-rating membantu jujur pada diri sendiri</li>
        </ul>
      </div>
    </div>
  );
}

function JournalCard({ entry, onDelete, onClose }: { entry: JournalEntry; onDelete: () => void; onClose: (outcome: "win" | "loss", price: string) => void }) {
  const [showClose, setShowClose] = useState(false);
  const [closePrice, setClosePrice] = useState("");
  const emotion = EMOTIONS.find((e) => e.value === entry.emotion);

  return (
    <div className={cn("rounded-2xl border bg-card p-4 transition-all", entry.outcome === "win" ? "border-bull/30" : entry.outcome === "loss" ? "border-bear/30" : "border-border/50")}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={entry.type === "buy" ? "bull" : "bear"}>{entry.type.toUpperCase()}</Badge>
          <span className="text-sm font-bold">{entry.symbol}</span>
          <span className="text-xs text-muted-foreground">{entry.shares} shares @ ${formatPrice(entry.price)}</span>
          {entry.outcome !== "open" && (
            <Badge variant={entry.outcome === "win" ? "bull" : "bear"}>
              {entry.outcome === "win" ? "✅ WIN" : "❌ LOSS"}
              {entry.exitPrice && ` → $${formatPrice(entry.exitPrice)}`}
            </Badge>
          )}
          {entry.outcome === "open" && <Badge variant="warning">OPEN</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{entry.date}</span>
          <button onClick={onDelete} className="rounded p-1 text-muted-foreground hover:bg-bear/10 hover:text-bear"><Trash2 size={12} /></button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="default">{entry.strategy}</Badge>
        <span className="text-xs">{emotion?.emoji} {emotion?.label}</span>
        <span className="text-xs text-warning">{"★".repeat(entry.rating ?? 3)}{"☆".repeat(5 - (entry.rating ?? 3))}</span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{entry.reason}</p>

      {entry.lesson && (
        <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-[11px] text-primary">
          💡 Lesson: {entry.lesson}
        </p>
      )}

      {entry.outcome === "open" && (
        <div className="mt-3">
          {!showClose ? (
            <Button variant="outline" size="sm" onClick={() => setShowClose(true)}>Close Trade</Button>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" placeholder="Exit price" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} className="h-8 w-28 rounded-lg border border-border/50 bg-muted/30 px-2 text-xs" />
              <Button size="sm" variant="primary" onClick={() => { onClose("win", closePrice); setShowClose(false); }}>Win ✅</Button>
              <Button size="sm" variant="danger" onClick={() => { onClose("loss", closePrice); setShowClose(false); }}>Loss ❌</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowClose(false)}><X size={12} /></Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
