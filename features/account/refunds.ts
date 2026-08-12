"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { TravelerBooking } from "@/types/traveler";
import {
  CANCELLATION_POLICIES,
  getRevision,
  getState,
  quoteRefund,
  refundService,
  subscribe as subscribeToDomain,
  type CancellationPolicyId,
  type Refund,
  type RefundQuote,
  type RefundReason,
} from "@/features/dashboard/domain";
import { PRICING_CONFIG, priceBooking } from "@/features/dashboard/domain/money";

/**
 * Customer-side refund bridge.
 *
 * The traveler account and the dashboard still hold separate booking datasets
 * (they merge when a backend arrives), but refunds must not fork: a cancellation
 * here is priced by the platform's own {@link quoteRefund} and lands in the same
 * queue admin/finance work from. This module is the only place that translation
 * happens.
 */

/**
 * Map the traveler booking's free-text policy onto a platform policy id.
 * The mock dataset stores prose; the platform reasons in policy ids, so the
 * mapping lives here rather than being guessed at three call sites.
 */
export function policyIdForBooking(booking: TravelerBooking): CancellationPolicyId {
  const text = booking.cancellationPolicy.toLowerCase();
  if (text.includes("non-refundable")) return "non_refundable";
  if (text.includes("7 days")) return "moderate";
  if (text.includes("24 hours") || text.includes("flexible")) return "flexible";
  if (text.includes("48 hours")) return "flexible";
  return "moderate";
}

/** Reconstruct the platform money model for a traveler booking. */
function moneyForBooking(booking: TravelerBooking) {
  const taxAndFee = 1 + PRICING_CONFIG.taxRate + PRICING_CONFIG.platformFeeRate;
  return priceBooking({
    base: booking.totalUsd / taxAndFee,
    commissionRate: PRICING_CONFIG.defaultCommissionRate,
  });
}

/**
 * Quote what a cancellation would refund — policy tier, fee, tax adjustment and
 * the final amount. Pure and synchronous, so the confirmation dialog can show it
 * before the customer commits.
 */
export function quoteBookingRefund(
  booking: TravelerBooking,
  reason: RefundReason = "customer_cancellation",
  at?: string,
): RefundQuote {
  return quoteRefund({
    booking: {
      money: moneyForBooking(booking),
      cancellationPolicyId: policyIdForBooking(booking),
      startAt: booking.checkIn,
      status: "confirmed",
    },
    reason,
    at,
  });
}

/** The policy record behind a traveler booking (label + summary + tiers). */
export function policyForBooking(booking: TravelerBooking) {
  return CANCELLATION_POLICIES[policyIdForBooking(booking)];
}

export interface RequestRefundResult {
  refund: Refund;
  quote: RefundQuote;
}

/**
 * Raise a refund request for a traveler booking. Returns the created record so
 * the UI can show its reference — the same reference the admin console sees.
 */
export function useRequestBookingRefund(customer: { name: string; email: string }) {
  const [isPending, setPending] = useState(false);

  const request = useCallback(
    async (
      booking: TravelerBooking,
      options: { reason?: RefundReason; note?: string } = {},
    ): Promise<RequestRefundResult> => {
      setPending(true);
      try {
        return await refundService.requestExternal({
          bookingRef: booking.reference,
          productTitle: booking.title,
          customerName: customer.name,
          customerEmail: customer.email,
          merchantName: booking.location,
          total: booking.totalUsd,
          cancellationPolicyId: policyIdForBooking(booking),
          startAt: booking.checkIn,
          reason: options.reason,
          note: options.note,
          actor: {
            id: `cus_${customer.email}`,
            name: customer.name,
            role: "customer",
          },
        });
      } finally {
        setPending(false);
      }
    },
    [customer.name, customer.email],
  );

  return { request, isPending };
}

/**
 * The customer's own refund requests, read reactively from the shared domain
 * store — so an admin approving one is reflected here on the next render.
 */
export function useMyRefunds(email: string): Refund[] {
  // The store mutates its collections in place, so we subscribe to its revision
  // number — an array snapshot would compare equal and never re-render. The
  // server snapshot is 0, so SSR and the first client paint agree before the
  // persisted state is read.
  const revision = useSyncExternalStore(subscribeToDomain, getRevision, () => 0);
  return useMemo(() => {
    const target = email.trim().toLowerCase();
    return getState().refunds.filter((r) => r.customer.email.toLowerCase() === target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, email]);
}
