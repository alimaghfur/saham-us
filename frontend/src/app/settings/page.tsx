"use client";

import { useState } from "react";
import {
  Bell,
  Database,
  Globe,
  Moon,
  Palette,
  Shield,
  Sun,
  User,
} from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your preferences and application settings."
      />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Appearance */}
        <Card title="Appearance" icon={<Palette size={14} />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Theme</h4>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred color scheme
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
                    theme === "dark"
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Moon size={14} />
                  Dark
                </button>
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
                    theme === "light"
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Sun size={14} />
                  Light
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Provider */}
        <Card title="Data Provider" icon={<Database size={14} />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Market Data Source</h4>
                <p className="text-xs text-muted-foreground">
                  Currently using yfinance for market data
                </p>
              </div>
              <Badge variant="primary">yfinance</Badge>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground">
                Data is delayed ~15 minutes. For educational and research
                purposes only. Not financial advice.
              </p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card title="Notifications" icon={<Bell size={14} />}>
          <div className="space-y-3">
            <SettingToggle
              label="Price Alerts"
              description="Get notified when stocks hit your target price"
              enabled={false}
            />
            <SettingToggle
              label="Market Summary"
              description="Daily market recap notification"
              enabled={false}
            />
            <SettingToggle
              label="Watchlist Updates"
              description="Notify on significant moves in watchlist"
              enabled={false}
            />
          </div>
          <div className="mt-3">
            <Badge variant="default">Notifications coming soon</Badge>
          </div>
        </Card>

        {/* Account */}
        <Card title="Account" icon={<User size={14} />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Plan</h4>
                <p className="text-xs text-muted-foreground">
                  Free tier — all features included during beta
                </p>
              </div>
              <Badge variant="bull" dot>
                Beta Access
              </Badge>
            </div>
            <div className="rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 p-4">
              <h4 className="text-sm font-semibold">Pro Plan (Coming Soon)</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Real-time data, AI insights, unlimited alerts, priority support
              </p>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card title="About" icon={<Shield size={14} />}>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-mono font-medium text-foreground">
                0.2.0
              </span>
            </div>
            <div className="flex justify-between">
              <span>Backend</span>
              <span className="font-mono font-medium text-foreground">
                FastAPI + yfinance
              </span>
            </div>
            <div className="flex justify-between">
              <span>Frontend</span>
              <span className="font-mono font-medium text-foreground">
                Next.js 14 + Tailwind
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-muted/30 p-3">
              <p>
                <strong className="text-foreground">Disclaimer:</strong> This
                platform is for educational and research purposes only. It does
                not constitute financial advice. Always do your own research
                before making investment decisions.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  const [on, setOn] = useState(enabled);
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/20 px-4 py-3">
      <div>
        <h4 className="text-sm font-medium">{label}</h4>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          on ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm",
            on && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
