import { createStubService } from "../../crud";
import type { ReconciliationBatch, ReconciliationSummary } from "./types";
import { RECONCILIATIONS_SEED } from "./data";

/** Settlement reconciliation batches (in-memory stub; repository-ready). */
export const reconciliationsService = createStubService<ReconciliationBatch>({
  seed: RECONCILIATIONS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "gateway", "period"],
  idPrefix: "rec",
});

/** Aggregate KPIs — mirrors a `/finance/reconciliation/summary` endpoint. */
export function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const batches = RECONCILIATIONS_SEED.length;
  const unmatchedItems = RECONCILIATIONS_SEED.reduce((s, b) => s + b.unmatched, 0);
  const totalVariance = RECONCILIATIONS_SEED.reduce((s, b) => s + b.variance, 0);
  const balanced = RECONCILIATIONS_SEED.filter((b) => b.status === "balanced").length;
  const summary: ReconciliationSummary = {
    batches,
    unmatchedItems,
    totalVariance: Math.round(totalVariance * 100) / 100,
    balancedRate: batches === 0 ? 0 : balanced / batches,
    currency: "USD",
  };
  return new Promise((resolve) => setTimeout(() => resolve(summary), 300));
}

export const reconciliationKeys = {
  all: ["finance", "reconciliation"] as const,
  summary: ["finance", "reconciliation", "summary"] as const,
};
