import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<
  AlertTone,
  { container: string; icon: string; Icon: LucideIcon }
> = {
  info: {
    container: "border-line bg-surface-muted",
    icon: "text-body",
    Icon: Info,
  },
  success: {
    container: "border-primary/30 bg-primary-50",
    icon: "text-primary-700",
    Icon: CheckCircle2,
  },
  warning: {
    container: "border-accent/40 bg-accent-50",
    icon: "text-accent-600",
    Icon: AlertTriangle,
  },
  danger: {
    container: "border-danger/30 bg-danger/10",
    icon: "text-danger",
    Icon: XCircle,
  },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Optional trailing action (e.g. a retry link/button). */
  action?: ReactNode;
  /** Show a dismiss button and call this when clicked. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Alert — an inline, non-blocking status banner (info/success/warning/danger).
 * Uses `role="status"` for polite tones and `role="alert"` for danger so screen
 * readers announce errors immediately. Presentation-only.
 */
export function Alert({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
  className,
}: AlertProps) {
  const { container, icon, Icon } = toneStyles[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-card border p-4 text-sm",
        container,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && (
          <div className={cn("text-body", title && "mt-0.5")}>{children}</div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
