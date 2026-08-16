/**
 * Commission change approvals — a second pair of eyes on the rate book.
 *
 * A commission rule decides what every future booking is charged, and until now
 * a single person could change one with no review. Rate changes are therefore
 * *requested* rather than applied: the request carries the proposed rule, the
 * rule as it stands today, and a plain-language summary of the delta, and only
 * an approval writes it into `commissionRuleStore`.
 *
 * The lifecycle is the standard one — `draft → pending → approved | rejected |
 * cancelled` — with a reviewer, a timestamp, a reason and a full history on every
 * record. Self-approval is allowed (a one-admin demo would otherwise deadlock)
 * but flagged, because "who approved this" is the question the record exists to
 * answer.
 */

import type { ListParams, Paginated } from "../data/types";
import {
  BASIS_LABELS,
  CALC_LABELS,
  SCOPE_LABELS,
  commissionRuleStore,
  describeRule,
  toRuleInput,
  type CommissionRule,
  type CommissionRuleInput,
} from "./commission-rules";
import {
  SYSTEM_ACTOR,
  byNewest,
  delay,
  invalid,
  notFound,
  notify,
  queryList,
  recordAudit,
} from "./service-kit";
import { getState, mutate, nextId, nextReference } from "./store";
import type { DomainActor } from "./types";

export const CHANGE_REQUEST_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const CHANGE_REQUEST_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  draft: "Draft",
  pending: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Withdrawn",
};

export const CHANGE_REQUEST_STATUS_TONES: Record<
  ChangeRequestStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

/** What the request would do to the rate book. */
export type CommissionChangeType = "create" | "update" | "disable" | "delete";

export const CHANGE_TYPE_LABELS: Record<CommissionChangeType, string> = {
  create: "New rule",
  update: "Rate change",
  disable: "Disable rule",
  delete: "Delete rule",
};

/** One entry in a request's history — every state move lands here. */
export interface ChangeRequestEvent {
  at: string;
  actorId: string;
  actorName: string;
  action: "submitted" | "approved" | "rejected" | "cancelled" | "edited";
  note?: string;
}

export interface CommissionChangeRequest {
  id: string;
  reference: string;
  type: CommissionChangeType;
  status: ChangeRequestStatus;
  /** The rule being changed; absent for a brand-new rule. */
  ruleId?: string;
  ruleName: string;
  scopeLabel: string;
  /** What the rule would become. Absent for delete/disable. */
  proposed?: CommissionRuleInput;
  /** What the rule charges today, captured when the request was raised. */
  current?: CommissionRuleInput;
  /** One-line delta, e.g. "12% of net → 9.5% of net". */
  summary: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  /** Why the change is being asked for. */
  note?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  /** Approval note or rejection reason. */
  decisionNote?: string;
  /** True when the approver is the person who raised it. */
  selfApproved?: boolean;
  history: ChangeRequestEvent[];
}

/** Human description of what a rule charges, used on both sides of the diff. */
export function describeInput(input: CommissionRuleInput): string {
  const rule = { ...input, id: "", createdAt: "", updatedAt: "" } as CommissionRule;
  return `${describeRule(rule)} · ${CALC_LABELS[input.calc]} · ${BASIS_LABELS[input.basis]}`;
}

function summarize(
  type: CommissionChangeType,
  proposed?: CommissionRuleInput,
  current?: CommissionRuleInput,
): string {
  if (type === "create" && proposed) return `New rule — ${describeInput(proposed)}`;
  if (type === "disable" && current) return `Disable — currently ${describeInput(current)}`;
  if (type === "delete" && current) return `Delete — currently ${describeInput(current)}`;
  if (proposed && current) {
    const before = describeInput(current);
    const after = describeInput(proposed);
    return before === after ? "No change to the charge" : `${before} → ${after}`;
  }
  return CHANGE_TYPE_LABELS[type];
}

function all(): CommissionChangeRequest[] {
  return getState().commissionChangeRequests;
}

const FILTERS: Record<string, (row: CommissionChangeRequest, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  type: (row, value) => row.type === value,
};

export interface SubmitChangeInput {
  type: CommissionChangeType;
  /** Required for update/disable/delete. */
  ruleId?: string;
  /** Required for create/update. */
  proposed?: CommissionRuleInput;
  note?: string;
  /** Save without submitting for review. */
  asDraft?: boolean;
}

export const commissionApprovalService = {
  async list(params: ListParams = {}): Promise<Paginated<CommissionChangeRequest>> {
    return delay(
      queryList(all(), {
        params,
        searchFields: (r) => [r.reference, r.ruleName, r.scopeLabel, r.requestedByName],
        sortValue: (r, field) =>
          field === "requestedAt"
            ? new Date(r.requestedAt).getTime()
            : (r as unknown as Record<string, string | number>)[field],
        filterPredicates: FILTERS,
        defaultSort: (a, b) =>
          byNewest(
            { createdAt: a.requestedAt },
            { createdAt: b.requestedAt },
          ),
      }),
    );
  },

  async get(id: string): Promise<CommissionChangeRequest> {
    return delay(all().find((r) => r.id === id) ?? notFound("Change request"));
  },

  /** How many are waiting on a decision — drives the sidebar badge. */
  pendingCount(): number {
    return all().filter((r) => r.status === "pending").length;
  },

  /**
   * Raise a change request. Nothing about the live rate book moves here — that
   * only happens on {@link approve}.
   */
  async submit(
    input: SubmitChangeInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<CommissionChangeRequest> {
    if (input.type === "create" && !input.proposed) {
      invalid("A new rule needs its details before it can be submitted.");
    }
    if (input.type !== "create" && !input.ruleId) {
      invalid("This change needs a rule to act on.");
    }

    const existing = input.ruleId ? commissionRuleStore.get(input.ruleId) : undefined;
    if (input.ruleId && !existing) notFound("Commission rule");

    const current = existing ? toRuleInput(existing) : undefined;

    const proposed = input.proposed;
    const name = proposed?.name ?? existing?.name ?? "Commission rule";
    const scope = proposed?.scope ?? existing?.scope;
    const targetLabel = proposed?.targetLabel ?? existing?.targetLabel ?? "";
    const now = new Date().toISOString();
    const status: ChangeRequestStatus = input.asDraft ? "draft" : "pending";

    const request: CommissionChangeRequest = {
      id: nextId("ccr"),
      reference: nextReference("CCR", 4_000),
      type: input.type,
      status,
      ruleId: input.ruleId,
      ruleName: name,
      scopeLabel: scope ? `${SCOPE_LABELS[scope]} · ${targetLabel}` : targetLabel,
      proposed,
      current,
      summary: summarize(input.type, proposed, current),
      requestedById: actor.id,
      requestedByName: actor.name,
      requestedAt: now,
      note: input.note?.trim() || undefined,
      history: [
        {
          at: now,
          actorId: actor.id,
          actorName: actor.name,
          action: input.asDraft ? "edited" : "submitted",
          note: input.note?.trim() || undefined,
        },
      ],
    };

    mutate((draft) => draft.commissionChangeRequests.unshift(request));

    recordAudit({
      actor,
      action: "create",
      entity: "commission_change_request",
      entityId: request.id,
      entityLabel: request.reference,
      summary: `${CHANGE_TYPE_LABELS[request.type]} requested for ${request.ruleName} — ${request.summary}`,
      to: status,
    });

    if (status === "pending") {
      notify({
        category: "commission",
        audience: ["admin"],
        title: "Commission change awaiting approval",
        body: `${actor.name} proposed: ${request.summary} (${request.ruleName}).`,
        href: "/dashboard/finance/commission/approvals",
        tone: "warning",
      });
    }

    return delay(request, 200);
  },

  /** Move a draft into the review queue. */
  async submitDraft(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<CommissionChangeRequest> {
    const request = all().find((r) => r.id === id) ?? notFound("Change request");
    if (request.status !== "draft") invalid("Only a draft can be submitted for review.");

    const now = new Date().toISOString();
    mutate(() => {
      request.status = "pending";
      request.history.push({
        at: now,
        actorId: actor.id,
        actorName: actor.name,
        action: "submitted",
      });
    });

    notify({
      category: "commission",
      audience: ["admin"],
      title: "Commission change awaiting approval",
      body: `${actor.name} submitted ${request.reference} for review.`,
      href: "/dashboard/finance/commission/approvals",
      tone: "warning",
    });

    return delay(request, 160);
  },

  /**
   * Approve a request — and *only here* does the rate book change. The write
   * goes through `commissionRuleStore`, so the pricing engine reads the new rate
   * on the very next quote.
   */
  async approve(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
    note?: string,
  ): Promise<CommissionChangeRequest> {
    const request = all().find((r) => r.id === id) ?? notFound("Change request");
    if (request.status !== "pending") {
      invalid("Only a pending request can be approved.");
    }

    switch (request.type) {
      case "create":
        commissionRuleStore.create(request.proposed!, actor.name);
        break;
      case "update":
        if (!commissionRuleStore.update(request.ruleId!, request.proposed!, actor.name)) {
          invalid("The rule this request targets no longer exists.");
        }
        break;
      case "disable":
        if (
          !commissionRuleStore.update(request.ruleId!, { status: "disabled" }, actor.name)
        ) {
          invalid("The rule this request targets no longer exists.");
        }
        break;
      case "delete":
        if (!commissionRuleStore.remove(request.ruleId!)) {
          invalid("The rule this request targets no longer exists.");
        }
        break;
    }

    const now = new Date().toISOString();
    mutate(() => {
      request.status = "approved";
      request.reviewedById = actor.id;
      request.reviewedByName = actor.name;
      request.reviewedAt = now;
      request.decisionNote = note?.trim() || undefined;
      request.selfApproved = actor.id === request.requestedById;
      request.history.push({
        at: now,
        actorId: actor.id,
        actorName: actor.name,
        action: "approved",
        note: note?.trim() || undefined,
      });
    });

    recordAudit({
      actor,
      action: "approve",
      entity: "commission_change_request",
      entityId: request.id,
      entityLabel: request.reference,
      summary: request.selfApproved
        ? `Self-approved ${request.summary} on ${request.ruleName}`
        : `Approved ${request.summary} on ${request.ruleName}`,
      from: "pending",
      to: "approved",
    });

    notify({
      category: "commission",
      audience: ["admin"],
      title: "Commission change applied",
      body: `${request.reference}: ${request.summary}.`,
      href: "/dashboard/finance/commission/rules",
      tone: "success",
    });

    return delay(request, 200);
  },

  /** Reject a request. A reason is mandatory — a bare "no" helps nobody. */
  async reject(
    id: string,
    reason: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<CommissionChangeRequest> {
    const request = all().find((r) => r.id === id) ?? notFound("Change request");
    if (request.status !== "pending") invalid("Only a pending request can be rejected.");
    if (reason.trim().length < 4) invalid("Give a reason the requester can act on.");

    const now = new Date().toISOString();
    mutate(() => {
      request.status = "rejected";
      request.reviewedById = actor.id;
      request.reviewedByName = actor.name;
      request.reviewedAt = now;
      request.decisionNote = reason.trim();
      request.history.push({
        at: now,
        actorId: actor.id,
        actorName: actor.name,
        action: "rejected",
        note: reason.trim(),
      });
    });

    recordAudit({
      actor,
      action: "reject",
      entity: "commission_change_request",
      entityId: request.id,
      entityLabel: request.reference,
      summary: `Rejected ${request.summary} on ${request.ruleName} — ${reason.trim()}`,
      from: "pending",
      to: "rejected",
    });

    return delay(request, 200);
  },

  /** The requester withdraws their own request. */
  async cancel(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
    note?: string,
  ): Promise<CommissionChangeRequest> {
    const request = all().find((r) => r.id === id) ?? notFound("Change request");
    if (request.status !== "pending" && request.status !== "draft") {
      invalid("Only a draft or pending request can be withdrawn.");
    }

    const now = new Date().toISOString();
    mutate(() => {
      request.status = "cancelled";
      request.decisionNote = note?.trim() || undefined;
      request.history.push({
        at: now,
        actorId: actor.id,
        actorName: actor.name,
        action: "cancelled",
        note: note?.trim() || undefined,
      });
    });

    recordAudit({
      actor,
      action: "cancel",
      entity: "commission_change_request",
      entityId: request.id,
      entityLabel: request.reference,
      summary: `Withdrew ${request.summary} on ${request.ruleName}`,
      to: "cancelled",
    });

    return delay(request, 160);
  },
};
