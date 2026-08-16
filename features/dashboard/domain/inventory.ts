/**
 * Inventory & availability — the prototype's allotment engine, and the caller
 * that turns a base rate into a price.
 *
 * A property's *baseline* (room types, per-night allotment and base rate) is
 * derived deterministically from the listing it belongs to, so the whole
 * catalogue has inventory without shipping a multi-megabyte calendar.
 * Everything a human or a booking then *changes* is stored as a delta in the
 * domain store:
 *
 *   baseline (pure, seeded)  +  overrides (revenue manager)  −  consumed (bookings/holds)
 *
 * That keeps the calendar infinite in both directions, SSR-stable, and small
 * enough to persist. A real backend replaces `dayRate`/`consumed` with a query
 * against the availability table; the signatures below are already the API.
 *
 * ## Where prices come from
 *
 * This module owns the *base* rate and the availability; it does not decide what
 * a night costs. That is `domain/pricing`, which turns the base rate into an
 * effective rate through the configurable rule book (seasons, holidays,
 * weekends, demand, manual overrides) and turns a set of nights into a room
 * total (rate plan, booking window, length of stay, guests, discounts). Every
 * price the product shows — the search card, the room picker, the checkout, the
 * merchant calendar — comes back through {@link quoteStay} or {@link dayRate},
 * so there is exactly one pricing path.
 *
 * All prices are base USD, like listing prices and the rest of the domain.
 */

import type { BookingVertical } from "@/types/booking";
import { hashString } from "@/lib/random";
import { getCancellationPolicy } from "./lifecycle";
import { money } from "./money";
import {
  calculateStayPrice,
  daysBetween,
  explainDailyRate,
  includedGuestsFor,
  legacySeasonTag,
  listRatePlans,
  findRatePlan,
  pricingConfigFor,
  resolveCached,
  todayISO,
  type BookingPriceCalculation,
  type DailyRate as PricedDay,
  type RatePlan,
  type RatePlanId,
} from "./pricing";
import { getRevision, getState, mutate, nextId } from "./store";
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

/**
 * The ids of the plans the product ships with.
 *
 * Rate plans are records in the store now, not a frozen constant, so merchants
 * can add their own — but these four are the ones deep-linked URLs and seeded
 * bookings refer to, and they are never deleted (disabling archives them).
 */
export const RATE_PLAN_IDS = [
  "standard",
  "non_refundable",
  "breakfast",
  "flexible",
] as const;

export type BuiltInRatePlanId = (typeof RATE_PLAN_IDS)[number];

export type { RatePlan, RatePlanId };

/** One night of one room type, fully resolved. */
export interface DayRate {
  date: string;
  roomTypeId: string;
  /** Units offered for sale that night (after admin blocks). */
  allotment: number;
  /** Units already sold or held. */
  booked: number;
  /** Units an external channel holds (`calendar-sync.ts`). */
  blocked: number;
  /** Which channel took them, for the calendar cell's explanation. */
  blockedBy?: string;
  available: number;
  /** Nightly price for the room type at the *standard* plan, USD. */
  price: number;
  /** The untouched base rate, before any pricing rule. */
  baseRate: number;
  /**
   * The pricing engine's full working for this night — which rules fired, in
   * what order, what each did, and what was skipped. The rate calendar renders
   * it; nothing recomputes it.
   */
  pricing: PricedDay;
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
  /** Why the rate was pinned by hand — shown wherever the override is. */
  priceNote?: string;
  /** What the pricing engine would have charged when the pin was set. */
  priceBefore?: number;
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

/**
 * The last-resort plan.
 *
 * `getRatePlan` reads the store, and on a first server render before any state
 * exists that read can come back empty. Returning `undefined` there would ripple
 * a null check through every caller for a case that only ever means "the seed
 * has not loaded", so a plain standard rate stands in.
 */
const FALLBACK_PLAN: RatePlan = {
  id: "standard",
  name: "Standard rate",
  description: "Room only.",
  priceFactor: 1,
  currency: "USD",
  cancellationPolicyId: "moderate",
  mealPlan: "none",
  includesBreakfast: false,
  refundable: true,
  minStay: 1,
  maxStay: 30,
  closedToArrival: [],
  closedToDeparture: [],
  minAdvanceDays: 0,
  maxAdvanceDays: 0,
  status: "active",
  verticals: [],
  propertyIds: [],
  roomTypeIds: [],
  inclusions: ["Room only"],
  builtIn: true,
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
  updatedBy: "system",
};

/** Every active rate plan on the platform. */
export function allRatePlans(): RatePlan[] {
  const rows = listRatePlans({ status: "active" });
  return rows.length > 0 ? rows : [FALLBACK_PLAN];
}

export function getRatePlan(id: RatePlanId): RatePlan {
  return findRatePlan(id) ?? allRatePlans()[0] ?? FALLBACK_PLAN;
}

/**
 * The rate plans a vertical (and optionally one property) actually sells.
 *
 * Which plans reach which vertical used to be a `switch`; it is a field on the
 * plan now, so a merchant adding a "Half board" plan for their resort does not
 * need a code change to have it offered.
 */
export function ratePlansFor(vertical: BookingVertical, propertyId?: string): RatePlan[] {
  const rows = listRatePlans({ status: "active", vertical, propertyId });
  return rows.length > 0 ? rows : [FALLBACK_PLAN];
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

function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * The untouched baseline for one night — before pricing rules, admin overrides
 * and bookings. Seeded by room type + date, so the calendar is identical on the
 * server and in every browser.
 *
 * The seasonal curve and weekend uplift that used to be multiplied in here are
 * gone: they are configurable pricing rules now (`domain/pricing`), which is
 * what lets a merchant see and change them. What remains is genuinely the
 * property's own rack rate plus a little per-night jitter so no two days look
 * copy-pasted.
 */
function baseline(
  property: PropertyRef,
  room: RoomType,
  date: string,
): { allotment: number; baseRate: number; stopSell: boolean } {
  const seed = hashString(`${room.id}:${date}`);
  // ±6% jitter so no two days look copy-pasted.
  const jitter = 0.94 + ((seed >>> 8) % 13) / 100;

  const baseRate = money(property.basePrice * room.priceFactor * jitter);

  // Occupancy pressure: a slice of each room type is already committed to
  // other channels, and roughly 1 in 22 nights is closed out entirely.
  const pressure = (seed >>> 3) % 100;
  const stopSell = pressure < 4;
  const committed = Math.floor((room.totalUnits * (pressure % 60)) / 100);
  const allotment = stopSell ? 0 : Math.max(0, room.totalUnits - committed);

  return { allotment, baseRate, stopSell };
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

/**
 * External blocks, indexed by `roomTypeId|date`.
 *
 * A rate-manager calendar renders hundreds of cells and each one asks about one
 * night, so a linear scan of every imported block per cell is quadratic on a
 * screen that redraws often. The index is rebuilt only when the store's revision
 * moves, which is exactly when the blocks can have changed.
 */
let blockIndex: Map<string, { units: number; summary: string }> | null = null;
let blockIndexRevision = -1;

function externalBlockIndex(): Map<string, { units: number; summary: string }> {
  const revision = getRevision();
  if (blockIndex && blockIndexRevision === revision) return blockIndex;
  const next = new Map<string, { units: number; summary: string }>();
  for (const block of getState().externalBlocks) {
    const key = overrideKey(block.roomTypeId, block.date);
    const existing = next.get(key);
    if (existing) existing.units += block.units;
    else next.set(key, { units: block.units, summary: block.summary });
  }
  blockIndex = next;
  blockIndexRevision = revision;
  return next;
}

/**
 * Units an external channel holds for one night. Written by `calendar-sync.ts`;
 * read here so availability is one number regardless of which channel took it.
 */
export function blockedUnits(roomTypeId: string, date: string): number {
  return externalBlockIndex().get(overrideKey(roomTypeId, date))?.units ?? 0;
}

/** Which channel took the night, for the calendar cell's explanation. */
export function blockedBy(roomTypeId: string, date: string): string | undefined {
  return externalBlockIndex().get(overrideKey(roomTypeId, date))?.summary;
}

/**
 * One fully-resolved night: baseline + pricing rules + override − consumed.
 *
 * The price it reports is the *standard plan* rate, which is what a calendar
 * cell and an availability check want. {@link nightlyRate} resolves the same
 * night for a specific rate plan, which is what a quote wants — both go through
 * the same engine, so they can never disagree about why a night costs what it
 * does.
 */
export function dayRate(
  property: PropertyRef,
  room: RoomType,
  date: string,
  ratePlanId: RatePlanId = "standard",
): DayRate {
  const base = baseline(property, room, date);
  const override = findOverride(room.id, date);

  const allotment = Math.min(
    room.totalUnits,
    Math.max(0, override?.allotment ?? base.allotment),
  );
  const stopSell = override?.stopSell ?? base.stopSell;
  const booked = consumedUnits(room.id, date);
  // Nights another channel has taken come out of availability exactly as our
  // own bookings do — that is the whole point of syncing a calendar.
  const blocked = blockedUnits(room.id, date);

  // Demand pricing reads the same occupancy the revenue manager sees: units
  // committed (ours and the channels') over units offered.
  const occupancy = allotment > 0 ? Math.min(1, (booked + blocked) / allotment) : 0;

  const pricing = resolveCached({
    date,
    baseRate: base.baseRate,
    propertyId: property.id,
    roomTypeId: room.id,
    ratePlanId,
    vertical: property.vertical,
    occupancy,
    override:
      override?.price === undefined
        ? undefined
        : {
            price: override.price,
            reason: override.priceNote,
            calculatedPrice: override.priceBefore,
          },
  });

  return {
    date,
    roomTypeId: room.id,
    allotment,
    booked,
    blocked,
    blockedBy: blocked > 0 ? blockedBy(room.id, date) : undefined,
    available: stopSell ? 0 : Math.max(0, allotment - booked - blocked),
    price: pricing.effectiveRate,
    baseRate: pricing.baseRate,
    pricing,
    stopSell,
    // A minimum stay can come from the day (a revenue-manager edit) or from a
    // rule that owns the date (a festive window, an Eid holiday).
    minStay: Math.max(override?.minStay ?? 1, pricing.minStay || 1),
    closedToArrival: override?.closedToArrival ?? false,
    closedToDeparture: override?.closedToDeparture ?? false,
    season: legacySeasonTag(pricing),
  };
}

/**
 * The priced night for a specific rate plan.
 *
 * A plan with a contracted `baseRate` replaces the room's own rate before the
 * rules run, so a negotiated corporate rate still moves with a holiday unless
 * the holiday is scoped away from that plan.
 */
export function nightlyRate(
  property: PropertyRef,
  room: RoomType,
  date: string,
  plan: RatePlan,
  occupancy: number,
): PricedDay {
  const base = baseline(property, room, date);
  const override = findOverride(room.id, date);
  const baseRate = plan.baseRate !== undefined ? plan.baseRate : base.baseRate;

  return resolveCached({
    date,
    baseRate,
    propertyId: property.id,
    roomTypeId: room.id,
    ratePlanId: plan.id,
    vertical: property.vertical,
    occupancy,
    override:
      override?.price === undefined
        ? undefined
        : {
            price: override.price,
            reason: override.priceNote,
            calculatedPrice: override.priceBefore,
          },
  });
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

/**
 * A calendar strip for the revenue manager / availability display.
 *
 * `ratePlanId` selects which plan's rules resolve the nightly rate; it defaults
 * to the standard plan, which is what an availability view wants.
 */
export function calendar(
  property: PropertyRef,
  room: RoomType,
  start: string,
  days: number,
  ratePlanId: RatePlanId = "standard",
): DayRate[] {
  return dateRange(start, days).map((date) => dayRate(property, room, date, ratePlanId));
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
  /**
   * The date the traveller is booking *on*, for booking-window pricing.
   * Defaults to today. Passing it explicitly is what makes a quote
   * reproducible — a test, or a re-price of an old booking, must not drift
   * with the wall clock.
   */
  bookingDate?: string;
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
  | "advance_booking"
  | "rate_plan_unavailable"
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
  const nights = dateRange(checkIn, nightCount).map((date) =>
    dayRate(property, room, date, plan.id),
  );

  if (plan.status !== "active") {
    blockers.push({
      code: "rate_plan_unavailable",
      message: `${plan.name} is not on sale at the moment.`,
    });
  }

  // Advance-purchase windows: how early or late the plan may be booked. Only
  // checked when the caller told us the booking date, so a re-price of a stored
  // booking is never rejected by today's calendar.
  if (request.bookingDate && (plan.minAdvanceDays > 0 || plan.maxAdvanceDays > 0)) {
    const lead = daysBetween(request.bookingDate, checkIn);
    if (plan.minAdvanceDays > 0 && lead < plan.minAdvanceDays) {
      blockers.push({
        code: "advance_booking",
        message: `${plan.name} must be booked at least ${plan.minAdvanceDays} days before arrival.`,
      });
    }
    if (plan.maxAdvanceDays > 0 && lead > plan.maxAdvanceDays) {
      blockers.push({
        code: "advance_booking",
        message: `${plan.name} opens ${plan.maxAdvanceDays} days before arrival.`,
      });
    }
  }

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
  /** The room's untouched rate, before any pricing rule. */
  baseRate: number;
  /** Standard-plan nightly rate before the plan factor. */
  basePrice: number;
  /** What this night actually costs on the chosen plan, per unit. */
  price: number;
  season?: DayRate["season"];
  /** "Peak season +30%", "Weekend +18%" — traveller-safe, no internals. */
  reasons: string[];
  /** True when the property pinned this night by hand. */
  overridden: boolean;
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
  /**
   * The pricing engine's full working: every night with its rule trace, the
   * stay-level adjustments (booking window, length of stay, guests) and the
   * discounts. The breakdown the traveller and the merchant both read.
   */
  pricing: BookingPriceCalculation;
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
 *
 * The arithmetic itself lives in `domain/pricing`; this function's job is to
 * supply it with the base rate, the occupancy and the stay shape, and to hand
 * back the result in the shape the product already consumes.
 */
export function quoteStay(request: AvailabilityRequest): StayQuote {
  const { property, roomTypeId, ratePlanId, units } = request;
  const room = findRoomType(property, roomTypeId);
  const plan = getRatePlan(ratePlanId);
  const result = checkAvailability(request);
  const config = pricingConfigFor(property.id);
  const guests = Math.max(1, request.guests ?? 1);
  const bookingDate = request.bookingDate ?? todayISO();

  // Resolve each night again for the *chosen* plan: a rule may be scoped to one
  // rate plan, and a contracted plan replaces the base rate outright. Both
  // resolutions are memoised, so this costs a map lookup per night.
  const priced: PricedDay[] = room
    ? result.nights.map((night) =>
        nightlyRate(
          property,
          room,
          night.date,
          plan,
          night.allotment > 0
            ? Math.min(1, (night.booked + night.blocked) / night.allotment)
            : 0,
        ),
      )
    : [];

  const calculation = calculateStayPrice({
    nights: priced,
    ratePlan: plan,
    roomTypeId,
    propertyId: property.id,
    vertical: property.vertical,
    units,
    guests,
    includedGuests: includedGuestsFor(room?.maxOccupancy ?? 2, units),
    bookingDate,
    checkIn: request.checkIn,
    checkOut: request.checkOut || request.checkIn,
    config,
  });

  const planFactor = plan.baseRate !== undefined ? 1 : plan.priceFactor;
  const lines: StayQuoteLine[] = priced.map((night, index) => ({
    date: night.date,
    baseRate: night.baseRate,
    basePrice: result.nights[index]?.price ?? night.effectiveRate,
    price: money(night.effectiveRate * planFactor),
    season: legacySeasonTag(night),
    reasons: explainDailyRate(night),
    overridden: night.overridden,
  }));

  const policy = getCancellationPolicy(plan.cancellationPolicyId);

  return {
    currency: plan.currency || config.currency || "USD",
    roomTypeId,
    roomTypeName: room?.name ?? "Room",
    ratePlanId: plan.id,
    ratePlanName: plan.name,
    nights: lines,
    nightCount: lines.length,
    units,
    averageNightly: calculation.averageNightly,
    roomSubtotal: calculation.roomSubtotal,
    pricing: calculation,
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
  bookingDate?: string,
): StayQuote | null {
  const rooms = getRoomTypes(property);
  const plans = ratePlansFor(property.vertical, property.id);
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
        bookingDate,
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
  /** Why the rate was pinned. Stored alongside it and shown in the calendar. */
  priceNote?: string;
  /**
   * What the pricing engine would have charged, captured so the override can
   * show "was $210, now $260". Resolved per date when omitted.
   */
  priceBefore?: number;
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
      if (input.price !== undefined) {
        entry.price = money(input.price);
        entry.priceNote = input.priceNote ?? entry.priceNote;
        // Keep the *first* pre-override rate: editing a pin twice should still
        // report what the engine originally wanted, not the previous pin.
        if (entry.priceBefore === undefined && input.priceBefore !== undefined) {
          entry.priceBefore = money(input.priceBefore);
        }
      }
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

// ---------------------------------------------------------------------------
// Manual price override
// ---------------------------------------------------------------------------

/**
 * What the pricing engine would charge for a night if nothing were pinned.
 *
 * Used to record what an override replaced ("was $210, now $260") and to show
 * what lifting it would restore. Deliberately ignores any existing override —
 * that is the whole question being asked.
 */
export function calculatedRate(
  property: PropertyRef,
  room: RoomType,
  date: string,
  ratePlanId: RatePlanId = "standard",
): number {
  const base = baseline(property, room, date);
  const override = findOverride(room.id, date);
  const allotment = Math.min(
    room.totalUnits,
    Math.max(0, override?.allotment ?? base.allotment),
  );
  const consumed = consumedUnits(room.id, date) + blockedUnits(room.id, date);
  return resolveCached({
    date,
    baseRate: base.baseRate,
    propertyId: property.id,
    roomTypeId: room.id,
    ratePlanId,
    vertical: property.vertical,
    occupancy: allotment > 0 ? Math.min(1, consumed / allotment) : 0,
  }).effectiveRate;
}

export interface PriceOverrideInput {
  propertyId: string;
  roomTypeId: string;
  /** Inclusive ISO dates. Pass the same value twice for a single night. */
  from: string;
  to: string;
  /** Restrict to these weekdays; empty = every day in the range. */
  weekdays?: number[];
  price: number;
  reason?: string;
  /** What the engine charged before the pin, when the caller knows it. */
  calculatedPrice?: number;
  updatedBy: string;
}

/**
 * Pin a nightly rate by hand.
 *
 * A manual override outranks every rule — see the calculation order in
 * `pricing/engine.ts`. That is deliberate: a merchant on the phone to a group
 * organiser needs the number they just agreed to be the number the site
 * charges, and no automation should quietly undo it.
 */
export function setPriceOverride(input: PriceOverrideInput): number {
  if (!Number.isFinite(input.price) || input.price < 0) return 0;
  return bulkUpdateInventory({
    propertyId: input.propertyId,
    roomTypeId: input.roomTypeId,
    from: input.from,
    to: input.to,
    weekdays: input.weekdays,
    price: input.price,
    priceNote: input.reason,
    priceBefore: input.calculatedPrice,
    updatedBy: input.updatedBy,
  });
}

/**
 * Lift a manual override, returning those nights to the rule engine.
 *
 * Only the price is cleared: an allotment or stop-sell set on the same night is
 * a different decision and survives.
 */
export function removePriceOverride(
  roomTypeId: string,
  from: string,
  to: string,
): number {
  const days = nightsBetween(from, to) + 1;
  const dates = new Set(dateRange(from, Math.max(1, days)));
  return mutate((draft) => {
    let cleared = 0;
    draft.inventoryOverrides = draft.inventoryOverrides.filter((entry) => {
      if (entry.roomTypeId !== roomTypeId || !dates.has(entry.date)) return true;
      if (entry.price === undefined) return true;
      cleared += 1;
      delete entry.price;
      delete entry.priceNote;
      delete entry.priceBefore;
      // Nothing else left on the row? Then it is no longer an override at all.
      const stillMeaningful =
        entry.allotment !== undefined ||
        entry.stopSell !== undefined ||
        entry.minStay !== undefined ||
        entry.closedToArrival !== undefined ||
        entry.closedToDeparture !== undefined;
      return stillMeaningful;
    });
    return cleared;
  });
}
