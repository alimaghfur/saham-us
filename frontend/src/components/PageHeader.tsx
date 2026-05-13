import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: string;
  gradient?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
  gradient = false,
}: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight",
              gradient && "gradient-text",
            )}
          >
            {title}
          </h1>
          {badge && (
            <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
