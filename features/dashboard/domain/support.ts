/**
 * Support — one ticket store shared by the customer help centre and the admin
 * inbox.
 *
 * There is deliberately no second "customer messages" model: a reply an agent
 * writes in `/dashboard/support` lands in the same `messages` array the
 * traveller reads at `/account/messages`, and vice versa. Internal notes live on
 * the ticket too but are filtered out of anything customer-facing by
 * {@link customerThread}.
 */

import { getState, mutate, nextId, nextReference } from "./store";
import type { DomainActor } from "./types";

export const TICKET_STATUS_VALUES = [
  "open",
  "pending_customer",
  "pending_agent",
  "resolved",
  "closed",
] as const;
export type SupportTicketStatus = (typeof TICKET_STATUS_VALUES)[number];

export const TICKET_PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
export type SupportTicketPriority = (typeof TICKET_PRIORITY_VALUES)[number];

export const TICKET_CATEGORY_VALUES = [
  "booking",
  "payment",
  "refund",
  "cancellation",
  "property",
  "account",
  "other",
] as const;
export type SupportTicketCategory = (typeof TICKET_CATEGORY_VALUES)[number];

export const TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  booking: "Booking help",
  payment: "Payment issue",
  refund: "Refund",
  cancellation: "Cancellation or change",
  property: "Problem at the property",
  account: "My account",
  other: "Something else",
};

/** Response-time targets, in hours, by priority. */
export const SLA_HOURS: Record<SupportTicketPriority, number> = {
  urgent: 2,
  high: 6,
  medium: 24,
  low: 48,
};

export interface TicketAttachment {
  id: string;
  name: string;
  /** Bytes — a plausible size for the demo; no file is ever uploaded. */
  size: number;
  kind: "image" | "document";
}

export interface TicketMessage {
  id: string;
  from: "customer" | "agent" | "system";
  authorName: string;
  body: string;
  at: string;
  /** Internal notes are never returned by {@link customerThread}. */
  internal: boolean;
  attachments: TicketAttachment[];
}

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  requesterName: string;
  requesterEmail: string;
  /** Linked booking, when the ticket was raised from one. */
  bookingId?: string;
  bookingRef?: string;
  /** Merchant the ticket concerns — drives merchant scoping. */
  merchantId?: string;
  merchantName?: string;
  assigneeId?: string;
  assigneeName?: string;
  channel: "web" | "email" | "phone" | "whatsapp";
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  /** When a first response is due, from {@link SLA_HOURS}. */
  slaDueAt: string;
  messages: TicketMessage[];
  satisfaction?: { rating: number; comment?: string; at: string };
}

export type SlaState = "on_track" | "due_soon" | "breached" | "met";

export interface SlaStatus {
  state: SlaState;
  /** Hours remaining (negative once breached). */
  hoursLeft: number;
  label: string;
}

export function slaStatus(ticket: SupportTicket, nowMs = Date.now()): SlaStatus {
  if (ticket.firstResponseAt) {
    const met = new Date(ticket.firstResponseAt).getTime() <= new Date(ticket.slaDueAt).getTime();
    return {
      state: met ? "met" : "breached",
      hoursLeft: 0,
      label: met ? "Responded in SLA" : "First response late",
    };
  }
  const hoursLeft = (new Date(ticket.slaDueAt).getTime() - nowMs) / 3_600_000;
  if (hoursLeft < 0) {
    return { state: "breached", hoursLeft, label: `${Math.abs(Math.round(hoursLeft))}h overdue` };
  }
  if (hoursLeft < 2) {
    return { state: "due_soon", hoursLeft, label: `Due in ${Math.max(1, Math.round(hoursLeft))}h` };
  }
  return { state: "on_track", hoursLeft, label: `Due in ${Math.round(hoursLeft)}h` };
}

/** Prewritten agent replies — the "canned response" library. */
export const CANNED_RESPONSES: { id: string; label: string; body: string }[] = [
  {
    id: "ack",
    label: "Acknowledge",
    body: "Thanks for getting in touch — I've picked this up and I'm looking into it now. I'll come back to you within the hour with an update.",
  },
  {
    id: "refund_timeline",
    label: "Refund timeline",
    body: "Your refund has been approved and sent back to the original payment method. Banks typically take 5–10 working days to post it. You'll see the reference on the refund record in your account.",
  },
  {
    id: "date_change",
    label: "Date change",
    body: "I can move your booking to new dates. The property has availability, and the difference in rate will be shown before anything is confirmed. Just reply with your preferred dates.",
  },
  {
    id: "escalate",
    label: "Escalating to the property",
    body: "I've raised this directly with the property's duty manager and asked for a response today. I'll update you as soon as I hear back.",
  },
  {
    id: "resolve",
    label: "Resolve",
    body: "I'm glad that's sorted. I'll close this ticket now, but reply any time and it'll reopen straight away.",
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface CreateTicketInput {
  subject: string;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  body: string;
  requesterName: string;
  requesterEmail: string;
  bookingId?: string;
  bookingRef?: string;
  merchantId?: string;
  merchantName?: string;
  attachments?: TicketAttachment[];
  channel?: SupportTicket["channel"];
}

function touch(ticket: SupportTicket, at: string): void {
  ticket.updatedAt = at;
}

export const supportService = {
  /** Every ticket, newest activity first. Optionally scoped to one merchant. */
  all(scope: { merchantId?: string } = {}): SupportTicket[] {
    return getState()
      .tickets.filter((t) => !scope.merchantId || t.merchantId === scope.merchantId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  forCustomer(email: string): SupportTicket[] {
    const key = email.toLowerCase();
    return getState()
      .tickets.filter((t) => t.requesterEmail.toLowerCase() === key)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): SupportTicket | undefined {
    return getState().tickets.find((t) => t.id === id);
  },

  /** The messages a customer may see — internal notes stripped. */
  customerThread(ticket: SupportTicket): TicketMessage[] {
    return ticket.messages.filter((m) => !m.internal);
  },

  unreadForCustomer(email: string): number {
    return supportService
      .forCustomer(email)
      .filter((t) => {
        const last = supportService.customerThread(t).at(-1);
        return last?.from === "agent" && t.status !== "closed";
      }).length;
  },

  create(input: CreateTicketInput, at = new Date().toISOString()): SupportTicket {
    const priority = input.priority ?? "medium";
    const ticket: SupportTicket = {
      id: nextId("tkt"),
      reference: nextReference("TKT", 5_200),
      subject: input.subject,
      category: input.category,
      priority,
      status: "open",
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      bookingId: input.bookingId,
      bookingRef: input.bookingRef,
      merchantId: input.merchantId,
      merchantName: input.merchantName,
      channel: input.channel ?? "web",
      createdAt: at,
      updatedAt: at,
      slaDueAt: new Date(new Date(at).getTime() + SLA_HOURS[priority] * 3_600_000).toISOString(),
      messages: [
        {
          id: nextId("tmg"),
          from: "customer",
          authorName: input.requesterName,
          body: input.body,
          at,
          internal: false,
          attachments: input.attachments ?? [],
        },
      ],
    };
    mutate((draft) => draft.tickets.unshift(ticket));
    return structuredClone(ticket);
  },

  /** Add a message. `from: "agent"` stamps the first-response SLA clock. */
  reply(
    id: string,
    input: {
      from: "customer" | "agent" | "system";
      authorName: string;
      body: string;
      internal?: boolean;
      attachments?: TicketAttachment[];
    },
    at = new Date().toISOString(),
  ): SupportTicket | undefined {
    let result: SupportTicket | undefined;
    mutate((draft) => {
      const ticket = draft.tickets.find((t) => t.id === id);
      if (!ticket) return;
      const internal = input.internal ?? false;
      ticket.messages.push({
        id: nextId("tmg"),
        from: input.from,
        authorName: input.authorName,
        body: input.body,
        at,
        internal,
        attachments: input.attachments ?? [],
      });
      if (!internal) {
        if (input.from === "agent") {
          ticket.firstResponseAt ??= at;
          if (ticket.status === "open" || ticket.status === "pending_agent") {
            ticket.status = "pending_customer";
          }
        } else if (input.from === "customer") {
          // A customer reply always reopens the ticket for the agent.
          ticket.status = ticket.status === "closed" ? "open" : "pending_agent";
          ticket.resolvedAt = undefined;
        }
      }
      touch(ticket, at);
      result = structuredClone(ticket);
    });
    return result;
  },

  assign(id: string, actor: Pick<DomainActor, "id" | "name">, at = new Date().toISOString()) {
    let result: SupportTicket | undefined;
    mutate((draft) => {
      const ticket = draft.tickets.find((t) => t.id === id);
      if (!ticket) return;
      ticket.assigneeId = actor.id;
      ticket.assigneeName = actor.name;
      touch(ticket, at);
      result = structuredClone(ticket);
    });
    return result;
  },

  setStatus(id: string, status: SupportTicketStatus, at = new Date().toISOString()) {
    let result: SupportTicket | undefined;
    mutate((draft) => {
      const ticket = draft.tickets.find((t) => t.id === id);
      if (!ticket) return;
      ticket.status = status;
      if (status === "resolved" || status === "closed") ticket.resolvedAt = at;
      else ticket.resolvedAt = undefined;
      touch(ticket, at);
      result = structuredClone(ticket);
    });
    return result;
  },

  setPriority(id: string, priority: SupportTicketPriority, at = new Date().toISOString()) {
    let result: SupportTicket | undefined;
    mutate((draft) => {
      const ticket = draft.tickets.find((t) => t.id === id);
      if (!ticket) return;
      ticket.priority = priority;
      if (!ticket.firstResponseAt) {
        ticket.slaDueAt = new Date(
          new Date(ticket.createdAt).getTime() + SLA_HOURS[priority] * 3_600_000,
        ).toISOString();
      }
      touch(ticket, at);
      result = structuredClone(ticket);
    });
    return result;
  },

  rate(id: string, rating: number, comment?: string, at = new Date().toISOString()) {
    mutate((draft) => {
      const ticket = draft.tickets.find((t) => t.id === id);
      if (ticket) ticket.satisfaction = { rating, comment, at };
    });
  },

  /** Inbox counters for the dashboard header. */
  counts(scope: { merchantId?: string } = {}, nowMs = Date.now()) {
    const rows = supportService.all(scope);
    return {
      total: rows.length,
      open: rows.filter((t) => t.status === "open" || t.status === "pending_agent").length,
      unassigned: rows.filter((t) => !t.assigneeId && t.status !== "closed").length,
      breached: rows.filter((t) => slaStatus(t, nowMs).state === "breached").length,
      urgent: rows.filter((t) => t.priority === "urgent" && t.status !== "closed").length,
    };
  },
};
