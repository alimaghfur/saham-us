"use client";

import React, { useState, useEffect } from "react";
import { Clock, Globe, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

const SESSIONS = [
  { name: "Pre-Market", start: 4, end: 9.5, color: "info", icon: Sunrise },
  { name: "Regular Hours", start: 9.5, end: 16, color: "bull", icon: Sun },
  { name: "After-Hours", start: 16, end: 20, color: "warning", icon: Sunset },
  { name: "Market Closed", start: 20, end: 4, color: "bear", icon: Moon },
];

function getETTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

function getWIBTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function getCurrentSession(etHour: number): typeof SESSIONS[number] {
  for (const s of SESSIONS) {
    if (s.start < s.end) {
      if (etHour >= s.start && etHour < s.end) return s;
    } else {
      if (etHour >= s.start || etHour < s.end) return s;
    }
  }
  return SESSIONS[3];
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export default function MarketHoursPage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const et = getETTime();
  const wib = getWIBTime();
  const etHour = et.getHours() + et.getMinutes() / 60;
  const session = getCurrentSession(etHour);
  const weekend = isWeekend(et);
  const Icon = session.icon;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Market Hours" description="Waktu perdagangan US Market dalam timezone Indonesia (WIB). Penting untuk tahu kapan pasar buka!" badge="Info" />

      {/* Live Clock */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card variant="gradient">
          <div className="flex flex-col items-center py-6">
            <Globe size={20} className="text-primary" />
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">New York (ET)</span>
            <span className="mt-1 text-2xl font-bold tabular">{formatTime(et)}</span>
          </div>
        </Card>
        <Card variant="gradient">
          <div className="flex flex-col items-center py-6">
            <Globe size={20} className="text-info" />
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Jakarta (WIB)</span>
            <span className="mt-1 text-2xl font-bold tabular">{formatTime(wib)}</span>
          </div>
        </Card>
        <Card variant="gradient">
          <div className="flex flex-col items-center py-6">
            <Icon size={20} className={cn(session.color === "bull" ? "text-bull" : session.color === "info" ? "text-info" : session.color === "warning" ? "text-warning" : "text-bear")} />
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
            <Badge variant={weekend ? "bear" : session.color === "bull" ? "bull" : session.color === "info" ? "info" : session.color === "warning" ? "warning" : "bear"} className="mt-1" dot>
              {weekend ? "Weekend — Closed" : session.name}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Schedule */}
      <Card title="Jadwal Trading (Waktu Indonesia)" icon={<Clock size={14} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Session</th>
                <th className="pb-3 pr-4">New York (ET)</th>
                <th className="pb-3 pr-4">Jakarta (WIB)</th>
                <th className="pb-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              <tr className={cn("transition-colors", !weekend && session.name === "Pre-Market" && "bg-info/5")}>
                <td className="py-3 pr-4"><Badge variant="info">Pre-Market</Badge></td>
                <td className="py-3 pr-4 tabular">04:00 - 09:30 AM</td>
                <td className="py-3 pr-4 tabular font-semibold">16:00 - 21:30 WIB</td>
                <td className="py-3 text-xs text-muted-foreground">Volume rendah, spread lebar. Hati-hati!</td>
              </tr>
              <tr className={cn("transition-colors", !weekend && session.name === "Regular Hours" && "bg-bull/5")}>
                <td className="py-3 pr-4"><Badge variant="bull">Regular Hours</Badge></td>
                <td className="py-3 pr-4 tabular">09:30 AM - 04:00 PM</td>
                <td className="py-3 pr-4 tabular font-semibold">21:30 - 04:00 WIB</td>
                <td className="py-3 text-xs text-muted-foreground">Jam utama trading. Volume & likuiditas tinggi.</td>
              </tr>
              <tr className={cn("transition-colors", !weekend && session.name === "After-Hours" && "bg-warning/5")}>
                <td className="py-3 pr-4"><Badge variant="warning">After-Hours</Badge></td>
                <td className="py-3 pr-4 tabular">04:00 PM - 08:00 PM</td>
                <td className="py-3 pr-4 tabular font-semibold">04:00 - 08:00 WIB</td>
                <td className="py-3 text-xs text-muted-foreground">Earnings biasa dirilis di sini. Volatil!</td>
              </tr>
              <tr className={cn("transition-colors", (weekend || session.name === "Market Closed") && "bg-bear/5")}>
                <td className="py-3 pr-4"><Badge variant="bear">Closed</Badge></td>
                <td className="py-3 pr-4 tabular">08:00 PM - 04:00 AM</td>
                <td className="py-3 pr-4 tabular font-semibold">08:00 - 16:00 WIB</td>
                <td className="py-3 text-xs text-muted-foreground">Pasar tutup. Weekend & US holidays.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tips for Indonesian investors */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">Tips untuk Investor Indonesia</h3>
        <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" /><strong className="text-foreground">Golden Hour:</strong> 21:30-23:00 WIB — jam pertama market buka, volume tinggi, banyak peluang</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" /><strong className="text-foreground">Hindari:</strong> Trading jam 02:00-04:00 WIB kecuali ada news besar (kurang tidur = keputusan buruk)</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><strong className="text-foreground">Limit Order:</strong> Gunakan limit order sebelum tidur — eksekusi otomatis saat harga tercapai</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info" /><strong className="text-foreground">DCA Style:</strong> Kalau tidak mau begadang, invest rutin pakai DCA — tidak perlu pantau real-time</li>
        </ul>
      </div>
    </div>
  );
}
