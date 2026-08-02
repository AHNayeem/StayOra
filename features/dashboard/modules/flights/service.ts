/**
 * Flight admin data sources.
 *
 * Six in-memory {@link createStubService} instances, one per resource. Each
 * matches the {@link import("../../crud/types").ResourceService} contract, so
 * swapping any of them for a real repository is a one-line change with no
 * caller impact.
 */

import { createStubService } from "../../crud";
import {
  ADMIN_AIRLINES,
  ADMIN_AIRPORTS,
  ADMIN_FLIGHT_BOOKINGS,
  ADMIN_FLIGHT_REFUNDS,
  ADMIN_PASSENGERS,
  ADMIN_ROUTES,
  ADMIN_SCHEDULES,
} from "./data";
import type {
  AdminAirline,
  AdminAirport,
  AdminFlightBooking,
  AdminFlightRefund,
  AdminPassenger,
  AdminRoute,
  AdminSchedule,
} from "./types";
import type {
  AirlineFormValues,
  AirportFormValues,
  RouteFormValues,
  ScheduleFormValues,
} from "./schemas";

const nowIso = () => new Date().toISOString();

/* ------------------------------- Airlines --------------------------------- */

export const airlineService = createStubService<AdminAirline, AirlineFormValues, AirlineFormValues>({
  seed: ADMIN_AIRLINES,
  getId: (row) => row.id,
  searchFields: ["name", "code", "country"],
  idPrefix: "arl",
  applyCreate: (input, id) => ({
    ...input,
    id,
    code: input.code.toUpperCase(),
    rating: 4,
    onTimePct: 80,
    updatedAt: nowIso(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    code: input.code.toUpperCase(),
    updatedAt: nowIso(),
  }),
});

export const airlineKeys = {
  all: ["flights", "airlines"] as const,
  detail: (id: string) => ["flights", "airlines", "detail", id] as const,
};

/* ------------------------------- Airports --------------------------------- */

export const airportService = createStubService<AdminAirport, AirportFormValues, AirportFormValues>({
  seed: ADMIN_AIRPORTS,
  getId: (row) => row.id,
  searchFields: ["name", "code", "city", "country"],
  idPrefix: "apt",
  applyCreate: (input, id) => ({
    ...input,
    id,
    code: input.code.toUpperCase(),
    countryCode: input.countryCode.toUpperCase(),
    updatedAt: nowIso(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    code: input.code.toUpperCase(),
    countryCode: input.countryCode.toUpperCase(),
    updatedAt: nowIso(),
  }),
});

export const airportKeys = {
  all: ["flights", "airports"] as const,
  detail: (id: string) => ["flights", "airports", "detail", id] as const,
};

/* -------------------------------- Routes ---------------------------------- */

export const routeService = createStubService<AdminRoute, RouteFormValues, RouteFormValues>({
  seed: ADMIN_ROUTES,
  getId: (row) => row.id,
  searchFields: ["pair", "originCode", "destinationCode", "airlineCode"],
  idPrefix: "rte",
  applyCreate: (input, id) => ({
    ...input,
    id,
    originCode: input.originCode.toUpperCase(),
    destinationCode: input.destinationCode.toUpperCase(),
    // Keep the denormalised label in step with its parts — the search index
    // reads `pair`, so a stale label would make a route unfindable.
    pair: `${input.originCode.toUpperCase()} → ${input.destinationCode.toUpperCase()}`,
    updatedAt: nowIso(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    originCode: input.originCode.toUpperCase(),
    destinationCode: input.destinationCode.toUpperCase(),
    pair: `${input.originCode.toUpperCase()} → ${input.destinationCode.toUpperCase()}`,
    updatedAt: nowIso(),
  }),
});

export const routeKeys = {
  all: ["flights", "routes"] as const,
  detail: (id: string) => ["flights", "routes", "detail", id] as const,
};

/* ------------------------------- Schedules -------------------------------- */

export const scheduleService = createStubService<AdminSchedule, ScheduleFormValues, ScheduleFormValues>({
  seed: ADMIN_SCHEDULES,
  getId: (row) => row.id,
  searchFields: ["flightNumber", "originCode", "destinationCode", "aircraft"],
  idPrefix: "sch",
  sortAccessors: {
    // Load factor is derived, so it needs an explicit accessor to be sortable.
    loadFactor: (row) => (row.seatsTotal > 0 ? row.seatsSold / row.seatsTotal : 0),
  },
  applyCreate: (input, id) => ({
    ...input,
    id,
    flightNumber: input.flightNumber.toUpperCase(),
    originCode: input.originCode.toUpperCase(),
    destinationCode: input.destinationCode.toUpperCase(),
    updatedAt: nowIso(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    flightNumber: input.flightNumber.toUpperCase(),
    originCode: input.originCode.toUpperCase(),
    destinationCode: input.destinationCode.toUpperCase(),
    updatedAt: nowIso(),
  }),
});

export const scheduleKeys = {
  all: ["flights", "schedules"] as const,
  detail: (id: string) => ["flights", "schedules", "detail", id] as const,
};

/* --------------------- Read-mostly operational resources ------------------ */
// Bookings, passengers and refunds are created by travellers, not by admins, so
// these expose list/get and a status update rather than full CRUD.

export const flightBookingService = createStubService<
  AdminFlightBooking,
  Partial<AdminFlightBooking>
>({
  seed: ADMIN_FLIGHT_BOOKINGS,
  getId: (row) => row.id,
  searchFields: ["reference", "pnr", "customer", "email", "route"],
  idPrefix: "fbk",
});

export const flightBookingKeys = {
  all: ["flights", "bookings"] as const,
  detail: (id: string) => ["flights", "bookings", "detail", id] as const,
};

export const passengerService = createStubService<
  AdminPassenger,
  Partial<AdminPassenger>
>({
  seed: ADMIN_PASSENGERS,
  getId: (row) => row.id,
  searchFields: ["fullName", "bookingRef", "pnr", "documentNumber", "ticketNumber"],
  idPrefix: "pax",
});

export const passengerKeys = {
  all: ["flights", "passengers"] as const,
  detail: (id: string) => ["flights", "passengers", "detail", id] as const,
};

export const flightRefundService = createStubService<
  AdminFlightRefund,
  Partial<AdminFlightRefund>
>({
  seed: ADMIN_FLIGHT_REFUNDS,
  getId: (row) => row.id,
  searchFields: ["bookingRef", "customer", "route", "reason"],
  idPrefix: "ref",
});

export const flightRefundKeys = {
  all: ["flights", "refunds"] as const,
  detail: (id: string) => ["flights", "refunds", "detail", id] as const,
};
