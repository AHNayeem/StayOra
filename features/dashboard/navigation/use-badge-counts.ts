"use client";

import { useQuery } from "../data";
import { bookingService, refundService } from "../domain/services";
import { allCatalogueItems, catalogueForMerchant } from "../domain/catalogue-service";
import { getState } from "../domain/store";
import { useDomainScope } from "../domain/use-domain";

/**
 * Live counters for the sidebar badges.
 *
 * The menu config declares a `countKey` per item (data, not code); this hook
 * resolves those keys against the domain so the badge next to "Bookings" is the
 * real number of bookings needing action for *this* user's scope — not a hardcoded
 * label. A backend swap only changes the queries below.
 */
export function useBadgeCounts(): Record<string, number> {
  const scope = useDomainScope();

  const query = useQuery({
    queryKey: ["menu", "badges", scope.merchantId ?? scope.organizationId ?? "all"],
    queryFn: async () => {
      const [counts, refunds] = await Promise.all([
        bookingService.counts(scope),
        refundService.summary(scope),
      ]);
      const state = getState();
      // Merchants and catalogue items are only "awaiting review" for the
      // platform; a merchant's own sidebar should not badge their own queue.
      const platformScope = !scope.merchantId;
      const merchantsAwaiting = platformScope
        ? state.merchants.filter(
            (m) => m.status === "submitted" || m.status === "under_review",
          ).length
        : 0;
      const catalogueAwaiting = platformScope
        ? allCatalogueItems().filter(
            (c) => c.status === "submitted" || c.status === "under_review",
          ).length
        : catalogueForMerchant(scope.merchantId!).filter(
            (c) => c.status === "action_required" || c.status === "rejected",
          ).length;

      return {
        "bookings.pending":
          counts.pending + counts.failed + counts.cancellationRequested,
        "flights.pendingRefunds": counts.refundPending,
        "finance.refundsAwaiting": refunds.requested,
        "merchants.pendingApproval": merchantsAwaiting,
        "catalog.awaitingReview": catalogueAwaiting,
        "b2b.pendingAccounts": state.b2bAccounts.filter((a) => a.status === "pending")
          .length,
        // Rate changes waiting on a decision — platform-side only.
        "finance.commissionApprovals": platformScope
          ? state.commissionChangeRequests.filter((r) => r.status === "pending").length
          : 0,
        // Supplier requests, waitlist demand and open recovery leads — each of
        // these is work someone has to do, so each gets a badge.
        "bookings.awaitingSupplier": (state.supplierConfirmations ?? []).filter(
          (c) =>
            c.status === "pending" &&
            (!scope.merchantId || c.merchantId === scope.merchantId),
        ).length,
        "catalog.waitlist": (state.waitlist ?? []).filter((w) => w.status === "waiting")
          .length,
        "promotions.recovery": platformScope
          ? (state.recoveryLeads ?? []).filter((l) => l.status === "open").length
          : 0,
        "reviews.pending": 0,
      } satisfies Record<string, number>;
    },
    staleTime: 10_000,
  });

  return query.data ?? {};
}
