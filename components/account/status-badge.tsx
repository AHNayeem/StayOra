import { cn } from "@/lib/utils";
import type {
  BookingStatus,
  CouponStatus,
  InvoiceStatus,
  PaymentStatus,
} from "@/types/traveler";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneMap: Record<StatusTone, string> = {
  success: "bg-emerald-500/12 text-emerald-700",
  warning: "bg-warning/15 text-amber-700",
  danger: "bg-danger/12 text-danger",
  info: "bg-primary-50 text-primary-700",
  neutral: "bg-surface-muted text-muted",
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

/** StatusBadge — a compact status pill used across the account tables/cards. */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold capitalize",
        toneMap[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          tone === "success" && "bg-emerald-600",
          tone === "warning" && "bg-amber-500",
          tone === "danger" && "bg-danger",
          tone === "info" && "bg-primary",
          tone === "neutral" && "bg-muted",
        )}
      />
      {label}
    </span>
  );
}

export function bookingStatusMeta(status: BookingStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case "upcoming":
      return { label: "Upcoming", tone: "info" };
    case "completed":
      return { label: "Completed", tone: "success" };
    case "pending":
      return { label: "Pending", tone: "warning" };
    case "cancelled":
      return { label: "Cancelled", tone: "danger" };
  }
}

export function invoiceStatusMeta(status: InvoiceStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case "paid":
      return { label: "Paid", tone: "success" };
    case "due":
      return { label: "Due", tone: "warning" };
    case "refunded":
      return { label: "Refunded", tone: "info" };
    case "void":
      return { label: "Void", tone: "neutral" };
  }
}

export function paymentStatusMeta(status: PaymentStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case "succeeded":
      return { label: "Succeeded", tone: "success" };
    case "refunded":
      return { label: "Refunded", tone: "info" };
    case "pending":
      return { label: "Pending", tone: "warning" };
    case "failed":
      return { label: "Failed", tone: "danger" };
  }
}

export function couponStatusMeta(status: CouponStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case "active":
      return { label: "Active", tone: "success" };
    case "used":
      return { label: "Used", tone: "neutral" };
    case "expired":
      return { label: "Expired", tone: "danger" };
  }
}
