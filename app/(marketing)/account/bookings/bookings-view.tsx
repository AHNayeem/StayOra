"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Luggage } from "lucide-react";
import type { BookingStatus, TravelerBooking } from "@/types/traveler";
import { useMergedBookings } from "@/features/account/created-bookings";
import { useCustomerBookings } from "@/features/booking";
import { useUnifiedCustomerBookings } from "@/features/booking/use-unified";
import { useLocale } from "@/features/i18n";
import { UnifiedBookingList } from "@/components/booking/unified-booking-list";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { BookingRow } from "@/components/account/booking-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Scope = BookingStatus | "all";

/**
 * Filter tabs, one per stored status. `failed` and `refunded` are their own tabs
 * on purpose — a booking that never happened and one that was refunded are
 * different situations for the traveler, and folding either into "Cancelled"
 * would hide money that is owed or already returned.
 */
const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "checked_in", label: "Checked in" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "cancellation_requested", label: "Cancelling" },
  { key: "cancelled", label: "Cancelled" },
  { key: "failed", label: "Failed" },
  { key: "refund_pending", label: "Refunding" },
  { key: "refunded", label: "Refunded" },
];

/**
 * `bookings` carries the flight/trip bookings that live in their own client
 * store; everything sold from the catalogue comes straight off the domain, so
 * a status an operator changes in the dashboard shows here immediately.
 */
export function BookingsView({ bookings }: { bookings: TravelerBooking[] }) {
  const domainBookings = useCustomerBookings();
  const merged = useMergedBookings(bookings);
  const unified = useUnifiedCustomerBookings();
  const { date, money } = useLocale();
  const [scope, setScope] = useState<Scope>("all");
  /**
   * "Stays" is the detailed, per-status view this page has always been. "All
   * products" is the unified read model — one row per thing booked, whether it
   * was a stay, a flight or a whole trip, projected rather than merged.
   */
  const [mode, setMode] = useState<"stays" | "all">("stays");

  const resolved = useMemo(() => {
    const ids = new Set(domainBookings.map((b) => b.id));
    return [...domainBookings, ...merged.filter((b) => !ids.has(b.id))].sort((a, z) =>
      z.bookedAt.localeCompare(a.bookedAt),
    );
  }, [domainBookings, merged]);

  const counts = useMemo(() => {
    const map = new Map<BookingStatus, number>();
    for (const b of resolved) map.set(b.status, (map.get(b.status) ?? 0) + 1);
    return map;
  }, [resolved]);

  const filtered = useMemo(
    () => (scope === "all" ? resolved : resolved.filter((b) => b.status === scope)),
    [resolved, scope],
  );

  return (
    <div>
      <AccountPageHeader
        title="Bookings"
        description="Every trip you've booked, from upcoming stays to past adventures."
      />

      <div
        role="group"
        aria-label="Booking view"
        className="mb-4 inline-flex rounded-pill border border-line p-1"
      >
        {(
          [
            ["stays", "Stays & experiences"],
            ["all", `All products (${unified.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={cn(
              "rounded-pill px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              mode === key ? "bg-primary text-white" : "text-body hover:text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "all" ? (
        <UnifiedBookingList
          bookings={unified}
          money={money}
          date={date}
          emptyMessage="Nothing booked yet — stays, flights and trips all land here."
        />
      ) : (
        <>
      <div className="mb-6 flex flex-wrap gap-2">
        {SCOPES.map((s) => {
          const count = s.key === "all" ? resolved.length : (counts.get(s.key as BookingStatus) ?? 0);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              aria-pressed={scope === s.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill border px-4 py-2 text-sm font-medium transition-colors",
                scope === s.key
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-surface text-body hover:border-primary hover:text-primary",
              )}
            >
              {s.label}
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <AccountEmpty
          icon={Luggage}
          title={scope === "all" ? "No bookings yet" : `No ${scope} bookings`}
          description={
            scope === "all"
              ? "Start planning your next trip — your bookings will appear here."
              : "Try a different filter to see your other bookings."
          }
          action={
            scope === "all" ? (
              <Link href="/" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Explore stays
              </Link>
            ) : undefined
          }
        />
      )}
        </>
      )}
    </div>
  );
}
