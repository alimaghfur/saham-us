import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface Props {
  value?: number | null;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ChangeBadge({
  value,
  className,
  showIcon = false,
  size = "sm",
}: Props) {
  if (value == null || !Number.isFinite(value)) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-lg px-2 py-0.5 text-xs text-muted-foreground",
          className,
        )}
      >
        —
      </span>
    );
  }

  const positive = value > 0;
  const negative = value < 0;

  const sizes = {
    sm: "text-[11px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-1 gap-1",
    lg: "text-sm px-2.5 py-1 gap-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg font-semibold tabular",
        sizes[size],
        positive && "bg-bull/10 text-bull",
        negative && "bg-bear/10 text-bear",
        !positive && !negative && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {showIcon && positive && <TrendingUp size={12} />}
      {showIcon && negative && <TrendingDown size={12} />}
      {showIcon && !positive && !negative && <Minus size={12} />}
      {formatPercent(value)}
    </span>
  );
}
