/**
 * Admin flight seed data.
 *
 * Projected from the *same* reference datasets the public site searches, rather
 * than invented separately. That matters: an admin airline table that lists
 * carriers the search engine has never heard of is worse than no table at all,
 * and here "Emirates" in the admin panel is definitionally the Emirates a
 * traveller can book.
 *
 * Everything is seeded from {@link SeededRandom} and anchored to
 * {@link FLIGHT_CALENDAR_ANCHOR} — no wall-clock reads at module load, so the
 * dashboard renders identically on server and client.
 */

import { SeededRandom } from "@/lib/random";
import { addDays, addMinutesLocal, formatDuration } from "@/lib/flight-time";
import { AIRLINES, AIRCRAFT_BY_CODE, fleetFor } from "@/lib/mock/airlines";
import { AIRPORTS, distanceKm } from "@/lib/mock/airports";
import { POPULAR_ROUTES, FLIGHT_CALENDAR_ANCHOR } from "@/lib/mock/routes";
import { DEMO_FLIGHT_BOOKINGS } from "@/lib/mock/passengers";
import { CABIN_LABEL } from "@/lib/mock/fares";
import type {
  AdminAirline,
  AdminAirport,
  AdminFlightBooking,
  AdminFlightRefund,
  AdminPassenger,
  AdminRoute,
  AdminSchedule,
  AirlineStatus,
  AdminFlightBookingStatus,
  CheckInStatus,
  FlightRefundStatus,
  RouteStatus,
  ScheduleStatus,
} from "./types";

/** ISO timestamp offset from the fixed anchor. */
function iso(dayOffset: number): string {
  return new Date(
    Date.parse(`${FLIGHT_CALENDAR_ANCHOR}T00:00:00Z`) + dayOffset * 86_400_000,
  ).toISOString();
}

/* ------------------------------- Airlines --------------------------------- */

const AIRLINE_STATUS_POOL: AirlineStatus[] = [
  "active",
  "active",
  "active",
  "active",
  "suspended",
  "inactive",
];

export const ADMIN_AIRLINES: AdminAirline[] = AIRLINES.map((airline, i) => {
  const rng = new SeededRandom(`admin-airline:${airline.code}`);
  return {
    id: `arl_${airline.code}`,
    code: airline.code,
    name: airline.name,
    country: airline.country,
    alliance: airline.alliance,
    fleetSize: airline.fleetSize,
    onTimePct: airline.onTimePct,
    rating: airline.rating,
    // Low-cost carriers pay a thinner commission — the industry norm.
    commissionPct: airline.lowCost ? rng.float(2, 4, 1) : rng.float(4, 7, 1),
    lowCost: airline.lowCost,
    status: AIRLINE_STATUS_POOL[i % AIRLINE_STATUS_POOL.length],
    updatedAt: iso(-((i * 3) % 60)),
  };
});

/* ------------------------------- Airports --------------------------------- */

export const ADMIN_AIRPORTS: AdminAirport[] = AIRPORTS.map((airport, i) => ({
  id: `apt_${airport.code}`,
  code: airport.code,
  name: airport.name,
  city: airport.city,
  country: airport.country,
  countryCode: airport.countryCode,
  timezone: airport.timezone,
  terminals: airport.terminals.length,
  // A handful of secondary fields are deactivated so the filter has real data.
  status: i % 11 === 7 ? "inactive" : "active",
  updatedAt: iso(-((i * 2) % 90)),
}));

/* -------------------------------- Routes ---------------------------------- */

const ROUTE_STATUS_POOL: RouteStatus[] = [
  "active",
  "active",
  "active",
  "seasonal",
  "active",
  "suspended",
];

export const ADMIN_ROUTES: AdminRoute[] = POPULAR_ROUTES.flatMap((route, i) => {
  // Each curated pair is sold by two or three carriers — that's what makes the
  // route table worth having.
  const carriers = [route.airlineCode, ...(i % 2 === 0 ? ["EK", "QR"] : ["TK"])];
  return [...new Set(carriers)].map((airlineCode, j) => {
    const rng = new SeededRandom(`admin-route:${route.fromCode}${route.toCode}${airlineCode}`);
    const km = distanceKm(route.fromCode, route.toCode);
    return {
      id: `rte_${route.fromCode}${route.toCode}${airlineCode}`,
      originCode: route.fromCode,
      destinationCode: route.toCode,
      pair: `${route.fromCode} → ${route.toCode}`,
      airlineCode,
      distanceKm: km,
      durationMinutes: route.durationMinutes + rng.int(-15, 35),
      weeklyFrequency: rng.int(2, 21),
      fromUsd: Math.round(route.fromUsd * rng.float(0.92, 1.25, 2)),
      status: ROUTE_STATUS_POOL[(i + j) % ROUTE_STATUS_POOL.length],
      updatedAt: iso(-(((i + j) * 4) % 75)),
    };
  });
});

/* ------------------------------- Schedules -------------------------------- */

const SCHEDULE_STATUS_POOL: ScheduleStatus[] = [
  "scheduled",
  "scheduled",
  "scheduled",
  "delayed",
  "landed",
  "departed",
  "scheduled",
  "cancelled",
];

const DAY_PATTERNS = [
  "Daily",
  "Mon, Wed, Fri",
  "Tue, Thu, Sat",
  "Mon–Fri",
  "Sat, Sun",
  "Mon, Thu",
];

export const ADMIN_SCHEDULES: AdminSchedule[] = ADMIN_ROUTES.slice(0, 30).map(
  (route, i) => {
    const rng = new SeededRandom(`admin-schedule:${route.id}`);
    const aircraftCodes = fleetFor(route.airlineCode, route.distanceKm);
    const aircraftCode = aircraftCodes.length ? rng.pick(aircraftCodes) : "32N";
    const aircraft = AIRCRAFT_BY_CODE[aircraftCode];
    const departLocal = `${addDays(FLIGHT_CALENDAR_ANCHOR, i % 14)}T${String(rng.int(5, 22)).padStart(2, "0")}:${rng.pick(["00", "15", "30", "45"])}`;
    // Widebodies seat far more; the split drives the load-factor column.
    const seatsTotal = aircraft?.wideBody ? rng.int(240, 380) : rng.int(150, 195);

    return {
      id: `sch_${route.id}_${i}`,
      flightNumber: `${route.airlineCode} ${rng.int(100, 899)}`,
      airlineCode: route.airlineCode,
      originCode: route.originCode,
      destinationCode: route.destinationCode,
      departLocal,
      arriveLocal: addMinutesLocal(departLocal, route.durationMinutes),
      aircraft: aircraft?.name ?? aircraftCode,
      operatingDays: rng.pick(DAY_PATTERNS),
      seatsTotal,
      seatsSold: Math.round(seatsTotal * rng.float(0.42, 0.98, 2)),
      status: SCHEDULE_STATUS_POOL[i % SCHEDULE_STATUS_POOL.length],
      updatedAt: iso(-((i * 3) % 45)),
    };
  },
);

/* ------------------------------- Bookings --------------------------------- */

const CUSTOMERS = [
  ["Arif Hossain", "arif.hossain@example.com"],
  ["Nusrat Jahan", "nusrat.j@example.com"],
  ["Tanvir Rahman", "tanvir.r@example.com"],
  ["Sadia Islam", "sadia.islam@example.com"],
  ["Imran Chowdhury", "imran.c@example.com"],
  ["Farhana Akter", "farhana.a@example.com"],
  ["Rakib Hasan", "rakib.hasan@example.com"],
  ["Mehjabin Karim", "mehjabin.k@example.com"],
  ["Shakib Al Amin", "shakib.a@example.com"],
  ["Priya Sharma", "priya.sharma@example.com"],
  ["David Chen", "d.chen@example.com"],
  ["Aisha Rahman", "aisha.r@example.com"],
];

const BOOKING_STATUS_POOL: AdminFlightBookingStatus[] = [
  "confirmed",
  "confirmed",
  "confirmed",
  "flown",
  "pending",
  "confirmed",
  "cancelled",
  "flown",
  "refunded",
  "confirmed",
];

const PAYMENT_METHODS = [
  "Visa •••• 4242",
  "Mastercard •••• 8817",
  "bKash •••• 6620",
  "Amex •••• 3005",
  "PayPal",
];

/**
 * Booking rows. The first few mirror the demo traveller's real bookings so an
 * admin looking up a reference from "My Flights" actually finds it — the two
 * views describe the same world.
 */
export const ADMIN_FLIGHT_BOOKINGS: AdminFlightBooking[] = [
  ...DEMO_FLIGHT_BOOKINGS.map((booking, i) => {
    const commission = ADMIN_AIRLINES.find((a) => a.code === booking.airlineCode);
    const status: AdminFlightBookingStatus =
      booking.status === "cancelled"
        ? "cancelled"
        : booking.status === "completed"
          ? "flown"
          : "confirmed";
    return {
      id: booking.id,
      reference: booking.reference,
      pnr: booking.pnr,
      customer: CUSTOMERS[i % CUSTOMERS.length][0],
      email: booking.contact.email,
      airlineCode: booking.airlineCode,
      route: `${booking.slices[0].fromCode} → ${booking.slices[booking.slices.length - 1].toCode}`,
      departDate: booking.slices[0].departLocal.slice(0, 10),
      cabin: CABIN_LABEL[booking.cabin],
      passengers: booking.passengers.length,
      totalUsd: booking.grandTotalUsd,
      commissionUsd: Math.round(
        (booking.grandTotalUsd * (commission?.commissionPct ?? 5)) / 100,
      ),
      paymentMethod: booking.paymentMethod,
      status,
      bookedAt: `${booking.bookedAt.slice(0, 10)}T09:24:00.000Z`,
    };
  }),

  // Plus a broader operational set so the table, facets and export are exercised.
  ...Array.from({ length: 34 }, (_, i) => {
    const rng = new SeededRandom(`admin-booking-extra:${i}`);
    const route = ADMIN_ROUTES[i % ADMIN_ROUTES.length];
    const airline = ADMIN_AIRLINES.find((a) => a.code === route.airlineCode);
    const passengers = rng.int(1, 4);
    const totalUsd = Math.round(route.fromUsd * passengers * rng.float(1.0, 1.9, 2));
    const [customer, email] = CUSTOMERS[i % CUSTOMERS.length];

    return {
      id: `fbk_adm_${1000 + i}`,
      reference: `OT-FL-${String(40000 + i * 7)}`,
      pnr: `${String.fromCharCode(65 + (i % 26))}${rng.int(10000, 99999)}`,
      customer,
      email,
      airlineCode: route.airlineCode,
      route: route.pair,
      departDate: addDays(FLIGHT_CALENDAR_ANCHOR, rng.int(-60, 70)),
      cabin: rng.pick(["Economy", "Economy", "Economy", "Premium Economy", "Business"]),
      passengers,
      totalUsd,
      commissionUsd: Math.round((totalUsd * (airline?.commissionPct ?? 5)) / 100),
      paymentMethod: rng.pick(PAYMENT_METHODS),
      status: BOOKING_STATUS_POOL[i % BOOKING_STATUS_POOL.length],
      bookedAt: iso(-rng.int(1, 90)),
    };
  }),
];

/* ------------------------------ Passengers -------------------------------- */

const CHECKIN_POOL: CheckInStatus[] = [
  "checked-in",
  "not-checked-in",
  "checked-in",
  "boarded",
  "not-checked-in",
  "no-show",
];

const NATIONALITIES = ["BD", "IN", "AE", "GB", "US", "SG", "MY", "SA"];

export const ADMIN_PASSENGERS: AdminPassenger[] = ADMIN_FLIGHT_BOOKINGS.flatMap(
  (booking, bookingIndex) =>
    Array.from({ length: Math.min(booking.passengers, 3) }, (_, i) => {
      const rng = new SeededRandom(`admin-pax:${booking.id}:${i}`);
      const [name] = CUSTOMERS[(bookingIndex + i) % CUSTOMERS.length];
      return {
        id: `pax_adm_${booking.id}_${i}`,
        fullName: i === 0 ? booking.customer : name,
        bookingRef: booking.reference,
        pnr: booking.pnr,
        type: i === 0 ? "Adult" : rng.pick(["Adult", "Child", "Infant"]),
        nationality: rng.pick(NATIONALITIES),
        documentNumber: `${rng.pick(["A", "B", "C", "E"])}${rng.int(1000000, 9999999)}`,
        documentExpiry: addDays(FLIGHT_CALENDAR_ANCHOR, rng.int(200, 2400)),
        flightNumber: `${booking.airlineCode} ${rng.int(100, 899)}`,
        route: booking.route,
        seat: `${rng.int(2, 40)}${rng.pick(["A", "B", "C", "D", "E", "F"])}`,
        ticketNumber: `${rng.int(100, 999)}-${rng.int(1000000000, 9999999999)}`,
        status:
          booking.status === "cancelled"
            ? "no-show"
            : CHECKIN_POOL[(bookingIndex + i) % CHECKIN_POOL.length],
      };
    }),
).slice(0, 60);

/* -------------------------------- Refunds --------------------------------- */

const REFUND_REASONS = [
  "Schedule change by airline",
  "Traveller unable to fly (medical)",
  "Visa application refused",
  "Duplicate booking",
  "Flight cancelled by airline",
  "Change of plans",
  "Bereavement",
  "Passport expiry issue",
];

const REFUND_STATUS_POOL: FlightRefundStatus[] = [
  "requested",
  "approved",
  "processed",
  "requested",
  "rejected",
  "processed",
];

export const ADMIN_FLIGHT_REFUNDS: AdminFlightRefund[] = ADMIN_FLIGHT_BOOKINGS.filter(
  (b) => b.status === "cancelled" || b.status === "refunded",
)
  .concat(ADMIN_FLIGHT_BOOKINGS.filter((b) => b.status === "confirmed").slice(0, 8))
  .map((booking, i) => {
    const rng = new SeededRandom(`admin-refund:${booking.id}`);
    const feeUsd = Math.round(booking.totalUsd * rng.float(0.05, 0.2, 2));
    return {
      id: `ref_fl_${booking.id}`,
      bookingRef: booking.reference,
      customer: booking.customer,
      airlineCode: booking.airlineCode,
      route: booking.route,
      reason: REFUND_REASONS[i % REFUND_REASONS.length],
      paidUsd: booking.totalUsd,
      feeUsd,
      refundUsd: Math.max(0, booking.totalUsd - feeUsd),
      requestedAt: iso(-rng.int(1, 45)),
      status: REFUND_STATUS_POOL[i % REFUND_STATUS_POOL.length],
    };
  });

/** Duration label helper reused by the route and schedule columns. */
export { formatDuration };
