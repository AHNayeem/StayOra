/**
 * Unified booking read model.
 *
 *   Stay booking (domain)     ┐
 *   Flight booking (store)    ├─▶ toUnified* ─▶ UnifiedBooking ─▶ combined lists
 *   Unified trip (store)      ┘
 *
 * A stay, a flight and a trip are genuinely different products — a stay has
 * room nights and an inventory hold, a flight has a PNR and fare rules, a trip
 * is a *group* of bookings that can be partially confirmed. Forcing them into
 * one record would cost each of them the model that makes it correct.
 *
 * So this is a projection, not a migration. It is read-only, derives everything
 * on the fly, and stores nothing. Each vertical keeps its own domain; this
 * layer exists only for the places that must show them together — the
 * traveller's "everything I've booked" view, and the operator's cross-vertical
 * read view.
 *
 * Never write through this type. If a screen needs to *change* a booking, it
 * uses that vertical's own service.
 */

import type { FlightBooking } from "@/types/flight";
import type { BookingStatus as TravelerStatus } from "@/types/traveler";
import type { TripBooking } from "@/types/trip";
import type { Booking, BookingStatus } from "@/features/dashboard/domain";
import { deriveTripStatus } from "@/services/trip.service";
import { airportLabel } from "@/lib/mock/airports";

/** Which vertical a row came from. */
export type UnifiedBookingType = "stay" | "flight" | "trip";

/**
 * The smallest status set that is true of all three verticals. Each vertical's
 * richer lifecycle stays intact behind it — this is the column a combined list
 * can sort and filter on, not a replacement state machine.
 */
export type UnifiedStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed"
  | "refunded";

export type UnifiedPaymentState =
  | "unpaid"
  | "authorized"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "failed";

/** Where the booking came from — channel for stays, "web" for the rest. */
export type UnifiedSource = "web" | "ios" | "android" | "agency" | "call_center";

export interface UnifiedBooking {
  id: string;
  reference: string;
  type: UnifiedBookingType;
  /** What was booked, in one line. */
  title: string;
  status: UnifiedStatus;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  paymentState: UnifiedPaymentState;
  createdAt: string;
  /** The next date that matters — check-in, departure, or trip start. */
  upcomingAt?: string;
  sourceType: UnifiedSource;
  /** Where the detail for this booking actually lives. */
  href: string;
  /** Count of underlying bookings — 1 for stays and flights, N for a trip. */
  componentCount: number;
}

export const UNIFIED_STATUS_LABEL: Record<UnifiedStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  refunded: "Refunded",
};

export const UNIFIED_TYPE_LABEL: Record<UnifiedBookingType, string> = {
  stay: "Stay",
  flight: "Flight",
  trip: "Trip",
};

/** The platform lifecycle, collapsed to the shared status set. */
const STATUS_MAP: Record<BookingStatus, UnifiedStatus> = {
  initiated: "pending",
  payment_pending: "pending",
  payment_processing: "pending",
  confirmed: "confirmed",
  checked_in: "in_progress",
  completed: "completed",
  cancellation_requested: "confirmed",
  cancelled: "cancelled",
  failed: "failed",
  refund_pending: "cancelled",
  refund_processing: "cancelled",
  refunded: "refunded",
  refund_failed: "cancelled",
};

export function toUnifiedStatus(status: BookingStatus): UnifiedStatus {
  return STATUS_MAP[status] ?? "pending";
}

/**
 * The customer-facing lifecycle, collapsed the same way. Flight bookings are
 * stored against this narrower set rather than the platform one — mapping it
 * separately keeps that difference visible instead of casting it away.
 */
const TRAVELER_STATUS_MAP: Record<TravelerStatus, UnifiedStatus> = {
  pending: "pending",
  upcoming: "confirmed",
  checked_in: "in_progress",
  completed: "completed",
  cancellation_requested: "confirmed",
  cancelled: "cancelled",
  failed: "failed",
  refund_pending: "cancelled",
  refunded: "refunded",
};

const PAYMENT_MAP: Record<string, UnifiedPaymentState> = {
  pending: "unpaid",
  processing: "unpaid",
  authorized: "authorized",
  captured: "paid",
  failed: "failed",
  refund_pending: "paid",
  partially_refunded: "partially_refunded",
  refunded: "refunded",
  voided: "failed",
};

// ---------------------------------------------------------------------------
// Adapters — one per vertical, each reading only that vertical's own record
// ---------------------------------------------------------------------------

/** A stay/experience booking from the platform domain. */
export function toUnifiedFromStay(booking: Booking): UnifiedBooking {
  return {
    id: booking.id,
    reference: booking.reference,
    type: "stay",
    title: booking.productTitle,
    status: toUnifiedStatus(booking.status),
    customerName: booking.customer.name,
    customerEmail: booking.customer.email,
    total: booking.money.total,
    currency: booking.money.currency,
    paymentState: PAYMENT_MAP[booking.payment.status] ?? "unpaid",
    createdAt: booking.createdAt,
    upcomingAt: booking.startAt,
    sourceType: booking.channel,
    href: `/account/bookings/${booking.id}`,
    componentCount: 1,
  };
}

/** A flight booking from the flight store. */
export function toUnifiedFromFlight(flight: FlightBooking): UnifiedBooking {
  const first = flight.slices[0];
  const last = flight.slices[flight.slices.length - 1];
  const lead = flight.passengers[0];

  // The flight store models the lifecycle but keeps no separate payment record,
  // so payment state is read off the booking status rather than invented.
  const paymentState: UnifiedPaymentState =
    flight.status === "refunded"
      ? "refunded"
      : flight.status === "cancelled" || flight.status === "refund_pending"
        ? "paid"
        : flight.status === "failed"
          ? "failed"
          : flight.status === "pending"
            ? "unpaid"
            : "paid";

  return {
    id: flight.id,
    reference: flight.reference,
    type: "flight",
    title: first
      ? `${airportLabel(first.fromCode)} → ${airportLabel(last.toCode)}`
      : "Flight booking",
    status: TRAVELER_STATUS_MAP[flight.status] ?? "pending",
    customerName: lead ? `${lead.firstName} ${lead.lastName}` : flight.contact.email,
    customerEmail: flight.contact.email,
    total: flight.grandTotalUsd,
    currency: "USD",
    paymentState,
    createdAt: flight.bookedAt,
    upcomingAt: first?.departLocal,
    sourceType: "web",
    href: `/account/flights/${flight.id}`,
    componentCount: flight.slices.length,
  };
}

/** Trip roll-up statuses mapped onto the shared set. */
const TRIP_STATUS_MAP: Record<string, UnifiedStatus> = {
  confirmed: "confirmed",
  partially_confirmed: "confirmed",
  pending: "pending",
  failed: "failed",
  cancelled: "cancelled",
  refund_pending: "cancelled",
  completed: "completed",
};

/**
 * A unified trip. Its status is the roll-up the trip domain already derives
 * from its components — recomputed here, never stored, so a leg an operator
 * confirms in the dashboard changes the trip's row too.
 */
export function toUnifiedFromTrip(trip: TripBooking): UnifiedBooking {
  const rollup = deriveTripStatus(trip.components);
  return {
    id: trip.id,
    reference: trip.reference,
    type: "trip",
    title: `${trip.destinationLabel} · ${trip.components.length} ${
      trip.components.length === 1 ? "booking" : "bookings"
    }`,
    status: TRIP_STATUS_MAP[rollup] ?? "pending",
    customerName: "",
    customerEmail: "",
    total: trip.totalUsd,
    currency: trip.currency,
    paymentState: rollup === "failed" ? "failed" : "paid",
    createdAt: trip.createdAt,
    upcomingAt: trip.startDate,
    sourceType: trip.segment === "b2b" ? "agency" : "web",
    href: `/account/trips/${trip.id}`,
    componentCount: trip.components.length,
  };
}

// ---------------------------------------------------------------------------
// Combination
// ---------------------------------------------------------------------------

/**
 * Merge the three sources into one list, newest first.
 *
 * Bookings that belong to a trip are folded into that trip's row rather than
 * listed twice — the trip is the thing the traveller booked, its legs are how
 * it was fulfilled.
 */
export function combineBookings(input: {
  stays?: Booking[];
  flights?: FlightBooking[];
  trips?: TripBooking[];
}): UnifiedBooking[] {
  const trips = input.trips ?? [];
  const grouped = new Set(trips.flatMap((t) => t.components.map((c) => c.bookingId)));

  const rows = [
    ...(input.stays ?? [])
      .filter((b) => !grouped.has(b.id))
      .map(toUnifiedFromStay),
    ...(input.flights ?? []).map(toUnifiedFromFlight),
    ...trips.map(toUnifiedFromTrip),
  ];

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
