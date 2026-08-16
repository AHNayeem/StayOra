/**
 * Inventory & rate plans — the prototype's availability engine.
 *
 * A property's *baseline* (room types, per-night allotment and price) is derived
 * deterministically from the listing it belongs to, so the whole catalogue has
 * inventory without shipping a multi-megabyte calendar. Everything a human or a
 * booking then *changes* is stored as a delta in the domain store:
 *
 *   baseline (pure, seeded)  +  overrides (revenue manager)  −  consumed (bookings/holds)
 *
 * That keeps the calendar infinite in both directions, SSR-stable, and small
 * enough to persist. A real backend replaces `dayRate`/`consumed` with a query
 * against the availability table; the signatures below are already the API.
 *
 * All prices are base USD, like listing prices and the rest of the domain.
 */

import type { BookingVertical } from "@/types/booking";
import { hashString } from "@/lib/random";
import { getCancellationPolicy } from "./lifecycle";
import { money } from "./money";
import { getState, mutate, nextId } from "./store";
import type { CancellationPolicyId } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A sellable unit type. "Room" is the hotel word for it; a tour sells seats and
 * a hall sells the room itself, but the engine treats them all identically.
 */
export interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  code: string;
  description: string;
  /** People one unit sleeps/seats. */
  maxOccupancy: number;
  /** e.g. "1 king bed", "2 twin beds", "Per person". */
  bedding: string;
  sizeSqm?: number;
  amenities: string[];
  /** Units the property owns — the ceiling for any day's allotment. */
  totalUnits: number;
  /** Nightly price = listing base price × this. */
  priceFactor: number;
  image: string;
}

export const RATE_PLAN_IDS = [
  "standard",
  "non_refundable",
  "breakfast",
  "flexible",
] as const;

export type RatePlanId = (typeof RATE_PLAN_IDS)[number];

export interface RatePlan {
  id: RatePlanId;
  name: string;
  description: string;
  /** Room price × this. Non-refundable is cheaper, flexible dearer. */
  priceFactor: number;
  cancellationPolicyId: CancellationPolicyId;
  includesBreakfast: boolean;
  refundable: boolean;
  minStay: number;
  maxStay: number;
  /** Weekdays (0 = Sunday) a stay may not *start* on. */
  closedToArrival: number[];
  /** Weekdays a stay may not *end* on. */
  closedToDeparture: number[];
  badge?: string;
  /** Perks shown as ticks on the rate card. */
  inclusions: string[];
}

/** One night of one room type, fully resolved. */
export interface DayRate {
  date: string;
  roomTypeId: string;
  /** Units offered for sale that night (after admin blocks). */
  allotment: number;
  /** Units already sold or held. */
  booked: number;
  available: number;
  /** Nightly price for the room type at the *standard* plan, USD. */
  price: number;
  stopSell: boolean;
  minStay: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  /** True when the day's price came from a seasonal/weekend rule. */
  season?: "peak" | "weekend" | "low";
}

/** A revenue-manager edit to one room-type/date cell. */
export interface InventoryOverride {
  propertyId: string;
  roomTypeId: string;
  date: string;
  allotment?: number;
  price?: number;
  stopSell?: boolean;
  minStay?: number;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  updatedAt: string;
  updatedBy: string;
}

/** A short-lived reservation of units while the traveller checks out. */
export interface InventoryHold {
  id: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: RatePlanId;
  /** Inclusive first night. */
  checkIn: string;
  /** Exclusive — the departure date. */
  checkOut: string;
  nights: number;
  units: number;
  createdAt: string;
  expiresAt: string;
  status: "held" | "committed" | "released" | "expired";
  bookingId?: string;
  /** Price the hold locked in, so the total can't drift mid-checkout. */
  lockedTotal: number;
  currency: string;

  /**
   * Who was checking out, and what for.
   *
   * A hold is the record of an *intent to book*, so it carries just enough
   * context for abandoned-checkout recovery to write the traveller a link back
   * to the same room on the same dates (`domain/recovery.ts`). All optional:
   * a hold taken by the dashboard or a test has no traveller attached.
   */
  customerEmail?: string;
  customerName?: string;
  listingSlug?: string;
  listingTitle?: string;
  vertical?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Hold/price-lock window, minutes. */
export const HOLD_MINUTES = 15;

const DAY_MS = 86_400_000;

/** Rate plans, shared by every property (a real system scopes them per hotel). */
export const RATE_PLANS: Record<RatePlanId, RatePlan> = {
  standard: {
    id: "standard",
    name: "Standard rate",
    description: "Room only. Free cancellation up to 5 days before arrival.",
    priceFactor: 1,
    cancellationPolicyId: "moderate",
    includesBreakfast: false,
    refundable: true,
    minStay: 1,
    maxStay: 30,
    closedToArrival: [],
    closedToDeparture: [],
    inclusions: ["Room only", "Free cancellation up to 5 days before"],
  },
  non_refundable: {
    id: "non_refundable",
    name: "Non-refundable",
    description: "Our lowest price. Pay now — no changes, no refunds.",
    priceFactor: 0.86,
    cancellationPolicyId: "non_refundable",
    includesBreakfast: false,
    refundable: false,
    minStay: 1,
    maxStay: 30,
    closedToArrival: [],
    closedToDeparture: [],
    badge: "Best price",
    inclusions: ["14% off the standard rate", "No refund if you cancel"],
  },
  breakfast: {
    id: "breakfast",
    name: "Breakfast included",
    description: "Daily breakfast for every guest, plus a moderate policy.",
    priceFactor: 1.14,
    cancellationPolicyId: "moderate",
    includesBreakfast: true,
    refundable: true,
    minStay: 1,
    maxStay: 30,
    closedToArrival: [],
    closedToDeparture: [],
    badge: "Most popular",
    inclusions: ["Breakfast for all guests", "Free cancellation up to 5 days before"],
  },
  flexible: {
    id: "flexible",
    name: "Fully flexible",
    description: "Change or cancel free of charge right up to check-in.",
    priceFactor: 1.22,
    cancellationPolicyId: "flexible",
    includesBreakfast: true,
    refundable: true,
    minStay: 1,
    maxStay: 45,
    closedToArrival: [],
    closedToDeparture: [],
    inclusions: [
      "Free cancellation up to 24 hours before",
      "Breakfast included",
      "Free date changes",
    ],
  },
};

export const RATE_PLAN_LIST: RatePlan[] = RATE_PLAN_IDS.map((id) => RATE_PLANS[id]);

export function getRatePlan(id: RatePlanId): RatePlan {
  return RATE_PLANS[id] ?? RATE_PLANS.standard;
}

/** The rate plans a vertical actually sells. */
export function ratePlansFor(vertical: BookingVertical): RatePlan[] {
  if (vertical === "hotels" || vertical === "resorts") return RATE_PLAN_LIST;
  if (vertical === "apartments" || vertical === "shared-rooms") {
    return [RATE_PLANS.standard, RATE_PLANS.non_refundable, RATE_PLANS.flexible];
  }
  // Tours, activities, transport, halls, visas: refundable vs not is enough.
  return [RATE_PLANS.standard, RATE_PLANS.non_refundable];
}

// ---------------------------------------------------------------------------
// Room-type baseline (deterministic, derived from the listing)
// ---------------------------------------------------------------------------

/** The minimum a caller must know about a listing to price its inventory. */
export interface PropertyRef {
  /** Listing id — doubles as the property id. */
  id: string;
  slug: string;
  vertical: BookingVertical;
  title: string;
  /** Listing headline price, USD. */
  basePrice: number;
  image: string;
}

interface UnitTemplate {
  name: string;
  code: string;
  description: string;
  maxOccupancy: number;
  bedding: string;
  sizeSqm?: number;
  amenities: string[];
  units: [number, number];
  priceFactor: number;
}

const STAY_UNITS: UnitTemplate[] = [
  {
    name: "Standard Room",
    code: "STD",
    description: "Comfortable room with the essentials, city or garden aspect.",
    maxOccupancy: 2,
    bedding: "1 queen bed",
    sizeSqm: 24,
    amenities: ["Free WiFi", "Air conditioning", "Flat-screen TV", "Safe"],
    units: [6, 14],
    priceFactor: 1,
  },
  {
    name: "Deluxe Room",
    code: "DLX",
    description: "Larger room with a seating area and the better view.",
    maxOccupancy: 3,
    bedding: "1 king bed",
    sizeSqm: 34,
    amenities: ["Free WiFi", "Air conditioning", "Balcony", "Minibar", "Bathrobes"],
    units: [3, 8],
    priceFactor: 1.35,
  },
  {
    name: "Executive Suite",
    code: "SUI",
    description: "Separate living room, lounge access and late check-out.",
    maxOccupancy: 4,
    bedding: "1 king bed + sofa bed",
    sizeSqm: 52,
    amenities: ["Free WiFi", "Lounge access", "Espresso machine", "Bathtub", "Late check-out"],
    units: [1, 4],
    priceFactor: 1.95,
  },
];

const APARTMENT_UNITS: UnitTemplate[] = [
  {
    name: "Entire apartment",
    code: "APT",
    description: "The whole place to yourself, self check-in.",
    maxOccupancy: 4,
    bedding: "Bedrooms + sofa bed",
    sizeSqm: 62,
    amenities: ["Kitchen", "Washer", "Free WiFi", "Self check-in"],
    units: [1, 3],
    priceFactor: 1,
  },
  {
    name: "Apartment with terrace",
    code: "APT-T",
    description: "Same layout with a private outdoor terrace.",
    maxOccupancy: 5,
    bedding: "Bedrooms + sofa bed",
    sizeSqm: 78,
    amenities: ["Kitchen", "Terrace", "Washer", "Free WiFi", "Self check-in"],
    units: [1, 2],
    priceFactor: 1.28,
  },
];

const DORM_UNITS: UnitTemplate[] = [
  {
    name: "Mixed dorm bed",
    code: "MIX",
    description: "One bed in a shared mixed dorm, with a locker.",
    maxOccupancy: 1,
    bedding: "1 bunk bed",
    amenities: ["Locker", "Free WiFi", "Shared bathroom", "Reading light"],
    units: [8, 20],
    priceFactor: 1,
  },
  {
    name: "Female-only dorm bed",
    code: "FEM",
    description: "One bed in a female-only dorm, with a locker.",
    maxOccupancy: 1,
    bedding: "1 bunk bed",
    amenities: ["Locker", "Free WiFi", "Female only", "Reading light"],
    units: [4, 12],
    priceFactor: 1.1,
  },
  {
    name: "Private twin",
    code: "PVT",
    description: "A private room in the hostel with an ensuite.",
    maxOccupancy: 2,
    bedding: "2 twin beds",
    amenities: ["Ensuite", "Free WiFi", "Desk"],
    units: [1, 4],
    priceFactor: 2.6,
  },
];

const HALL_UNITS: UnitTemplate[] = [
  {
    name: "Main hall (full day)",
    code: "HALL",
    description: "Exclusive use of the main hall, 8am–11pm.",
    maxOccupancy: 400,
    bedding: "Theatre / banquet layout",
    amenities: ["AV system", "Stage", "Catering kitchen", "Parking"],
    units: [1, 1],
    priceFactor: 1,
  },
  {
    name: "Breakout room",
    code: "BRK",
    description: "Smaller adjoining room for sessions and green rooms.",
    maxOccupancy: 60,
    bedding: "Boardroom layout",
    amenities: ["Projector", "Whiteboard", "Free WiFi"],
    units: [2, 4],
    priceFactor: 0.35,
  },
];

const TICKET_UNITS: UnitTemplate[] = [
  {
    name: "Standard ticket",
    code: "STD",
    description: "Join the scheduled group departure.",
    maxOccupancy: 1,
    bedding: "Per person",
    amenities: ["Guide", "Entrance fees"],
    units: [10, 30],
    priceFactor: 1,
  },
  {
    name: "Private experience",
    code: "PVT",
    description: "Your own guide and vehicle, at your pace.",
    maxOccupancy: 6,
    bedding: "Private group",
    amenities: ["Private guide", "Hotel pickup", "Flexible timing"],
    units: [1, 3],
    priceFactor: 2.4,
  },
];

const TRANSPORT_UNITS: UnitTemplate[] = [
  {
    name: "Standard vehicle",
    code: "STD",
    description: "Air-conditioned sedan or shared coach seat.",
    maxOccupancy: 3,
    bedding: "Per vehicle",
    amenities: ["Air conditioning", "Meet & greet", "60 min free waiting"],
    units: [4, 12],
    priceFactor: 1,
  },
  {
    name: "Premium vehicle",
    code: "PRM",
    description: "Business-class car with extra luggage space.",
    maxOccupancy: 4,
    bedding: "Per vehicle",
    amenities: ["Premium car", "Bottled water", "90 min free waiting"],
    units: [1, 5],
    priceFactor: 1.7,
  },
];

const VISA_UNITS: UnitTemplate[] = [
  {
    name: "Standard processing",
    code: "STD",
    description: "Documents reviewed and lodged in the usual window.",
    maxOccupancy: 1,
    bedding: "Per applicant",
    amenities: ["Document review", "Appointment booking"],
    units: [10, 25],
    priceFactor: 1,
  },
  {
    name: "Express processing",
    code: "EXP",
    description: "Priority lodgement and a dedicated case officer.",
    maxOccupancy: 1,
    bedding: "Per applicant",
    amenities: ["Priority lodgement", "Dedicated officer", "SMS updates"],
    units: [2, 8],
    priceFactor: 1.55,
  },
];

function templatesFor(vertical: BookingVertical): UnitTemplate[] {
  switch (vertical) {
    case "hotels":
    case "resorts":
      return STAY_UNITS;
    case "apartments":
      return APARTMENT_UNITS;
    case "shared-rooms":
      return DORM_UNITS;
    case "convention-hall":
      return HALL_UNITS;
    case "tours":
    case "activities":
      return TICKET_UNITS;
    case "transport":
      return TRANSPORT_UNITS;
    case "visa":
      return VISA_UNITS;
    default:
      return TICKET_UNITS;
  }
}

/** Verticals whose price is per night of a date range. */
export function isPerNight(vertical: BookingVertical): boolean {
  return (
    vertical === "hotels" ||
    vertical === "resorts" ||
    vertical === "apartments" ||
    vertical === "shared-rooms"
  );
}

/** "Room", "Bed", "Ticket"… — what one unit is called in this vertical. */
export function unitNoun(vertical: BookingVertical): { one: string; many: string } {
  switch (vertical) {
    case "shared-rooms":
      return { one: "bed", many: "beds" };
    case "convention-hall":
      return { one: "space", many: "spaces" };
    case "tours":
    case "activities":
      return { one: "ticket", many: "tickets" };
    case "transport":
      return { one: "vehicle", many: "vehicles" };
    case "visa":
      return { one: "application", many: "applications" };
    case "apartments":
      return { one: "unit", many: "units" };
    default:
      return { one: "room", many: "rooms" };
  }
}

/**
 * The room types a property sells. Pure and deterministic — the same array on
 * the server and the client, and stable across reloads.
 */
export function getRoomTypes(property: PropertyRef): RoomType[] {
  const templates = templatesFor(property.vertical);
  // Cheap properties don't offer the top tier; expensive ones offer everything.
  const tiers = property.basePrice < 70 ? Math.min(2, templates.length) : templates.length;
  return templates.slice(0, tiers).map((template, index) => {
    const seed = hashString(`${property.id}:${template.code}`);
    const [minUnits, maxUnits] = template.units;
    const span = maxUnits - minUnits + 1;
    return {
      id: `${property.id}__${template.code.toLowerCase()}`,
      propertyId: property.id,
      name: template.name,
      code: template.code,
      description: template.description,
      maxOccupancy: template.maxOccupancy,
      bedding: template.bedding,
      sizeSqm: template.sizeSqm,
      amenities: template.amenities,
      totalUnits: minUnits + (seed % span),
      priceFactor: template.priceFactor,
      image: property.image,
      // index kept for stable ordering by callers that re-sort
      ...(index === 0 ? {} : {}),
    } satisfies RoomType;
  });
}

export function findRoomType(property: PropertyRef, roomTypeId: string): RoomType | undefined {
  return getRoomTypes(property).find((r) => r.id === roomTypeId);
}

// ---------------------------------------------------------------------------
// Day baseline
// ---------------------------------------------------------------------------

/** Month multipliers — a believable Northern-hemisphere leisure season curve. */
const SEASON_FACTOR = [
  0.88, 0.9, 0.95, 1.0, 1.05, 1.15, 1.25, 1.25, 1.08, 0.98, 0.9, 1.12,
];

function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function monthOf(date: string): number {
  return Number(date.slice(5, 7)) - 1;
}

/**
 * The untouched baseline for one night — before admin overrides and bookings.
 * Seeded by room type + date, so the calendar is identical everywhere.
 */
function baseline(
  property: PropertyRef,
  room: RoomType,
  date: string,
): { allotment: number; price: number; stopSell: boolean; season: DayRate["season"] } {
  const seed = hashString(`${room.id}:${date}`);
  const dow = dayOfWeek(date);
  const isWeekend = dow === 5 || dow === 6;
  const seasonFactor = SEASON_FACTOR[monthOf(date)] ?? 1;
  const weekendFactor = isWeekend ? 1.18 : 1;
  // ±6% jitter so no two days look copy-pasted.
  const jitter = 0.94 + ((seed >>> 8) % 13) / 100;

  const price = money(
    property.basePrice * room.priceFactor * seasonFactor * weekendFactor * jitter,
  );

  // Occupancy pressure: a slice of each room type is already committed to
  // other channels, and roughly 1 in 22 nights is closed out entirely.
  const pressure = (seed >>> 3) % 100;
  const stopSell = pressure < 4;
  const committed = Math.floor((room.totalUnits * (pressure % 60)) / 100);
  const allotment = stopSell ? 0 : Math.max(0, room.totalUnits - committed);

  const season: DayRate["season"] =
    seasonFactor >= 1.15 ? "peak" : isWeekend ? "weekend" : seasonFactor <= 0.92 ? "low" : undefined;

  return { allotment, price, stopSell, season };
}

function overrideKey(roomTypeId: string, date: string): string {
  return `${roomTypeId}|${date}`;
}

function findOverride(roomTypeId: string, date: string): InventoryOverride | undefined {
  return getState().inventoryOverrides.find(
    (o) => o.roomTypeId === roomTypeId && o.date === date,
  );
}

/** Units sold or held for one night. */
function consumedUnits(roomTypeId: string, date: string): number {
  return getState().inventoryConsumed[overrideKey(roomTypeId, date)] ?? 0;
}

/** One fully-resolved night: baseline + override − consumed. */
export function dayRate(property: PropertyRef, room: RoomType, date: string): DayRate {
  const base = baseline(property, room, date);
  const override = findOverride(room.id, date);
  const plan = RATE_PLANS.standard;

  const allotment = Math.min(
    room.totalUnits,
    Math.max(0, override?.allotment ?? base.allotment),
  );
  const stopSell = override?.stopSell ?? base.stopSell;
  const booked = consumedUnits(room.id, date);

  return {
    date,
    roomTypeId: room.id,
    allotment,
    booked,
    available: stopSell ? 0 : Math.max(0, allotment - booked),
    price: money(override?.price ?? base.price),
    stopSell,
    minStay: override?.minStay ?? plan.minStay,
    closedToArrival: override?.closedToArrival ?? false,
    closedToDeparture: override?.closedToDeparture ?? false,
    season: base.season,
  };
}

/** `count` consecutive nights from `start` (ISO `YYYY-MM-DD`). */
export function dateRange(start: string, count: number): string[] {
  const [y, m, d] = start.split("-").map(Number);
  const anchor = Date.UTC(y, m - 1, d);
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    new Date(anchor + i * DAY_MS).toISOString().slice(0, 10),
  );
}

/** Whole nights between two ISO dates. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const [ay, am, ad] = checkIn.split("-").map(Number);
  const [by, bm, bd] = checkOut.split("-").map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.max(0, Math.round(ms / DAY_MS));
}

/** A calendar strip for the revenue manager / availability display. */
export function calendar(
  property: PropertyRef,
  room: RoomType,
  start: string,
  days: number,
): DayRate[] {
  return dateRange(start, days).map((date) => dayRate(property, room, date));
}

// ---------------------------------------------------------------------------
// Availability + quoting
// ---------------------------------------------------------------------------

export interface AvailabilityRequest {
  property: PropertyRef;
  roomTypeId: string;
  ratePlanId: RatePlanId;
  checkIn: string;
  /** Exclusive. For single-date verticals pass the same value as `checkIn`. */
  checkOut: string;
  units: number;
  /** People travelling, checked against the room's occupancy. */
  guests?: number;
}

export type AvailabilityBlocker =
  | "sold_out"
  | "stop_sell"
  | "min_stay"
  | "max_stay"
  | "closed_to_arrival"
  | "closed_to_departure"
  | "occupancy"
  | "no_dates"
  | "unknown_room";

export interface AvailabilityResult {
  available: boolean;
  /** Nights inspected (empty when the request was unusable). */
  nights: DayRate[];
  /** Fewest units free on any night — drives "only 2 left" copy. */
  unitsLeft: number;
  blockers: { code: AvailabilityBlocker; message: string }[];
}

/** Check a stay against inventory, the rate plan's stay rules and occupancy. */
export function checkAvailability(request: AvailabilityRequest): AvailabilityResult {
  const { property, roomTypeId, ratePlanId, checkIn, checkOut, units, guests } = request;
  const blockers: AvailabilityResult["blockers"] = [];
  const room = findRoomType(property, roomTypeId);

  if (!room) {
    return {
      available: false,
      nights: [],
      unitsLeft: 0,
      blockers: [{ code: "unknown_room", message: "That room type is no longer offered." }],
    };
  }

  const perNight = isPerNight(property.vertical);
  const nightCount = perNight ? nightsBetween(checkIn, checkOut) : 1;

  if (!checkIn || (perNight && nightCount < 1)) {
    return {
      available: false,
      nights: [],
      unitsLeft: 0,
      blockers: [{ code: "no_dates", message: "Choose your dates to see availability." }],
    };
  }

  const plan = getRatePlan(ratePlanId);
  const nights = dateRange(checkIn, nightCount).map((date) => dayRate(property, room, date));

  if (guests && guests > room.maxOccupancy * units) {
    blockers.push({
      code: "occupancy",
      message: `${room.name} sleeps ${room.maxOccupancy}. Add another ${
        unitNoun(property.vertical).one
      } for ${guests} guests.`,
    });
  }

  if (perNight && nightCount < plan.minStay) {
    blockers.push({
      code: "min_stay",
      message: `${plan.name} needs a minimum stay of ${plan.minStay} nights.`,
    });
  }
  if (perNight && nightCount > plan.maxStay) {
    blockers.push({
      code: "max_stay",
      message: `${plan.name} allows at most ${plan.maxStay} nights.`,
    });
  }

  const firstNight = nights[0];
  if (firstNight?.closedToArrival || plan.closedToArrival.includes(dayOfWeek(checkIn))) {
    blockers.push({
      code: "closed_to_arrival",
      message: "This rate can't start on that date. Try arriving a day either side.",
    });
  }
  if (perNight && checkOut) {
    const lastNight = nights[nights.length - 1];
    if (lastNight?.closedToDeparture || plan.closedToDeparture.includes(dayOfWeek(checkOut))) {
      blockers.push({
        code: "closed_to_departure",
        message: "This rate can't end on that date.",
      });
    }
  }

  const stopSold = nights.find((n) => n.stopSell);
  if (stopSold) {
    blockers.push({
      code: "stop_sell",
      message: `Closed for sale on ${stopSold.date}.`,
    });
  }

  const unitsLeft = nights.length
    ? Math.min(...nights.map((n) => n.available))
    : 0;
  if (unitsLeft < units) {
    blockers.push({
      code: "sold_out",
      message:
        unitsLeft <= 0
          ? "Sold out for these dates."
          : `Only ${unitsLeft} ${
              unitsLeft === 1
                ? unitNoun(property.vertical).one
                : unitNoun(property.vertical).many
            } left — reduce the quantity or change dates.`,
    });
  }

  // A minimum stay set on the *day* (revenue manager) also has to hold.
  const dayMin = Math.max(0, ...nights.map((n) => n.minStay));
  if (perNight && dayMin > nightCount) {
    blockers.push({
      code: "min_stay",
      message: `These dates need a minimum stay of ${dayMin} nights.`,
    });
  }

  return { available: blockers.length === 0, nights, unitsLeft, blockers };
}

export interface StayQuoteLine {
  date: string;
  /** Standard-plan nightly rate before the plan factor. */
  basePrice: number;
  /** What this night actually costs on the chosen plan, per unit. */
  price: number;
  season?: DayRate["season"];
}

export interface StayQuote {
  currency: string;
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: RatePlanId;
  ratePlanName: string;
  nights: StayQuoteLine[];
  nightCount: number;
  units: number;
  /** Nightly average per unit. */
  averageNightly: number;
  /** Room subtotal for all nights × units, before add-ons/fees/tax. */
  roomSubtotal: number;
  cancellationPolicyId: CancellationPolicyId;
  cancellationSummary: string;
  refundable: boolean;
  includesBreakfast: boolean;
  unitsLeft: number;
  available: boolean;
  blockers: AvailabilityResult["blockers"];
}

/**
 * Price a stay night-by-night. This is the *only* place a room price is
 * computed for the customer — the checkout and the detail page both call it,
 * so a price shown can never diverge from the price charged.
 */
export function quoteStay(request: AvailabilityRequest): StayQuote {
  const { property, roomTypeId, ratePlanId, units } = request;
  const room = findRoomType(property, roomTypeId);
  const plan = getRatePlan(ratePlanId);
  const result = checkAvailability(request);

  const lines: StayQuoteLine[] = result.nights.map((night) => ({
    date: night.date,
    basePrice: night.price,
    price: money(night.price * plan.priceFactor),
    season: night.season,
  }));

  const nightCount = lines.length;
  const perUnit = lines.reduce((sum, line) => sum + line.price, 0);
  const policy = getCancellationPolicy(plan.cancellationPolicyId);

  return {
    currency: "USD",
    roomTypeId,
    roomTypeName: room?.name ?? "Room",
    ratePlanId: plan.id,
    ratePlanName: plan.name,
    nights: lines,
    nightCount,
    units,
    averageNightly: nightCount ? money(perUnit / nightCount) : 0,
    roomSubtotal: money(perUnit * units),
    cancellationPolicyId: plan.cancellationPolicyId,
    cancellationSummary: policy.summary,
    refundable: plan.refundable,
    includesBreakfast: plan.includesBreakfast,
    unitsLeft: result.unitsLeft,
    available: result.available,
    blockers: result.blockers,
  };
}

/** Cheapest bookable option for a property on given dates — for search cards. */
export function cheapestQuote(
  property: PropertyRef,
  checkIn: string,
  checkOut: string,
  units = 1,
  guests?: number,
): StayQuote | null {
  const rooms = getRoomTypes(property);
  const plans = ratePlansFor(property.vertical);
  let best: StayQuote | null = null;
  for (const room of rooms) {
    for (const plan of plans) {
      const quote = quoteStay({
        property,
        roomTypeId: room.id,
        ratePlanId: plan.id,
        checkIn,
        checkOut,
        units,
        guests,
      });
      if (!quote.available) continue;
      if (!best || quote.roomSubtotal < best.roomSubtotal) best = quote;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Holds — the bit that prevents double booking
// ---------------------------------------------------------------------------

function consume(roomTypeId: string, dates: string[], units: number): void {
  mutate((draft) => {
    for (const date of dates) {
      const key = overrideKey(roomTypeId, date);
      draft.inventoryConsumed[key] = Math.max(0, (draft.inventoryConsumed[key] ?? 0) + units);
    }
  });
}

/** Expire any hold whose window has passed, returning its units to the pool. */
export function sweepExpiredHolds(nowMs = Date.now()): void {
  const stale = getState().holds.filter(
    (h) => h.status === "held" && new Date(h.expiresAt).getTime() <= nowMs,
  );
  if (stale.length === 0) return;
  for (const hold of stale) {
    consume(hold.roomTypeId, holdDates(hold), -hold.units);
  }
  mutate((draft) => {
    for (const hold of draft.holds) {
      if (stale.some((s) => s.id === hold.id)) hold.status = "expired";
    }
  });
}

function holdDates(hold: Pick<InventoryHold, "checkIn" | "nights">): string[] {
  return dateRange(hold.checkIn, Math.max(1, hold.nights));
}

export class InventoryError extends Error {
  constructor(
    message: string,
    readonly blockers: AvailabilityResult["blockers"] = [],
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

/**
 * Reserve units for `HOLD_MINUTES`. The units come out of availability the
 * instant the hold is created, which is what stops two browser tabs from
 * selling the same last room.
 */
export function holdInventory(
  request: AvailabilityRequest & {
    lockedTotal: number;
    nowMs?: number;
    /** Traveller + listing context, kept for abandoned-checkout recovery. */
    intent?: Pick<
      InventoryHold,
      "customerEmail" | "customerName" | "listingSlug" | "listingTitle" | "vertical"
    >;
  },
): InventoryHold {
  const nowMs = request.nowMs ?? Date.now();
  sweepExpiredHolds(nowMs);

  const result = checkAvailability(request);
  if (!result.available) {
    throw new InventoryError(
      result.blockers[0]?.message ?? "Those dates are no longer available.",
      result.blockers,
    );
  }

  const nights = result.nights.length;
  const hold: InventoryHold = {
    id: nextId("hld"),
    propertyId: request.property.id,
    roomTypeId: request.roomTypeId,
    ratePlanId: request.ratePlanId,
    checkIn: request.checkIn,
    checkOut: request.checkOut || request.checkIn,
    nights,
    units: request.units,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + HOLD_MINUTES * 60_000).toISOString(),
    status: "held",
    lockedTotal: money(request.lockedTotal),
    currency: "USD",
    ...request.intent,
  };

  consume(hold.roomTypeId, holdDates(hold), hold.units);
  mutate((draft) => draft.holds.unshift(hold));
  return hold;
}

export function getHold(id: string): InventoryHold | undefined {
  return getState().holds.find((h) => h.id === id);
}

/** Turn a hold into a booked allocation. Units stay consumed. */
export function commitHold(id: string, bookingId: string): void {
  mutate((draft) => {
    const hold = draft.holds.find((h) => h.id === id);
    if (hold && hold.status === "held") {
      hold.status = "committed";
      hold.bookingId = bookingId;
    }
  });
}

/** Give the units back (checkout abandoned, payment finally failed). */
export function releaseHold(id: string): void {
  const hold = getHold(id);
  if (!hold || hold.status !== "held") return;
  consume(hold.roomTypeId, holdDates(hold), -hold.units);
  mutate((draft) => {
    const target = draft.holds.find((h) => h.id === id);
    if (target) target.status = "released";
  });
}

/** Return a committed booking's units to the pool (cancellation/refund). */
export function releaseForBooking(bookingId: string): void {
  const committed = getState().holds.filter(
    (h) => h.bookingId === bookingId && h.status === "committed",
  );
  for (const hold of committed) {
    consume(hold.roomTypeId, holdDates(hold), -hold.units);
  }
  if (committed.length === 0) return;
  mutate((draft) => {
    for (const hold of draft.holds) {
      if (committed.some((c) => c.id === hold.id)) hold.status = "released";
    }
  });
}

/** Milliseconds left on a hold (0 once it has lapsed). */
export function holdRemainingMs(hold: InventoryHold, nowMs = Date.now()): number {
  return Math.max(0, new Date(hold.expiresAt).getTime() - nowMs);
}

// ---------------------------------------------------------------------------
// Revenue management (admin writes)
// ---------------------------------------------------------------------------

export interface BulkUpdateInput {
  propertyId: string;
  roomTypeId: string;
  /** Inclusive ISO dates. */
  from: string;
  to: string;
  /** Restrict to these weekdays (0 = Sunday); empty = every day. */
  weekdays?: number[];
  price?: number;
  allotment?: number;
  stopSell?: boolean;
  minStay?: number;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  updatedBy: string;
}

/** Apply a revenue-manager edit across a date range. Returns days touched. */
export function bulkUpdateInventory(input: BulkUpdateInput): number {
  const days = nightsBetween(input.from, input.to) + 1;
  if (days <= 0) return 0;
  const dates = dateRange(input.from, Math.min(days, 400)).filter((date) =>
    input.weekdays?.length ? input.weekdays.includes(dayOfWeek(date)) : true,
  );
  const at = new Date().toISOString();

  mutate((draft) => {
    for (const date of dates) {
      let entry = draft.inventoryOverrides.find(
        (o) => o.roomTypeId === input.roomTypeId && o.date === date,
      );
      if (!entry) {
        entry = {
          propertyId: input.propertyId,
          roomTypeId: input.roomTypeId,
          date,
          updatedAt: at,
          updatedBy: input.updatedBy,
        };
        draft.inventoryOverrides.push(entry);
      }
      if (input.price !== undefined) entry.price = money(input.price);
      if (input.allotment !== undefined) entry.allotment = Math.max(0, input.allotment);
      if (input.stopSell !== undefined) entry.stopSell = input.stopSell;
      if (input.minStay !== undefined) entry.minStay = Math.max(1, input.minStay);
      if (input.closedToArrival !== undefined) entry.closedToArrival = input.closedToArrival;
      if (input.closedToDeparture !== undefined) {
        entry.closedToDeparture = input.closedToDeparture;
      }
      entry.updatedAt = at;
      entry.updatedBy = input.updatedBy;
    }
  });

  return dates.length;
}

/** Drop every override for a room type in a range — back to the baseline. */
export function clearOverrides(roomTypeId: string, from: string, to: string): number {
  const days = nightsBetween(from, to) + 1;
  const dates = new Set(dateRange(from, Math.max(1, days)));
  let removed = 0;
  mutate((draft) => {
    const before = draft.inventoryOverrides.length;
    draft.inventoryOverrides = draft.inventoryOverrides.filter(
      (o) => !(o.roomTypeId === roomTypeId && dates.has(o.date)),
    );
    removed = before - draft.inventoryOverrides.length;
  });
  return removed;
}
