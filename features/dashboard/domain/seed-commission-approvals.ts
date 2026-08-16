/**
 * Seed data for the commission-approval queue.
 *
 * Kept out of `commission-approvals.ts` so the store can import it without
 * pulling the service (and therefore the store itself) into an import cycle.
 */

import {
  BASIS_LABELS,
  CALC_LABELS,
  SCOPE_LABELS,
  describeRule,
  toRuleInput,
  type CommissionRule,
  type CommissionRuleInput,
} from "./commission-rules";
import type { CommissionChangeRequest } from "./commission-approvals";

function describeInput(input: CommissionRuleInput): string {
  const rule = { ...input, id: "", createdAt: "", updatedAt: "" } as CommissionRule;
  return `${describeRule(rule)} · ${CALC_LABELS[input.calc]} · ${BASIS_LABELS[input.basis]}`;
}

/** Same one-line delta the service writes, for the seeded rows. */
function summarize(proposed: CommissionRuleInput, current: CommissionRuleInput): string {
  const before = describeInput(current);
  const after = describeInput(proposed);
  return before === after ? "No change to the charge" : `${before} → ${after}`;
}

/**
 * Seed a small, realistic queue so the screen shows the workflow rather than an
 * empty state: one waiting on a decision, one already approved, one rejected.
 */
export function seedCommissionChangeRequests(
  rules: CommissionRule[],
): CommissionChangeRequest[] {
  const strip = toRuleInput;

  const iso = (daysAgo: number) =>
    new Date(Date.UTC(2026, 0, 20) - daysAgo * 86_400_000).toISOString();

  const [first, second] = rules;
  const out: CommissionChangeRequest[] = [];

  if (first) {
    const proposed: CommissionRuleInput = {
      ...strip(first),
      percent: Math.max(1, Math.round((first.percent - 2.5) * 10) / 10),
      note: "Matching a competitor's published rate for Q1.",
    };
    out.push({
      id: "ccr_seed_1",
      reference: "CCR-4001",
      type: "update",
      status: "pending",
      ruleId: first.id,
      ruleName: first.name,
      scopeLabel: `${SCOPE_LABELS[first.scope]} · ${first.targetLabel}`,
      proposed,
      current: strip(first),
      summary: summarize(proposed, strip(first)),
      requestedById: "usr_finance_demo",
      requestedByName: "Priya Nair",
      requestedAt: iso(2),
      note: "Sales asked for a Q1 concession to hold volume.",
      history: [
        {
          at: iso(2),
          actorId: "usr_finance_demo",
          actorName: "Priya Nair",
          action: "submitted",
          note: "Sales asked for a Q1 concession to hold volume.",
        },
      ],
    });
  }

  if (second) {
    const proposed: CommissionRuleInput = {
      ...strip(second),
      percent: Math.round((second.percent + 1) * 10) / 10,
    };
    out.push({
      id: "ccr_seed_2",
      reference: "CCR-4002",
      type: "update",
      status: "rejected",
      ruleId: second.id,
      ruleName: second.name,
      scopeLabel: `${SCOPE_LABELS[second.scope]} · ${second.targetLabel}`,
      proposed,
      current: strip(second),
      summary: summarize(proposed, strip(second)),
      requestedById: "usr_admin_demo",
      requestedByName: "Sana Rahman",
      requestedAt: iso(9),
      note: "Cover the higher acquisition cost on this vertical.",
      reviewedById: "usr_super_demo",
      reviewedByName: "AH Nayeem",
      reviewedAt: iso(8),
      decisionNote:
        "Not mid-contract — several merchants have a fixed rate until renewal.",
      history: [
        {
          at: iso(9),
          actorId: "usr_admin_demo",
          actorName: "Sana Rahman",
          action: "submitted",
        },
        {
          at: iso(8),
          actorId: "usr_super_demo",
          actorName: "AH Nayeem",
          action: "rejected",
          note: "Not mid-contract — several merchants have a fixed rate until renewal.",
        },
      ],
    });
  }

  return out;
}
