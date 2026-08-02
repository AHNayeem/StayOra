import type { StatusDef } from "../../lib/status";

/**
 * Admin-side flight types.
 *
 * Deliberately *flatter* than the public {@link import("@/types/flight")} shapes:
 * an operations table needs one row per record with sortable scalar columns, not
 * a nested offer → slice → segment tree. These are the shapes a `/admin/flights/*`
 * API would return, projected for tabular display, and each module maps from the
 * reference data at seed time.
 */

/* ------------------------------- Airlines --------------------------------- */

export const AIRLINE_STATUS_VALUES = ["active", "suspended", "inactive"] as const;
export type AirlineStatus = (typeof AIRLINE_STATUS_VALUES)[number];

export const ALLIANCE_VALUES = [
  "Star Alliance",
  "SkyTeam",
  "Oneworld",
  "None",
] as const;

export interface AdminAirline {
  id: string;
  /** IATA designator. */
  code: string;
  name: string;
  country: string;
  alliance: (typeof ALLIANCE_VALUES)[number];
  fleetSize: number;
  onTimePct: number;
  rating: number;
  /** Commission Otithee earns on this carrier's fares, percent. */
  commissionPct: number;
  lowCost: boolean;
  status: AirlineStatus;
  updatedAt: string;
}

export const AIRLINE_STATUSES: readonly StatusDef<AirlineStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "suspended", label: "Suspended", tone: "warning" },
  { value: "inactive", label: "Inactive", tone: "neutral" },
];

/* ------------------------------- Airports --------------------------------- */

export const AIRPORT_STATUS_VALUES = ["active", "inactive"] as const;
export type AirportStatus = (typeof AIRPORT_STATUS_VALUES)[number];

export interface AdminAirport {
  id: string;
  /** IATA code. */
  code: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  timezone: string;
  terminals: number;
  status: AirportStatus;
  updatedAt: string;
}

export const AIRPORT_STATUSES: readonly StatusDef<AirportStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "inactive", label: "Inactive", tone: "neutral" },
];

/* -------------------------------- Routes ---------------------------------- */

export const ROUTE_STATUS_VALUES = ["active", "seasonal", "suspended"] as const;
export type RouteStatus = (typeof ROUTE_STATUS_VALUES)[number];

export interface AdminRoute {
  id: string;
  originCode: string;
  destinationCode: string;
  /** "DAC → DXB", denormalised for search and display. */
  pair: string;
  airlineCode: string;
  distanceKm: number;
  /** Typical non-stop block time, minutes. */
  durationMinutes: number;
  /** Weekly departures on this pair. */
  weeklyFrequency: number;
  /** Lowest fare currently sold, USD. */
  fromUsd: number;
  status: RouteStatus;
  updatedAt: string;
}

export const ROUTE_STATUSES: readonly StatusDef<RouteStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "seasonal", label: "Seasonal", tone: "info" },
  { value: "suspended", label: "Suspended", tone: "danger" },
];

/* ------------------------------- Schedules -------------------------------- */

export const SCHEDULE_STATUS_VALUES = [
  "scheduled",
  "delayed",
  "departed",
  "landed",
  "cancelled",
] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUS_VALUES)[number];

export interface AdminSchedule {
  id: string;
  flightNumber: string;
  airlineCode: string;
  originCode: string;
  destinationCode: string;
  /** Local departure, `YYYY-MM-DDTHH:mm`. */
  departLocal: string;
  /** Local arrival, `YYYY-MM-DDTHH:mm`. */
  arriveLocal: string;
  aircraft: string;
  /** Days of the week this rotation operates, e.g. "Mon, Wed, Fri". */
  operatingDays: string;
  seatsTotal: number;
  seatsSold: number;
  status: ScheduleStatus;
  updatedAt: string;
}

export const SCHEDULE_STATUSES: readonly StatusDef<ScheduleStatus>[] = [
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "delayed", label: "Delayed", tone: "warning" },
  { value: "departed", label: "Departed", tone: "neutral" },
  { value: "landed", label: "Landed", tone: "success" },
  { value: "cancelled", label: "Cancelled", tone: "danger" },
];

/* ------------------------------- Bookings --------------------------------- */

export const FLIGHT_BOOKING_STATUS_VALUES = [
  "confirmed",
  "pending",
  "cancelled",
  "refunded",
  "flown",
] as const;
export type AdminFlightBookingStatus =
  (typeof FLIGHT_BOOKING_STATUS_VALUES)[number];

export interface AdminFlightBooking {
  id: string;
  reference: string;
  pnr: string;
  customer: string;
  email: string;
  airlineCode: string;
  route: string;
  departDate: string;
  cabin: string;
  passengers: number;
  totalUsd: number;
  /** Otithee's commission on this booking, USD. */
  commissionUsd: number;
  paymentMethod: string;
  status: AdminFlightBookingStatus;
  bookedAt: string;
}

export const FLIGHT_BOOKING_STATUSES: readonly StatusDef<AdminFlightBookingStatus>[] =
  [
    { value: "confirmed", label: "Confirmed", tone: "success" },
    { value: "pending", label: "Pending", tone: "warning" },
    { value: "flown", label: "Flown", tone: "neutral" },
    { value: "cancelled", label: "Cancelled", tone: "danger" },
    { value: "refunded", label: "Refunded", tone: "info" },
  ];

/* ------------------------------ Passengers -------------------------------- */

export const CHECKIN_STATUS_VALUES = [
  "not-checked-in",
  "checked-in",
  "boarded",
  "no-show",
] as const;
export type CheckInStatus = (typeof CHECKIN_STATUS_VALUES)[number];

export interface AdminPassenger {
  id: string;
  fullName: string;
  bookingRef: string;
  pnr: string;
  type: string;
  nationality: string;
  documentNumber: string;
  documentExpiry: string;
  flightNumber: string;
  route: string;
  seat: string;
  ticketNumber: string;
  status: CheckInStatus;
}

export const CHECKIN_STATUSES: readonly StatusDef<CheckInStatus>[] = [
  { value: "checked-in", label: "Checked in", tone: "success" },
  { value: "boarded", label: "Boarded", tone: "info" },
  { value: "not-checked-in", label: "Not checked in", tone: "neutral" },
  { value: "no-show", label: "No show", tone: "danger" },
];

/* -------------------------------- Refunds --------------------------------- */

export const REFUND_STATUS_VALUES = [
  "requested",
  "approved",
  "processed",
  "rejected",
] as const;
export type FlightRefundStatus = (typeof REFUND_STATUS_VALUES)[number];

export interface AdminFlightRefund {
  id: string;
  bookingRef: string;
  customer: string;
  airlineCode: string;
  route: string;
  reason: string;
  /** What the traveller paid, USD. */
  paidUsd: number;
  /** Airline cancellation fee retained, USD. */
  feeUsd: number;
  /** Amount to return, USD. */
  refundUsd: number;
  requestedAt: string;
  status: FlightRefundStatus;
}

export const REFUND_STATUSES: readonly StatusDef<FlightRefundStatus>[] = [
  { value: "requested", label: "Requested", tone: "warning" },
  { value: "approved", label: "Approved", tone: "info" },
  { value: "processed", label: "Processed", tone: "success" },
  { value: "rejected", label: "Rejected", tone: "danger" },
];
