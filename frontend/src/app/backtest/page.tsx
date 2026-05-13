"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  LineChart,
  Play,
  RotateCcw,
  Target,
  TestTube,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

const STRATEGIES = [
  {
    id: "sma_crossover",
    name: "SMA Crossover",
    description: "Buy when fast SMA crosses above slow SMA, sell on cross below",
    icon: TrendingUp,
    color: "primary",
  },
  {
    id: "rsi_oversold",
    name: "RSI Oversold Bounce",
    description: "Buy when RSI crosses above oversold level, sell at overbought",
    icon: Activity,
    color: "bull",
  },
  {
    id: "macd_crossover",
    name: "MACD Crossover",
    description: "Buy on MACD bullish crossover, sell on bearish crossover",
    icon: LineChart,
    color: "info",
  },
  {
    id: "breakout",
    name: "20-Day Breakout",
    description: "Buy when price breaks above 20-day high, hold max 10 days",
    icon: Zap,
    color: "warning",
  },
];

const RANGES = [
  { value: "6mo", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "5y", label: "5 Years" },
];

export default function BacktestPage() {
  const [form, setForm] = useState({
    symbol: "AAPL",
    strategy: "sma_crossover",
    range: "2y",
    fast_period: 20,
    slow_period: 50,
    rsi_period: 14,
    rsi_oversold: 30,
    rsi_overbought: 70,
    stop_loss_pct: 5,
    take_profit_pct: 10,
  });

  const backtest = useMutation({
    mutationFn: (params: typeof form) => api.runBacktest(params),
  });

  const result = backtest.data;

  function runTest(e: React.FormEvent) {
    e.preventDefault();
    backtest.mutate(form);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Backtesting"
        description="Simulate trading strategies on historical data to measure performance before risking real capital."
        badge="Live"
      />

      {/* Strategy Selection */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STRATEGIES.map((s) => {
          const Icon = s.icon;
          const isActive = form.strategy === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setForm({ ...form, strategy: s.id })}
              className={cn(
                "group flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200",
                isActive
                  ? "border-primary/50 bg-primary/10 shadow-glow-sm"
                  : "border-border/50 bg-card hover:border-border hover:bg-card-hover hover:-translate-y-0.5",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon size={18} />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{s.name}</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {s.description}
              </p>
            </button>
          );
        })}
      </section>

      {/* Configuration Form */}
      <Card title="Configuration" icon={<TestTube size={14} />} variant="glass">
        <form onSubmit={runTest} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Symbol
              </label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm font-semibold outline-none focus:border-primary/50"
                placeholder="AAPL"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Time Period
              </label>
              <select
                value={form.range}
                onChange={(e) => setForm({ ...form, range: e.target.value })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Stop Loss %
              </label>
              <input
                type="number"
                step="0.5"
                value={form.stop_loss_pct}
                onChange={(e) => setForm({ ...form, stop_loss_pct: parseFloat(e.target.value) || 5 })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Take Profit %
              </label>
              <input
                type="number"
                step="0.5"
                value={form.take_profit_pct}
                onChange={(e) => setForm({ ...form, take_profit_pct: parseFloat(e.target.value) || 10 })}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Strategy-specific params */}
          {form.strategy === "sma_crossover" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Fast SMA Period
                </label>
                <input
                  type="number"
                  value={form.fast_period}
                  onChange={(e) => setForm({ ...form, fast_period: parseInt(e.target.value) || 20 })}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Slow SMA Period
                </label>
                <input
                  type="number"
                  value={form.slow_period}
                  onChange={(e) => setForm({ ...form, slow_period: parseInt(e.target.value) || 50 })}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>
            </div>
          )}

          {form.strategy === "rsi_oversold" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  RSI Period
                </label>
                <input
                  type="number"
                  value={form.rsi_period}
                  onChange={(e) => setForm({ ...form, rsi_period: parseInt(e.target.value) || 14 })}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Oversold Level
                </label>
                <input
                  type="number"
                  value={form.rsi_oversold}
                  onChange={(e) => setForm({ ...form, rsi_oversold: parseInt(e.target.value) || 30 })}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Overbought Level
                </label>
                <input
                  type="number"
                  value={form.rsi_overbought}
                  onChange={(e) => setForm({ ...form, rsi_overbought: parseInt(e.target.value) || 70 })}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              icon={<Play size={14} />}
              disabled={backtest.isPending || !form.symbol}
            >
              {backtest.isPending ? "Running..." : "Run Backtest"}
            </Button>
            {result && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={() => backtest.reset()}
              >
                Clear Results
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Loading State */}
      {backtest.isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && result.total_trades > 0 && (
        <>
          {/* Summary Stats */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Return"
              value={`${result.total_return >= 0 ? "+" : ""}${result.total_return.toFixed(2)}%`}
              changeType={result.total_return >= 0 ? "bull" : "bear"}
              icon={result.total_return >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            />
            <StatCard
              label="Win Rate"
              value={`${result.win_rate.toFixed(1)}%`}
              change={`${result.winning_trades}W / ${result.losing_trades}L`}
              changeType={result.win_rate >= 50 ? "bull" : "bear"}
              icon={<Target size={16} />}
            />
            <StatCard
              label="Profit Factor"
              value={result.profit_factor >= 999 ? "∞" : result.profit_factor.toFixed(2)}
              change={`Avg Win: +${result.avg_win.toFixed(1)}% | Avg Loss: -${result.avg_loss.toFixed(1)}%`}
              changeType={result.profit_factor >= 1.5 ? "bull" : result.profit_factor >= 1 ? "neutral" : "bear"}
              icon={<BarChart3 size={16} />}
            />
            <StatCard
              label="Max Drawdown"
              value={`-${result.max_drawdown.toFixed(2)}%`}
              change={result.sharpe_ratio != null ? `Sharpe: ${result.sharpe_ratio}` : ""}
              changeType={result.max_drawdown <= 15 ? "bull" : result.max_drawdown <= 25 ? "neutral" : "bear"}
              icon={<ArrowDownRight size={16} />}
            />
          </section>

          {/* Equity Curve */}
          <Card title="Equity Curve" subtitle="Starting capital: $100" icon={<LineChart size={14} />}>
            <div className="flex items-end gap-1 px-2 py-4" style={{ height: "200px" }}>
              {result.equity_curve.map((point: any, idx: number) => {
                const max = Math.max(...result.equity_curve.map((p: any) => p.equity));
                const min = Math.min(...result.equity_curve.map((p: any) => p.equity));
                const range = max - min || 1;
                const height = ((point.equity - min) / range) * 160 + 20;
                const isProfit = point.equity >= 100;
                return (
                  <div
                    key={idx}
                    className="group relative flex-1"
                    style={{ height: "100%" }}
                  >
                    <div
                      className={cn(
                        "absolute bottom-0 w-full rounded-t transition-all",
                        isProfit ? "bg-bull/60 hover:bg-bull/80" : "bg-bear/60 hover:bg-bear/80"
                      )}
                      style={{ height: `${height}px` }}
                    />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-card px-1.5 py-0.5 text-[9px] font-mono opacity-0 shadow transition-opacity group-hover:opacity-100">
                      ${point.equity.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-2 text-[10px] text-muted-foreground">
              <span>Trade #0</span>
              <span className="font-medium text-foreground">
                Final: ${result.equity_curve[result.equity_curve.length - 1]?.equity.toFixed(2)}
              </span>
              <span>Trade #{result.total_trades}</span>
            </div>
          </Card>

          {/* Trade Log */}
          <Card
            title="Trade Log"
            subtitle={`${result.total_trades} trades executed`}
            icon={<Activity size={14} />}
          >
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-3">#</th>
                    <th className="pb-2 pr-3">Entry</th>
                    <th className="pb-2 pr-3">Exit</th>
                    <th className="pb-2 pr-3 text-right">Entry $</th>
                    <th className="pb-2 pr-3 text-right">Exit $</th>
                    <th className="pb-2 pr-3 text-right">P&L</th>
                    <th className="pb-2 text-right">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {result.trades.map((trade: any, idx: number) => (
                    <tr key={idx} className="transition-colors hover:bg-muted/20">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 pr-3 text-xs">{trade.entry_date}</td>
                      <td className="py-2 pr-3 text-xs">{trade.exit_date}</td>
                      <td className="py-2 pr-3 text-right tabular text-xs">
                        ${formatPrice(trade.entry_price)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular text-xs">
                        ${formatPrice(trade.exit_price)}
                      </td>
                      <td className={cn(
                        "py-2 pr-3 text-right tabular text-xs font-semibold",
                        trade.pnl_percent >= 0 ? "text-bull" : "text-bear"
                      )}>
                        {trade.pnl_percent >= 0 ? "+" : ""}{trade.pnl_percent.toFixed(2)}%
                      </td>
                      <td className="py-2 text-right tabular text-xs text-muted-foreground">
                        {trade.holding_days}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Performance Summary */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/30 bg-card/50 px-4 py-3 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Summary:</span>
            <span>Symbol: <strong className="text-foreground">{result.symbol}</strong></span>
            <span>Strategy: <strong className="text-foreground">{STRATEGIES.find(s => s.id === result.strategy)?.name}</strong></span>
            <span>Period: <strong className="text-foreground">{result.range}</strong></span>
            <span>Trades: <strong className="text-foreground">{result.total_trades}</strong></span>
            <span className={result.total_return >= 0 ? "text-bull" : "text-bear"}>
              Return: <strong>{result.total_return >= 0 ? "+" : ""}{result.total_return.toFixed(2)}%</strong>
            </span>
          </div>
        </>
      )}

      {/* No trades result */}
      {result && result.total_trades === 0 && (
        <Card variant="glass">
          <div className="flex flex-col items-center py-12 text-center">
            <TestTube size={32} className="text-muted-foreground" />
            <h3 className="mt-4 text-sm font-semibold">No Trades Generated</h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              The strategy did not generate any trade signals for {result.symbol} in the selected time period.
              Try a different symbol, strategy, or adjust the parameters.
            </p>
          </div>
        </Card>
      )}

      {/* Tips */}
      {!result && !backtest.isPending && (
        <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
          <h3 className="text-sm font-semibold">Backtesting Tips</h3>
          <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Test on at least 2 years of data for statistical significance
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              A win rate above 50% with profit factor &gt; 1.5 is a solid strategy
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Keep max drawdown under 20% for sustainable trading
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Past performance does not guarantee future results — always use stop losses
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
