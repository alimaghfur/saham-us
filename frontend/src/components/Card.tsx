import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "gradient" | "outline";
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  title,
  subtitle,
  action,
  icon,
  children,
  className,
  variant = "default",
  hover = false,
  padding = "md",
}: CardProps) {
  const variants = {
    default: "border border-border/50 bg-card",
    glass: "glass",
    gradient: "gradient-border bg-card",
    outline: "border border-border/30 bg-transparent",
  };

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-300",
        variants[variant],
        hover && "hover:border-border hover:shadow-card-hover hover:-translate-y-0.5",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={cn(paddings[padding])}>{children}</div>
    </div>
  );
}

/** Stat card — used for KPI displays */
interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "bull" | "bear" | "neutral";
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:border-border hover:shadow-card-hover hover:-translate-y-0.5",
        className,
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 text-xl font-bold tabular">{value}</div>
        {change && (
          <div
            className={cn(
              "mt-1 text-xs font-medium tabular",
              changeType === "bull" && "text-bull",
              changeType === "bear" && "text-bear",
              changeType === "neutral" && "text-muted-foreground",
            )}
          >
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
