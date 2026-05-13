"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  GraduationCap,
  Lightbulb,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

// --- Glossary Data ---
const GLOSSARY = [
  { term: "PE Ratio", indo: "Rasio Harga/Laba", explanation: "Berapa kali harga saham dibanding laba per saham. PE rendah (<15) = murah, PE tinggi (>30) = mahal. Contoh: PE 20 artinya investor bayar $20 untuk setiap $1 laba." },
  { term: "PB Ratio", indo: "Rasio Harga/Nilai Buku", explanation: "Perbandingan harga saham dengan nilai aset bersih. PB < 1 artinya saham dijual di bawah nilai asetnya (berpotensi undervalued)." },
  { term: "ROE", indo: "Return on Equity", explanation: "Seberapa efisien perusahaan menghasilkan laba dari modal pemegang saham. ROE > 15% = bagus, > 25% = sangat bagus." },
  { term: "Market Cap", indo: "Kapitalisasi Pasar", explanation: "Total nilai perusahaan di bursa = harga saham × jumlah saham beredar. Large cap (>$10B) lebih stabil, small cap (<$2B) lebih volatile." },
  { term: "EPS", indo: "Laba Per Saham", explanation: "Laba bersih dibagi jumlah saham. EPS naik tiap tahun = perusahaan tumbuh. Basis perhitungan PE ratio." },
  { term: "Dividend Yield", indo: "Imbal Hasil Dividen", explanation: "Persentase dividen tahunan dibanding harga saham. Yield > 3% = menarik untuk passive income." },
  { term: "RSI", indo: "Relative Strength Index", explanation: "Indikator momentum 0-100. RSI > 70 = overbought (mungkin turun), RSI < 30 = oversold (mungkin naik). Sweet spot beli: RSI 30-50." },
  { term: "MACD", indo: "Moving Average Convergence Divergence", explanation: "Indikator trend. MACD cross di atas signal = sinyal beli. MACD cross di bawah signal = sinyal jual." },
  { term: "SMA", indo: "Simple Moving Average", explanation: "Rata-rata harga X hari terakhir. Harga di atas SMA200 = uptrend (bullish). Harga di bawah SMA200 = downtrend (bearish)." },
  { term: "Volume", indo: "Volume Perdagangan", explanation: "Jumlah saham yang diperdagangkan. Volume tinggi saat harga naik = konfirmasi tren kuat. Volume rendah = tren lemah." },
  { term: "ATR", indo: "Average True Range", explanation: "Rata-rata volatilitas harian. Digunakan untuk menentukan stop loss yang tepat (biasanya 2× ATR di bawah entry)." },
  { term: "Bull Market", indo: "Pasar Naik", explanation: "Kondisi pasar yang sedang naik secara keseluruhan (kenaikan > 20% dari titik terendah)." },
  { term: "Bear Market", indo: "Pasar Turun", explanation: "Kondisi pasar yang sedang turun secara keseluruhan (penurunan > 20% dari puncak)." },
  { term: "Stop Loss", indo: "Batas Kerugian", explanation: "Level harga di mana Anda menjual saham untuk membatasi kerugian. WAJIB dipasang setiap transaksi! Biasanya 5-10% di bawah harga beli." },
  { term: "Risk/Reward Ratio", indo: "Rasio Risiko/Untung", explanation: "Perbandingan potensi kerugian vs keuntungan. R:R 1:2 artinya risiko $1 untuk potensi $2. Minimal R:R 1:1.5 untuk trading." },
];

const STRATEGIES = [
  {
    name: "Investor Konservatif (Pemula)",
    risk: "Low",
    timeframe: "1-5 tahun",
    icon: Shield,
    rules: [
      "Beli saham dengan dividend yield > 2.5%",
      "PE Ratio < 25 (tidak terlalu mahal)",
      "ROE > 12% (profitable)",
      "Market Cap > $10 Billion (perusahaan besar & stabil)",
      "Hold minimal 1 tahun, jangan panik saat turun",
      "Diversifikasi: beli 5-10 saham dari sektor berbeda",
    ],
    stocks: ["AAPL", "MSFT", "JNJ", "PG", "KO", "JPM"],
  },
  {
    name: "Growth Investor",
    risk: "Medium",
    timeframe: "6 bulan - 3 tahun",
    icon: TrendingUp,
    rules: [
      "Revenue growth > 15% per tahun",
      "Perusahaan di industri yang berkembang (AI, Cloud, EV)",
      "PE bisa tinggi (sampai 40) asal growth konsisten",
      "Trend bullish (harga > SMA50)",
      "Cut loss jika turun > 15% dari harga beli",
      "Jangan all-in, beli bertahap (dollar cost averaging)",
    ],
    stocks: ["NVDA", "AMZN", "CRM", "AVGO", "AMD"],
  },
  {
    name: "Swing Trader",
    risk: "High",
    timeframe: "3-10 hari",
    icon: Target,
    rules: [
      "Cari saham dengan RSI < 40 yang mulai bounce",
      "Entry saat harga breakout di atas resistance",
      "Stop loss ketat: 2× ATR di bawah entry",
      "Target profit: 3× ATR di atas entry (R:R 1:1.5)",
      "Jangan hold lebih dari 10 hari",
      "Maksimal 3 posisi terbuka sekaligus",
    ],
    stocks: ["Use Swing Trading scanner"],
  },
];

const BUY_CHECKLIST = [
  { label: "Score > 60", description: "Skor saham di atas 60/100" },
  { label: "Trend Bullish", description: "Harga di atas SMA50 dan SMA200" },
  { label: "RSI 30-65", description: "Tidak overbought (RSI < 70)" },
  { label: "PE < 35", description: "Valuasi wajar, tidak terlalu mahal" },
  { label: "Revenue Growing", description: "Pendapatan naik dari tahun lalu" },
  { label: "Volume Normal", description: "Tidak ada volume abnormal yang mencurigakan" },
  { label: "Risk Terukur", description: "Sudah tentukan stop loss sebelum beli" },
  { label: "Diversifikasi", description: "Tidak > 20% portfolio di satu saham" },
];

const SELL_CHECKLIST = [
  { label: "Hit Stop Loss", description: "Harga turun ke level stop loss → JUAL SEGERA", type: "urgent" },
  { label: "Hit Target Profit", description: "Harga naik ke target → ambil profit (minimal sebagian)", type: "profit" },
  { label: "Fundamental Berubah", description: "Perusahaan rugi, skandal, atau revenue turun drastis", type: "urgent" },
  { label: "RSI > 80", description: "Sangat overbought → pertimbangkan jual sebagian", type: "warning" },
  { label: "Trend Berubah", description: "Harga turun di bawah SMA200 → sinyal bahaya", type: "warning" },
  { label: "Butuh Uang", description: "Jangan pernah invest uang yang Anda butuhkan dalam 1 tahun", type: "info" },
];

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState<"glossary" | "strategies" | "checklist" | "calculator">("glossary");
  const [calcInvestment, setCalcInvestment] = useState("1000");
  const [calcStopLoss, setCalcStopLoss] = useState("5");

  const TABS = [
    { id: "glossary", label: "Glossary", icon: BookOpen },
    { id: "strategies", label: "Strategi", icon: Lightbulb },
    { id: "checklist", label: "Checklist", icon: CheckCircle2 },
    { id: "calculator", label: "Kalkulator", icon: Calculator },
  ] as const;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Panduan Investasi"
        description="Pelajari dasar-dasar investasi saham US. Semua penjelasan dalam Bahasa Indonesia."
        badge="Edu"
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary/20 text-primary shadow-glow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Glossary Tab */}
      {activeTab === "glossary" && (
        <Card title="Glossary Istilah Saham" icon={<BookOpen size={14} />} subtitle="Dalam Bahasa Indonesia">
          <div className="space-y-2">
            {GLOSSARY.map((item) => (
              <GlossaryItem key={item.term} item={item} />
            ))}
          </div>
        </Card>
      )}

      {/* Strategies Tab */}
      {activeTab === "strategies" && (
        <div className="space-y-4">
          {STRATEGIES.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <Card key={strategy.name}>
                <div className="p-1">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold">{strategy.name}</h3>
                        <Badge variant={strategy.risk === "Low" ? "bull" : strategy.risk === "Medium" ? "warning" : "bear"}>
                          Risiko: {strategy.risk}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Timeframe: {strategy.timeframe}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {strategy.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 rounded-lg bg-muted/20 px-3 py-2">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-bull" />
                        <span className="text-xs">{rule}</span>
                      </div>
                    ))}
                  </div>

                  {strategy.stocks.length > 0 && strategy.stocks[0] !== "Use Swing Trading scanner" && (
                    <div className="mt-3">
                      <span className="text-[10px] text-muted-foreground">Contoh saham: </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {strategy.stocks.map((s) => (
                          <Link key={s} href={`/score?symbol=${s}`}>
                            <Badge variant="primary" className="cursor-pointer hover:bg-primary/30">{s}</Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Checklist Tab */}
      {activeTab === "checklist" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="✅ Checklist SEBELUM Beli" icon={<CheckCircle2 size={14} className="text-bull" />}>
            <div className="space-y-2">
              {BUY_CHECKLIST.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl bg-bull/5 px-4 py-3">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-bull" />
                  <div>
                    <span className="text-xs font-semibold">{item.label}</span>
                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="⚠️ Checklist KAPAN Jual" icon={<AlertTriangle size={14} className="text-warning" />}>
            <div className="space-y-2">
              {SELL_CHECKLIST.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-4 py-3",
                    item.type === "urgent" ? "bg-bear/5" : item.type === "profit" ? "bg-bull/5" : "bg-muted/30",
                  )}
                >
                  <AlertTriangle
                    size={14}
                    className={cn(
                      "mt-0.5 shrink-0",
                      item.type === "urgent" ? "text-bear" : item.type === "profit" ? "text-bull" : "text-warning",
                    )}
                  />
                  <div>
                    <span className="text-xs font-semibold">{item.label}</span>
                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Calculator Tab */}
      {activeTab === "calculator" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Kalkulator Risiko" icon={<Calculator size={14} />}>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Jumlah Investasi ($)
                </label>
                <input
                  type="number"
                  value={calcInvestment}
                  onChange={(e) => setCalcInvestment(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  value={calcStopLoss}
                  onChange={(e) => setCalcStopLoss(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>

              {/* Results */}
              <div className="space-y-3 rounded-xl bg-muted/20 p-4">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Investasi:</span>
                  <span className="font-bold">${parseFloat(calcInvestment || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Max kerugian (Stop Loss {calcStopLoss}%):</span>
                  <span className="font-bold text-bear">
                    -${((parseFloat(calcInvestment || "0") * parseFloat(calcStopLoss || "0")) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Target profit (2× risk = {parseFloat(calcStopLoss || "0") * 2}%):</span>
                  <span className="font-bold text-bull">
                    +${((parseFloat(calcInvestment || "0") * parseFloat(calcStopLoss || "0") * 2) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-border/30 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Risk/Reward Ratio:</span>
                    <Badge variant="bull">1:2 (Ideal)</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Aturan Emas Investasi" icon={<GraduationCap size={14} />}>
            <div className="space-y-3">
              {[
                "💰 Jangan invest uang yang Anda butuhkan dalam 1 tahun",
                "📊 Diversifikasi: jangan taruh > 20% di 1 saham",
                "🛡️ SELALU pasang Stop Loss sebelum beli",
                "📈 Beli saat orang lain takut, jual saat orang lain serakah",
                "⏰ Time in market > timing the market (konsisten > spekulasi)",
                "📚 Pahami apa yang Anda beli (riset dulu!)",
                "🧘 Jangan panik saat market turun — itu normal",
                "💵 Mulai kecil, tambah bertahap (Dollar Cost Averaging)",
                "📱 Jangan cek portfolio setiap 5 menit — bikin stress",
                "🎯 Punya target jelas: kapan beli, kapan jual, berapa risikonya",
              ].map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-sm">{rule.split(" ")[0]}</span>
                  <span>{rule.split(" ").slice(1).join(" ")}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function GlossaryItem({ item }: { item: typeof GLOSSARY[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/30 transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-primary">{item.term}</span>
          <span className="text-[10px] text-muted-foreground">({item.indo})</span>
        </div>
        <ChevronDown
          size={14}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-border/30 px-4 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">{item.explanation}</p>
        </div>
      )}
    </div>
  );
}
