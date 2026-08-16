/**
 * External calendar sync — the half of the channel connection that moves
 * inventory.
 *
 * `merchants.ts` already models the *link* to a channel manager or PMS
 * (provider, property code, scopes, status). What it deliberately stopped short
 * of was doing anything: a connected property's availability was identical to a
 * disconnected one's, which meant the whole point of a channel — another sales
 * channel taking your rooms — never showed up anywhere.
 *
 * This module is that missing half:
 *
 *   pull   feed → external blocks → availability drops → calendar shows why
 *   push   the property's own sold/blocked dates → an iCal feed to hand out
 *
 * Nothing leaves the browser. A "feed" is generated deterministically from the
 * connection's property code, so the same connection always imports the same
 * blocks on every machine and every reload — a demo you can point at, not
 * random noise. The lifecycle is the real one:
 *
 *   not_connected → syncing → synced → (syncing → synced)… → error → paused
 *
 * A real integration replaces {@link fetchFeed} with an HTTP GET of the iCal URL
 * and {@link runCalendarSync} keeps its signature, its blocks and its states.
 */

import { hashString } from "@/lib/random";
import { catalogueForMerchant, getCatalogueItem } from "./catalogue-service";
import type { CatalogueItem } from "./catalogue";
import { dateRange, getRoomTypes, type PropertyRef } from "./inventory";
import { getMerchant } from "./merchant-service";
import type { ChannelStatus, Merchant, MerchantProperty } from "./merchants";
import { SYSTEM_ACTOR, delay, notFound, recordAudit } from "./service-kit";
import { getState, mutate, nextId } from "./store";
import type { DomainActor } from "./types";

export { blockedBy, blockedUnits } from "./inventory";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** How far ahead a pull imports blocks. */
export const SYNC_HORIZON_DAYS = 60;

/** How often a connected property is due for another pull. */
export const SYNC_EVERY_MINUTES = 60;

/**
 * A pull fails every seventh run. Real feeds go down; a prototype that always
 * succeeds never exercises the error state or the retry the UI offers.
 */
const FAILURE_EVERY = 7;

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * One night the external channel has taken. Stored rather than derived, because
 * the merchant needs to see *which* channel took it and when it arrived.
 */
export interface ExternalBlock {
  id: string;
  merchantId: string;
  /** The merchant property whose connection imported this. */
  propertyId: string;
  /** Catalogue listing — the inventory engine's property id. */
  listingId: string;
  roomTypeId: string;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  units: number;
  /** The feed event's summary line, e.g. "Booking.com reservation". */
  summary: string;
  /** Provider label, for the calendar tooltip. */
  source: string;
  importedAt: string;
}

/** Every block a property's connection has imported. */
export function blocksForProperty(propertyId: string): ExternalBlock[] {
  return getState()
    .externalBlocks.filter((block) => block.propertyId === propertyId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function blocksForMerchant(merchantId: string): ExternalBlock[] {
  return getState().externalBlocks.filter((block) => block.merchantId === merchantId);
}

// ---------------------------------------------------------------------------
// The simulated feed
// ---------------------------------------------------------------------------

/** Sales channels a feed's events can come from. */
const FEED_SOURCES = [
  "Booking.com reservation",
  "Airbnb reservation",
  "Expedia reservation",
  "Owner block — maintenance",
  "Direct phone booking",
];

interface FeedEvent {
  roomTypeId: string;
  date: string;
  units: number;
  summary: string;
}

/**
 * The events an external calendar would return for a property.
 *
 * Deterministic in the property code, room type and date — the same connection
 * always yields the same calendar, so the availability a demo shows is stable
 * across reloads and machines. Replace this body with a real iCal fetch + parse
 * and nothing above it changes.
 */
function fetchFeed(
  externalRef: string,
  property: PropertyRef,
  fromDate: string,
): FeedEvent[] {
  const events: FeedEvent[] = [];
  const rooms = getRoomTypes(property);
  for (const room of rooms) {
    for (const date of dateRange(fromDate, SYNC_HORIZON_DAYS)) {
      const seed = hashString(`${externalRef}:${room.id}:${date}`);
      // Roughly one night in eight is taken by another channel.
      if (seed % 100 >= 13) continue;
      const units = Math.min(room.totalUnits, 1 + ((seed >>> 5) % 2));
      events.push({
        roomTypeId: room.id,
        date,
        units,
        summary: FEED_SOURCES[(seed >>> 11) % FEED_SOURCES.length],
      });
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export interface SyncOutcome {
  propertyId: string;
  propertyName: string;
  status: ChannelStatus;
  /** Blocks now held for this property after the pull. */
  imported: number;
  /** Blocks the pull dropped because the feed no longer lists them. */
  released: number;
  message: string;
}

/**
 * A property is one place, so it sells a handful of products — not a merchant's
 * whole vertical. The derived fallback below is capped to keep that true.
 */
const MAX_DERIVED_LISTINGS = 3;

/**
 * The catalogue listings a merchant property operates.
 *
 * `MerchantProperty.listingIds` is the explicit link and wins when it is set.
 * Most properties don't have one — the merchant roster and the catalogue were
 * built independently — so the fallback derives the link the same way the rest
 * of the domain does: the merchant's own products, in the property's vertical,
 * preferring the property's own city. Deriving keeps one source of truth;
 * copying listing ids into the merchant record would create a second one to
 * keep in step.
 */
export function listingsForProperty(property: MerchantProperty): CatalogueItem[] {
  if (property.listingIds.length > 0) {
    return property.listingIds
      .map((id) => getCatalogueItem(id))
      .filter((item): item is CatalogueItem => Boolean(item));
  }

  const owned = catalogueForMerchant(property.merchantId);
  const explicit = owned.filter((item) => item.propertyId === property.id);
  if (explicit.length > 0) return explicit;

  const sameVertical = owned.filter((item) => item.vertical === property.vertical);
  const sameCity = sameVertical.filter(
    (item) => item.city.toLowerCase() === property.city.toLowerCase(),
  );
  // Stable ordering, then capped: a sync that claimed a merchant's entire
  // vertical would block inventory the property doesn't actually operate.
  return (sameCity.length > 0 ? sameCity : sameVertical)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, MAX_DERIVED_LISTINGS);
}

function toPropertyRef(item: CatalogueItem): PropertyRef {
  return {
    id: item.id,
    slug: item.slug,
    vertical: item.vertical,
    title: item.title,
    basePrice: item.basePrice,
    image: item.image,
  };
}

function today(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Statuses a pull is allowed to run against. */
const SYNCABLE: readonly ChannelStatus[] = ["connected", "syncing", "synced", "error"];

export function isSyncable(property: MerchantProperty): boolean {
  return (
    SYNCABLE.includes(property.channel.status) &&
    property.channel.scopes.includes("availability")
  );
}

/** Is this property's connection due for another pull? */
export function isSyncDue(property: MerchantProperty, nowMs = Date.now()): boolean {
  if (!isSyncable(property)) return false;
  const last = property.channel.lastSyncAt
    ? new Date(property.channel.lastSyncAt).getTime()
    : 0;
  return nowMs - last >= SYNC_EVERY_MINUTES * 60_000;
}

function writeChannel(
  merchantId: string,
  propertyId: string,
  patch: Partial<MerchantProperty["channel"]>,
): void {
  mutate((draft) => {
    const merchant = draft.merchants.find((m) => m.id === merchantId);
    const property = merchant?.properties.find((p) => p.id === propertyId);
    if (property) Object.assign(property.channel, patch);
  });
}

/**
 * Pull a property's external calendar.
 *
 * The pull is a *replace*, not an append: blocks the feed no longer lists are
 * released, which is how a cancellation on the other channel gives the night
 * back here. That is the behaviour that makes the number in the calendar
 * trustworthy, so it is the behaviour the prototype has.
 */
export function runCalendarSync(
  merchantId: string,
  propertyId: string,
  nowMs = Date.now(),
): SyncOutcome {
  const merchant = getMerchant(merchantId) ?? notFound("Merchant");
  const property =
    merchant.properties.find((p) => p.id === propertyId) ?? notFound("Property");
  const at = new Date(nowMs).toISOString();

  if (!isSyncable(property)) {
    return {
      propertyId,
      propertyName: property.name,
      status: property.channel.status,
      imported: 0,
      released: 0,
      message:
        property.channel.status === "paused"
          ? "Sync is paused for this property."
          : "This property has no availability connection.",
    };
  }

  const existing = blocksForProperty(propertyId);
  const runIndex = property.channel.syncRuns ?? 0;

  // Deterministic failure so the error state and the retry are reachable.
  if (runIndex > 0 && runIndex % FAILURE_EVERY === FAILURE_EVERY - 1) {
    writeChannel(merchantId, propertyId, {
      status: "error",
      lastSyncAt: at,
      syncRuns: runIndex + 1,
      message:
        "The provider's calendar feed timed out. The last successful import is still in force — retry when you're ready.",
    });
    return {
      propertyId,
      propertyName: property.name,
      status: "error",
      imported: existing.length,
      released: 0,
      message: "Feed timed out — the previous import still stands.",
    };
  }

  const refs = listingsForProperty(property).map(toPropertyRef);
  const from = today(nowMs);
  const next: ExternalBlock[] = [];

  for (const ref of refs) {
    for (const event of fetchFeed(property.channel.externalRef ?? property.id, ref, from)) {
      next.push({
        id: nextId("xcb"),
        merchantId,
        propertyId,
        listingId: ref.id,
        roomTypeId: event.roomTypeId,
        date: event.date,
        units: event.units,
        summary: event.summary,
        source: property.channel.provider,
        importedAt: at,
      });
    }
  }

  mutate((draft) => {
    draft.externalBlocks = [
      ...draft.externalBlocks.filter((block) => block.propertyId !== propertyId),
      ...next,
    ];
  });

  const released = Math.max(0, existing.length - next.length);
  writeChannel(merchantId, propertyId, {
    status: "synced",
    lastSyncAt: at,
    syncRuns: runIndex + 1,
    blocksImported: next.length,
    message:
      refs.length === 0
        ? "Connected, but this property has no published listings to sync yet."
        : `${next.length} blocked night${next.length === 1 ? "" : "s"} imported across ${refs.length} listing${refs.length === 1 ? "" : "s"}.`,
  });

  return {
    propertyId,
    propertyName: property.name,
    status: "synced",
    imported: next.length,
    released,
    message: `${next.length} night${next.length === 1 ? "" : "s"} held by other channels.`,
  };
}

/** Release every block a property's connection imported. */
export function clearBlocksForProperty(propertyId: string): number {
  let removed = 0;
  mutate((draft) => {
    const before = draft.externalBlocks.length;
    draft.externalBlocks = draft.externalBlocks.filter(
      (block) => block.propertyId !== propertyId,
    );
    removed = before - draft.externalBlocks.length;
  });
  return removed;
}

/**
 * Sync every connection that is due. Driven by the `calendar:sync` scheduled
 * job, and by the merchant pressing "Sync now".
 */
export function sweepCalendarSync(nowMs = Date.now()): {
  synced: number;
  failed: number;
  blocks: number;
} {
  let synced = 0;
  let failed = 0;
  let blocks = 0;
  for (const merchant of getState().merchants) {
    for (const property of merchant.properties) {
      if (!isSyncDue(property, nowMs)) continue;
      const outcome = runCalendarSync(merchant.id, property.id, nowMs);
      if (outcome.status === "error") failed += 1;
      else {
        synced += 1;
        blocks += outcome.imported;
      }
    }
  }
  return { synced, failed, blocks };
}

// ---------------------------------------------------------------------------
// Export — the feed this platform hands out
// ---------------------------------------------------------------------------

function icsDate(date: string): string {
  return date.replace(/-/g, "");
}

function escapeIcs(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/**
 * The property's own availability as an iCal feed — every night that is sold,
 * held or blocked, so another channel can avoid double-selling it.
 *
 * A real deployment serves this from a signed URL; here it is text the merchant
 * downloads. Same content either way.
 */
export function calendarFeed(merchantId: string, propertyId: string): string {
  const merchant = getMerchant(merchantId) ?? notFound("Merchant");
  const property =
    merchant.properties.find((p) => p.id === propertyId) ?? notFound("Property");
  const state = getState();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Otithee//Availability//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(property.name)} availability`,
  ];

  const listingIds = new Set(listingsForProperty(property).map((item) => item.id));

  // Committed bookings — the nights this platform has sold.
  for (const hold of state.holds) {
    if (hold.status !== "committed" || !listingIds.has(hold.propertyId)) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${hold.id}@otithee`,
      `DTSTART;VALUE=DATE:${icsDate(hold.checkIn)}`,
      `DTEND;VALUE=DATE:${icsDate(hold.checkOut || hold.checkIn)}`,
      `SUMMARY:${escapeIcs(`Otithee booking — ${hold.units} unit${hold.units === 1 ? "" : "s"}`)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  // Stop-sell days the revenue manager set by hand.
  for (const override of state.inventoryOverrides) {
    if (!override.stopSell || !listingIds.has(override.propertyId)) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:stop-${override.roomTypeId}-${override.date}@otithee`,
      `DTSTART;VALUE=DATE:${icsDate(override.date)}`,
      `DTEND;VALUE=DATE:${icsDate(override.date)}`,
      "SUMMARY:Closed for sale",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const calendarSyncService = {
  /** Pull now, from the merchant's "Sync now" button. */
  async sync(
    merchantId: string,
    propertyId: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<SyncOutcome> {
    // The intermediate `syncing` state is written first so the UI can show it —
    // a real pull is not instantaneous and neither is this one.
    writeChannel(merchantId, propertyId, {
      status: "syncing",
      message: "Reading the provider's calendar…",
    });
    const outcome = runCalendarSync(merchantId, propertyId);
    recordAudit({
      actor,
      action: "update",
      entity: "merchant_channel",
      entityId: propertyId,
      entityLabel: outcome.propertyName,
      summary:
        outcome.status === "error"
          ? `Calendar sync failed for ${outcome.propertyName}`
          : `Calendar sync imported ${outcome.imported} blocked night(s) for ${outcome.propertyName}`,
      to: outcome.status,
    });
    return delay(outcome);
  },

  /** Stop importing without forgetting the connection. */
  async pause(
    merchantId: string,
    propertyId: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<ChannelStatus> {
    const released = clearBlocksForProperty(propertyId);
    writeChannel(merchantId, propertyId, {
      status: "paused",
      message: `Sync paused. ${released} imported block${released === 1 ? "" : "s"} released back into availability.`,
    });
    recordAudit({
      actor,
      action: "update",
      entity: "merchant_channel",
      entityId: propertyId,
      entityLabel: propertyId,
      summary: `Calendar sync paused; ${released} block(s) released`,
      to: "paused",
    });
    return delay("paused" as ChannelStatus);
  },

  async resume(
    merchantId: string,
    propertyId: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<SyncOutcome> {
    writeChannel(merchantId, propertyId, { status: "connected", message: undefined });
    return calendarSyncService.sync(merchantId, propertyId, actor);
  },

  /** Everything a merchant needs to render its calendar-sync panel. */
  summary(merchantId: string): {
    property: MerchantProperty;
    blocks: number;
    nights: number;
    due: boolean;
  }[] {
    const merchant: Merchant | undefined = getMerchant(merchantId);
    if (!merchant) return [];
    return merchant.properties.map((property) => {
      const blocks = blocksForProperty(property.id);
      return {
        property,
        blocks: blocks.length,
        nights: new Set(blocks.map((b) => b.date)).size,
        due: isSyncDue(property),
      };
    });
  },

  feed: calendarFeed,
};
