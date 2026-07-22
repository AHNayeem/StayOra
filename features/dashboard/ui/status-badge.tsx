import type { ReactNode } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Semantic status tones. Callers map their DB status → a tone (statuses
 * themselves are never hardcoded here); the tone decides the colour.
 */
export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const toneToVariant: Record<StatusTone, BadgeVariant> = {
  success: "success",
  warning: "accent",
  danger: "danger",
  info: "primary",
  neutral: "neutral",
};

const dotColor: Record<StatusTone, string> = {
  success: "bg-primary",
  warning: "bg-accent",
  danger: "bg-danger",
  info: "bg-primary",
  neutral: "bg-muted",
};

interface StatusBadgeProps {
  children: ReactNode;
  /** Semantic tone; resolve it from a DB-driven status → tone map. */
  tone?: StatusTone;
  /** Show a leading status dot. */
  dot?: boolean;
  className?: string;
}

/**
 * StatusBadge — a status pill with an optional leading dot, built on {@link Badge}
 * so it inherits the one badge look. Tone-driven: pass the tone resolved from a
 * status's config, not a hardcoded status string.
 */
export function StatusBadge({
  children,
  tone = "neutral",
  dot = true,
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant={toneToVariant[tone]}
      className={className}
      icon={
        dot ? (
          <span
            className={cn("size-1.5 rounded-full", dotColor[tone])}
            aria-hidden="true"
          />
        ) : undefined
      }
    >
      {children}
    </Badge>
  );
}
