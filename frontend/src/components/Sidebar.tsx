"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { menuSections } from "@/lib/menu";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-300 lg:flex",
        collapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 border-b border-border/50 px-4 py-4"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
          <BarChart3 size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <div className="text-sm font-bold tracking-tight">Saham-US</div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Pro Analysis
            </div>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {menuSections.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed && (
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                {section.label}
              </div>
            )}
            {collapsed && <div className="mb-2 border-t border-border/30" />}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-primary/10 text-primary shadow-glow-sm"
                          : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}

                      <Icon
                        size={18}
                        className={cn(
                          "shrink-0 transition-colors",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />

                      {!collapsed && (
                        <>
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                "ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                item.badge === "New"
                                  ? "bg-primary/20 text-primary"
                                  : item.badge === "Soon"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-warning/20 text-warning",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Tooltip for collapsed state */}
                      {collapsed && (
                        <div className="pointer-events-none absolute left-full z-50 ml-2 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle + footer */}
      <div className="border-t border-border/50 px-3 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
        {!collapsed && (
          <div className="mt-2 px-3 text-[10px] text-muted-foreground/50">
            v0.2.0 · Data via yfinance
          </div>
        )}
      </div>
    </aside>
  );
}
