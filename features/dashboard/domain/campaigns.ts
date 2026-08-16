/**
 * CRM segments and marketing campaigns.
 *
 * Two things were missing: a way to describe *who* to talk to, and a way to
 * write to them. Both are built on data that already exists, which is the point
 * — a segment is a query over bookings, loyalty and recovery leads, never a
 * hand-maintained list that drifts out of date.
 *
 *   segments   computed audiences: first-time, repeat, high value, lapsed,
 *              members, abandoned, waitlisted
 *   campaigns  draft → scheduled → sending → sent, with the send going through
 *              the ordinary messaging layer so it respects marketing
 *              preferences and lands in the same delivery log
 *
 * Nothing is broadcast to a real inbox: sends are simulated exactly like every
 * other message, and the campaign report reads the delivery log rather than
 * inventing open rates.
 */

import { send } from "./messaging";
import { SYSTEM_ACTOR, delay, invalid, notFound, recordAudit } from "./service-kit";
import { getState, mutate, nextId } from "./store";
import type { DomainActor } from "./types";

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

export interface SegmentMember {
  email: string;
  name: string;
  bookings: number;
  lifetimeValue: number;
  lastBookingAt?: string;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  description: string;
  /** Evaluated against the live dataset every time. */
  match: (member: SegmentMember, nowMs: number) => boolean;
}

const HIGH_VALUE_THRESHOLD = 2_000;
const LAPSED_DAYS = 180;

export const SEGMENTS: SegmentDefinition[] = [
  {
    id: "all",
    name: "All customers",
    description: "Everyone who has ever booked.",
    match: () => true,
  },
  {
    id: "first_time",
    name: "First-time guests",
    description: "Exactly one booking — the hardest cohort to bring back.",
    match: (m) => m.bookings === 1,
  },
  {
    id: "repeat",
    name: "Repeat guests",
    description: "Two or more bookings.",
    match: (m) => m.bookings >= 2,
  },
  {
    id: "high_value",
    name: "High value",
    description: `Lifetime spend over ${HIGH_VALUE_THRESHOLD.toLocaleString()}.`,
    match: (m) => m.lifetimeValue >= HIGH_VALUE_THRESHOLD,
  },
  {
    id: "lapsed",
    name: "Lapsed",
    description: `No booking in ${LAPSED_DAYS} days.`,
    match: (m, now) =>
      Boolean(m.lastBookingAt) &&
      now - new Date(m.lastBookingAt as string).getTime() > LAPSED_DAYS * 86_400_000,
  },
  {
    id: "members",
    name: "Members",
    description: "Customers on a paid membership tier.",
    match: (m) =>
      getState().memberships.some(
        (s) => s.customerEmail?.toLowerCase() === m.email.toLowerCase() && s.status === "active",
      ),
  },
  {
    id: "abandoned",
    name: "Abandoned checkouts",
    description: "Left a booking unpaid and has not come back.",
    match: (m) =>
      (getState().recoveryLeads ?? []).some(
        (lead) => lead.status === "open" && lead.customerEmail.toLowerCase() === m.email.toLowerCase(),
      ),
  },
  {
    id: "waitlisted",
    name: "Waitlisted",
    description: "Waiting on dates that are still sold out.",
    match: (m) =>
      (getState().waitlist ?? []).some(
        (entry) =>
          entry.status === "waiting" && entry.customerEmail.toLowerCase() === m.email.toLowerCase(),
      ),
  },
];

export function findSegment(id: string): SegmentDefinition | undefined {
  return SEGMENTS.find((s) => s.id === id);
}

/** Roll the booking table up into one row per customer. */
function customerRoster(): SegmentMember[] {
  const byEmail = new Map<string, SegmentMember>();
  for (const booking of getState().bookings) {
    if (booking.status === "failed") continue;
    const key = booking.customer.email.toLowerCase();
    const existing = byEmail.get(key);
    const value = booking.money.netSale;
    if (existing) {
      existing.bookings += 1;
      existing.lifetimeValue = Math.round((existing.lifetimeValue + value) * 100) / 100;
      if (!existing.lastBookingAt || booking.createdAt > existing.lastBookingAt) {
        existing.lastBookingAt = booking.createdAt;
      }
    } else {
      byEmail.set(key, {
        email: booking.customer.email,
        name: booking.customer.name,
        bookings: 1,
        lifetimeValue: Math.round(value * 100) / 100,
        lastBookingAt: booking.createdAt,
      });
    }
  }
  return [...byEmail.values()].sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

/** Who is in a segment right now. */
export function segmentMembers(segmentId: string, nowMs = Date.now()): SegmentMember[] {
  const segment = findSegment(segmentId);
  if (!segment) return [];
  return customerRoster().filter((member) => segment.match(member, nowMs));
}

/** Segment sizes for the CRM overview. */
export function segmentSizes(nowMs = Date.now()) {
  const roster = customerRoster();
  return SEGMENTS.map((segment) => ({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    size: roster.filter((member) => segment.match(member, nowMs)).length,
    value: Math.round(
      roster
        .filter((member) => segment.match(member, nowMs))
        .reduce((sum, m) => sum + m.lifetimeValue, 0) * 100,
    ) / 100,
  }));
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export type MarketingCampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";
export type MarketingCampaignChannel = "email" | "sms" | "push";

export interface MarketingCampaign {
  id: string;
  name: string;
  segmentId: string;
  channel: MarketingCampaignChannel;
  subject: string;
  body: string;
  status: MarketingCampaignStatus;
  createdAt: string;
  createdBy: string;
  scheduledFor?: string;
  sentAt?: string;
  /** Recipients at send time — a campaign's audience is frozen when it goes. */
  recipients: string[];
  /** Message ids produced by the send, so the report reads the delivery log. */
  messageIds: string[];
}

export interface MarketingCampaignInput {
  name: string;
  segmentId: string;
  channel: MarketingCampaignChannel;
  subject: string;
  body: string;
  scheduledFor?: string;
}

function campaigns(): MarketingCampaign[] {
  return getState().marketingCampaigns ?? [];
}

/** Two shipped examples so the screen is never empty on a fresh install. */
export function seedCampaigns(): MarketingCampaign[] {
  const at = "2026-07-02T09:00:00.000Z";
  return [
    {
      id: "cmp_9001",
      name: "Win back lapsed guests",
      segmentId: "lapsed",
      channel: "email",
      subject: "We saved your favourite room, {{name}}",
      body: "It has been a while. Here is 10% off your next stay — the code is WELCOMEBACK and it runs for 30 days.",
      status: "draft",
      createdAt: at,
      createdBy: "Marketing",
      recipients: [],
      messageIds: [],
    },
    {
      id: "cmp_9002",
      name: "Members-only flash sale",
      segmentId: "members",
      channel: "email",
      subject: "48 hours only: member rates in 12 cities",
      body: "Your membership unlocks an extra 8% this weekend. Browse the member rates and book by Sunday.",
      status: "draft",
      createdAt: at,
      createdBy: "Marketing",
      recipients: [],
      messageIds: [],
    },
  ];
}

/** Delivery figures for a campaign, read from the outbox it produced. */
export function campaignReport(campaign: MarketingCampaign) {
  const outbox = getState().outbox.filter((m) => campaign.messageIds.includes(m.id));
  const delivered = outbox.filter((m) => m.status === "delivered" || m.status === "read").length;
  const failed = outbox.filter((m) => m.status === "failed" || m.status === "bounced").length;
  return {
    audience: campaign.recipients.length,
    sent: outbox.length,
    queued: outbox.filter((m) => m.status === "queued").length,
    delivered,
    failed,
    read: outbox.filter((m) => m.status === "read").length,
    deliveryRate: outbox.length ? Math.round((delivered / outbox.length) * 100) : 0,
    /**
     * Suppressed = in the segment but not messaged, because the customer has
     * marketing turned off. Honest number: it is why audience ≠ sent.
     */
    suppressed: Math.max(0, campaign.recipients.length - outbox.length),
  };
}

/** Send one campaign now. Shared by "send now" and the scheduled sweep. */
function dispatchCampaign(campaign: MarketingCampaign, nowMs: number): MarketingCampaign {
  const members = segmentMembers(campaign.segmentId, nowMs);
  const messageIds: string[] = [];

  for (const member of members) {
    const created = send({
      templateKey: "marketing_broadcast",
      channels: [campaign.channel],
      to: { email: member.email, phone: "+10000000000" },
      customerEmail: member.email,
      manual: true,
      nowMs,
      context: {
        subject: campaign.subject.replace(/\{\{name\}\}/g, member.name.split(" ")[0]),
        body: campaign.body.replace(/\{\{name\}\}/g, member.name.split(" ")[0]),
        name: member.name.split(" ")[0],
      },
    });
    messageIds.push(...created.map((m) => m.id));
  }

  return mutate((draft) => {
    const row = draft.marketingCampaigns?.find((c) => c.id === campaign.id);
    if (!row) return campaign;
    row.status = "sent";
    row.sentAt = new Date(nowMs).toISOString();
    row.recipients = members.map((m) => m.email);
    row.messageIds = messageIds;
    return structuredClone(row);
  });
}

/** Synchronous read for React subscribers (the store is the source of truth). */
export function allCampaigns(): MarketingCampaign[] {
  return [...campaigns()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const campaignService = {
  async list(): Promise<MarketingCampaign[]> {
    return delay([...campaigns()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async get(id: string): Promise<MarketingCampaign> {
    return delay(campaigns().find((c) => c.id === id) ?? notFound("Campaign"));
  },

  async create(input: MarketingCampaignInput, actor: DomainActor = SYSTEM_ACTOR): Promise<MarketingCampaign> {
    if (!input.name.trim()) invalid("A campaign needs a name.");
    if (!input.subject.trim()) invalid("A campaign needs a subject line.");
    if (!findSegment(input.segmentId)) invalid("Choose an audience segment.");

    const campaign: MarketingCampaign = {
      id: nextId("cmp"),
      name: input.name.trim(),
      segmentId: input.segmentId,
      channel: input.channel,
      subject: input.subject.trim(),
      body: input.body,
      status: input.scheduledFor ? "scheduled" : "draft",
      createdAt: new Date().toISOString(),
      createdBy: actor.name,
      scheduledFor: input.scheduledFor,
      recipients: [],
      messageIds: [],
    };
    mutate((draft) => {
      draft.marketingCampaigns ??= [];
      draft.marketingCampaigns.unshift(campaign);
    });
    recordAudit({
      actor,
      action: "create",
      entity: "campaign",
      entityId: campaign.id,
      entityLabel: campaign.name,
      summary: `Campaign "${campaign.name}" created for ${findSegment(campaign.segmentId)?.name}.`,
    });
    return delay(structuredClone(campaign));
  },

  async update(
    id: string,
    input: Partial<MarketingCampaignInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<MarketingCampaign> {
    const next = mutate((draft) => {
      const row = draft.marketingCampaigns?.find((c) => c.id === id);
      if (!row) return undefined;
      if (row.status === "sent") invalid("A campaign that has been sent cannot be edited.");
      Object.assign(row, input);
      row.status = input.scheduledFor ? "scheduled" : row.status === "scheduled" ? "draft" : row.status;
      return structuredClone(row);
    });
    if (!next) notFound("Campaign");
    recordAudit({
      actor,
      action: "update",
      entity: "campaign",
      entityId: id,
      entityLabel: next.name,
      summary: `Campaign "${next.name}" updated.`,
    });
    return delay(next);
  },

  /** Send immediately. Returns the campaign with its delivery record attached. */
  async sendNow(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
    nowMs = Date.now(),
  ): Promise<MarketingCampaign> {
    const campaign = campaigns().find((c) => c.id === id) ?? notFound("Campaign");
    if (campaign.status === "sent") invalid("That campaign has already been sent.");
    const sent = dispatchCampaign(campaign, nowMs);
    const report = campaignReport(sent);
    recordAudit({
      actor,
      action: "update",
      entity: "campaign",
      entityId: id,
      entityLabel: sent.name,
      summary: `Campaign "${sent.name}" sent to ${report.sent} of ${report.audience} in ${findSegment(sent.segmentId)?.name} (${report.suppressed} suppressed by preferences).`,
      to: "sent",
    });
    return delay(sent);
  },

  async cancel(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<MarketingCampaign> {
    const next = mutate((draft) => {
      const row = draft.marketingCampaigns?.find((c) => c.id === id);
      if (!row) return undefined;
      if (row.status === "sent") invalid("A sent campaign cannot be cancelled.");
      row.status = "cancelled";
      row.scheduledFor = undefined;
      return structuredClone(row);
    });
    if (!next) notFound("Campaign");
    recordAudit({
      actor,
      action: "cancel",
      entity: "campaign",
      entityId: id,
      entityLabel: next.name,
      summary: `Campaign "${next.name}" cancelled.`,
    });
    return delay(next);
  },

  async remove(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const campaign = campaigns().find((c) => c.id === id);
    mutate((draft) => {
      draft.marketingCampaigns = (draft.marketingCampaigns ?? []).filter((c) => c.id !== id);
    });
    if (campaign) {
      recordAudit({
        actor,
        action: "delete",
        entity: "campaign",
        entityId: id,
        entityLabel: campaign.name,
        summary: `Campaign "${campaign.name}" deleted.`,
      });
    }
  },

  /** Audience preview — who would receive this, before committing to send. */
  preview(segmentId: string): SegmentMember[] {
    return segmentMembers(segmentId).slice(0, 25);
  },

  report: campaignReport,
  segments: segmentSizes,
  members: segmentMembers,
};

/**
 * Send any campaign whose scheduled time has passed. Wired into the scheduler
 * so "schedule for Friday 9am" actually happens.
 */
export function sweepScheduledCampaigns(nowMs = Date.now()) {
  let sent = 0;
  for (const campaign of campaigns()) {
    if (campaign.status !== "scheduled" || !campaign.scheduledFor) continue;
    if (new Date(campaign.scheduledFor).getTime() > nowMs) continue;
    dispatchCampaign(campaign, nowMs);
    sent += 1;
  }
  return {
    affected: sent,
    summary: sent ? `${sent} scheduled campaign(s) sent` : "No campaigns due",
  };
}
