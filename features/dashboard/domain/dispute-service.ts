/**
 * The dispute API surface.
 *
 * Scoped like every other domain service: a merchant sees only disputes raised
 * against their own bookings, and can only make the moves a merchant is allowed
 * to make. The platform decides the outcome.
 */

import type { ListParams, Paginated } from "../data/types";
import {
  canTransitionDispute,
  summarizeDisputes,
  type Dispute,
  type DisputeEvidence,
  type DisputeReason,
  type DisputeStatus,
  type DisputeSummary,
} from "./disputes";
import {
  SCOPE_NONE,
  SYSTEM_ACTOR,
  delay,
  forbidden,
  invalid,
  notFound,
  notify,
  queryList,
  recordAudit,
  type DomainScope,
} from "./service-kit";
import { getState, mutate, nextId, nextReference } from "./store";
import type { DomainActor } from "./types";

function scoped(scope: DomainScope): Dispute[] {
  return getState().disputes.filter(
    (d) => !scope.merchantId || d.merchantId === scope.merchantId,
  );
}

function event(
  status: DisputeStatus,
  label: string,
  actor: DomainActor,
  note?: string,
) {
  return {
    id: nextId("dspe"),
    at: new Date().toISOString(),
    status,
    label,
    actor: actor.name,
    note,
  };
}

const DISPUTE_FILTERS: Record<string, (row: Dispute, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  reason: (row, value) => row.reason === value,
  merchantId: (row, value) => row.merchantId === value,
};

export const disputeService = {
  async list(params: ListParams = {}, scope: DomainScope = SCOPE_NONE): Promise<Paginated<Dispute>> {
    return delay(
      queryList(scoped(scope), {
        params,
        searchFields: (r) => [r.reference, r.bookingRef, r.merchantName, r.customerName],
        sortValue: (r, field) =>
          field === "openedAt" || field === "dueAt"
            ? new Date(r[field]).getTime()
            : (r as unknown as Record<string, string | number>)[field],
        filterPredicates: DISPUTE_FILTERS,
        defaultSort: (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
      }),
    );
  },

  async get(id: string, scope: DomainScope = SCOPE_NONE): Promise<Dispute> {
    const row = scoped(scope).find((d) => d.id === id) ?? notFound("Dispute");
    return delay(structuredClone(row));
  },

  async summary(scope: DomainScope = SCOPE_NONE): Promise<DisputeSummary> {
    return delay(summarizeDisputes(scoped(scope)), 120);
  },

  /** Merchant: answer the claim, optionally with supporting evidence. */
  async respond(
    id: string,
    input: { response: string; evidence?: { label: string; fileName: string }[] },
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Dispute> {
    if (input.response.trim().length < 20) {
      invalid("Write at least 20 characters explaining your side of the case.");
    }
    const current = scoped(scope).find((d) => d.id === id) ?? notFound("Dispute");
    if (!canTransitionDispute(current.status, "merchant_responded", "merchant")) {
      forbidden("This dispute is no longer open for a response.");
    }

    const now = new Date().toISOString();
    const updated = mutate((draft) => {
      const row = draft.disputes.find((d) => d.id === id)!;
      row.merchantResponse = input.response.trim();
      row.respondedAt = now;
      row.status = "merchant_responded";
      for (const item of input.evidence ?? []) {
        const record: DisputeEvidence = {
          id: nextId("dspv"),
          label: item.label,
          fileName: item.fileName,
          addedAt: now,
          addedBy: actor.name,
        };
        row.evidence.push(record);
      }
      row.timeline.push(
        event("merchant_responded", "Merchant responded", actor, input.response.trim()),
      );
      return structuredClone(row);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "dispute",
      entityId: id,
      entityLabel: updated.reference,
      summary: `${updated.merchantName} responded to ${updated.reference}`,
      from: current.status,
      to: "merchant_responded",
    });
    notify({
      category: "support",
      audience: ["admin"],
      title: "Dispute response received",
      body: `${updated.merchantName} responded to ${updated.reference}.`,
      href: "/dashboard/finance/disputes",
      tone: "neutral",
    });
    return delay(updated);
  },

  /** Merchant: concede rather than fight. The refund path is unchanged. */
  async acceptLiability(
    id: string,
    note: string | undefined,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Dispute> {
    const current = scoped(scope).find((d) => d.id === id) ?? notFound("Dispute");
    if (!canTransitionDispute(current.status, "accepted", "merchant")) {
      forbidden("This dispute can no longer be conceded.");
    }
    const updated = mutate((draft) => {
      const row = draft.disputes.find((d) => d.id === id)!;
      row.status = "accepted";
      row.decidedAt = new Date().toISOString();
      row.decisionNote = note;
      row.timeline.push(event("accepted", "Merchant accepted liability", actor, note));
      return structuredClone(row);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "dispute",
      entityId: id,
      entityLabel: updated.reference,
      summary: `${updated.merchantName} accepted liability on ${updated.reference}`,
      from: current.status,
      to: "accepted",
    });
    return delay(updated);
  },

  /**
   * Platform: move the case on. Merchants cannot reach this — the transition
   * table only grants these moves to the platform actor.
   */
  async decide(
    id: string,
    to: DisputeStatus,
    note: string | undefined,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Dispute> {
    const current = getState().disputes.find((d) => d.id === id) ?? notFound("Dispute");
    if (!canTransitionDispute(current.status, to, "platform")) {
      forbidden(`A ${current.status} dispute cannot move to ${to}.`);
    }
    if ((to === "won" || to === "lost") && !note?.trim()) {
      invalid("Record why the case was decided this way.");
    }

    const LABEL: Partial<Record<DisputeStatus, string>> = {
      under_review: "Sent to the issuer for review",
      won: "Won — chargeback reversed",
      lost: "Lost — chargeback stands",
    };
    const updated = mutate((draft) => {
      const row = draft.disputes.find((d) => d.id === id)!;
      row.status = to;
      if (to !== "under_review") {
        row.decidedAt = new Date().toISOString();
        row.decidedBy = actor.name;
        row.decisionNote = note;
      }
      row.timeline.push(event(to, LABEL[to] ?? to, actor, note));
      return structuredClone(row);
    });

    recordAudit({
      actor,
      action: "status_change",
      entity: "dispute",
      entityId: id,
      entityLabel: updated.reference,
      summary: `${updated.reference}: ${LABEL[to] ?? to}`,
      from: current.status,
      to,
    });
    notify({
      category: "support",
      audience: ["merchant"],
      merchantId: updated.merchantId,
      title:
        to === "won"
          ? "Dispute won"
          : to === "lost"
            ? "Dispute lost"
            : "Dispute under review",
      body: `${updated.reference} (${updated.bookingRef}): ${note ?? LABEL[to]}`,
      href: "/dashboard/finance/disputes",
      tone: to === "won" ? "success" : to === "lost" ? "danger" : "neutral",
    });
    return delay(updated);
  },

  /** Raise a dispute against a booking — the admin/finance entry point. */
  async open(
    bookingId: string,
    input: { reason: DisputeReason; claim: string; amount?: number },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Dispute> {
    const booking = getState().bookings.find((b) => b.id === bookingId) ?? notFound("Booking");
    if (!input.claim.trim()) invalid("Record what the cardholder claimed.");

    const now = new Date().toISOString();
    const dispute: Dispute = {
      id: nextId("dsp"),
      reference: nextReference("DSP", 7_100),
      bookingId: booking.id,
      bookingRef: booking.reference,
      merchantId: booking.merchant.id,
      merchantName: booking.merchant.name,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      segment: booking.segment,
      reason: input.reason,
      claim: input.claim.trim(),
      amount: input.amount ?? booking.money.total,
      currency: booking.money.currency,
      status: "needs_response",
      openedAt: now,
      dueAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      evidence: [],
      timeline: [event("needs_response", "Dispute opened", actor, input.claim.trim())],
    };

    mutate((draft) => draft.disputes.unshift(dispute));
    recordAudit({
      actor,
      action: "create",
      entity: "dispute",
      entityId: dispute.id,
      entityLabel: dispute.reference,
      summary: `Dispute opened on ${booking.reference} — ${input.reason}`,
      to: "needs_response",
    });
    notify({
      category: "support",
      audience: ["merchant"],
      merchantId: dispute.merchantId,
      title: "A dispute needs your response",
      body: `${dispute.reference} on booking ${dispute.bookingRef}. Respond within 7 days.`,
      href: "/dashboard/finance/disputes",
      tone: "danger",
    });
    return delay(dispute);
  },
};
