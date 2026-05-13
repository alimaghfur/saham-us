import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "card" | "text" | "circle";
}

export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  const variants = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-3 w-3/4",
    circle: "h-10 w-10 rounded-full",
  };

  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted/70",
        variants[variant],
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/30 bg-card p-4",
        className,
      )}
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl bg-muted/30 px-4 py-3"
        >
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
