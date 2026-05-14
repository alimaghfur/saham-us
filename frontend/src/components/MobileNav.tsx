"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Target, Star, Eye, Menu } from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/score", icon: Target, label: "Score" },
  { href: "/recommendations", icon: Star, label: "Picks" },
  { href: "/watchlist", icon: Eye, label: "Watchlist" },
];

const moreLinks = [
  { href: "/markets", label: "Markets & Sectors" },
  { href: "/macro", label: "Macro Economy" },
  { href: "/opportunities", label: "Buy the Dip" },
  { href: "/screener", label: "Screener" },
  { href: "/earnings", label: "Earnings Calendar" },
  { href: "/news", label: "News" },
  { href: "/swing", label: "Swing Trading" },
  { href: "/scalping", label: "Scalping" },
  { href: "/calculator", label: "Calculator" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/education", label: "Education" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* More drawer/sheet */}
      {showMore && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-border/50 bg-card p-4 pb-24 animate-fade-in">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <h3 className="mb-3 text-sm font-semibold">More Pages</h3>
            <div className="grid grid-cols-2 gap-2">
              {moreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
                    pathname === link.href
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-card/80 backdrop-blur-xl lg:hidden">
        <nav className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 h-0.5 w-5 rounded-full bg-primary" />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span
                  className={cn(
                    "text-[10px]",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all",
              showMore
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Menu size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </nav>
      </div>
    </>
  );
}
