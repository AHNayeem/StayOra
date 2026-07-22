import type { StatusDef } from "../../lib/status";

/** Reservation lifecycle values — the API contract, and the enum source. */
export const BOOKING_STATUS_VALUES = [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "refunded",
] as const;

/** Reservation lifecycle. Labels/tones are config (see {@link BOOKING_STATUSES}). */
export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];

export interface Booking {
  id: string;
  /** Human-facing reference, e.g. "BK-1042". */
  reference: string;
  guestName: string;
  guestEmail: string;
  property: string;
  propertyType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  amount: number;
  currency: string;
  status: BookingStatus;
  channel: string;
  createdAt: string;
}

/** Fields accepted when creating a booking (see the create form / schema). */
export interface CreateBookingInput {
  guestName: string;
  guestEmail: string;
  property: string;
  propertyType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  amount: number;
  currency: string;
  status: BookingStatus;
}

/** Status registry — the single source for booking status labels + tones. */
export const BOOKING_STATUSES: readonly StatusDef<BookingStatus>[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "confirmed", label: "Confirmed", tone: "info" },
  { value: "checked_in", label: "Checked in", tone: "info" },
  { value: "completed", label: "Completed", tone: "success" },
  { value: "cancelled", label: "Cancelled", tone: "neutral" },
  { value: "refunded", label: "Refunded", tone: "danger" },
];
