import { cn } from "@/lib/cn";
import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-gradient-primary text-white shadow-glow-sm hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]",
    secondary:
      "bg-muted text-foreground hover:bg-muted/80 active:scale-[0.98]",
    ghost:
      "text-muted-foreground hover:bg-muted hover:text-foreground",
    outline:
      "border border-border/50 text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
    danger:
      "bg-bear/10 text-bear hover:bg-bear/20 active:scale-[0.98]",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-9 px-4 text-sm gap-2 rounded-xl",
    lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
