/**
 * Abandoned-checkout recovery.
 *
 * A traveller who reached the payment step already told us what they want: the
 * hold records the property, the dates and the price. When they leave without
 * paying, that intent is the highest-quality lead the platform has — and until
 * now it expired silently.
 *
 * The `abandoned:recover` job sweeps holds that lapsed without becoming a
 * booking and, once per hold:
 *
 *   • records a {@link RecoveryLead} with the deep link back to the same dates
 *   • sends the traveller a nudge through the messaging layer
 *   • raises an admin notification so Marketing can see the size of the leak
 *
 * A lead is closed automatically when a booking for the same room type and
 * dates appears, so the recovery rate on the Marketing screen is real.
 */

import { getState, mutate, nextId } from "./store";
import { notify } from "./service-kit";
import { send } from "./messaging";
import type { JobOutcome } from "./scheduler";

export type RecoveryStatus = "open" | "recovered" | "expired";

export interface RecoveryLead {
  id: string;
  holdId: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  propertyId: string;
  roomTypeId: string;
  listingSlug?: string;
  listingTitle: string;
  vertical: string;
  checkIn: string;
  checkOut: string;
  units: number;
  /** What the abandoned basket was worth. */
  value: number;
  currency: string;
  /** Back to the same dates, same room, same rate. */
  resumeHref: string;
  status: RecoveryStatus;
  nudgedAt?: string;
  recoveredAt?: string;
  recoveredBookingId?: string;
}

/** How long a lead stays worth chasing. */
const LEAD_TTL_DAYS = 14;

function leads(): RecoveryLead[] {
  return getState().recoveryLeads ?? [];
}

/**
 * Turn one lapsed hold into a lead. Exported so the checkout can raise a lead
 * the moment a traveller abandons, rather than waiting for the sweep.
 */
export function recordAbandonment(holdId: string, nowMs = Date.now()): RecoveryLead | undefined {
  const state = getState();
  const hold = state.holds.find((h) => h.id === holdId);
  if (!hold) return undefined;
  if (hold.bookingId) return undefined;
  if (leads().some((lead) => lead.holdId === holdId)) return undefined;

  // The hold knows the room; the booking that never happened knows the rest, so
  // fall back to the room type's own labels.
  const booking = state.bookings.find((b) => b.holdId === holdId);
  const customerEmail = booking?.customer.email ?? state.holds.find((h) => h.id === holdId)?.customerEmail;
  if (!customerEmail) return undefined;

  const lead: RecoveryLead = {
    id: nextId("rec"),
    holdId,
    createdAt: new Date(nowMs).toISOString(),
    customerEmail,
    customerName: booking?.customer.name ?? hold.customerName ?? "there",
    propertyId: hold.propertyId,
    roomTypeId: hold.roomTypeId,
    listingSlug: hold.listingSlug,
    listingTitle: hold.listingTitle ?? "your stay",
    vertical: hold.vertical ?? "hotels",
    checkIn: hold.checkIn,
    checkOut: hold.checkOut,
    units: hold.units,
    value: hold.lockedTotal,
    currency: hold.currency,
    resumeHref: hold.listingSlug
      ? `/checkout?v=${hold.vertical ?? "hotels"}&slug=${hold.listingSlug}&in=${hold.checkIn}&out=${hold.checkOut}&units=${hold.units}&room=${hold.roomTypeId}&rate=${hold.ratePlanId}`
      : "/hotels",
    status: "open",
  };

  mutate((draft) => {
    draft.recoveryLeads ??= [];
    draft.recoveryLeads.unshift(lead);
  });
  return lead;
}

/** Nudge a lead once. Safe to call again — it won't send twice. */
export function nudgeLead(leadId: string, nowMs = Date.now()): boolean {
  const lead = leads().find((l) => l.id === leadId);
  if (!lead || lead.status !== "open" || lead.nudgedAt) return false;

  send({
    templateKey: "abandoned_checkout",
    to: { email: lead.customerEmail },
    customerEmail: lead.customerEmail,
    href: lead.resumeHref,
    nowMs,
    context: {
      name: lead.customerName,
      product: lead.listingTitle,
      dates: `${lead.checkIn} → ${lead.checkOut}`,
      total: `${lead.currency} ${lead.value.toFixed(2)}`,
    },
  });

  mutate((draft) => {
    const row = draft.recoveryLeads?.find((l) => l.id === leadId);
    if (row) row.nudgedAt = new Date(nowMs).toISOString();
  });
  return true;
}

/** Close a lead because the traveller came back and booked. */
export function markRecovered(leadId: string, bookingId: string, nowMs = Date.now()): void {
  mutate((draft) => {
    const lead = draft.recoveryLeads?.find((l) => l.id === leadId);
    if (!lead || lead.status !== "open") return;
    lead.status = "recovered";
    lead.recoveredAt = new Date(nowMs).toISOString();
    lead.recoveredBookingId = bookingId;
  });
}

/**
 * The job body: create leads for newly-lapsed holds, nudge the ones that are
 * still open, close any the traveller has since fulfilled and expire the rest.
 */
export function sweepAbandonedCheckouts(nowMs = Date.now()): JobOutcome {
  const state = getState();
  let created = 0;
  let nudged = 0;
  let recovered = 0;
  let expired = 0;

  // 1. New leads from holds that expired or were abandoned without a booking.
  for (const hold of state.holds) {
    if (hold.bookingId) continue;
    if (hold.status !== "expired" && hold.status !== "released") continue;
    if (recordAbandonment(hold.id, nowMs)) created += 1;
  }

  // 2. Close leads the traveller fulfilled anyway (same room, same dates).
  for (const lead of leads()) {
    if (lead.status !== "open") continue;
    const booking = state.bookings.find(
      (b) =>
        b.customer.email.toLowerCase() === lead.customerEmail.toLowerCase() &&
        b.stay?.roomTypeId === lead.roomTypeId &&
        b.startAt.slice(0, 10) === lead.checkIn &&
        ["confirmed", "checked_in", "completed"].includes(b.status),
    );
    if (booking) {
      markRecovered(lead.id, booking.id, nowMs);
      recovered += 1;
    }
  }

  // 3. Nudge, then expire.
  for (const lead of leads()) {
    if (lead.status !== "open") continue;
    const ageDays = (nowMs - new Date(lead.createdAt).getTime()) / 86_400_000;
    if (ageDays > LEAD_TTL_DAYS) {
      mutate((draft) => {
        const row = draft.recoveryLeads?.find((l) => l.id === lead.id);
        if (row) row.status = "expired";
      });
      expired += 1;
      continue;
    }
    if (nudgeLead(lead.id, nowMs)) nudged += 1;
  }

  if (created > 0) {
    notify({
      category: "booking",
      audience: ["admin"],
      tone: "warning",
      title: `${created} abandoned checkout${created === 1 ? "" : "s"}`,
      body: "Recovery emails have gone out with a link back to the same dates.",
      href: "/dashboard/promotions/recovery",
    });
  }

  const affected = created + nudged + recovered + expired;
  return {
    affected,
    summary: affected
      ? `${created} new, ${nudged} nudged, ${recovered} recovered, ${expired} expired`
      : "No abandoned checkouts",
  };
}

/** Recovery performance — the Marketing screen's header. */
export function recoveryStats() {
  const rows = leads();
  const recovered = rows.filter((l) => l.status === "recovered");
  return {
    total: rows.length,
    open: rows.filter((l) => l.status === "open").length,
    recovered: recovered.length,
    expired: rows.filter((l) => l.status === "expired").length,
    /** Value still sitting in abandoned baskets. */
    openValue: rows
      .filter((l) => l.status === "open")
      .reduce((sum, l) => sum + l.value, 0),
    recoveredValue: recovered.reduce((sum, l) => sum + l.value, 0),
    rate: rows.length ? Math.round((recovered.length / rows.length) * 100) : 0,
  };
}

export const recoveryService = {
  list(): RecoveryLead[] {
    return [...leads()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  stats: recoveryStats,
  nudge: nudgeLead,
  sweep: sweepAbandonedCheckouts,
};
