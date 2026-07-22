"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Luggage } from "lucide-react";
import type { BookingStatus, TravelerBooking } from "@/types/traveler";
import { useCancelledIds, withOverride } from "@/features/account/booking-overrides";
import { useMergedBookings } from "@/features/account/created-bookings";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { BookingRow } from "@/components/account/booking-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Scope = BookingStatus | "all";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

export function BookingsView({ bookings }: { bookings: TravelerBooking[] }) {
  const cancelledIds = useCancelledIds();
  const merged = useMergedBookings(bookings);
  const [scope, setScope] = useState<Scope>("all");

  // Merge in checkout-created bookings, then apply any local cancellations.
  const resolved = useMemo(
    () => merged.map((b) => withOverride(b, cancelledIds)),
    [merged, cancelledIds],
  );

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
    </div>
  );
}
