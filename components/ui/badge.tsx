import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "neutral"
  | "outline"
  | "dark";
export type BadgeSize = "sm" | "md";

const variantMap: Record<BadgeVariant, string> = {
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-600",
  success: "bg-primary-50 text-primary-700",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-surface-muted text-body",
  outline: "border border-line text-body",
  dark: "bg-ink text-white",
};

const sizeMap: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[0.6875rem]",
  md: "px-2.5 py-1 text-xs",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Leading icon (e.g. a star or spark). */
  icon?: ReactNode;
  className?: string;
}

/**
 * Badge — a compact status/label pill (e.g. "Featured", "-20%", "Best seller").
 * Non-interactive; for removable filter chips use {@link Tag}.
 */
export function Badge({
  children,
  variant = "primary",
  size = "md",
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill font-semibold whitespace-nowrap",
        variantMap[variant],
        sizeMap[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
