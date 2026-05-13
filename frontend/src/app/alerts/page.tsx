"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

// --- Types ---
interface Alert {
  id: string;
  symbol: string;
  condition: "above" | "below" | "rsi_above" | "rsi_below" | "change_above" | "change_below";
  value: number;
  enabled: boolean;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

const CONDITION_OPTIONS = [
  { value: "above", label: "Price Above", icon: ArrowUp, description: "Trigger when price goes above target" },
  { value: "below", label: "Price Below", icon: ArrowDown, description: "Trigger when price drops below target" },
  { value: "rsi_above", label: "RSI Above", icon: TrendingUp, description: "Trigger when RSI exceeds value" },
  { value: "rsi_below", label: "RSI Below", icon: TrendingDown, description: "Trigger when RSI drops below value" },
  { value: "change_above", label: "Daily Change Above %", icon: Zap, description: "Trigger on large daily gain" },
  { value: "change_below", label: "Daily Change Below %", icon: Zap, description: "Trigger on large daily loss" },
] as const;

// --- Local Storage ---
function getAlerts(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("stock_alerts") ?? "[]");
  } catch {
    return [];
  }
}

function saveAlerts(alerts: Alert[]) {
  localStorage.setItem("stock_alerts", JSON.stringify(alerts));
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    condition: "above" as Alert["condition"],
    value: "",
  });

  React.useEffect(() => {
    setAlerts(getAlerts());
  }, []);

  // Check alerts against live data
  const symbols = [...new Set(alerts.filter((a) => a.enabled && !a.triggered).map((a) => a.symbol))];
  const liveCheck = useQuery({
    queryKey: ["alert-check", symbols.join(",")],
    queryFn: async () => {
      const results = await Promise.allSettled(symbols.map((s) => api.quote(s)));
      const techResults = await Promise.allSettled(symbols.map((s) => api.technicals(s)));
      const map: Record<string, { price: number; change_percent: number; rsi: number | null }> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value.price != null) {
          const tech = techResults[i];
          map[symbols[i]] = {
            price: r.value.price,
            change_percent: r.value.change_percent ?? 0,
            rsi: tech.status === "fulfilled" ? tech.value.rsi_14 ?? null : null,
          };
        }
      });
      return map;
    },
    enabled: symbols.length > 0,
    refetchInterval: 30000,
  });

  // Check and trigger alerts
  React.useEffect(() => {
    if (!liveCheck.data) return;
    let changed = false;
    const updated = alerts.map((alert) => {
      if (!alert.enabled || alert.triggered) return alert;
      const data = liveCheck.data[alert.symbol];
      if (!data) return alert;

      let triggered = false;
      switch (alert.condition) {
        case "above":
          triggered = data.price >= alert.value;
          break;
        case "below":
          triggered = data.price <= alert.value;
          break;
        case "rsi_above":
          triggered = data.rsi != null && data.rsi >= alert.value;
          break;
        case "rsi_below":
          triggered = data.rsi != null && data.rsi <= alert.value;
          break;
        case "change_above":
          triggered = data.change_percent >= alert.value;
          break;
        case "change_below":
          triggered = data.change_percent <= -alert.value;
          break;
      }

      if (triggered) {
        changed = true;
        return { ...alert, triggered: true, triggeredAt: new Date().toISOString() };
      }
      return alert;
    });

    if (changed) {
      setAlerts(updated);
      saveAlerts(updated);
    }
  }, [liveCheck.data, alerts]);

  function addAlert(e: React.FormEvent) {
    e.preventDefault();
    const sym = form.symbol.trim().toUpperCase();
    const value = parseFloat(form.value);
    if (!sym || isNaN(value)) return;

    const newAlert: Alert = {
      id: Date.now().toString(),
      symbol: sym,
      condition: form.condition,
      value,
      enabled: true,
      triggered: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [...alerts, newAlert];
    setAlerts(updated);
    saveAlerts(updated);
    setForm({ symbol: "", condition: "above", value: "" });
    setShowAdd(false);
  }

  function removeAlert(id: string) {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
  }

  function toggleAlert(id: string) {
    const updated = alerts.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    setAlerts(updated);
    saveAlerts(updated);
  }

  function resetAlert(id: string) {
    const updated = alerts.map((a) =>
      a.id === id ? { ...a, triggered: false, triggeredAt: undefined } : a
    );
    setAlerts(updated);
    saveAlerts(updated);
  }

  const activeAlerts = alerts.filter((a) => a.enabled && !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const disabledAlerts = alerts.filter((a) => !a.enabled && !a.triggered);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Alerts"
        description="Set price alerts and technical signal notifications. Checked every 30 seconds."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="bull" dot>
              Auto-check 30s
            </Badge>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(!showAdd)}>
              New Alert
            </Button>
          </div>
        }
      />

      {/* Add Alert Form */}
      {showAdd && (
        <Card variant="glass" title="Create Alert" icon={<Bell size={14} />}>
          <form onSubmit={addAlert} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Symbol</label>
              <input
                type="text"
                placeholder="e.g. AAPL"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Condition</label>
              <select
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as Alert["condition"] })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {CONDITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                {form.condition.includes("rsi") ? "RSI Value" : form.condition.includes("change") ? "% Change" : "Price ($)"}
              </label>
              <input
                type="number"
                step="any"
                placeholder={form.condition.includes("rsi") ? "70" : form.condition.includes("change") ? "5" : "200.00"}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" type="submit" className="flex-1">
                Create
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}>
                <X size={14} />
              </Button>
            </div>
          </form>

          {/* Condition Descriptions */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CONDITION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2 rounded-xl px-3 py-2 text-[11px]",
                    form.condition === opt.value ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon size={12} className="mt-0.5 shrink-0" />
                  <span>{opt.description}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell size={16} />
              </div>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="mt-2 text-xl font-bold">{activeAlerts.length}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bull/10 text-bull">
                <Check size={16} />
              </div>
              <span className="text-xs text-muted-foreground">Triggered</span>
            </div>
            <p className="mt-2 text-xl font-bold">{triggeredAlerts.length}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                <BellOff size={16} />
              </div>
              <span className="text-xs text-muted-foreground">Disabled</span>
            </div>
            <p className="mt-2 text-xl font-bold">{disabledAlerts.length}</p>
          </div>
        </div>
      )}

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <Card title="Triggered" icon={<Check size={14} className="text-bull" />} subtitle={`${triggeredAlerts.length} alerts fired`}>
          <div className="space-y-2">
            {triggeredAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={() => removeAlert(alert.id)}
                onToggle={() => toggleAlert(alert.id)}
                onReset={() => resetAlert(alert.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card title="Active Alerts" icon={<Bell size={14} className="text-primary" />} subtitle={`${activeAlerts.length} monitoring`}>
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={() => removeAlert(alert.id)}
                onToggle={() => toggleAlert(alert.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Disabled Alerts */}
      {disabledAlerts.length > 0 && (
        <Card title="Disabled" icon={<BellOff size={14} />} subtitle={`${disabledAlerts.length} paused`}>
          <div className="space-y-2">
            {disabledAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={() => removeAlert(alert.id)}
                onToggle={() => toggleAlert(alert.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {alerts.length === 0 && (
        <EmptyState
          icon={<Bell size={28} />}
          title="No alerts set"
          description="Create price alerts to get notified when stocks hit your target levels. Alerts are checked every 30 seconds while this page is open."
          action={
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
              Create your first alert
            </Button>
          }
        />
      )}

      {/* Info Banner */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <h3 className="text-sm font-semibold">How Alerts Work</h3>
        <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Alerts are checked every 30 seconds while the app is open
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Triggered alerts are marked and can be reset for re-use
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            RSI alerts use 14-period RSI on daily timeframe
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Data is stored locally — alerts persist across sessions
          </li>
        </ul>
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  onRemove,
  onToggle,
  onReset,
}: {
  alert: Alert;
  onRemove: () => void;
  onToggle: () => void;
  onReset?: () => void;
}) {
  const condOpt = CONDITION_OPTIONS.find((c) => c.value === alert.condition);
  const Icon = condOpt?.icon ?? AlertCircle;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl px-4 py-3 transition-colors",
        alert.triggered
          ? "bg-bull/5 border border-bull/20"
          : alert.enabled
            ? "bg-muted/20 hover:bg-muted/30"
            : "bg-muted/10 opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl",
            alert.triggered
              ? "bg-bull/20 text-bull"
              : alert.enabled
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground"
          )}
        >
          {alert.triggered ? <Check size={14} /> : <Icon size={14} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{alert.symbol}</span>
            <Badge
              variant={alert.triggered ? "bull" : alert.enabled ? "primary" : "default"}
            >
              {condOpt?.label}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Target: {alert.condition.includes("rsi") ? `RSI ${alert.value}` : alert.condition.includes("change") ? `${alert.value}%` : `$${formatPrice(alert.value)}`}
            {alert.triggeredAt && ` · Fired ${new Date(alert.triggeredAt).toLocaleString()}`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {alert.triggered && onReset && (
          <button
            onClick={onReset}
            className="rounded-lg px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
          >
            Reset
          </button>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            alert.enabled ? "bg-primary" : "bg-border"
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              alert.enabled && "translate-x-4"
            )}
          />
        </button>
        <button
          onClick={onRemove}
          className="ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-bear/10 hover:text-bear"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
