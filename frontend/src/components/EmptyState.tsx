import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
