import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "default" | "primary" | "bull" | "bear" | "warning" | "info";
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({
  variant = "default",
  children,
  className,
  dot = false,
}: BadgeProps) {
  const variants = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    bull: "bg-bull/15 text-bull",
    bear: "bg-bear/15 text-bear",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold",
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "bull" && "bg-bull",
            variant === "bear" && "bg-bear",
            variant === "primary" && "bg-primary",
            variant === "warning" && "bg-warning",
            variant === "info" && "bg-info",
            variant === "default" && "bg-muted-foreground",
          )}
        />
      )}
      {children}
    </span>
  );
}
