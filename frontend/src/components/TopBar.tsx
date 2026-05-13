"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Command,
  Menu,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import { cn } from "@/lib/cn";

export function TopBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;
    router.push(`/stock/${encodeURIComponent(symbol)}`);
    setValue("");
    setFocused(false);
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border/50 bg-sidebar/80 px-4 backdrop-blur-xl sm:px-6">
      {/* Mobile menu button */}
      <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden">
        <Menu size={18} />
      </button>

      {/* Search */}
      <form
        onSubmit={submit}
        className={cn(
          "relative flex w-full max-w-md items-center transition-all duration-300",
          focused && "max-w-lg",
        )}
      >
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search ticker (AAPL, TSLA, NVDA)..."
          className={cn(
            "w-full rounded-xl border border-border/50 bg-muted/50 py-2 pl-9 pr-20 text-sm outline-none transition-all duration-300 placeholder:text-muted-foreground/60",
            focused
              ? "border-primary/50 bg-muted shadow-glow-sm ring-1 ring-primary/20"
              : "hover:border-border hover:bg-muted/70",
          )}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <kbd className="hidden rounded-md border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            <Command size={9} className="mr-0.5 inline" />K
          </kbd>
        </div>
      </form>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* Market status */}
        <div className="hidden items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 py-1.5 md:flex">
          <span className="status-live">Live</span>
          <span className="text-[11px] text-muted-foreground">US Market</span>
        </div>

        {/* Notifications */}
        <button className="relative rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        {/* User Avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-xs font-bold text-white shadow-glow-sm transition-transform hover:scale-105">
          U
        </button>
      </div>
    </header>
  );
}
