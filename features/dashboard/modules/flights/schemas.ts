import { z } from "zod";
import { requiredString } from "../../schemas/common";
import {
  AIRLINE_STATUS_VALUES,
  AIRPORT_STATUS_VALUES,
  ALLIANCE_VALUES,
  ROUTE_STATUS_VALUES,
  SCHEDULE_STATUS_VALUES,
} from "./types";

/**
 * Admin flight form schemas.
 *
 * IATA codes carry real format rules — two characters for an airline, three for
 * an airport — and enforcing them here is what keeps the reference data usable:
 * a malformed code silently breaks every lookup that joins on it.
 */

const iataAirline = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2}$/, "Airline codes are 2 characters, e.g. EK");

const iataAirport = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Airport codes are 3 letters, e.g. DAC");

const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO country code, e.g. BD");

/* ------------------------------- Airlines --------------------------------- */

export const airlineSchema = z.object({
  code: iataAirline,
  name: requiredString,
  country: requiredString,
  alliance: z.enum(ALLIANCE_VALUES),
  fleetSize: z.coerce.number().int().min(0, "Can't be negative"),
  commissionPct: z.coerce
    .number()
    .min(0, "Can't be negative")
    .max(100, "Commission can't exceed 100%"),
  lowCost: z.coerce.boolean(),
  status: z.enum(AIRLINE_STATUS_VALUES),
});

export type AirlineFormValues = z.infer<typeof airlineSchema>;

/* ------------------------------- Airports --------------------------------- */

export const airportSchema = z.object({
  code: iataAirport,
  name: requiredString,
  city: requiredString,
  country: requiredString,
  countryCode,
  timezone: requiredString,
  terminals: z.coerce.number().int().min(1, "At least one terminal"),
  status: z.enum(AIRPORT_STATUS_VALUES),
});

export type AirportFormValues = z.infer<typeof airportSchema>;

/* -------------------------------- Routes ---------------------------------- */

export const routeSchema = z
  .object({
    originCode: iataAirport,
    destinationCode: iataAirport,
    airlineCode: iataAirline,
    distanceKm: z.coerce.number().int().min(1, "Enter a distance"),
    durationMinutes: z.coerce.number().int().min(20, "Too short to be a flight"),
    weeklyFrequency: z.coerce.number().int().min(0).max(140, "That's more than 20 a day"),
    fromUsd: z.coerce.number().min(0, "Can't be negative"),
    status: z.enum(ROUTE_STATUS_VALUES),
  })
  .refine((value) => value.originCode !== value.destinationCode, {
    path: ["destinationCode"],
    message: "Origin and destination must differ",
  });

export type RouteFormValues = z.infer<typeof routeSchema>;

/* ------------------------------- Schedules -------------------------------- */

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use the date-and-time picker");

export const scheduleSchema = z
  .object({
    flightNumber: requiredString,
    airlineCode: iataAirline,
    originCode: iataAirport,
    destinationCode: iataAirport,
    departLocal: localDateTime,
    arriveLocal: localDateTime,
    aircraft: requiredString,
    operatingDays: requiredString,
    seatsTotal: z.coerce.number().int().min(1, "Enter the cabin capacity"),
    seatsSold: z.coerce.number().int().min(0, "Can't be negative"),
    status: z.enum(SCHEDULE_STATUS_VALUES),
  })
  .refine((value) => value.originCode !== value.destinationCode, {
    path: ["destinationCode"],
    message: "Origin and destination must differ",
  })
  .refine((value) => value.seatsSold <= value.seatsTotal, {
    path: ["seatsSold"],
    message: "Seats sold can't exceed capacity",
  });

export type ScheduleFormValues = z.infer<typeof scheduleSchema>;
