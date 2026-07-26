import { createStubService } from "../../crud";
import type { Dispute, DisputeSummary } from "./types";
import { DISPUTES_SEED } from "./data";

/** Chargeback / dispute cases (in-memory stub; repository-ready). */
export const disputesService = createStubService<Dispute>({
  seed: DISPUTES_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "bookingRef", "merchant", "customer"],
  idPrefix: "dsp",
});

/** Aggregate KPIs — mirrors a `/finance/disputes/summary` endpoint. */
export function getDisputeSummary(): Promise<DisputeSummary> {
  const needsResponse = DISPUTES_SEED.filter((d) => d.status === "needs_response");
  const underReview = DISPUTES_SEED.filter((d) => d.status === "under_review");
  const atRisk = [...needsResponse, ...underReview].reduce((s, d) => s + d.amount, 0);
  const resolved = DISPUTES_SEED.filter(
    (d) => d.status === "won" || d.status === "lost",
  );
  const won = resolved.filter((d) => d.status === "won").length;
  const summary: DisputeSummary = {
    open: needsResponse.length,
    underReview: underReview.length,
    atRisk: Math.round(atRisk * 100) / 100,
    wonRate: resolved.length === 0 ? 0 : won / resolved.length,
    currency: "USD",
  };
  return new Promise((resolve) => setTimeout(() => resolve(summary), 300));
}

export const disputeKeys = {
  all: ["finance", "disputes"] as const,
  summary: ["finance", "disputes", "summary"] as const,
};
