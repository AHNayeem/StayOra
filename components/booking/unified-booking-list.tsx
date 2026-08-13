"use client";

import Link from "next/link";
import { Building2, Plane, Route } from "lucide-react";
import {
  UNIFIED_STATUS_LABEL,
  UNIFIED_TYPE_LABEL,
  type UnifiedBooking,
  type UnifiedBookingType,
  type UnifiedStatus,
} from "@/features/booking/unified";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The one table that shows stays, flights and trips together.
 *
 * It renders {@link UnifiedBooking} and nothing else — no vertical-specific
 * fields, no branching on `type` beyond the icon. That is the constraint that
 * keeps the adapter honest: anything this table needs must be true of all three
 * products, or it does not belong in the unified model.
 */

const TYPE_ICON: Record<UnifiedBookingType, typeof Plane> = {
  stay: Building2,
  flight: Plane,
  trip: Route,
};

const STATUS_TONE: Record<UnifiedStatus, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-success/15 text-success",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-muted/15 text-muted",
  cancelled: "bg-danger/15 text-danger",
  failed: "bg-danger/15 text-danger",
  refunded: "bg-primary/15 text-primary",
};

interface UnifiedBookingListProps {
  bookings: UnifiedBooking[];
  /** Show the traveller column — useful for the operator view, noise on /account. */
  showCustomer?: boolean;
  emptyMessage?: string;
  /**
   * Formatters are injected rather than pulled from a context, because this
   * table renders on both sides of the app: the public account pages format
   * through the visitor's locale/currency, the dashboard through the tenant's.
   * Neither provider exists on the other's side of the tree.
   */
  money: (amountUsd: number) => string;
  date: (iso: string) => string;
  className?: string;
}

export function UnifiedBookingList({
  bookings,
  showCustomer = false,
  emptyMessage = "No bookings yet.",
  money,
  date,
  className,
}: UnifiedBookingListProps) {
  if (bookings.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[48rem] border-collapse text-sm">
        <caption className="sr-only">
          All bookings across stays, flights and trips
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-3 py-2 font-semibold">Type</th>
            <th scope="col" className="px-3 py-2 font-semibold">Reference</th>
            <th scope="col" className="px-3 py-2 font-semibold">Booking</th>
            {showCustomer && (
              <th scope="col" className="px-3 py-2 font-semibold">Traveller</th>
            )}
            <th scope="col" className="px-3 py-2 font-semibold">Status</th>
            <th scope="col" className="px-3 py-2 font-semibold">Payment</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Total</th>
            <th scope="col" className="px-3 py-2 font-semibold">Upcoming</th>
            <th scope="col" className="px-3 py-2 font-semibold">Booked</th>
            <th scope="col" className="px-3 py-2 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const Icon = TYPE_ICON[booking.type];
            return (
              <tr key={`${booking.type}:${booking.id}`} className="border-b border-line/60">
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-body">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {UNIFIED_TYPE_LABEL[booking.type]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={booking.href}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {booking.reference}
                  </Link>
                </td>
                <td className="max-w-[16rem] px-3 py-3">
                  <p className="truncate text-ink">{booking.title}</p>
                  {booking.componentCount > 1 && (
                    <p className="text-xs text-muted">
                      {booking.componentCount} components
                    </p>
                  )}
                </td>
                {showCustomer && (
                  <td className="px-3 py-3">
                    <p className="truncate text-ink">{booking.customerName || "—"}</p>
                    <p className="truncate text-xs text-muted">
                      {booking.customerEmail || ""}
                    </p>
                  </td>
                )}
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-pill px-2 py-0.5 text-xs font-medium",
                      STATUS_TONE[booking.status],
                    )}
                  >
                    {UNIFIED_STATUS_LABEL[booking.status]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge variant="neutral" size="sm">
                    {booking.paymentState.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-ink">
                  {money(booking.total)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-muted">
                  {booking.upcomingAt ? date(booking.upcomingAt) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-muted">
                  {date(booking.createdAt)}
                </td>
                <td className="px-3 py-3 text-muted">
                  {booking.sourceType.replace(/_/g, " ")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
