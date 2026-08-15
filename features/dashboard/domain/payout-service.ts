/**
 * The payout API surface.
 *
 * Reads project settlements into payouts; writes go straight back to
 * `settlementService.advance`, so approving a payout here and advancing the
 * settlement on the Settlements screen are literally the same operation. That
 * is what removes the old "which of these two screens is authoritative?"
 * problem.
 */

import type { ListParams, Paginated } from "../data/types";
import { summarizePayouts, toPayout, type Payout, type PayoutStatus, type PayoutSummary } from "./payouts";
import { settlementService } from "./services";
import {
  SCOPE_NONE,
  SYSTEM_ACTOR,
  delay,
  forbidden,
  notFound,
  queryList,
  type DomainScope,
} from "./service-kit";
import { getState } from "./store";
import type { DomainActor } from "./types";

function allPayouts(scope: DomainScope): Payout[] {
  const state = getState();
  const merchants = new Map(state.merchants.map((m) => [m.id, m]));
  return state.settlements
    .filter((s) => !scope.merchantId || s.merchantId === scope.merchantId)
    .map((s) => toPayout(s, merchants.get(s.merchantId)));
}

const PAYOUT_FILTERS: Record<string, (row: Payout, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  merchantId: (row, value) => row.merchantId === value,
  blocked: (row, value) => String(row.blocked) === value,
};

export const payoutService = {
  async list(params: ListParams = {}, scope: DomainScope = SCOPE_NONE): Promise<Paginated<Payout>> {
    return delay(
      queryList(allPayouts(scope), {
        params,
        searchFields: (r) => [r.reference, r.merchantName, r.destination],
        sortValue: (r, field) =>
          field === "scheduledFor" || field === "periodEnd"
            ? new Date(r[field]).getTime()
            : (r as unknown as Record<string, string | number>)[field],
        filterPredicates: PAYOUT_FILTERS,
        defaultSort: (a, b) =>
          new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime(),
      }),
    );
  },

  async get(id: string, scope: DomainScope = SCOPE_NONE): Promise<Payout> {
    return delay(allPayouts(scope).find((p) => p.id === id) ?? notFound("Payout"));
  },

  async summary(scope: DomainScope = SCOPE_NONE): Promise<PayoutSummary> {
    return delay(summarizePayouts(allPayouts(scope)), 120);
  },

  /**
   * Move a payout on. Delegates to the settlement machine, so an illegal move
   * is rejected by the same transition table the settlements screen uses.
   */
  async advance(
    id: string,
    to: PayoutStatus,
    options: { note?: string; actor?: DomainActor } = {},
  ): Promise<Payout> {
    const payout = allPayouts(SCOPE_NONE).find((p) => p.id === id) ?? notFound("Payout");
    // Releasing money to an unverified account is the one move finance must not
    // be able to make by accident.
    if ((to === "scheduled" || to === "processing" || to === "paid") && payout.blocked) {
      forbidden(payout.blockedReason ?? "This merchant has no verified payout account.");
    }
    await settlementService.advance(payout.settlementId, to, {
      note: options.note,
      actor: options.actor ?? SYSTEM_ACTOR,
    });
    return delay(
      allPayouts(SCOPE_NONE).find((p) => p.id === id) ?? notFound("Payout"),
      120,
    );
  },
};
