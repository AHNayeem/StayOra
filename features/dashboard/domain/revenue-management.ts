/**
 * Revenue management — pricing, pace and the recommendations that connect them.
 *
 * The rate calendar in `inventory.ts` already answers "what is this night
 * selling for and how many are left". This file answers the questions a revenue
 * manager actually asks: how full am I, what am I earning per available room,
 * am I picking up faster or slower than usual, and what should I change.
 *
 * Two rules govern everything here:
 *
 *   1. **Deterministic.** No randomness, no wall-clock inside a metric, no ML.
 *      Every number is a function of the inventory baseline, the override table
 *      and the booking ledger, so the same date range always renders the same
 *      chart on the server and the client.
 *   2. **Transparent.** A recommendation carries the numbers that produced it
 *      and the exact change it would make. Nothing is a black box, and applying
 *      one writes an ordinary inventory override — the same edit a human would
 *      have made by hand, so the booking engine picks it up immediately.
 */

import {
  calendar,
  bulkUpdateInventory,
  dateRange,
  getRoomTypes,
  nightsBetween,
  type DayRate,
  type PropertyRef,
  type RoomType,
} from "./inventory";
import { money } from "./money";
import { getState, mutate, nextId } from "./store";
import type { Booking } from "./types";

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** One night, with the revenue metrics a manager reads. */
export interface DayMetrics {
  date: string;
  /** 0 = Sunday. */
  weekday: number;
  isWeekend: boolean;
  /** Units offered for sale. */
  allotment: number;
  sold: number;
  available: number;
  /** Price a new booking would pay tonight. */
  price: number;
  /** Sold ÷ allotment, 0–1. */
  occupancy: number;
  /** Average daily rate — revenue ÷ rooms sold. */
  adr: number;
  /** Revenue per available room — revenue ÷ rooms offered. */
  revpar: number;
  /** Room revenue for the night. */
  revenue: number;
  stopSell: boolean;
  minStay: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  season?: DayRate["season"];
  demand: DemandLevel;
}

export type DemandLevel = "very_low" | "low" | "moderate" | "high" | "very_high";

export const DEMAND_LABELS: Record<DemandLevel, string> = {
  very_low: "Very low",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  very_high: "Very high",
};

export const DEMAND_TONES: Record<DemandLevel, "danger" | "warning" | "neutral" | "info" | "success"> =
  {
    very_low: "danger",
    low: "warning",
    moderate: "neutral",
    high: "info",
    very_high: "success",
  };

/**
 * Demand is read straight off occupancy. A real system would blend pace,
 * search volume and compression; a prototype that pretended to would only be
 * harder to reason about.
 */
export function demandFor(occupancy: number): DemandLevel {
  if (occupancy >= 0.9) return "very_high";
  if (occupancy >= 0.7) return "high";
  if (occupancy >= 0.45) return "moderate";
  if (occupancy >= 0.2) return "low";
  return "very_low";
}

function toMetrics(day: DayRate): DayMetrics {
  const [y, m, d] = day.date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sold = Math.min(day.booked, day.allotment);
  const occupancy = day.allotment > 0 ? sold / day.allotment : 0;
  const revenue = money(sold * day.price);
  return {
    date: day.date,
    weekday,
    isWeekend: weekday === 5 || weekday === 6,
    allotment: day.allotment,
    sold,
    available: day.available,
    price: day.price,
    occupancy,
    adr: sold > 0 ? money(revenue / sold) : day.price,
    revpar: day.allotment > 0 ? money(revenue / day.allotment) : 0,
    revenue,
    stopSell: day.stopSell,
    minStay: day.minStay,
    closedToArrival: day.closedToArrival,
    closedToDeparture: day.closedToDeparture,
    season: day.season,
    demand: demandFor(occupancy),
  };
}

/** Per-night metrics for one room type across a window. */
export function roomMetrics(
  property: PropertyRef,
  room: RoomType,
  start: string,
  days: number,
): DayMetrics[] {
  return calendar(property, room, start, days).map(toMetrics);
}

/** Per-night metrics for the whole property, summed across room types. */
export function propertyMetrics(
  property: PropertyRef,
  start: string,
  days: number,
): DayMetrics[] {
  const rooms = getRoomTypes(property);
  const perRoom = rooms.map((room) => roomMetrics(property, room, start, days));
  return dateRange(start, days).map((date, index) => {
    const slices = perRoom.map((rows) => rows[index]).filter(Boolean);
    const allotment = slices.reduce((n, s) => n + s.allotment, 0);
    const sold = slices.reduce((n, s) => n + s.sold, 0);
    const revenue = money(slices.reduce((n, s) => n + s.revenue, 0));
    const occupancy = allotment > 0 ? sold / allotment : 0;
    const first = slices[0];
    return {
      date,
      weekday: first?.weekday ?? 0,
      isWeekend: first?.isWeekend ?? false,
      allotment,
      sold,
      available: slices.reduce((n, s) => n + s.available, 0),
      // Property-level "price" is the cheapest bookable room — what a search
      // result would show.
      price: slices.length
        ? Math.min(...slices.filter((s) => !s.stopSell).map((s) => s.price), Infinity) ===
          Infinity
          ? (first?.price ?? 0)
          : Math.min(...slices.filter((s) => !s.stopSell).map((s) => s.price))
        : 0,
      occupancy,
      adr: sold > 0 ? money(revenue / sold) : (first?.price ?? 0),
      revpar: allotment > 0 ? money(revenue / allotment) : 0,
      revenue,
      stopSell: slices.length > 0 && slices.every((s) => s.stopSell),
      minStay: Math.max(1, ...slices.map((s) => s.minStay)),
      closedToArrival: slices.length > 0 && slices.every((s) => s.closedToArrival),
      closedToDeparture: slices.length > 0 && slices.every((s) => s.closedToDeparture),
      season: first?.season,
      demand: demandFor(occupancy),
    } satisfies DayMetrics;
  });
}

export interface PerformanceSummary {
  currency: string;
  nights: number;
  roomsAvailable: number;
  roomsSold: number;
  occupancy: number;
  adr: number;
  revpar: number;
  revenue: number;
  /** Best-performing night by RevPAR. */
  peak?: DayMetrics;
  /** Worst-performing night by RevPAR. */
  trough?: DayMetrics;
  weekendOccupancy: number;
  weekdayOccupancy: number;
  stopSellNights: number;
}

/** Window totals — the headline tiles on the revenue-management dashboard. */
export function summarizeMetrics(rows: DayMetrics[]): PerformanceSummary {
  const roomsAvailable = rows.reduce((n, r) => n + r.allotment, 0);
  const roomsSold = rows.reduce((n, r) => n + r.sold, 0);
  const revenue = money(rows.reduce((n, r) => n + r.revenue, 0));
  const weekend = rows.filter((r) => r.isWeekend);
  const weekday = rows.filter((r) => !r.isWeekend);
  const occOf = (set: DayMetrics[]) => {
    const a = set.reduce((n, r) => n + r.allotment, 0);
    return a > 0 ? set.reduce((n, r) => n + r.sold, 0) / a : 0;
  };
  const sorted = [...rows].sort((a, b) => b.revpar - a.revpar);

  return {
    currency: "USD",
    nights: rows.length,
    roomsAvailable,
    roomsSold,
    occupancy: roomsAvailable > 0 ? roomsSold / roomsAvailable : 0,
    adr: roomsSold > 0 ? money(revenue / roomsSold) : 0,
    revpar: roomsAvailable > 0 ? money(revenue / roomsAvailable) : 0,
    revenue,
    peak: sorted[0],
    trough: sorted[sorted.length - 1],
    weekendOccupancy: occOf(weekend),
    weekdayOccupancy: occOf(weekday),
    stopSellNights: rows.filter((r) => r.stopSell).length,
  };
}

// ---------------------------------------------------------------------------
// Booking pace & forecast
// ---------------------------------------------------------------------------

export interface PacePoint {
  /** Booking-creation month, `YYYY-MM`. */
  period: string;
  bookings: number;
  roomNights: number;
  revenue: number;
  cancellations: number;
  /** Cancellations ÷ bookings, 0–1. */
  cancellationRate: number;
  averageLengthOfStay: number;
  /** Days between booking and arrival. */
  averageLeadTime: number;
}

const CANCELLED_STATUSES = new Set(["cancelled", "refunded", "failed"]);

/**
 * Booking pace by the month the booking was *made* — the pickup curve. Filters
 * to one merchant/property when given, so a merchant sees only their own.
 */
export function bookingPace(filter: {
  merchantId?: string;
  listingId?: string;
  from?: string;
  to?: string;
} = {}): PacePoint[] {
  const rows = getState().bookings.filter((b) => {
    if (filter.merchantId && b.merchant.id !== filter.merchantId) return false;
    if (filter.listingId && b.listing?.id !== filter.listingId) return false;
    if (filter.from && b.createdAt < filter.from) return false;
    if (filter.to && b.createdAt > filter.to) return false;
    return true;
  });

  const map = new Map<string, PacePoint & { leadSum: number; nightSum: number }>();
  for (const b of rows) {
    const period = b.createdAt.slice(0, 7);
    const entry =
      map.get(period) ??
      ({
        period,
        bookings: 0,
        roomNights: 0,
        revenue: 0,
        cancellations: 0,
        cancellationRate: 0,
        averageLengthOfStay: 0,
        averageLeadTime: 0,
        leadSum: 0,
        nightSum: 0,
      } as PacePoint & { leadSum: number; nightSum: number });

    const nights = Math.max(1, b.nights);
    entry.bookings += 1;
    entry.roomNights += nights * Math.max(1, b.quantity);
    entry.revenue = money(entry.revenue + b.money.netSale);
    if (CANCELLED_STATUSES.has(b.status)) entry.cancellations += 1;
    entry.nightSum += nights;
    entry.leadSum += Math.max(
      0,
      Math.round(
        (new Date(b.startAt).getTime() - new Date(b.createdAt).getTime()) / 86_400_000,
      ),
    );
    map.set(period, entry);
  }

  return [...map.values()]
    .map((e) => ({
      period: e.period,
      bookings: e.bookings,
      roomNights: e.roomNights,
      revenue: e.revenue,
      cancellations: e.cancellations,
      cancellationRate: e.bookings > 0 ? e.cancellations / e.bookings : 0,
      averageLengthOfStay: e.bookings > 0 ? money(e.nightSum / e.bookings) : 0,
      averageLeadTime: e.bookings > 0 ? Math.round(e.leadSum / e.bookings) : 0,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export interface RevenueForecast {
  /** Revenue already on the books for the window. */
  onTheBooks: number;
  /** What the remaining inventory would add at today's prices and pace. */
  projectedPickup: number;
  /** `onTheBooks + projectedPickup`. */
  forecast: number;
  /** Occupancy the forecast implies. */
  forecastOccupancy: number;
  /** The pickup rate used, as a share of remaining inventory. */
  pickupRate: number;
  explanation: string;
}

/**
 * A transparent forecast: whatever share of remaining inventory the window's
 * own occupancy suggests will still sell, priced at the current rate. It is a
 * planning aid, not a prediction, and it says so.
 */
export function forecastRevenue(rows: DayMetrics[]): RevenueForecast {
  const summary = summarizeMetrics(rows);
  const remaining = rows.reduce((n, r) => n + (r.stopSell ? 0 : r.available), 0);
  // Nights that are already selling well keep selling; empty ones rarely fill.
  const pickupRate = Math.min(0.85, Math.max(0.1, summary.occupancy));
  const projectedPickup = money(
    rows.reduce(
      (n, r) => n + (r.stopSell ? 0 : r.available * r.price * pickupRate),
      0,
    ),
  );
  const forecastRooms = summary.roomsSold + remaining * pickupRate;
  return {
    onTheBooks: summary.revenue,
    projectedPickup,
    forecast: money(summary.revenue + projectedPickup),
    forecastOccupancy:
      summary.roomsAvailable > 0 ? forecastRooms / summary.roomsAvailable : 0,
    pickupRate,
    explanation: `${remaining} unsold room nights × current rate × ${Math.round(
      pickupRate * 100,
    )}% pickup (the window's own occupancy).`,
  };
}

// ---------------------------------------------------------------------------
// Pricing rules
// ---------------------------------------------------------------------------

export const RECOMMENDATION_RULE_KINDS = [
  "high_demand",
  "low_demand",
  "weekend",
  "seasonal",
  "last_room",
  "min_stay",
  "stop_sell",
  "arrival_restriction",
] as const;

export type RecommendationRuleKind = (typeof RECOMMENDATION_RULE_KINDS)[number];

export const RULE_KIND_LABELS: Record<RecommendationRuleKind, string> = {
  high_demand: "High demand — raise price",
  low_demand: "Low demand — discount",
  weekend: "Weekend pricing",
  seasonal: "Seasonal pricing",
  last_room: "Last-room availability",
  min_stay: "Minimum stay",
  stop_sell: "Stop sell",
  arrival_restriction: "Arrival / departure restriction",
};

export interface RecommendationRule {
  id: string;
  name: string;
  kind: RecommendationRuleKind;
  /** Empty = every property in scope. */
  propertyId?: string;
  roomTypeId?: string;
  /** Occupancy threshold, 0–1 (demand and last-room rules). */
  threshold: number;
  /** Units remaining that trigger a last-room rule. */
  unitsRemaining: number;
  /** Price change to apply, percent. Negative discounts. */
  adjustmentPercent: number;
  /** Nights to require (min-stay rules). */
  minStay: number;
  /** Weekdays the rule applies to (0 = Sunday); empty = all. */
  weekdays: number[];
  /** Season window the rule is limited to. */
  seasonFrom?: string;
  seasonTo?: string;
  status: "active" | "paused";
  /** Higher runs first when several rules match a night. */
  priority: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

const WEEKEND_DAYS = [5, 6];

/** Does the rule apply to this night? Pure, so previews can reuse it. */
export function ruleMatches(rule: RecommendationRule, day: DayMetrics): boolean {
  if (rule.status !== "active") return false;
  if (rule.weekdays.length > 0 && !rule.weekdays.includes(day.weekday)) return false;
  if (rule.seasonFrom && day.date < rule.seasonFrom) return false;
  if (rule.seasonTo && day.date > rule.seasonTo) return false;

  switch (rule.kind) {
    case "high_demand":
      return day.occupancy >= rule.threshold;
    case "low_demand":
      return day.occupancy <= rule.threshold;
    case "weekend":
      return WEEKEND_DAYS.includes(day.weekday);
    case "seasonal":
      return Boolean(rule.seasonFrom || rule.seasonTo) || day.season === "peak";
    case "last_room":
      return day.available > 0 && day.available <= rule.unitsRemaining;
    case "min_stay":
      return day.occupancy >= rule.threshold && day.minStay < rule.minStay;
    case "stop_sell":
      return day.occupancy >= rule.threshold && !day.stopSell;
    case "arrival_restriction":
      return day.occupancy >= rule.threshold && !day.closedToArrival;
    default:
      return false;
  }
}

export type RecommendationRuleInput = Omit<
  RecommendationRule,
  "id" | "createdAt" | "updatedAt" | "updatedBy"
>;

export const recommendationRuleStore = {
  list(scope: { propertyId?: string } = {}): RecommendationRule[] {
    return getState()
      .recommendationRules.filter(
        (r) => !scope.propertyId || !r.propertyId || r.propertyId === scope.propertyId,
      )
      .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
  },

  create(input: RecommendationRuleInput, by: string): RecommendationRule {
    const now = new Date().toISOString();
    const rule: RecommendationRule = {
      ...input,
      id: nextId("prl"),
      createdAt: now,
      updatedAt: now,
      updatedBy: by,
    };
    mutate((draft) => draft.recommendationRules.unshift(rule));
    return rule;
  },

  update(
    id: string,
    patch: Partial<RecommendationRuleInput>,
    by: string,
  ): { before: RecommendationRule; after: RecommendationRule } | undefined {
    return mutate((draft) => {
      const row = draft.recommendationRules.find((r) => r.id === id);
      if (!row) return undefined;
      const before = structuredClone(row);
      Object.assign(row, patch);
      row.updatedAt = new Date().toISOString();
      row.updatedBy = by;
      return { before, after: structuredClone(row) };
    });
  },

  remove(id: string): RecommendationRule | undefined {
    return mutate((draft) => {
      const index = draft.recommendationRules.findIndex((r) => r.id === id);
      if (index < 0) return undefined;
      return draft.recommendationRules.splice(index, 1)[0];
    });
  },
};

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export type RecommendationKind =
  | "raise_price"
  | "lower_price"
  | "min_stay"
  | "stop_sell"
  | "close_arrival"
  | "open_availability";

export const RECOMMENDATION_LABELS: Record<RecommendationKind, string> = {
  raise_price: "Raise price",
  lower_price: "Promotional discount",
  min_stay: "Set minimum stay",
  stop_sell: "Stop sell",
  close_arrival: "Close to arrival",
  open_availability: "Release more inventory",
};

/** The change a recommendation would make, ready to hand to the inventory engine. */
export interface RecommendationAction {
  date: string;
  roomTypeId: string;
  propertyId: string;
  price?: number;
  minStay?: number;
  stopSell?: boolean;
  closedToArrival?: boolean;
  allotment?: number;
}

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  date: string;
  propertyId: string;
  roomTypeId: string;
  roomTypeName: string;
  /** The one-sentence message a manager reads. */
  message: string;
  /** The numbers behind it, so nothing is a black box. */
  evidence: { label: string; value: string }[];
  /** Estimated effect on revenue for the night, USD. */
  impact: number;
  confidence: "low" | "medium" | "high";
  /** The rule that produced it, when a configured rule did. */
  ruleId?: string;
  action: RecommendationAction;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Generate recommendations for a room type across a window.
 *
 * Configured {@link RecommendationRule}s run first — they are the operator's own
 * policy. The built-in heuristics below only fire where no rule already covers
 * the night, so a manager never sees the system arguing with their own setup.
 */
export function recommendationsFor(
  property: PropertyRef,
  room: RoomType,
  start: string,
  days: number,
): Recommendation[] {
  const rows = roomMetrics(property, room, start, days);
  const rules = recommendationRuleStore
    .list({ propertyId: property.id })
    .filter((r) => !r.roomTypeId || r.roomTypeId === room.id);
  const out: Recommendation[] = [];
  const covered = new Set<string>();

  const push = (rec: Recommendation) => {
    out.push(rec);
    covered.add(rec.date);
  };

  for (const day of rows) {
    if (day.allotment === 0) continue;
    const rule = rules.find((r) => ruleMatches(r, day));
    if (!rule) continue;

    const newPrice = money(day.price * (1 + rule.adjustmentPercent / 100));
    switch (rule.kind) {
      case "high_demand":
      case "weekend":
      case "seasonal":
      case "last_room":
      case "low_demand":
        push({
          id: `${room.id}:${day.date}:${rule.id}`,
          kind: rule.adjustmentPercent >= 0 ? "raise_price" : "lower_price",
          date: day.date,
          propertyId: property.id,
          roomTypeId: room.id,
          roomTypeName: room.name,
          message: `${rule.name}: occupancy is ${pct(day.occupancy)} for ${day.date}. ${
            rule.adjustmentPercent >= 0 ? "Increase" : "Reduce"
          } ${room.name} by ${Math.abs(rule.adjustmentPercent)}% to $${newPrice.toFixed(0)}.`,
          evidence: [
            { label: "Occupancy", value: pct(day.occupancy) },
            { label: "Rooms left", value: String(day.available) },
            { label: "Current rate", value: `$${day.price.toFixed(0)}` },
            { label: "Rule", value: RULE_KIND_LABELS[rule.kind] },
          ],
          impact: money(day.available * (newPrice - day.price)),
          confidence: "high",
          ruleId: rule.id,
          action: {
            date: day.date,
            roomTypeId: room.id,
            propertyId: property.id,
            price: newPrice,
          },
        });
        break;
      case "min_stay":
        push({
          id: `${room.id}:${day.date}:${rule.id}`,
          kind: "min_stay",
          date: day.date,
          propertyId: property.id,
          roomTypeId: room.id,
          roomTypeName: room.name,
          message: `${rule.name}: ${day.date} is ${pct(day.occupancy)} full. Require a ${rule.minStay}-night minimum stay.`,
          evidence: [
            { label: "Occupancy", value: pct(day.occupancy) },
            { label: "Current minimum", value: `${day.minStay} night(s)` },
          ],
          impact: money(day.available * day.price * 0.25),
          confidence: "medium",
          ruleId: rule.id,
          action: {
            date: day.date,
            roomTypeId: room.id,
            propertyId: property.id,
            minStay: rule.minStay,
          },
        });
        break;
      case "stop_sell":
        push({
          id: `${room.id}:${day.date}:${rule.id}`,
          kind: "stop_sell",
          date: day.date,
          propertyId: property.id,
          roomTypeId: room.id,
          roomTypeName: room.name,
          message: `${rule.name}: ${day.date} is ${pct(day.occupancy)} full. Close ${room.name} to protect the remaining units.`,
          evidence: [
            { label: "Occupancy", value: pct(day.occupancy) },
            { label: "Rooms left", value: String(day.available) },
          ],
          impact: 0,
          confidence: "medium",
          ruleId: rule.id,
          action: {
            date: day.date,
            roomTypeId: room.id,
            propertyId: property.id,
            stopSell: true,
          },
        });
        break;
      case "arrival_restriction":
        push({
          id: `${room.id}:${day.date}:${rule.id}`,
          kind: "close_arrival",
          date: day.date,
          propertyId: property.id,
          roomTypeId: room.id,
          roomTypeName: room.name,
          message: `${rule.name}: close ${day.date} to arrivals so shoulder nights fill first.`,
          evidence: [{ label: "Occupancy", value: pct(day.occupancy) }],
          impact: 0,
          confidence: "low",
          ruleId: rule.id,
          action: {
            date: day.date,
            roomTypeId: room.id,
            propertyId: property.id,
            closedToArrival: true,
          },
        });
        break;
    }
  }

  // --- built-in heuristics, only where no rule already spoke ---------------
  for (const day of rows) {
    if (covered.has(day.date) || day.allotment === 0 || day.stopSell) continue;

    if (day.occupancy >= 0.9 && day.available > 0) {
      const uplift = day.occupancy >= 0.95 ? 15 : 12;
      const newPrice = money(day.price * (1 + uplift / 100));
      push({
        id: `${room.id}:${day.date}:high`,
        kind: "raise_price",
        date: day.date,
        propertyId: property.id,
        roomTypeId: room.id,
        roomTypeName: room.name,
        message: `Occupancy is ${pct(day.occupancy)} for ${day.date}. Consider increasing ${room.name} price by ${uplift}% to $${newPrice.toFixed(0)}.`,
        evidence: [
          { label: "Occupancy", value: pct(day.occupancy) },
          { label: "Rooms left", value: `${day.available} of ${day.allotment}` },
          { label: "Current rate", value: `$${day.price.toFixed(0)}` },
          { label: "RevPAR", value: `$${day.revpar.toFixed(0)}` },
        ],
        impact: money(day.available * (newPrice - day.price)),
        confidence: "high",
        action: {
          date: day.date,
          roomTypeId: room.id,
          propertyId: property.id,
          price: newPrice,
        },
      });
      continue;
    }

    if (day.occupancy <= 0.3 && day.available >= 2) {
      const cut = day.occupancy <= 0.15 ? 15 : 10;
      const newPrice = money(day.price * (1 - cut / 100));
      push({
        id: `${room.id}:${day.date}:low`,
        kind: "lower_price",
        date: day.date,
        propertyId: property.id,
        roomTypeId: room.id,
        roomTypeName: room.name,
        message: `Occupancy is only ${pct(day.occupancy)} for ${day.date}. Consider a ${cut}% promotional discount on ${room.name} to $${newPrice.toFixed(0)}.`,
        evidence: [
          { label: "Occupancy", value: pct(day.occupancy) },
          { label: "Unsold rooms", value: String(day.available) },
          { label: "Current rate", value: `$${day.price.toFixed(0)}` },
          { label: "RevPAR", value: `$${day.revpar.toFixed(0)}` },
        ],
        // A discount only pays if it converts; assume it sells a third of what's left.
        impact: money(Math.round(day.available / 3) * newPrice - 0),
        confidence: "medium",
        action: {
          date: day.date,
          roomTypeId: room.id,
          propertyId: property.id,
          price: newPrice,
        },
      });
      continue;
    }

    if (day.available === 1 && day.allotment > 2) {
      const newPrice = money(day.price * 1.08);
      push({
        id: `${room.id}:${day.date}:lastroom`,
        kind: "raise_price",
        date: day.date,
        propertyId: property.id,
        roomTypeId: room.id,
        roomTypeName: room.name,
        message: `Last ${room.name} left for ${day.date}. Last-room availability supports +8% to $${newPrice.toFixed(0)}.`,
        evidence: [
          { label: "Rooms left", value: "1" },
          { label: "Occupancy", value: pct(day.occupancy) },
        ],
        impact: money(newPrice - day.price),
        confidence: "high",
        action: {
          date: day.date,
          roomTypeId: room.id,
          propertyId: property.id,
          price: newPrice,
        },
      });
    }
  }

  return out.sort((a, b) => b.impact - a.impact || a.date.localeCompare(b.date));
}

/** Recommendations across every room type of a property. */
export function propertyRecommendations(
  property: PropertyRef,
  start: string,
  days: number,
): Recommendation[] {
  return getRoomTypes(property)
    .flatMap((room) => recommendationsFor(property, room, start, days))
    .sort((a, b) => b.impact - a.impact || a.date.localeCompare(b.date));
}

/**
 * Apply a recommendation. It writes an ordinary inventory override for the one
 * night, so the change is indistinguishable from a manual edit — and the next
 * quote the booking engine produces already reflects it.
 */
export function applyRecommendation(rec: Recommendation, by: string): number {
  return bulkUpdateInventory({
    propertyId: rec.propertyId,
    roomTypeId: rec.roomTypeId,
    from: rec.action.date,
    to: rec.action.date,
    price: rec.action.price,
    minStay: rec.action.minStay,
    stopSell: rec.action.stopSell,
    closedToArrival: rec.action.closedToArrival,
    allotment: rec.action.allotment,
    updatedBy: by,
  });
}

// ---------------------------------------------------------------------------
// Merchant / property performance
// ---------------------------------------------------------------------------

export interface PropertyPerformance {
  bookings: number;
  roomNights: number;
  grossSales: number;
  netSales: number;
  commission: number;
  merchantEarning: number;
  cancellations: number;
  cancellationRate: number;
  averageLengthOfStay: number;
  averageLeadTime: number;
  averageBookingValue: number;
}

/** Booking-side performance for a merchant or one of its listings. */
export function bookingPerformance(filter: {
  merchantId?: string;
  listingId?: string;
} = {}): PropertyPerformance {
  const rows: Booking[] = getState().bookings.filter((b) => {
    if (filter.merchantId && b.merchant.id !== filter.merchantId) return false;
    if (filter.listingId && b.listing?.id !== filter.listingId) return false;
    return true;
  });

  const cancellations = rows.filter((b) => CANCELLED_STATUSES.has(b.status)).length;
  const nightSum = rows.reduce((n, b) => n + Math.max(1, b.nights), 0);
  const leadSum = rows.reduce(
    (n, b) =>
      n +
      Math.max(
        0,
        Math.round(
          (new Date(b.startAt).getTime() - new Date(b.createdAt).getTime()) / 86_400_000,
        ),
      ),
    0,
  );

  return {
    bookings: rows.length,
    roomNights: rows.reduce(
      (n, b) => n + Math.max(1, b.nights) * Math.max(1, b.quantity),
      0,
    ),
    grossSales: money(rows.reduce((n, b) => n + b.money.base + b.money.markup, 0)),
    netSales: money(rows.reduce((n, b) => n + b.money.netSale, 0)),
    commission: money(
      rows.reduce((n, b) => n + b.money.commission - b.money.commissionReversed, 0),
    ),
    merchantEarning: money(rows.reduce((n, b) => n + b.money.netSettlement, 0)),
    cancellations,
    cancellationRate: rows.length > 0 ? cancellations / rows.length : 0,
    averageLengthOfStay: rows.length > 0 ? money(nightSum / rows.length) : 0,
    averageLeadTime: rows.length > 0 ? Math.round(leadSum / rows.length) : 0,
    averageBookingValue:
      rows.length > 0 ? money(rows.reduce((n, b) => n + b.money.total, 0) / rows.length) : 0,
  };
}

/** Convenience for the dashboard: nights between two ISO dates, inclusive. */
export function windowLength(from: string, to: string): number {
  return Math.max(1, nightsBetween(from, to) + 1);
}
