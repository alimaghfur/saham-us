"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, AlertTriangle, Globe, Activity, Bell } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function EconomicCalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["economic-calendar"],
    queryFn: () => api.economicCalendar(),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Economic Calendar"
        description="Upcoming macro events — FOMC, NFP, CPI, and more. Know what moves markets before it happens."
        badge="Macro"
      />

      {isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-bear tabular-nums">{data.high_impact_count ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">High Impact Events</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-500 tabular-nums">{data.medium_impact_count ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">Medium Impact</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-muted-foreground tabular-nums">{data.low_impact_count ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">Low Impact</div>
              </div>
            </Card>
          </div>

          {/* Key Dates */}
          {(data.next_fomc || data.next_nfp || data.next_cpi) && (
            <div className="grid gap-4 md:grid-cols-3">
              {data.next_fomc && (
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bear/10"><Bell size={18} className="text-bear" /></div>
                    <div>
                      <div className="text-sm font-semibold">Next FOMC</div>
                      <div className="text-xs text-muted-foreground">{data.next_fomc}</div>
                    </div>
                  </div>
                </Card>
              )}
              {data.next_nfp && (
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Activity size={18} className="text-primary" /></div>
                    <div>
                      <div className="text-sm font-semibold">Next NFP</div>
                      <div className="text-xs text-muted-foreground">{data.next_nfp}</div>
                    </div>
                  </div>
                </Card>
              )}
              {data.next_cpi && (
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10"><AlertTriangle size={18} className="text-yellow-500" /></div>
                    <div>
                      <div className="text-sm font-semibold">Next CPI</div>
                      <div className="text-xs text-muted-foreground">{data.next_cpi}</div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Events Table */}
          {data.events?.length > 0 && (
            <Card title="Upcoming Events" icon={<Calendar size={14} />} subtitle={`${data.events.length} events`}>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Event</th>
                      <th className="pb-3 pr-4">Impact</th>
                      <th className="pb-3 pr-4">Category</th>
                      <th className="pb-3 pr-4 text-right">Previous</th>
                      <th className="pb-3 pr-4 text-right">Forecast</th>
                      <th className="pb-3 text-right">Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.events.map((ev: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{ev.date}</td>
                        <td className="py-3 pr-4 font-medium">{ev.name}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={ev.impact === "High" ? "danger" : ev.impact === "Medium" ? "warning" : "default"}>
                            {ev.impact}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{ev.category}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{ev.previous ?? "—"}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{ev.forecast ?? "—"}</td>
                        <td className="py-3 text-right tabular-nums font-medium">{ev.actual ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
