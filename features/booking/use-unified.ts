"use client";

import { useMemo } from "react";
import type { Booking } from "@/features/dashboard/domain";
import { getState } from "@/features/dashboard/domain";
import { useLocalFlightBookings, useCancelledFlightIds } from "@/features/flights/bookings-store";
import { useTrips } from "@/features/trip/trips-store";
import { useCustomerDomainBookings } from "./customer";
import { useDomainValue } from "./use-domain";
import { combineBookings, type UnifiedBooking } from "./unified";

/**
 * Hooks over the unified read model.
 *
 * Each one reads the three underlying stores *as they are* and projects them —
 * no synchronisation, no copy, nothing to drift. Add a booking anywhere and it
 * shows up here on the next render.
 */

/** Every booking the signed-in traveller owns, across all three verticals. */
export function useUnifiedCustomerBookings(): UnifiedBooking[] {
  const stays = useCustomerDomainBookings();
  const flights = useLocalFlightBookings();
  const cancelledIds = useCancelledFlightIds();
  const trips = useTrips();

  return useMemo(() => {
    const cancelled = new Set(cancelledIds);
    return combineBookings({
      stays,
      flights: flights.map((f) =>
        cancelled.has(f.id) ? { ...f, status: "cancelled" as const } : f,
      ),
      trips,
    });
  }, [stays, flights, cancelledIds, trips]);
}

/**
 * The operator's cross-vertical read view.
 *
 * Merchant-scoped by design: pass a `merchantId` and only that merchant's
 * bookings come back, the same rule the rest of the dashboard enforces. Flights
 * and trips live in browser-local stores that carry no merchant, so a scoped
 * read returns platform stays only rather than leaking rows the scope can't
 * verify.
 */
export function useUnifiedAdminBookings(scope?: { merchantId?: string }): UnifiedBooking[] {
  const merchantId = scope?.merchantId;
  const flights = useLocalFlightBookings();
  const trips = useTrips();

  const stays = useDomainValue<Booking[]>(
    () =>
      getState().bookings.filter((b) => !merchantId || b.merchant.id === merchantId),
    [merchantId ?? ""],
  );

  return useMemo(
    () =>
      combineBookings(
        merchantId ? { stays } : { stays, flights, trips },
      ),
    [stays, flights, trips, merchantId],
  );
}

/** A traveller-scoped count by type, for overview tiles. */
export function useUnifiedCounts(): Record<"stay" | "flight" | "trip" | "total", number> {
  const rows = useUnifiedCustomerBookings();
  return useMemo(
    () => ({
      stay: rows.filter((r) => r.type === "stay").length,
      flight: rows.filter((r) => r.type === "flight").length,
      trip: rows.filter((r) => r.type === "trip").length,
      total: rows.length,
    }),
    [rows],
  );
}
