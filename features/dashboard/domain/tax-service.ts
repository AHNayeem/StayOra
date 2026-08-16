/**
 * The tax rule book as a service.
 *
 * `tax.ts` holds the rules and the engine and deliberately imports nothing that
 * touches the domain store (see the note at the top of that file). This layer
 * sits above both: it adds the {@link ResourceService} contract the dashboard's
 * list and mutation hooks already speak, simulated latency, validation and the
 * audit trail every other configuration change in the platform writes.
 */

import { ApiError } from "../data/errors";
import type { ID, ListParams, Paginated } from "../data/types";
import type { ResourceService } from "../crud/types";
import { SYSTEM_ACTOR, delay, queryList, recordAudit } from "./service-kit";
import {
  TAX_BASIS_LABELS,
  assessTax,
  commitTaxRules,
  isPercentageBasis,
  jurisdictionLabel,
  nextTaxRuleId,
  taxRules,
  type TaxAssessment,
  type TaxContext,
  type TaxRule,
  type TaxRuleInput,
  type TaxStatus,
} from "./tax";
import type { DomainActor } from "./types";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function requireRule(id: ID): TaxRule {
  const rule = taxRules().find((row) => row.id === id);
  if (!rule) {
    throw new ApiError({
      kind: "not-found",
      message: "That tax rule no longer exists.",
    });
  }
  return rule;
}

function normalize(input: Partial<TaxRuleInput>): Partial<TaxRule> {
  const patch: Partial<TaxRule> = { ...input };
  if (input.rate !== undefined) patch.rate = Math.max(0, Math.min(100, input.rate));
  if (input.amount !== undefined) patch.amount = round(Math.max(0, input.amount));
  if (input.priority !== undefined) patch.priority = Math.max(0, Math.round(input.priority));
  if (input.effectiveFrom !== undefined) patch.effectiveFrom = input.effectiveFrom || undefined;
  if (input.effectiveTo !== undefined) patch.effectiveTo = input.effectiveTo || undefined;
  return patch;
}

/** One line of audit prose: what this rule charges, and where. */
function describe(rule: TaxRule): string {
  const charge = isPercentageBasis(rule.basis)
    ? `${rule.rate}% ${TAX_BASIS_LABELS[rule.basis].replace("% of ", "of ")}`
    : `${rule.amount.toFixed(2)} ${TAX_BASIS_LABELS[rule.basis].toLowerCase()}`;
  return `${charge} in ${jurisdictionLabel(rule.region)}`;
}

function validate(input: Partial<TaxRuleInput>, merged: TaxRule): void {
  const percentage = isPercentageBasis(merged.basis);
  if (percentage && merged.rate <= 0) {
    throw new ApiError({
      kind: "validation",
      message: "A percentage rule needs a rate above zero.",
    });
  }
  if (!percentage && merged.amount <= 0) {
    throw new ApiError({
      kind: "validation",
      message: "A fixed rule needs an amount above zero.",
    });
  }
  if (
    merged.effectiveFrom &&
    merged.effectiveTo &&
    merged.effectiveTo < merged.effectiveFrom
  ) {
    throw new ApiError({
      kind: "validation",
      message: "The end date can't be before the start date.",
    });
  }
  void input;
}

async function updateRule(
  id: ID,
  input: Partial<TaxRuleInput>,
  actor: DomainActor = SYSTEM_ACTOR,
): Promise<TaxRule> {
  const before = requireRule(id);
  const next: TaxRule = {
    ...before,
    ...normalize(input),
    updatedAt: new Date().toISOString(),
  };
  validate(input, next);
  commitTaxRules(taxRules().map((row) => (row.id === id ? next : row)));
  recordAudit({
    actor,
    action: "update",
    entity: "TaxRule",
    entityId: id,
    entityLabel: next.name,
    summary: `Tax rule updated — ${describe(next)}.`,
    from: describe(before),
    to: describe(next),
  });
  return delay({ ...next });
}

/**
 * The admin rule book. Same contract as every other dashboard data source, so
 * the tax screens are unchanged — they just write to the book the money engine
 * reads, which is the whole point.
 */
export const taxRuleService: ResourceService<TaxRule, TaxRuleInput, Partial<TaxRuleInput>> & {
  /** What a context would be charged — powers the "what this changes" preview. */
  preview: (context: TaxContext) => TaxAssessment;
  setStatus: (id: ID, status: TaxStatus, actor?: DomainActor) => Promise<TaxRule>;
} = {
  async list(params: ListParams = {}): Promise<Paginated<TaxRule>> {
    return delay(
      queryList(taxRules(), {
        params,
        searchFields: (rule) => [rule.name, jurisdictionLabel(rule.region), rule.category],
        sortValue: (rule, field) =>
          field === "rate"
            ? isPercentageBasis(rule.basis)
              ? rule.rate
              : rule.amount
            : (rule[field as keyof TaxRule] as string | number | undefined),
        defaultSort: (a, b) => a.priority - b.priority || a.name.localeCompare(b.name),
      }),
    );
  },

  async get(id: ID): Promise<TaxRule> {
    return delay({ ...requireRule(id) });
  },

  async create(input: TaxRuleInput, actor: DomainActor = SYSTEM_ACTOR): Promise<TaxRule> {
    const rule: TaxRule = {
      id: nextTaxRuleId(),
      name: input.name,
      region: input.region,
      category: input.category,
      basis: input.basis,
      rate: 0,
      amount: 0,
      type: input.type,
      priority: 10,
      status: input.status,
      updatedAt: new Date().toISOString(),
      ...normalize(input),
    };
    validate(input, rule);
    commitTaxRules([rule, ...taxRules()]);
    recordAudit({
      actor,
      action: "create",
      entity: "TaxRule",
      entityId: rule.id,
      entityLabel: rule.name,
      summary: `Tax rule created — ${describe(rule)}.`,
    });
    return delay({ ...rule });
  },

  update: updateRule,

  async remove(id: ID, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const rule = requireRule(id);
    commitTaxRules(taxRules().filter((row) => row.id !== id));
    recordAudit({
      actor,
      action: "delete",
      entity: "TaxRule",
      entityId: id,
      entityLabel: rule.name,
      summary: `Tax rule removed — ${describe(rule)}.`,
    });
    await delay(null);
  },

  peek(): TaxRule[] {
    return taxRules().map((rule) => ({ ...rule }));
  },

  preview(context: TaxContext): TaxAssessment {
    return assessTax(context);
  },

  setStatus(id: ID, status: TaxStatus, actor: DomainActor = SYSTEM_ACTOR) {
    return updateRule(id, { status }, actor);
  },
};
