/**
 * Domain services — the API surface of the business layer.
 *
 * Each service is async, takes/returns the domain types, enforces its own access
 * scope and records the side effects a real backend would (timeline entries,
 * audit log, notifications). UIs never mutate the store directly and never
 * recompute money: they call these functions.
 *
 * Swapping to a real backend = replacing each body with a `fetch`. Signatures,
 * scoping semantics and error kinds are already what the server will expose.
 */

import { ApiError } from "../data/errors";
import type { ListParams, Paginated } from "../data/types";
import {
  SCOPE_NONE,
  SYSTEM_ACTOR,
  byNewest,
  delay,
  forbidden,
  inScope,
  notFound,
  notify,
  queryList,
  recordAudit,
  type DomainScope,
  type NotifyInput,
  type RecordAuditInput,
} from "./service-kit";
import {
  BOOKING_ACTIONS,
  FAILURE_REASON_LABELS,
  assertRefundTransition,
  assertSettlementTransition,
  assertTransition,
  availableBookingActions,
  getBookingAction,
  paymentStatusForBooking,
} from "./lifecycle";
import {
  PLATFORM_NOW,
  PRICING_CONFIG,
  applyRefundToMoney,
  comboTotals,
  defaultPolicyFor,
  evaluateOffer,
  groupSum,
  merchantFinancials,
  money,
  platformFinancials,
  priceB2B,
  priceBooking,
  quoteRefund,
  settlementTotals,
  type MerchantFinancials,
  type OfferContext,
  type PlatformFinancials,
} from "./money";
import { MERCHANTS } from "./seed";
import { DEMO_CUSTOMER_PHONE } from "./seed-extra";
import { commitHold, releaseForBooking } from "./inventory";
import { cancelSplit } from "./split-payment";
import { loyaltyService } from "./engagement";
import {
  commissionRuleStore,
  describeRule,
  matchingRules,
  resolveCommission,
  type CommissionContext,
  type CommissionResolution,
  type CommissionRule,
  type CommissionRuleInput,
} from "./commission-rules";
import {
  insurancePlanStore,
  insuranceService,
  quoteInsurance,
  type InsurancePlan,
  type InsurancePlanInput,
  type InsurancePolicy,
  type InsuranceProvider,
} from "./insurance";
import {
  benefitsFor,
  membershipPlanStore,
  membershipService,
  type MembershipPlan,
  type MembershipPlanInput,
  type MembershipSubscription,
} from "./membership";
import {
  CAMPAIGN_STATUS_LABELS,
  PLACEMENT_LABELS,
  PRICING_MODEL_LABELS,
  adService,
  campaignPerformance,
  campaignSpend,
  spendExplanation,
  type AdCampaign,
  type AdCampaignInput,
  type Advertiser,
  type CampaignStatus,
} from "./advertising";
import {
  groupRevenue,
  recordRevenue,
  revenueByMonth,
  revenueLedger,
  revenueMixByMonth,
  reverseRevenue,
  storedEntriesFor,
  summarizeRevenue,
  type RevenueEntry,
  type RevenueFilters,
  type RevenueScope,
  type RevenueSummary,
} from "./revenue";
import {
  RECOMMENDATION_LABELS,
  RULE_KIND_LABELS,
  applyRecommendation,
  bookingPace,
  bookingPerformance,
  pricingRuleStore,
  type PricingRule,
  type PricingRuleInput,
  type Recommendation,
} from "./revenue-management";
import { messagingService } from "./messaging";
import { resetRoleRegistry } from "../rbac/role-registry";
import { resetAllFlags } from "../feature-flags/flag-store";
import { clearAllModuleState } from "../crud/module-store";
import { resetPlatformConfig } from "./platform-config";
import { resetTaxRules } from "./tax";
import { resetLocaleSettings } from "@/features/i18n/locale-settings";
import { recordRefund as recordPaymentRefund } from "./payments";
import { track } from "./telemetry";
import {
  getState,
  mutate,
  nextId,
  nextReference,
  resetState,
  subscribe,
} from "./store";
import type {
  AppliedDiscount,
  B2BAccount,
  B2BSubUser,
  CancellationPolicyId,
  B2BInvoice,
  Booking,
  BookingActionResult,
  BookingEvent,
  BookingSegment,
  BookingStatus,
  ComboOffer,
  CommissionEntry,
  DomainActor,
  NotificationAudience,
  Offer,
  PlatformNotification,
  ProductKind,
  Refund,
  RefundQuote,
  RefundReason,
  RefundStatus,
  Settlement,
  SettlementStatus,
} from "./types";
import type { BookingActionId } from "./lifecycle";

// ---------------------------------------------------------------------------
// Audit + notification read surfaces
// ---------------------------------------------------------------------------

/**
 * Re-exported from {@link import("./service-kit")} so the historical import
 * surface (`from "./services"`) keeps working for every existing caller.
 */
export {
  SYSTEM_ACTOR,
  notify,
  recordAudit,
  type DomainScope,
  type NotifyInput,
  type RecordAuditInput,
};

export const auditService = {
  async list(params: ListParams = {}, scope: DomainScope = SCOPE_NONE) {
    const rows = getState().auditLog.filter(
      () => !scope.merchantId, // merchants don't see the platform audit trail
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.summary, r.actorName, r.entityLabel, r.entity],
        sortValue: (r, f) => (r as unknown as Record<string, string>)[f],
        defaultSort: (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      }),
    );
  },
  record: recordAudit,
};

export const notificationService = {
  async list(
    params: ListParams = {},
    audience: NotificationAudience = "admin",
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<PlatformNotification>> {
    const rows = getState().notifications.filter(
      (n) =>
        n.audience.includes(audience) &&
        (!scope.merchantId || n.merchantId === scope.merchantId) &&
        (!scope.organizationId || n.organizationId === scope.organizationId),
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.title, r.body],
        sortValue: (r, f) => (r as unknown as Record<string, string>)[f],
        defaultSort: byNewest,
      }),
    );
  },
  async unreadCount(audience: NotificationAudience = "admin", scope: DomainScope = SCOPE_NONE) {
    const rows = getState().notifications.filter(
      (n) =>
        !n.read &&
        n.audience.includes(audience) &&
        (!scope.merchantId || n.merchantId === scope.merchantId),
    );
    return delay(rows.length, 60);
  },
  async markRead(id: string) {
    return delay(
      mutate((draft) => {
        const row = draft.notifications.find((n) => n.id === id) ?? notFound("Notification");
        row.read = true;
        return row;
      }),
      120,
    );
  },
  async markAllRead(audience: NotificationAudience = "admin") {
    return delay(
      mutate((draft) => {
        let n = 0;
        for (const row of draft.notifications) {
          if (row.audience.includes(audience) && !row.read) {
            row.read = true;
            n += 1;
          }
        }
        return n;
      }),
      160,
    );
  },
  notify,
};

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

function findBooking(id: string): Booking {
  return getState().bookings.find((b) => b.id === id) ?? notFound("Booking");
}

function pushEvent(booking: Booking, event: Omit<BookingEvent, "id">): void {
  booking.timeline.push({ ...event, id: nextId("ev") });
}

const BOOKING_FILTERS: Record<string, (row: Booking, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  segment: (row, value) => row.segment === value,
  productKind: (row, value) => row.productKind === value,
  channel: (row, value) => row.channel === value,
  merchantId: (row, value) => row.merchant.id === value,
  organizationId: (row, value) => row.customer.organizationId === value,
  destination: (row, value) => row.destination === value,
  paymentStatus: (row, value) => row.payment.status === value,
  /** `needsAttention` groups everything an operator must act on. */
  needsAttention: (row) =>
    ["failed", "payment_pending", "cancellation_requested", "refund_pending", "refund_failed"].includes(
      row.status,
    ),
};

const BOOKING_SORT = (row: Booking, field: string): string | number | undefined => {
  switch (field) {
    case "reference":
      return row.reference;
    case "customer":
      return row.customer.name;
    case "merchant":
      return row.merchant.name;
    case "total":
      return row.money.total;
    case "commission":
      return row.money.commission;
    case "startAt":
      return new Date(row.startAt).getTime();
    case "createdAt":
      return new Date(row.createdAt).getTime();
    case "status":
      return row.status;
    default:
      return (row as unknown as Record<string, string | number>)[field];
  }
};

export interface CreateBookingInput {
  productKind: ProductKind;
  productTitle: string;
  destination: string;
  /**
   * ISO-2 of the destination country. Decides which tax jurisdiction's rules
   * apply; without it only `GLOBAL` rules (and the flat fallback) can match.
   */
  destinationCountryCode?: string;
  merchantId: string;
  customerName: string;
  customerEmail: string;
  segment: BookingSegment;
  /** B2B only — the booking account. */
  organizationId?: string;
  startAt: string;
  endAt: string;
  quantity: number;
  /** Public/list price before discounts. */
  baseAmount: number;
  /** Promo code to apply, if any. */
  promoCode?: string;
  /** Combo bundle being booked, if any. */
  comboId?: string;
  travelerNames?: string[];
  /** Where the booking originated. */
  channel?: Booking["channel"];
  /**
   * Booking group this booking belongs to (unified trip). Each grouped booking
   * is still created, priced and confirmed independently.
   */
  tripId?: string;
  tripRef?: string;
  /**
   * A discount decided outside the offer engine — today the trip cart's bundle
   * saving, already apportioned to this component. Applied on top of any
   * combo/promo discount and, like them, reduces the commission base.
   */
  extraDiscount?: AppliedDiscount;

  // --- customer-checkout extras ------------------------------------------

  /** Catalog listing behind the booking. */
  listing?: Booking["listing"];
  /** Room type / rate plan selected from the inventory engine. */
  stay?: Booking["stay"];
  /** Hold to commit — the units this booking consumes. */
  holdId?: string;
  /** Extras bought at checkout; folded into the commissionable base. */
  addOns?: Booking["addOns"];
  fx?: Booking["fx"];
  paymentPlan?: Booking["paymentPlan"];
  specialRequests?: string;
  pointsRedeemed?: number;
  /**
   * Cancellation policy to record. Normally derived from the product, but the
   * stay's rate plan overrides it (non-refundable rates are the whole point).
   */
  cancellationPolicyId?: CancellationPolicyId;
  /** Full traveler records, when checkout collected more than names. */
  travelers?: Booking["travelers"];
  /** Discount lines decided outside the offer engine (points, wallet coupons). */
  discounts?: AppliedDiscount[];

  // --- monetization -------------------------------------------------------

  /** Demo insurance plan the traveller chose. Priced outside the commissionable base. */
  insurancePlanId?: string;
  /**
   * Apply the customer's membership benefits (fee waiver, member discount,
   * insurance discount). On by default for B2C; B2B books on account terms.
   */
  applyMembership?: boolean;
  /** Advertising campaign the booking is attributed to, for CPA billing. */
  attributedCampaignId?: string;
}

export const bookingService = {
  async list(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<Booking>> {
    const rows = getState().bookings.filter((b) => inScope(scope, b));
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [
          r.reference,
          r.customer.name,
          r.customer.email,
          r.productTitle,
          r.merchant.name,
          r.destination,
          r.invoiceNumber,
        ],
        sortValue: BOOKING_SORT,
        filterPredicates: BOOKING_FILTERS,
        defaultSort: (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      }),
    );
  },

  async get(id: string, scope: DomainScope = SCOPE_NONE): Promise<Booking> {
    const booking = findBooking(id);
    if (!inScope(scope, booking)) {
      forbidden("This booking belongs to another organization.");
    }
    return delay(structuredClone(booking));
  },

  /** All bookings in scope, unpaginated — for dashboards and roll-ups. */
  async all(scope: DomainScope = SCOPE_NONE): Promise<Booking[]> {
    return delay(getState().bookings.filter((b) => inScope(scope, b)));
  },

  /**
   * Every booking in one trip group, oldest first. The group has no status of
   * its own — callers derive it from these components.
   */
  async byTrip(tripId: string, scope: DomainScope = SCOPE_NONE): Promise<Booking[]> {
    const rows = getState()
      .bookings.filter((b) => b.tripId === tripId && inScope(scope, b))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return delay(structuredClone(rows));
  },

  /** Actions available for a booking, given the caller's permissions. */
  actions(booking: Booking, can: (p: string) => boolean = () => true) {
    return availableBookingActions(booking, can);
  },

  /**
   * Move a booking through the lifecycle.
   *
   * The transition table is authoritative: an illegal move throws before
   * anything is written. Payment status, timeline, audit log and notifications
   * are all updated in the same call, and refund-bearing transitions create or
   * advance the linked {@link Refund}.
   */
  async transition(
    id: string,
    actionId: BookingActionId,
    options: {
      actor?: DomainActor;
      failureReason?: Booking["failureReason"];
      note?: string;
      /** Refund reason to use when the action raises one. */
      refundReason?: RefundReason;
      scope?: DomainScope;
    } = {},
  ): Promise<BookingActionResult> {
    const {
      actor = SYSTEM_ACTOR,
      failureReason,
      note,
      refundReason,
      scope = SCOPE_NONE,
    } = options;
    const action = getBookingAction(actionId);

    const result = mutate((draft): BookingActionResult => {
      const booking = draft.bookings.find((b) => b.id === id) ?? notFound("Booking");
      if (!inScope(scope, booking)) {
        forbidden("You can't act on a booking from another organization.");
      }
      const from = booking.status;
      assertTransition(from, action.to);

      booking.status = action.to;
      booking.updatedAt = new Date().toISOString();

      if (action.to === "failed") {
        booking.failureReason = failureReason ?? "technical_error";
        booking.failureNote = note ?? FAILURE_REASON_LABELS[booking.failureReason];
      }
      if (action.to === "payment_pending") {
        // Retrying clears the previous failure so the record reads correctly.
        booking.failureReason = undefined;
        booking.failureNote = undefined;
      }

      const nextPayment = paymentStatusForBooking(
        action.to,
        booking.payment.status,
        booking.failureReason,
      );
      if (nextPayment) {
        booking.payment.status = nextPayment;
        if (nextPayment === "captured" && !booking.payment.capturedAt) {
          booking.payment.capturedAt = new Date().toISOString();
        }
        if (nextPayment === "failed") {
          booking.payment.failureCode = "card_declined";
          booking.payment.failureMessage =
            note ?? "The issuing bank declined the transaction.";
        }
      }

      pushEvent(booking, {
        at: new Date().toISOString(),
        status: action.to,
        paymentStatus: nextPayment ?? undefined,
        label: action.label,
        note: note ?? action.description,
        actor: actor.name,
        tone:
          action.to === "failed" || action.to === "refund_failed"
            ? "danger"
            : action.to === "confirmed" || action.to === "refunded" || action.to === "completed"
              ? "success"
              : action.tone === "danger"
                ? "warning"
                : "neutral",
      });

      let refund: Refund | undefined;

      // --- refund side effects ------------------------------------------
      if (action.to === "refund_pending") {
        const reason: RefundReason =
          refundReason ??
          (from === "failed"
            ? booking.payment.status === "captured" ||
              booking.payment.status === "refund_pending"
              ? "payment_captured_booking_failed"
              : "booking_failed"
            : "customer_cancellation");
        const quote = quoteRefund({ booking, reason, at: new Date().toISOString() });
        refund = buildRefundRecord(booking, quote, reason, note);
        draft.refunds.unshift(refund);
        booking.refundIds.push(refund.id);
      }

      if (action.to === "refund_processing") {
        const linked = draft.refunds.find(
          (r) => booking.refundIds.includes(r.id) && r.status !== "completed",
        );
        if (linked) {
          if (linked.status === "requested" || linked.status === "under_review") {
            linked.status = "approved";
            linked.reviewedAt = new Date().toISOString();
            linked.decidedBy = actor.name;
          }
          if (linked.status === "approved" || linked.status === "failed") {
            linked.status = "processing";
          }
          refund = linked;
        }
      }

      if (action.to === "refunded") {
        const linked = draft.refunds.find((r) => booking.refundIds.includes(r.id));
        if (linked) {
          linked.status = "completed";
          linked.processedAt = new Date().toISOString();
          refund = linked;
          booking.money = applyRefundToMoney(
            booking.money,
            linked.refundAmount,
            linked.commissionReversed,
            linked.insuranceRevenueReversed ?? 0,
            linked.platformCancellationFee ?? 0,
          );
          booking.payment.status =
            booking.money.refunded >= booking.money.total ? "refunded" : "partially_refunded";
          // Keep the commission ledger and settlement in step.
          const entry = draft.commissions.find((c) => c.bookingId === booking.id);
          if (entry) {
            entry.reversed = booking.money.commissionReversed;
            entry.status =
              entry.reversed >= entry.commission ? "reversed" : "adjusted";
          }
          // The demo insurance policy unwinds by the same share.
          if (booking.insurancePolicyId && linked.insuranceRefund > 0) {
            const policy = draft.insurancePolicies.find(
              (p) => p.bookingId === booking.id && p.status === "active",
            );
            if (policy) {
              policy.refunded = money(policy.refunded + linked.insuranceRefund);
              policy.revenueReversed = money(
                policy.revenueReversed + (linked.insuranceRevenueReversed ?? 0),
              );
              policy.cancelledAt = new Date().toISOString();
              if (policy.refunded >= policy.premium) policy.status = "refunded";
            }
          }
          const settlement = draft.settlements.find((s) => s.id === booking.settlementId);
          if (settlement && settlement.status !== "paid") {
            const group = draft.bookings.filter((b) => settlement.bookingIds.includes(b.id));
            const totals = settlementTotals(group);
            Object.assign(settlement, totals);
          }
        }
      }

      if (action.to === "cancelled") {
        const entry = draft.commissions.find((c) => c.bookingId === booking.id);
        if (entry) entry.status = "adjusted";
      }

      return {
        booking: structuredClone(booking),
        refund: refund ? structuredClone(refund) : undefined,
        from,
        to: action.to,
      };
    });

    recordAudit({
      actor,
      action:
        action.to === "cancelled"
          ? "cancel"
          : action.to === "refunded"
            ? "refund"
            : "status_change",
      entity: "booking",
      entityId: id,
      entityLabel: result.booking.reference,
      summary: `${action.label} — ${result.booking.reference}`,
      from: result.from,
      to: result.to,
    });

    notifyForTransition(result);
    applyLifecycleSideEffects(result);
    return delay(result);
  },

  /**
   * Synchronous refund quote — the calculation is pure, so a confirmation
   * dialog can render it without a loading state. Returns `null` for an unknown
   * booking rather than throwing, because the caller is mid-render.
   */
  quoteCancellationSync(
    id: string,
    reason: RefundReason = "customer_cancellation",
  ): RefundQuote | null {
    const booking = getState().bookings.find((b) => b.id === id);
    if (!booking) return null;
    return quoteRefund({ booking, reason, at: new Date().toISOString() });
  },

  /** Quote the refund a cancellation would produce, without changing anything. */
  async quoteCancellation(
    id: string,
    reason: RefundReason = "customer_cancellation",
    scope: DomainScope = SCOPE_NONE,
  ): Promise<RefundQuote> {
    const booking = findBooking(id);
    if (!inScope(scope, booking)) forbidden("Not your booking.");
    return delay(quoteRefund({ booking, reason, at: new Date().toISOString() }), 180);
  },

  /**
   * Create a booking the way checkout would: price it centrally, apply a promo
   * code through the offer engine, honour B2B net rates, and land it in
   * `payment_pending` so the lifecycle can be driven from the UI.
   */
  async create(
    input: CreateBookingInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Booking> {
    const state = getState();
    const merchant =
      state.bookings.find((b) => b.merchant.id === input.merchantId)?.merchant ??
      MERCHANTS.find((m) => m.id === input.merchantId) ??
      notFound("Merchant");
    const account = input.organizationId
      ? state.b2bAccounts.find((a) => a.id === input.organizationId)
      : undefined;
    if (input.segment === "b2b" && !account) notFound("B2B account");
    if (account && account.status !== "active") {
      forbidden(`${account.name} is ${account.status} and can't book on credit.`);
    }

    const combo = input.comboId
      ? state.combos.find((c) => c.id === input.comboId)
      : undefined;
    // Add-ons are part of what is sold, so they sit inside the commissionable
    // base rather than being bolted on after tax.
    const addOnTotal = money(
      (input.addOns ?? []).reduce((sum, addOn) => sum + addOn.total, 0),
    );
    const base = money((combo ? combo.comboPrice : input.baseAmount) + addOnTotal);

    const b2b = account
      ? priceB2B({
          publicRate: base,
          netRateDiscount: account.netRateDiscount,
          markupRate: account.defaultMarkupRate,
          model: account.commercialModel,
          agencyCommissionRate: account.agencyCommissionRate,
        })
      : null;

    // Membership benefits apply to consumer bookings only — an agency books on
    // its own negotiated terms, not a traveller's subscription.
    const useMembership = (input.applyMembership ?? true) && input.segment === "b2c";
    const benefits = useMembership ? benefitsFor(input.customerEmail) : undefined;

    // Discount lines the caller already resolved (loyalty points, a wallet
    // coupon) arrive priced; the offer engine appends to the same list.
    const discounts: Booking["discounts"] = [...(input.discounts ?? [])];
    if (combo) {
      discounts.push({
        kind: "combo",
        ref: combo.id,
        label: `${combo.name} bundle saving`,
        amount: comboTotals(combo).savings,
      });
    }
    if (input.promoCode) {
      const offer = state.offers.find(
        (o) => o.promoCode?.toUpperCase() === input.promoCode!.toUpperCase(),
      );
      if (!offer) {
        throw new ApiError({ kind: "validation", message: "That promo code doesn't exist." });
      }
      const evaluation = evaluateOffer(offer, {
        amount: b2b ? b2b.netRate : base,
        productKind: input.productKind,
        destination: input.destination,
        segment: input.segment,
      });
      if (!evaluation.applicable) {
        throw new ApiError({ kind: "validation", message: evaluation.reason });
      }
      discounts.push({
        kind: "coupon",
        ref: offer.promoCode!,
        label: offer.name,
        amount: evaluation.discount,
      });
      mutate((draft) => {
        const target = draft.offers.find((o) => o.id === offer.id);
        if (target) target.used += 1;
      });
    }
    // A trip-level saving arrives already apportioned to this component.
    if (input.extraDiscount && input.extraDiscount.amount > 0) {
      discounts.push(input.extraDiscount);
    }

    // --- membership discount ------------------------------------------------
    // The platform funds this one, so it is tracked separately: the merchant is
    // made whole and the subsidy comes out of platform revenue.
    const saleBase = b2b ? b2b.netRate : base;
    let platformFundedDiscount = 0;
    if (benefits && benefits.memberDiscountPercent > 0) {
      const raw = money(saleBase * (benefits.memberDiscountPercent / 100));
      platformFundedDiscount = money(
        benefits.memberDiscountCap > 0 ? Math.min(raw, benefits.memberDiscountCap) : raw,
      );
      if (platformFundedDiscount > 0) {
        discounts.push({
          kind: "offer",
          ref: `membership:${benefits.code}`,
          label: `${benefits.planName} member discount`,
          amount: platformFundedDiscount,
        });
      }
    }

    const discountTotal = money(discounts.reduce((n, d) => n + d.amount, 0));
    const grossSale = money(saleBase + (b2b ? b2b.markup : 0));
    const netSale = money(Math.max(0, grossSale - discountTotal));

    // --- commission: the rule engine decides, never a component -------------
    const resolution = resolveCommission({
      productKind: input.productKind,
      merchantId: merchant.id,
      productId: input.listing?.id,
      ratePlanId: input.stay?.ratePlanId,
      b2bAccountId: account?.id,
      gross: grossSale,
      // A platform-funded discount doesn't reduce what the merchant sold for,
      // so it doesn't reduce the commission base either.
      net: money(netSale + platformFundedDiscount),
      merchantRate: merchant.commissionRate,
    });

    // --- insurance: priced alongside, never inside the commissionable base --
    const plan = input.insurancePlanId
      ? insuranceService.plan(input.insurancePlanId)
      : undefined;
    const insuranceQuote = plan
      ? quoteInsurance(plan, {
          travelers: Math.max(1, input.travelers?.length ?? input.travelerNames?.length ?? 1),
          tripValue: netSale,
          discountPercent: benefits?.insuranceDiscountPercent,
        })
      : null;

    // Needed before pricing: fixed-amount tax rules (city levies) multiply by
    // nights and guests.
    const nights = Math.max(
      0,
      Math.round(
        (new Date(input.endAt).getTime() - new Date(input.startAt).getTime()) / 86_400_000,
      ),
    );
    const travellerCount = Math.max(
      1,
      input.travelers?.length ?? input.travelerNames?.length ?? input.stay?.guests ?? 1,
    );

    const priced = priceBooking({
      base: saleBase,
      markup: b2b ? b2b.markup : 0,
      discount: discountTotal,
      platformFundedDiscount,
      commissionRate: resolution.rate,
      commissionBasis: resolution.basis,
      commissionAmount: resolution.commission,
      commissionRuleId: resolution.ruleId,
      // A membership can waive part or all of the platform service fee.
      feeOverride: benefits
        ? money(netSale * PRICING_CONFIG.platformFeeRate * (1 - benefits.serviceFeeWaiver))
        : undefined,
      insurance: insuranceQuote?.premium ?? 0,
      insuranceProviderShare: insuranceQuote?.providerShare ?? 0,
      taxContext: {
        productKind: input.productKind,
        countryCode: input.destinationCountryCode,
        nights,
        units: Math.max(1, input.quantity),
        guests: travellerCount,
      },
    });

    // --- B2B credit limit ----------------------------------------------------
    // Booking on account is lending: the limit is enforced here, before the
    // booking exists, so an agency can never quietly exceed it.
    if (account) {
      const available = money(Math.max(0, account.creditLimit - account.creditUsed));
      if (priced.total > available) {
        forbidden(
          `${account.name} has ${account.currency} ${available.toFixed(2)} of credit available — this booking needs ${account.currency} ${priced.total.toFixed(2)}. Settle an invoice or raise the limit first.`,
        );
      }
    }

    const now = new Date().toISOString();
    const id = nextId("bkg");
    const booking: Booking = {
      id,
      reference: nextReference("SO", 24_500),
      segment: input.segment,
      channel: input.channel ?? (input.segment === "b2b" ? "agency" : "web"),
      productKind: input.productKind,
      productTitle: combo ? combo.name : input.productTitle,
      destination: input.destination,
      comboId: combo?.id,
      tripId: input.tripId,
      tripRef: input.tripRef,
      merchant,
      customer: {
        id: nextId("cus"),
        name: input.customerName,
        email: input.customerEmail,
        organizationId: account?.id,
        organizationName: account?.name,
      },
      travelers:
        input.travelers?.length
          ? input.travelers
          : (input.travelerNames?.length
              ? input.travelerNames
              : [input.customerName]
            ).map((fullName, i) => ({
              id: `${id}_trv_${i}`,
              fullName,
              type: "adult" as const,
            })),
      startAt: input.startAt,
      endAt: input.endAt,
      nights,
      quantity: input.quantity,
      status: "payment_pending",
      payment: {
        id: nextId("pay"),
        reference: nextReference("PMT", 48_500),
        method: account ? "Credit account" : "Card",
        instrument: account ? `${account.code} · ${account.settlementTerm}` : "Card on file",
        status: "pending",
        amount: priced.total,
        currency: priced.currency,
      },
      money: priced,
      discounts,
      cancellationPolicyId:
        input.cancellationPolicyId ??
        (combo ? combo.cancellationPolicyId : defaultPolicyFor(input.productKind)),
      listing: input.listing,
      stay: input.stay,
      holdId: input.holdId,
      addOns: input.addOns?.length ? input.addOns : undefined,
      fx: input.fx,
      paymentPlan: input.paymentPlan,
      specialRequests: input.specialRequests,
      pointsRedeemed: input.pointsRedeemed,
      membershipCode: benefits && benefits.code !== "free" ? benefits.code : undefined,
      attributedCampaignId: input.attributedCampaignId,
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          id: nextId("ev"),
          at: now,
          status: "initiated",
          label: "Booking initiated",
          note: `Created by ${actor.name}.`,
          actor: actor.name,
          tone: "neutral",
        },
        {
          id: nextId("ev"),
          at: now,
          status: "payment_pending",
          paymentStatus: "pending",
          label: "Awaiting payment",
          actor: actor.name,
          tone: "warning",
        },
      ],
      invoiceNumber: nextReference("INV", 76_500),
      refundIds: [],
    };

    mutate((draft) => {
      draft.bookings.unshift(booking);
      draft.commissions.unshift({
        id: nextId("cmn"),
        reference: nextReference("CMN", 91_500),
        bookingId: booking.id,
        bookingRef: booking.reference,
        merchantId: merchant.id,
        merchantName: merchant.name,
        productKind: booking.productKind,
        segment: booking.segment,
        currency: booking.money.currency,
        netSale: booking.money.netSale,
        rate: booking.money.commissionRate,
        commission: booking.money.commission,
        merchantEarning: booking.money.merchantEarning,
        reversed: 0,
        status: "pending",
        createdAt: now,
      });
      if (combo) {
        const target = draft.combos.find((c) => c.id === combo.id);
        if (target) target.sold += 1;
      }
      if (account) {
        const target = draft.b2bAccounts.find((a) => a.id === account.id);
        if (target) target.creditUsed = money(target.creditUsed + booking.money.total);
      }
    });

    // The hold becomes the booking's allocation — units stay consumed, and a
    // later cancellation is what gives them back.
    if (input.holdId) commitHold(input.holdId, booking.id);
    if (input.pointsRedeemed && input.pointsRedeemed > 0) {
      loyaltyService.redeem(booking.customer.email, input.pointsRedeemed, {
        bookingId: booking.id,
        bookingRef: booking.reference,
      });
    }

    // The policy is written only once the booking exists, so a failed create
    // can never leave an orphan policy behind.
    if (insuranceQuote) {
      const policy = insuranceService.issue({
        quote: insuranceQuote,
        bookingId: booking.id,
        bookingRef: booking.reference,
        customerEmail: booking.customer.email,
        customerName: booking.customer.name,
        currency: booking.money.currency,
        travelers: booking.travelers.length,
        startAt: booking.startAt,
        endAt: booking.endAt,
        at: now,
      });
      mutate((draft) => {
        const target = draft.bookings.find((b) => b.id === booking.id);
        if (target) target.insurancePolicyId = policy.id;
      });
      booking.insurancePolicyId = policy.id;
      notify({
        category: "insurance",
        audience: ["admin"],
        title: "Insurance attached",
        body: `${policy.reference} · ${policy.planName} · platform revenue ${policy.currency} ${policy.platformRevenue.toFixed(2)}`,
        href: "/dashboard/finance/insurance",
        tone: "success",
      });
    }

    // Attribute the conversion so the campaign's CPA billing reflects it.
    if (input.attributedCampaignId) {
      adService.recordEvent(input.attributedCampaignId, "conversion", {
        value: booking.money.netSale,
      });
    }

    recordAudit({
      actor,
      action: "create",
      entity: "booking",
      entityId: booking.id,
      entityLabel: booking.reference,
      summary: `Created ${booking.segment.toUpperCase()} booking ${booking.reference} for ${booking.customer.name}`,
      to: booking.status,
    });
    notify({
      category: "booking",
      audience: ["admin", "merchant"],
      title: "New booking",
      body: `${booking.reference} · ${booking.productTitle} · ${booking.money.currency} ${booking.money.total.toFixed(2)}`,
      href: `/dashboard/bookings/${booking.id}`,
      tone: "success",
      merchantId: merchant.id,
      organizationId: account?.id,
    });

    return delay(structuredClone(booking));
  },

  /** Counts for the sidebar badges and overview tiles. */
  async counts(scope: DomainScope = SCOPE_NONE) {
    const rows = getState().bookings.filter((b) => inScope(scope, b));
    const count = (predicate: (b: Booking) => boolean) => rows.filter(predicate).length;
    return delay(
      {
        total: rows.length,
        pending: count((b) => b.status === "payment_pending" || b.status === "initiated"),
        confirmed: count((b) => b.status === "confirmed"),
        failed: count((b) => b.status === "failed"),
        cancellationRequested: count((b) => b.status === "cancellation_requested"),
        refundPending: count(
          (b) => b.status === "refund_pending" || b.status === "refund_failed",
        ),
        completed: count((b) => b.status === "completed"),
      },
      80,
    );
  },
};

function buildRefundRecord(
  booking: Booking,
  quote: RefundQuote,
  reason: RefundReason,
  note?: string,
): Refund {
  return {
    id: nextId("rfd"),
    reference: nextReference("RFD", 34_000),
    bookingId: booking.id,
    bookingRef: booking.reference,
    customer: booking.customer,
    merchant: booking.merchant,
    segment: booking.segment,
    kind: quote.kind,
    reason,
    note,
    status: "requested",
    currency: quote.currency,
    originalAmount: quote.originalAmount,
    cancellationFee: quote.cancellationFee,
    taxAdjustment: quote.taxAdjustment,
    refundAmount: quote.refundAmount,
    commissionReversed: quote.commissionReversed,
    insuranceRefund: quote.insuranceRefund,
    insuranceRevenueReversed: quote.insuranceRevenueReversed,
    platformCancellationFee: quote.platformCancellationFee,
    merchantDeduction: quote.merchantDeduction,
    method:
      booking.segment === "b2b"
        ? "Credit note"
        : `Original method (${booking.payment.instrument})`,
    requestedAt: new Date().toISOString(),
  };
}

function notifyForTransition(result: BookingActionResult): void {
  const { booking, to } = result;
  const shared = {
    href: `/dashboard/bookings/${booking.id}`,
    merchantId: booking.merchant.id,
    organizationId: booking.customer.organizationId,
    customerId: booking.customer.id,
  };
  switch (to) {
    case "confirmed":
      notify({
        ...shared,
        category: "booking",
        audience: ["admin", "merchant", "customer"],
        title: "Booking confirmed",
        body: `${booking.reference} · ${booking.productTitle}`,
        tone: "success",
      });
      break;
    case "failed": {
      const captured = booking.payment.status === "captured";
      notify({
        ...shared,
        category: captured ? "payment" : "booking",
        audience: ["admin", "customer"],
        title: captured ? "Payment captured but booking failed" : "Booking failed",
        body: `${booking.reference} · ${
          FAILURE_REASON_LABELS[booking.failureReason ?? "technical_error"]
        }${captured ? " — a refund is owed." : ""}`,
        tone: "danger",
      });
      break;
    }
    case "cancelled":
      notify({
        ...shared,
        category: "booking",
        audience: ["admin", "merchant", "customer"],
        title: "Booking cancelled",
        body: `${booking.reference} cancelled under the ${booking.cancellationPolicyId} policy.`,
        tone: "warning",
      });
      break;
    case "refund_pending":
      notify({
        ...shared,
        category: "refund",
        audience: ["admin", "merchant"],
        title: "Refund requested",
        body: `${booking.reference} · ${result.refund?.currency ?? "USD"} ${(
          result.refund?.refundAmount ?? 0
        ).toFixed(2)} awaiting review.`,
        href: "/dashboard/finance/refunds",
        tone: "warning",
      });
      break;
    case "refunded":
      notify({
        ...shared,
        category: "refund",
        audience: ["admin", "merchant", "customer"],
        title: "Refund completed",
        body: `${booking.reference} · ${booking.money.currency} ${booking.money.refunded.toFixed(2)} returned.`,
        href: "/dashboard/finance/refunds",
        tone: "success",
      });
      break;
    case "completed":
      notify({
        ...shared,
        category: "booking",
        audience: ["admin", "merchant"],
        title: "Trip completed",
        body: `${booking.reference} · earning released for settlement.`,
        tone: "success",
      });
      break;
    default:
      break;
  }
}

/**
 * The cross-cutting consequences of a lifecycle move: inventory, loyalty, the
 * payment ledger and the customer's messages.
 *
 * Kept out of the `mutate` block above so each concern owns its own store
 * writes — and so a real backend can move any one of them behind an event bus
 * without unpicking the transition itself.
 */
function applyLifecycleSideEffects(result: BookingActionResult): void {
  const { booking, to } = result;
  const at = new Date().toISOString();
  const dates = `${booking.startAt.slice(0, 10)} → ${booking.endAt.slice(0, 10)}`;
  const context = {
    name: booking.customer.name.split(" ")[0],
    reference: booking.reference,
    product: booking.productTitle,
    dates,
    total: `${booking.money.currency} ${booking.money.total.toFixed(2)}`,
  };
  const to_ = { email: booking.customer.email, phone: DEMO_CUSTOMER_PHONE };
  const href = `/account/bookings/${booking.id}`;

  // --- inventory --------------------------------------------------------
  // A booking that will never be delivered gives its units straight back.
  if (to === "cancelled" || to === "failed" || to === "refunded") {
    releaseForBooking(booking.id);
    // Nobody should be asked to pay their share of a booking that no longer
    // stands, so an open split closes with it.
    cancelSplit(booking.id);
  }

  // --- loyalty ----------------------------------------------------------
  if (to === "completed") loyaltyService.earnForBooking(booking, at);
  if (to === "refunded") loyaltyService.reverseForBooking(booking, at);

  // --- payment ledger ---------------------------------------------------
  if (to === "refunded" && result.refund) {
    recordPaymentRefund(booking.id, result.refund.refundAmount, at);
  }

  // --- customer communications -----------------------------------------
  const common = {
    to: to_,
    customerEmail: booking.customer.email,
    bookingId: booking.id,
    bookingRef: booking.reference,
    href,
  };
  switch (to) {
    case "confirmed":
      messagingService.send({ templateKey: "booking_confirmed", context, ...common });
      break;
    case "failed":
      messagingService.send({
        templateKey: "payment_failed",
        context: {
          ...context,
          reason: FAILURE_REASON_LABELS[booking.failureReason ?? "technical_error"],
        },
        ...common,
      });
      break;
    case "cancelled":
      messagingService.send({
        templateKey: "cancellation_confirmed",
        context: {
          ...context,
          refund: `${booking.money.currency} ${(result.refund?.refundAmount ?? 0).toFixed(2)}`,
          fee: `${booking.money.currency} ${(result.refund?.cancellationFee ?? 0).toFixed(2)}`,
        },
        ...common,
      });
      break;
    case "refunded":
      messagingService.send({
        templateKey: "refund_processed",
        context: {
          ...context,
          refund: `${booking.money.currency} ${(result.refund?.refundAmount ?? 0).toFixed(2)}`,
        },
        ...common,
      });
      break;
    case "completed":
      messagingService.send({ templateKey: "review_invite", context, ...common, href: "/account/reviews" });
      break;
    default:
      break;
  }

  track("booking_status_changed", {
    from: result.from,
    to,
    reference: booking.reference,
    productKind: booking.productKind,
  });
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

const REFUND_FILTERS: Record<string, (row: Refund, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  kind: (row, value) => row.kind === value,
  reason: (row, value) => row.reason === value,
  segment: (row, value) => row.segment === value,
  merchantId: (row, value) => row.merchant.id === value,
};

export const refundService = {
  async list(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<Refund>> {
    const rows = getState().refunds.filter((r) => inScope(scope, r));
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.reference, r.bookingRef, r.customer.name, r.merchant.name],
        sortValue: (row, field) => {
          switch (field) {
            case "customer":
              return row.customer.name;
            case "merchant":
              return row.merchant.name;
            case "requestedAt":
              return new Date(row.requestedAt).getTime();
            case "refundAmount":
              return row.refundAmount;
            default:
              return (row as unknown as Record<string, string | number>)[field];
          }
        },
        filterPredicates: REFUND_FILTERS,
        defaultSort: (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
      }),
    );
  },

  async get(id: string, scope: DomainScope = SCOPE_NONE): Promise<Refund> {
    const refund = getState().refunds.find((r) => r.id === id) ?? notFound("Refund");
    if (!inScope(scope, refund)) forbidden("This refund belongs to another merchant.");
    return delay(structuredClone(refund));
  },

  async all(scope: DomainScope = SCOPE_NONE): Promise<Refund[]> {
    return delay(getState().refunds.filter((r) => inScope(scope, r)));
  },

  /**
   * Raise a refund against a booking. Used by the customer cancellation flow and
   * by admin/support. The amount always comes from {@link quoteRefund} — callers
   * can't invent a figure, only an override percentage for goodwill cases.
   */
  async request(
    bookingId: string,
    options: {
      reason?: RefundReason;
      note?: string;
      overridePercent?: number;
      actor?: DomainActor;
      scope?: DomainScope;
    } = {},
  ): Promise<Refund> {
    const {
      reason = "customer_cancellation",
      note,
      overridePercent,
      actor = SYSTEM_ACTOR,
      scope = SCOPE_NONE,
    } = options;

    const refund = mutate((draft) => {
      const booking = draft.bookings.find((b) => b.id === bookingId) ?? notFound("Booking");
      if (!inScope(scope, booking)) forbidden("Not your booking.");
      const quote = quoteRefund({
        booking,
        reason,
        overridePercent,
        at: new Date().toISOString(),
      });
      if (quote.refundAmount <= 0) {
        throw new ApiError({
          kind: "validation",
          message: quote.reason ?? "No refund is due for this booking.",
        });
      }
      const record = buildRefundRecord(booking, quote, reason, note);
      draft.refunds.unshift(record);
      booking.refundIds.push(record.id);
      pushEvent(booking, {
        at: record.requestedAt,
        label: "Refund requested",
        note: `${quote.kind} refund of ${quote.currency} ${quote.refundAmount.toFixed(2)} · ${quote.policy.label} policy`,
        actor: actor.name,
        tone: "warning",
      });
      return structuredClone(record);
    });

    recordAudit({
      actor,
      action: "create",
      entity: "refund",
      entityId: refund.id,
      entityLabel: refund.reference,
      summary: `Refund ${refund.reference} requested for ${refund.bookingRef} (${refund.currency} ${refund.refundAmount.toFixed(2)})`,
      to: "requested",
    });
    notify({
      category: "refund",
      audience: ["admin", "merchant"],
      title: "Refund requested",
      body: `${refund.reference} · ${refund.bookingRef} · ${refund.currency} ${refund.refundAmount.toFixed(2)}`,
      href: "/dashboard/finance/refunds",
      tone: "warning",
      merchantId: refund.merchant.id,
      customerId: refund.customer.id,
    });
    return delay(refund);
  },

  /**
   * Raise a refund for a booking that lives outside the dashboard's booking
   * ledger — today, the traveler account's own dataset.
   *
   * The two datasets collapse into one when a backend arrives; until then this is
   * the seam that lets a customer cancellation on `/account` land in the *same*
   * refund queue an admin works from, priced by the *same* {@link quoteRefund}
   * rules. Callers supply the booking facts, never the refund amount.
   */
  async requestExternal(input: {
    bookingRef: string;
    productTitle: string;
    customerName: string;
    customerEmail: string;
    merchantName: string;
    /** Amount the customer paid, in the domain currency. */
    total: number;
    cancellationPolicyId: CancellationPolicyId;
    /** Trip start (ISO) — decides which policy tier applies. */
    startAt: string;
    reason?: RefundReason;
    note?: string;
    actor?: DomainActor;
    currency?: string;
    /** Commission rate to reverse; defaults to the platform rate. */
    commissionRate?: number;
  }): Promise<{ refund: Refund; quote: RefundQuote }> {
    const {
      reason = "customer_cancellation",
      actor = SYSTEM_ACTOR,
      currency = "USD",
      commissionRate,
    } = input;

    // Rebuild the money model from the paid total so the tax/fee/commission
    // split matches how the platform would have priced the booking originally.
    const taxAndFee = 1 + PRICING_CONFIG.taxRate + PRICING_CONFIG.platformFeeRate;
    const netSale = money(input.total / taxAndFee);
    const pricedMoney = priceBooking({
      base: netSale,
      commissionRate: commissionRate ?? PRICING_CONFIG.defaultCommissionRate,
      currency,
    });

    const quote = quoteRefund({
      booking: {
        money: pricedMoney,
        cancellationPolicyId: input.cancellationPolicyId,
        startAt: input.startAt,
        status: "cancelled",
      },
      reason,
      at: new Date().toISOString(),
    });

    const customer = {
      id: `cus_${input.customerEmail.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`,
      name: input.customerName,
      email: input.customerEmail,
    };
    const refund: Refund = {
      id: nextId("rfd"),
      reference: nextReference("RFD", 34_000),
      bookingId: `ext_${input.bookingRef}`,
      bookingRef: input.bookingRef,
      customer,
      merchant: { id: "mrc_external", name: input.merchantName, commissionRate: 0 },
      segment: "b2c",
      kind: quote.kind,
      reason,
      note: input.note ?? `Requested from the customer account · ${input.productTitle}`,
      status: "requested",
      currency,
      originalAmount: input.total,
      cancellationFee: quote.cancellationFee,
      taxAdjustment: quote.taxAdjustment,
      refundAmount: quote.refundAmount,
      commissionReversed: quote.commissionReversed,
      insuranceRefund: quote.insuranceRefund,
      insuranceRevenueReversed: quote.insuranceRevenueReversed,
      platformCancellationFee: quote.platformCancellationFee,
      merchantDeduction: quote.merchantDeduction,
      method: "Original payment method",
      requestedAt: new Date().toISOString(),
    };

    mutate((draft) => draft.refunds.unshift(refund));
    recordAudit({
      actor,
      action: "create",
      entity: "refund",
      entityId: refund.id,
      entityLabel: refund.reference,
      summary: `Customer requested a refund for ${input.bookingRef} (${currency} ${refund.refundAmount.toFixed(2)})`,
      to: "requested",
    });
    notify({
      category: "refund",
      audience: ["admin", "customer"],
      title: "Refund requested",
      body: `${refund.reference} · ${input.bookingRef} · ${currency} ${refund.refundAmount.toFixed(2)} awaiting review.`,
      href: "/dashboard/finance/refunds",
      tone: "warning",
      customerId: customer.id,
    });

    return delay({ refund, quote });
  },

  /** Refunds raised by one customer (matched on email) — the account view. */
  async forCustomer(email: string): Promise<Refund[]> {
    const target = email.trim().toLowerCase();
    return delay(
      getState().refunds.filter((r) => r.customer.email.toLowerCase() === target),
    );
  },

  /**
   * Advance a refund. The transition table is enforced, and reaching
   * `completed` writes the money back onto the booking, reverses the commission
   * and re-totals the affected settlement — in one atomic mutation.
   */
  async advance(
    id: string,
    to: RefundStatus,
    options: { actor?: DomainActor; note?: string; scope?: DomainScope } = {},
  ): Promise<Refund> {
    const { actor = SYSTEM_ACTOR, note, scope = SCOPE_NONE } = options;
    // Merchants may not decide refunds — that's a platform-level rule.
    if (scope.merchantId) {
      forbidden("Refund decisions are made by the platform, not by merchants.");
    }

    const refund = mutate((draft) => {
      const row = draft.refunds.find((r) => r.id === id) ?? notFound("Refund");
      const from = row.status;
      assertRefundTransition(from, to);
      row.status = to;
      const now = new Date().toISOString();

      if (to === "under_review" || to === "approved" || to === "rejected") {
        row.reviewedAt = now;
        row.decidedBy = actor.name;
        if (note) row.decisionNote = note;
      }
      if (to === "completed" || to === "failed") row.processedAt = now;
      if (to === "failed") {
        row.failureMessage = note ?? "The payment provider rejected the refund.";
      }

      const booking = draft.bookings.find((b) => b.id === row.bookingId);
      if (booking) {
        const statusMap: Partial<Record<RefundStatus, BookingStatus>> = {
          approved: "refund_pending",
          processing: "refund_processing",
          completed: "refunded",
          failed: "refund_failed",
        };
        const nextStatus = statusMap[to];
        if (nextStatus && booking.status !== nextStatus) {
          // Walk the booking forward only when the machine allows it; a rejected
          // refund leaves the booking exactly where it was.
          try {
            assertTransition(booking.status, nextStatus);
            booking.status = nextStatus;
          } catch {
            /* keep the booking status; the refund record still advances */
          }
        }
        if (to === "completed") {
          booking.money = applyRefundToMoney(
            booking.money,
            row.refundAmount,
            row.commissionReversed,
            row.insuranceRevenueReversed ?? 0,
            row.platformCancellationFee ?? 0,
          );
          booking.payment.status =
            booking.money.refunded >= booking.money.total ? "refunded" : "partially_refunded";
          const entry = draft.commissions.find((c) => c.bookingId === booking.id);
          if (entry) {
            entry.reversed = booking.money.commissionReversed;
            entry.status = entry.reversed >= entry.commission ? "reversed" : "adjusted";
          }
          if (booking.insurancePolicyId && row.insuranceRefund > 0) {
            const policy = draft.insurancePolicies.find(
              (p) => p.bookingId === booking.id && p.status === "active",
            );
            if (policy) {
              policy.refunded = money(policy.refunded + row.insuranceRefund);
              policy.revenueReversed = money(
                policy.revenueReversed + (row.insuranceRevenueReversed ?? 0),
              );
              policy.cancelledAt = now;
              if (policy.refunded >= policy.premium) policy.status = "refunded";
            }
          }
          const settlement = draft.settlements.find((s) => s.id === booking.settlementId);
          if (settlement && settlement.status !== "paid") {
            const group = draft.bookings.filter((b) => settlement.bookingIds.includes(b.id));
            Object.assign(settlement, settlementTotals(group));
          }
        }
        booking.updatedAt = now;
        pushEvent(booking, {
          at: now,
          label: `Refund ${to.replace(/_/g, " ")}`,
          note: note ?? `${row.reference} · ${row.currency} ${row.refundAmount.toFixed(2)}`,
          actor: actor.name,
          tone: to === "completed" ? "success" : to === "failed" || to === "rejected" ? "danger" : "neutral",
        });
      }

      return structuredClone(row);
    });

    recordAudit({
      actor,
      action: to === "rejected" ? "reject" : to === "completed" ? "refund" : "approve",
      entity: "refund",
      entityId: refund.id,
      entityLabel: refund.reference,
      summary: `Refund ${refund.reference} → ${to}`,
      to,
    });
    notify({
      category: "refund",
      audience: ["admin", "merchant", "customer"],
      title:
        to === "completed"
          ? "Refund completed"
          : to === "rejected"
            ? "Refund rejected"
            : `Refund ${to.replace(/_/g, " ")}`,
      body: `${refund.reference} · ${refund.bookingRef} · ${refund.currency} ${refund.refundAmount.toFixed(2)}`,
      href: "/dashboard/finance/refunds",
      tone: to === "completed" ? "success" : to === "rejected" || to === "failed" ? "danger" : "neutral",
      merchantId: refund.merchant.id,
      customerId: refund.customer.id,
    });
    return delay(refund);
  },

  /** Aggregate tiles for the refund console. */
  async summary(scope: DomainScope = SCOPE_NONE) {
    const rows = getState().refunds.filter((r) => inScope(scope, r));
    const sum = (predicate: (r: Refund) => boolean) =>
      money(rows.filter(predicate).reduce((n, r) => n + r.refundAmount, 0));
    return delay({
      currency: "USD",
      requested: rows.filter((r) => r.status === "requested" || r.status === "under_review").length,
      awaitingAmount: sum((r) => r.status === "requested" || r.status === "under_review"),
      processing: rows.filter((r) => r.status === "processing" || r.status === "approved").length,
      completedAmount: sum((r) => r.status === "completed"),
      rejected: rows.filter((r) => r.status === "rejected").length,
      failed: rows.filter((r) => r.status === "failed").length,
      total: rows.length,
    });
  },
};

// ---------------------------------------------------------------------------
// Commission
// ---------------------------------------------------------------------------

export const commissionService = {
  async list(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<CommissionEntry>> {
    const rows = getState().commissions.filter((c) => inScope(scope, c));
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.reference, r.bookingRef, r.merchantName],
        sortValue: (row, field) =>
          field === "createdAt"
            ? new Date(row.createdAt).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          segment: (row, value) => row.segment === value,
          productKind: (row, value) => row.productKind === value,
          merchantId: (row, value) => row.merchantId === value,
        },
        defaultSort: byNewest,
      }),
    );
  },

  /** Platform-wide financial summary — the admin commission dashboard. */
  async platformSummary(scope: DomainScope = SCOPE_NONE): Promise<PlatformFinancials> {
    const state = getState();
    const bookings = state.bookings.filter((b) => inScope(scope, b));
    const settlements = state.settlements.filter((s) => inScope(scope, s));
    return delay(platformFinancials(bookings, settlements));
  },

  /** Commission grouped by merchant / product / month, for charts and tables. */
  async breakdown(scope: DomainScope = SCOPE_NONE) {
    const rows = getState().commissions.filter((c) => inScope(scope, c));
    const net = (c: CommissionEntry) => money(c.commission - c.reversed);
    return delay({
      byMerchant: groupSum(rows, (c) => c.merchantId, net, (c) => c.merchantName),
      byProduct: groupSum(rows, (c) => c.productKind, net),
      bySegment: groupSum(rows, (c) => c.segment, net),
      byMonth: groupSum(rows, (c) => c.createdAt.slice(0, 7), net).sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
    });
  },
};

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

export const settlementService = {
  async list(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<Settlement>> {
    const rows = getState().settlements.filter((s) => inScope(scope, s));
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.reference, r.merchantName, r.method],
        sortValue: (row, field) =>
          field === "periodStart" || field === "scheduledFor"
            ? new Date(row[field]).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          merchantId: (row, value) => row.merchantId === value,
        },
        defaultSort: (a, b) =>
          new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
      }),
    );
  },

  async get(id: string, scope: DomainScope = SCOPE_NONE): Promise<Settlement> {
    const row = getState().settlements.find((s) => s.id === id) ?? notFound("Settlement");
    if (!inScope(scope, row)) forbidden("This settlement belongs to another merchant.");
    return delay(structuredClone(row));
  },

  /** Bookings that make up a settlement — the payout drill-down. */
  async bookings(id: string, scope: DomainScope = SCOPE_NONE): Promise<Booking[]> {
    const settlement = getState().settlements.find((s) => s.id === id) ?? notFound("Settlement");
    if (!inScope(scope, settlement)) forbidden("Not your settlement.");
    return delay(
      getState().bookings.filter((b) => settlement.bookingIds.includes(b.id)),
    );
  },

  async advance(
    id: string,
    to: SettlementStatus,
    options: { actor?: DomainActor; note?: string } = {},
  ): Promise<Settlement> {
    const { actor = SYSTEM_ACTOR, note } = options;
    const settlement = mutate((draft) => {
      const row = draft.settlements.find((s) => s.id === id) ?? notFound("Settlement");
      assertSettlementTransition(row.status, to);
      row.status = to;
      if (to === "paid") {
        row.paidAt = new Date().toISOString();
        for (const entry of draft.commissions) {
          if (row.bookingIds.includes(entry.bookingId) && entry.status === "pending") {
            entry.status = "settled";
            entry.settlementId = row.id;
          }
        }
      }
      if (note) row.reference_note = note;
      return structuredClone(row);
    });

    recordAudit({
      actor,
      action: "settle",
      entity: "settlement",
      entityId: settlement.id,
      entityLabel: settlement.reference,
      summary: `Settlement ${settlement.reference} → ${to} (${settlement.currency} ${settlement.netPayable.toFixed(2)})`,
      to,
    });
    if (to === "paid") {
      notify({
        category: "settlement",
        audience: ["admin", "merchant"],
        title: "Settlement paid",
        body: `${settlement.reference} · ${settlement.currency} ${settlement.netPayable.toFixed(2)} sent by ${settlement.method}.`,
        href: "/dashboard/finance/settlements",
        tone: "success",
        merchantId: settlement.merchantId,
      });
    }
    return delay(settlement);
  },

  /** Merchant P&L — the merchant financial dashboard. */
  async merchantSummary(merchantId: string): Promise<MerchantFinancials> {
    const state = getState();
    const bookings = state.bookings.filter((b) => b.merchant.id === merchantId);
    const settlements = state.settlements.filter((s) => s.merchantId === merchantId);
    return delay(merchantFinancials(bookings, settlements));
  },

  /**
   * A merchant's revenue cut by product, rate plan and month — the "where did
   * my money come from" view. Derived from the merchant's own bookings, so a
   * merchant can never see another's.
   */
  async merchantBreakdown(merchantId: string) {
    const bookings = getState().bookings.filter((b) => b.merchant.id === merchantId);
    const earning = (b: Booking) => b.money.netSettlement;
    return delay({
      byProduct: groupSum(bookings, (b) => b.productKind, earning),
      byRatePlan: groupSum(
        bookings.filter((b) => b.stay),
        (b) => b.stay!.ratePlanId,
        earning,
        (b) => b.stay!.ratePlanName,
      ),
      byDestination: groupSum(bookings, (b) => b.destination, earning),
      byMonth: groupSum(bookings, (b) => b.createdAt.slice(0, 7), earning).sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
      commissionByMonth: groupSum(bookings, (b) => b.createdAt.slice(0, 7), (b) =>
        money(b.money.commission - b.money.commissionReversed),
      ).sort((a, b) => a.key.localeCompare(b.key)),
    });
  },

  /**
   * The financial timeline of a payout, in the platform's canonical states.
   *
   * The settlement machine has its own status vocabulary; this maps it onto the
   * pending → eligible → approved → released → paid chain the business talks in,
   * so admin, merchant and finance describe a payout the same way.
   */
  payoutTimeline(settlement: Settlement) {
    const order: SettlementStatus[] = [
      "pending",
      "scheduled",
      "processing",
      "paid",
    ];
    const reached = order.indexOf(settlement.status);
    const held = settlement.status === "on_hold";
    const reversed = settlement.status === "failed";
    return [
      {
        key: "pending",
        label: "Pending",
        note: "Bookings accrued; the batch is still open.",
        done: reached >= 0 || held || reversed,
      },
      {
        key: "eligible",
        label: "Eligible",
        note: "Delivery confirmed and the payout window has opened.",
        done: reached >= 1 || reversed,
      },
      {
        key: "held",
        label: "Held",
        note: "On hold pending a dispute or verification.",
        done: held,
        skipped: !held,
      },
      {
        key: "approved",
        label: "Approved",
        note: `Scheduled for ${settlement.scheduledFor.slice(0, 10)} via ${settlement.method}.`,
        done: reached >= 1,
      },
      {
        key: "released",
        label: "Released",
        note: "Sent to the payment rail.",
        done: reached >= 2,
      },
      {
        key: "paid",
        label: "Paid",
        note: settlement.paidAt
          ? `Settled ${settlement.paidAt.slice(0, 10)}.`
          : "Not yet settled.",
        done: reached >= 3,
      },
      {
        key: "reversed",
        label: "Reversed",
        note: "The payout failed and was returned.",
        done: reversed,
        skipped: !reversed,
      },
    ];
  },

  async all(scope: DomainScope = SCOPE_NONE): Promise<Settlement[]> {
    return delay(getState().settlements.filter((s) => inScope(scope, s)));
  },
};

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export type OfferInput = Omit<Offer, "id" | "used" | "createdAt">;

export const offerService = {
  async list(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<Offer>> {
    // A merchant sees platform offers (which apply to their inventory) plus
    // their own; they can only *edit* their own — enforced in update/remove.
    const rows = getState().offers.filter(
      (o) => !scope.merchantId || o.scope === "platform" || o.merchantId === scope.merchantId,
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.name, r.description, r.promoCode ?? "", r.merchantName ?? ""],
        sortValue: (row, field) =>
          field === "startAt" || field === "endAt" || field === "createdAt"
            ? new Date(row[field]).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          scope: (row, value) => row.scope === value,
          offerType: (row, value) => row.offerType === value,
          discountType: (row, value) => row.discountType === value,
        },
        defaultSort: byNewest,
      }),
    );
  },

  async get(id: string): Promise<Offer> {
    return delay(structuredClone(getState().offers.find((o) => o.id === id) ?? notFound("Offer")));
  },

  async create(input: OfferInput, actor: DomainActor = SYSTEM_ACTOR): Promise<Offer> {
    if (actor.merchantId && input.scope === "platform") {
      forbidden("Merchants can't create platform-wide offers.");
    }
    const offer: Offer = {
      ...input,
      id: nextId("ofr"),
      used: 0,
      createdAt: new Date().toISOString(),
      merchantId: actor.merchantId ?? input.merchantId,
    };
    mutate((draft) => draft.offers.unshift(offer));
    recordAudit({
      actor,
      action: "create",
      entity: "offer",
      entityId: offer.id,
      entityLabel: offer.name,
      summary: `Created ${offer.scope} offer "${offer.name}"`,
      to: offer.status,
    });
    notify({
      category: "offer",
      audience: offer.scope === "platform" ? ["admin", "merchant"] : ["admin"],
      title: "Offer created",
      body: `${offer.name} · ${offer.discountType === "percent" ? `${offer.value}%` : `$${offer.value}`} off`,
      href: "/dashboard/promotions/offers",
      tone: "success",
      merchantId: offer.merchantId,
    });
    return delay(offer);
  },

  async update(
    id: string,
    patch: Partial<OfferInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Offer> {
    const offer = mutate((draft) => {
      const row = draft.offers.find((o) => o.id === id) ?? notFound("Offer");
      if (actor.merchantId && row.merchantId !== actor.merchantId) {
        forbidden("You can only edit your own offers.");
      }
      Object.assign(row, patch);
      return structuredClone(row);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "offer",
      entityId: offer.id,
      entityLabel: offer.name,
      summary: `Updated offer "${offer.name}"`,
      to: offer.status,
    });
    return delay(offer);
  },

  async remove(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const label = mutate((draft) => {
      const row = draft.offers.find((o) => o.id === id) ?? notFound("Offer");
      if (actor.merchantId && row.merchantId !== actor.merchantId) {
        forbidden("You can only delete your own offers.");
      }
      draft.offers = draft.offers.filter((o) => o.id !== id);
      return row.name;
    });
    recordAudit({
      actor,
      action: "delete",
      entity: "offer",
      entityId: id,
      entityLabel: label,
      summary: `Deleted offer "${label}"`,
    });
    return delay(undefined);
  },

  /** Validate a promo code against a prospective booking. */
  async validateCode(code: string, ctx: OfferContext) {
    const offer = getState().offers.find(
      (o) => o.promoCode?.toUpperCase() === code.trim().toUpperCase(),
    );
    if (!offer) {
      return delay({
        applicable: false as const,
        discount: 0,
        reason: "That promo code doesn't exist.",
        offer: undefined,
      });
    }
    const evaluation = evaluateOffer(offer, ctx);
    return delay({ ...evaluation, offer });
  },

  /** Offers that apply automatically to a context (no code needed). */
  async applicable(ctx: OfferContext): Promise<{ offer: Offer; discount: number }[]> {
    const rows = getState().offers.filter((o) => !o.promoCode && o.status === "active");
    return delay(
      rows
        .map((offer) => ({ offer, evaluation: evaluateOffer(offer, ctx) }))
        .filter((x) => x.evaluation.applicable)
        .map((x) => ({ offer: x.offer, discount: x.evaluation.discount })),
    );
  },
};

// ---------------------------------------------------------------------------
// Combo offers
// ---------------------------------------------------------------------------

export type ComboInput = Omit<ComboOffer, "id" | "sold" | "createdAt">;

export const comboService = {
  async list(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<ComboOffer>> {
    const rows = getState().combos.filter(
      (c) => !scope.merchantId || c.items.some((i) => i.merchantId === scope.merchantId),
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.name, r.destination, r.description],
        sortValue: (row, field) =>
          field === "validFrom" || field === "validTo" || field === "createdAt"
            ? new Date(row[field]).getTime()
            : field === "comboPrice"
              ? row.comboPrice
              : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          destination: (row, value) => row.destination === value,
        },
        defaultSort: byNewest,
      }),
    );
  },

  async get(id: string): Promise<ComboOffer> {
    return delay(
      structuredClone(getState().combos.find((c) => c.id === id) ?? notFound("Combo offer")),
    );
  },

  /** Derived economics: individual total, savings and per-item allocation. */
  totals: comboTotals,

  async create(input: ComboInput, actor: DomainActor = SYSTEM_ACTOR): Promise<ComboOffer> {
    const combo: ComboOffer = {
      ...input,
      id: nextId("cmb"),
      sold: 0,
      createdAt: new Date().toISOString(),
    };
    mutate((draft) => draft.combos.unshift(combo));
    const totals = comboTotals(combo);
    recordAudit({
      actor,
      action: "create",
      entity: "combo_offer",
      entityId: combo.id,
      entityLabel: combo.name,
      summary: `Created combo "${combo.name}" — ${combo.items.length} products, $${totals.savings.toFixed(2)} saving`,
      to: combo.status,
    });
    notify({
      category: "offer",
      audience: ["admin", "merchant"],
      title: "Combo offer created",
      body: `${combo.name} · $${totals.comboPrice.toFixed(2)} (save $${totals.savings.toFixed(2)})`,
      href: "/dashboard/promotions/combos",
      tone: "success",
    });
    return delay(combo);
  },

  async update(
    id: string,
    patch: Partial<ComboInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<ComboOffer> {
    const combo = mutate((draft) => {
      const row = draft.combos.find((c) => c.id === id) ?? notFound("Combo offer");
      Object.assign(row, patch);
      return structuredClone(row);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "combo_offer",
      entityId: combo.id,
      entityLabel: combo.name,
      summary: `Updated combo "${combo.name}"`,
      to: combo.status,
    });
    return delay(combo);
  },

  async remove(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const label = mutate((draft) => {
      const row = draft.combos.find((c) => c.id === id) ?? notFound("Combo offer");
      draft.combos = draft.combos.filter((c) => c.id !== id);
      return row.name;
    });
    recordAudit({
      actor,
      action: "delete",
      entity: "combo_offer",
      entityId: id,
      entityLabel: label,
      summary: `Deleted combo "${label}"`,
    });
    return delay(undefined);
  },
};

// ---------------------------------------------------------------------------
// B2B
// ---------------------------------------------------------------------------

export type B2BAccountInput = Omit<B2BAccount, "id" | "creditUsed" | "createdAt">;

export const b2bService = {
  async listAccounts(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<B2BAccount>> {
    const rows = getState().b2bAccounts.filter(
      (a) => !scope.organizationId || a.id === scope.organizationId,
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.name, r.code, r.contactName, r.contactEmail, r.country],
        sortValue: (row, field) =>
          field === "createdAt"
            ? new Date(row.createdAt).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          type: (row, value) => row.type === value,
          settlementTerm: (row, value) => row.settlementTerm === value,
        },
        defaultSort: byNewest,
      }),
    );
  },

  async getAccount(id: string): Promise<B2BAccount> {
    return delay(
      structuredClone(getState().b2bAccounts.find((a) => a.id === id) ?? notFound("B2B account")),
    );
  },

  async createAccount(
    input: B2BAccountInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<B2BAccount> {
    const account: B2BAccount = {
      ...input,
      id: nextId("org"),
      creditUsed: 0,
      createdAt: new Date().toISOString(),
    };
    mutate((draft) => draft.b2bAccounts.unshift(account));
    recordAudit({
      actor,
      action: "create",
      entity: "b2b_account",
      entityId: account.id,
      entityLabel: account.name,
      summary: `Created ${account.type.replace(/_/g, " ")} account ${account.name} (${account.code})`,
      to: account.status,
    });
    return delay(account);
  },

  async updateAccount(
    id: string,
    patch: Partial<B2BAccountInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<B2BAccount> {
    const account = mutate((draft) => {
      const row = draft.b2bAccounts.find((a) => a.id === id) ?? notFound("B2B account");
      const from = row.status;
      const beforeLimit = row.creditLimit;
      Object.assign(row, patch);
      return { row: structuredClone(row), from, beforeLimit };
    });
    // A credit-limit change is a lending decision, so it is audited with the
    // before/after value rather than a generic "updated".
    const creditChanged =
      patch.creditLimit !== undefined && patch.creditLimit !== account.beforeLimit;
    recordAudit({
      actor,
      action:
        patch.status === "suspended"
          ? "suspend"
          : patch.status === "active"
            ? "activate"
            : "update",
      entity: "b2b_account",
      entityId: id,
      entityLabel: account.row.name,
      summary: creditChanged
        ? `Changed ${account.row.name} credit limit to ${account.row.currency} ${account.row.creditLimit.toFixed(2)}`
        : `Updated B2B account ${account.row.name}`,
      from: creditChanged ? account.beforeLimit.toFixed(2) : account.from,
      to: creditChanged ? account.row.creditLimit.toFixed(2) : account.row.status,
    });
    if (creditChanged) {
      notify({
        category: "system",
        audience: ["admin", "agency"],
        title: "Credit limit changed",
        body: `${account.row.name}: ${account.row.currency} ${account.beforeLimit.toFixed(2)} → ${account.row.creditLimit.toFixed(2)}`,
        href: "/dashboard/b2b/accounts",
        tone: "warning",
        organizationId: id,
      });
    }
    return delay(account.row);
  },

  /** Credit position for an account — drives the credit meter. */
  async creditStatus(id: string) {
    const state = getState();
    const account = state.b2bAccounts.find((a) => a.id === id) ?? notFound("B2B account");
    const invoices = state.b2bInvoices.filter((i) => i.accountId === id);
    const outstanding = money(invoices.reduce((n, i) => n + i.balance, 0));
    const overdue = money(
      invoices.filter((i) => i.status === "overdue").reduce((n, i) => n + i.balance, 0),
    );
    const nextDue = invoices
      .filter((i) => i.balance > 0)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    return delay({
      currency: account.currency,
      creditLimit: account.creditLimit,
      creditUsed: account.creditUsed,
      available: money(Math.max(0, account.creditLimit - account.creditUsed)),
      utilization: account.creditLimit
        ? money((account.creditUsed / account.creditLimit) * 100)
        : 0,
      outstanding,
      overdue,
      invoiceCount: invoices.length,
      dueAt: nextDue?.dueAt,
      dueAmount: nextDue?.balance ?? 0,
      blocked: account.status !== "active",
    });
  },

  /**
   * Can this account commit `amount` right now? The same check
   * `bookingService.create` enforces, exposed so a UI can warn *before* the
   * traveller fills in a form.
   */
  async checkCredit(
    id: string,
    amount: number,
  ): Promise<{ ok: boolean; available: number; currency: string; reason?: string }> {
    const account =
      getState().b2bAccounts.find((a) => a.id === id) ?? notFound("B2B account");
    const available = money(Math.max(0, account.creditLimit - account.creditUsed));
    if (account.status !== "active") {
      return delay(
        {
          ok: false,
          available,
          currency: account.currency,
          reason: `${account.name} is ${account.status} and can't book on credit.`,
        },
        120,
      );
    }
    return delay(
      {
        ok: amount <= available,
        available,
        currency: account.currency,
        reason:
          amount <= available
            ? undefined
            : `Needs ${account.currency} ${money(amount - available).toFixed(2)} more credit.`,
      },
      120,
    );
  },

  /**
   * The commercial build-up for an account at a given public rate — the
   * transparent view of Model 1 / 2 / 3 the admin UI renders line by line.
   */
  async terms(id: string, publicRate = 1_000) {
    const account =
      getState().b2bAccounts.find((a) => a.id === id) ?? notFound("B2B account");
    const pricing = priceB2B({
      publicRate,
      netRateDiscount: account.netRateDiscount,
      markupRate: account.defaultMarkupRate,
      model: account.commercialModel,
      agencyCommissionRate: account.agencyCommissionRate,
    });
    // The platform's own commission is decided by the rule engine, exactly as
    // it would be on a real booking through this account.
    const resolution = resolveCommission({
      b2bAccountId: account.id,
      gross: pricing.transactionValue,
      net: pricing.transactionValue,
    });
    const platformMargin = money(resolution.commission - pricing.agencyCommission);
    return delay({
      account,
      pricing,
      resolution,
      platformCommission: resolution.commission,
      /** What the platform keeps after paying the agency its commission. */
      platformMargin,
      supplierPayable: money(pricing.transactionValue - resolution.commission),
      lines: [
        ...pricing.lines,
        {
          label: `Platform commission (${resolution.rate}%)`,
          amount: resolution.commission,
          tone: "positive" as const,
        },
        ...(pricing.agencyCommission > 0
          ? [
              {
                label: "Less agency commission",
                amount: pricing.agencyCommission,
                tone: "negative" as const,
              },
            ]
          : []),
        { label: "Platform margin", amount: platformMargin },
      ],
    });
  },

  /** Named users who book under an account. */
  async subUsers(id: string): Promise<B2BSubUser[]> {
    return delay(getState().b2bSubUsers.filter((u) => u.accountId === id));
  },

  /**
   * A period statement: opening balance, the bookings and invoices raised
   * against it, payments received, and the closing balance.
   */
  async statement(id: string, from: string, to: string) {
    const state = getState();
    const account = state.b2bAccounts.find((a) => a.id === id) ?? notFound("B2B account");
    const inWindow = (iso: string) => iso >= from && iso <= `${to}T23:59:59.999Z`;

    const bookings = state.bookings.filter(
      (b) => b.customer.organizationId === id && inWindow(b.createdAt),
    );
    const invoices = state.b2bInvoices.filter(
      (i) => i.accountId === id && inWindow(i.issuedAt),
    );
    const priorInvoices = state.b2bInvoices.filter(
      (i) => i.accountId === id && i.issuedAt < from,
    );

    const charges = money(invoices.reduce((n, i) => n + i.total, 0));
    const payments = money(invoices.reduce((n, i) => n + i.paid, 0));
    const opening = money(priorInvoices.reduce((n, i) => n + i.balance, 0));
    const platformMargin = money(
      bookings.reduce((n, b) => n + b.money.commission - b.money.commissionReversed, 0),
    );

    return delay({
      account,
      from,
      to,
      opening,
      charges,
      payments,
      closing: money(opening + charges - payments),
      bookings,
      invoices,
      bookingCount: bookings.length,
      grossValue: money(bookings.reduce((n, b) => n + b.money.total, 0)),
      netValue: money(bookings.reduce((n, b) => n + b.money.base, 0)),
      markup: money(bookings.reduce((n, b) => n + b.money.markup, 0)),
      platformMargin,
    });
  },

  /**
   * Charge the account's B2B subscription for another period. Simulated —
   * the prototype has no recurring billing.
   */
  async chargeSubscription(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<B2BAccount> {
    const account =
      getState().b2bAccounts.find((a) => a.id === id) ?? notFound("B2B account");
    if (account.subscriptionFee <= 0) {
      throw new ApiError({
        kind: "validation",
        message: `${account.name} is on the free Standard tier.`,
      });
    }
    const renewsAt = new Date(
      Math.max(
        new Date(account.subscriptionRenewsAt ?? new Date().toISOString()).getTime(),
        Date.now(),
      ) +
        90 * 86_400_000,
    ).toISOString();
    const updated = mutate((draft) => {
      const row = draft.b2bAccounts.find((a) => a.id === id)!;
      row.subscriptionRenewsAt = renewsAt;
      return structuredClone(row);
    });
    recordRevenue({
      at: new Date().toISOString(),
      source: "b2b_subscription",
      status: "finalized",
      currency: account.currency,
      label: `${account.name} — ${account.tier} B2B access`,
      grossValue: account.subscriptionFee,
      partnerShare: 0,
      amount: account.subscriptionFee,
      organizationId: account.id,
      organizationName: account.name,
      note: "Simulated subscription period — no recurring billing in the prototype.",
    });
    recordAudit({
      actor,
      action: "update",
      entity: "b2b_account",
      entityId: id,
      entityLabel: account.name,
      summary: `Charged ${account.currency} ${account.subscriptionFee.toFixed(2)} for ${account.tier} B2B access`,
      to: renewsAt.slice(0, 10),
    });
    return delay(updated);
  },

  async listInvoices(
    params: ListParams = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<B2BInvoice>> {
    const rows = getState().b2bInvoices.filter(
      (i) => !scope.organizationId || i.accountId === scope.organizationId,
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.number, r.accountName],
        sortValue: (row, field) =>
          field === "issuedAt" || field === "dueAt"
            ? new Date(row[field]).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          accountId: (row, value) => row.accountId === value,
        },
        defaultSort: (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
      }),
    );
  },

  /** Record a payment against a B2B invoice and release the credit. */
  async payInvoice(
    id: string,
    amount: number,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<B2BInvoice> {
    const invoice = mutate((draft) => {
      const row = draft.b2bInvoices.find((i) => i.id === id) ?? notFound("Invoice");
      if (amount <= 0) {
        throw new ApiError({ kind: "validation", message: "Enter an amount above zero." });
      }
      const applied = Math.min(amount, row.balance);
      row.paid = money(row.paid + applied);
      row.balance = money(row.total - row.paid);
      row.status = row.balance <= 0 ? "paid" : "part_paid";
      const account = draft.b2bAccounts.find((a) => a.id === row.accountId);
      if (account) account.creditUsed = money(Math.max(0, account.creditUsed - applied));
      return structuredClone(row);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "b2b_invoice",
      entityId: invoice.id,
      entityLabel: invoice.number,
      summary: `Recorded payment on ${invoice.number} — balance ${invoice.currency} ${invoice.balance.toFixed(2)}`,
      to: invoice.status,
    });
    notify({
      category: "payment",
      audience: ["admin", "agency"],
      title: "B2B payment recorded",
      body: `${invoice.number} · ${invoice.accountName} · balance ${invoice.currency} ${invoice.balance.toFixed(2)}`,
      href: "/dashboard/b2b/invoices",
      tone: "success",
      organizationId: invoice.accountId,
    });
    return delay(invoice);
  },

  /** B2B roll-up for the segment dashboard. */
  async summary(scope: DomainScope = SCOPE_NONE) {
    const state = getState();
    const accounts = state.b2bAccounts.filter(
      (a) => !scope.organizationId || a.id === scope.organizationId,
    );
    const bookings = state.bookings.filter(
      (b) =>
        b.segment === "b2b" &&
        (!scope.organizationId || b.customer.organizationId === scope.organizationId),
    );
    const invoices = state.b2bInvoices.filter(
      (i) => !scope.organizationId || i.accountId === scope.organizationId,
    );
    const b2cBookings = state.bookings.filter((b) => b.segment === "b2c");

    return delay({
      currency: "USD",
      accounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === "active").length,
      pendingAccounts: accounts.filter((a) => a.status === "pending").length,
      bookings: bookings.length,
      netValue: money(bookings.reduce((n, b) => n + b.money.base, 0)),
      markup: money(bookings.reduce((n, b) => n + b.money.markup, 0)),
      commission: money(bookings.reduce((n, b) => n + b.money.commission, 0)),
      invoiced: money(invoices.reduce((n, i) => n + i.total, 0)),
      outstanding: money(invoices.reduce((n, i) => n + i.balance, 0)),
      overdue: money(
        invoices.filter((i) => i.status === "overdue").reduce((n, i) => n + i.balance, 0),
      ),
      creditLimit: money(accounts.reduce((n, a) => n + a.creditLimit, 0)),
      creditUsed: money(accounts.reduce((n, a) => n + a.creditUsed, 0)),
      /** Side-by-side with B2C so the two models are comparable. */
      b2cBookings: b2cBookings.length,
      b2cGmv: money(b2cBookings.reduce((n, b) => n + b.money.total, 0)),
      b2bGmv: money(bookings.reduce((n, b) => n + b.money.total, 0)),

      // --- platform revenue from the B2B side ------------------------------
      /** Commission on B2B bookings, net of reversals — the platform's margin. */
      platformMargin: money(
        bookings.reduce((n, b) => n + b.money.commission - b.money.commissionReversed, 0),
      ),
      /** What agencies keep: their markup plus any agency commission. */
      agencyEarning: money(bookings.reduce((n, b) => n + b.money.markup, 0)),
      subscriptionRevenue: money(
        getState()
          .revenueEntries.filter(
            (e) =>
              e.source === "b2b_subscription" &&
              (!scope.organizationId || e.organizationId === scope.organizationId),
          )
          .reduce((n, e) => n + e.net, 0),
      ),
      subscribedAccounts: accounts.filter((a) => a.subscriptionFee > 0).length,
      byModel: groupSum(
        accounts,
        (a) => a.commercialModel,
        () => 1,
      ),
      byAccount: groupSum(
        bookings,
        (b) => b.customer.organizationId ?? "—",
        (b) => money(b.money.commission - b.money.commissionReversed),
        (b) => b.customer.organizationName ?? "—",
      ),
    });
  },
};

// ---------------------------------------------------------------------------
// Commission configuration
// ---------------------------------------------------------------------------

/**
 * The commission rule book. Every change is audited with the before/after
 * value, because a commission rate is the single most consequential number an
 * operator can edit.
 */
export const commissionRuleService = {
  async list(params: ListParams = {}): Promise<Paginated<CommissionRule>> {
    return delay(
      queryList(commissionRuleStore.list(), {
        params,
        searchFields: (r) => [r.name, r.targetLabel, r.targetId, r.note ?? ""],
        sortValue: (row, field) =>
          field === "effectiveFrom"
            ? new Date(row.effectiveFrom).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          scope: (row, value) => row.scope === value,
          status: (row, value) => row.status === value,
          basis: (row, value) => row.basis === value,
          calc: (row, value) => row.calc === value,
        },
      }),
    );
  },

  async all(): Promise<CommissionRule[]> {
    return delay(commissionRuleStore.list());
  },

  async get(id: string): Promise<CommissionRule> {
    return delay(commissionRuleStore.get(id) ?? notFound("Commission rule"));
  },

  async create(
    input: CommissionRuleInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<CommissionRule> {
    const rule = commissionRuleStore.create(input, actor.name);
    recordAudit({
      actor,
      action: "create",
      entity: "commission_rule",
      entityId: rule.id,
      entityLabel: rule.name,
      summary: `Created commission rule ${rule.name} — ${describeRule(rule)} on ${rule.targetLabel}`,
      to: describeRule(rule),
    });
    notify({
      category: "commission",
      audience: ["admin"],
      title: "Commission rule created",
      body: `${rule.name} · ${describeRule(rule)} · ${rule.targetLabel}`,
      href: "/dashboard/finance/commission/rules",
      tone: "neutral",
    });
    return delay(rule);
  },

  async update(
    id: string,
    patch: Partial<CommissionRuleInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<CommissionRule> {
    const result = commissionRuleStore.update(id, patch, actor.name);
    if (!result) notFound("Commission rule");
    recordAudit({
      actor,
      action: "update",
      entity: "commission_rule",
      entityId: id,
      entityLabel: result.after.name,
      summary: `Changed commission rule ${result.after.name} on ${result.after.targetLabel}`,
      from: describeRule(result.before),
      to: describeRule(result.after),
    });
    notify({
      category: "commission",
      audience: ["admin"],
      title: "Commission rule changed",
      body: `${result.after.name}: ${describeRule(result.before)} → ${describeRule(result.after)}`,
      href: "/dashboard/finance/commission/rules",
      tone: "warning",
    });
    return delay(result.after);
  },

  async remove(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const removed = commissionRuleStore.remove(id);
    if (!removed) notFound("Commission rule");
    recordAudit({
      actor,
      action: "delete",
      entity: "commission_rule",
      entityId: id,
      entityLabel: removed.name,
      summary: `Deleted commission rule ${removed.name} (${removed.targetLabel})`,
      from: describeRule(removed),
    });
  },

  /** Dry-run the rule book against a hypothetical booking. */
  async preview(ctx: CommissionContext): Promise<{
    resolution: CommissionResolution;
    candidates: CommissionRule[];
  }> {
    return delay(
      { resolution: resolveCommission(ctx), candidates: matchingRules(ctx) },
      120,
    );
  },

  /**
   * The commission lifecycle for one booking: accrual → finalisation →
   * reversal, with the numbers at each step.
   */
  async lifecycle(bookingId: string, scope: DomainScope = SCOPE_NONE) {
    const booking = findBooking(bookingId);
    if (!inScope(scope, booking)) forbidden("Not your booking.");
    const entry = getState().commissions.find((c) => c.bookingId === bookingId);
    const m = booking.money;
    const stages = [
      {
        key: "accrued",
        label: "Commission accrued",
        at: booking.createdAt,
        amount: m.commission,
        done: true,
        note: `${m.commissionRate}% of ${m.commissionBasis === "gross" ? "gross" : "net"} sale (${m.currency} ${m.commissionBase.toFixed(2)})`,
      },
      {
        key: "finalized",
        label: "Commission finalized",
        at: booking.status === "completed" ? booking.updatedAt : undefined,
        amount: m.commission,
        done: booking.status === "completed",
        note: "Booking delivered — the commission is no longer contingent.",
      },
      {
        key: "settled",
        label: "Settled to the merchant",
        at: entry?.settlementId ? booking.updatedAt : undefined,
        amount: m.netSettlement,
        done: entry?.status === "settled",
        note: entry?.settlementId
          ? `Included in settlement ${entry.settlementId}`
          : "Awaiting the next payout run.",
      },
      {
        key: "reversed",
        label: "Commission reversed",
        at: m.commissionReversed > 0 ? booking.updatedAt : undefined,
        amount: m.commissionReversed,
        done: m.commissionReversed > 0,
        note:
          m.commissionReversed > 0
            ? "Refund issued — commission returned proportionally."
            : "No refund on this booking.",
      },
    ];
    return delay({ booking, entry, stages });
  },
};

// ---------------------------------------------------------------------------
// Platform revenue
// ---------------------------------------------------------------------------

function revenueScopeFor(scope: DomainScope): RevenueScope {
  return { merchantId: scope.merchantId, organizationId: scope.organizationId };
}

/**
 * The Revenue Center's data source. Every figure comes from
 * {@link revenueLedger}, so the answer to "where does Otithee make money?" has
 * exactly one definition.
 */
export const revenueService = {
  async ledger(
    filters: RevenueFilters = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<RevenueEntry[]> {
    return delay(revenueLedger(filters, revenueScopeFor(scope)));
  },

  async list(
    params: ListParams = {},
    filters: RevenueFilters = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Paginated<RevenueEntry>> {
    const rows = revenueLedger(filters, revenueScopeFor(scope));
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [
          r.label,
          r.reference,
          r.bookingRef ?? "",
          r.merchantName ?? "",
          r.organizationName ?? "",
          r.customerName ?? "",
        ],
        sortValue: (row, field) =>
          field === "at"
            ? new Date(row.at).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        defaultSort: (a, b) => b.at.localeCompare(a.at),
      }),
    );
  },

  async summary(
    filters: RevenueFilters = {},
    scope: DomainScope = SCOPE_NONE,
  ): Promise<RevenueSummary> {
    return delay(summarizeRevenue(revenueLedger(filters, revenueScopeFor(scope))));
  },

  /** Everything the Revenue Center renders, in one call. */
  async center(filters: RevenueFilters = {}, scope: DomainScope = SCOPE_NONE) {
    const entries = revenueLedger(filters, revenueScopeFor(scope));
    const state = getState();
    const bookings = state.bookings.filter((b) => inScope(scope, b));
    const settlements = state.settlements.filter((s) => inScope(scope, s));
    return delay({
      summary: summarizeRevenue(entries),
      byMonth: revenueByMonth(entries),
      mixByMonth: revenueMixByMonth(entries),
      byMerchant: groupRevenue(
        entries,
        (e) => e.merchantId,
        (e) => e.merchantName ?? e.merchantId ?? "—",
      ),
      byProduct: groupRevenue(entries, (e) => e.productKind),
      byDestination: groupRevenue(entries, (e) => e.destination),
      byAccount: groupRevenue(
        entries,
        (e) => e.organizationId,
        (e) => e.organizationName ?? e.organizationId ?? "—",
      ),
      byCustomer: groupRevenue(
        entries,
        (e) => e.customerEmail,
        (e) => e.customerName ?? e.customerEmail ?? "—",
      ),
      bySegment: groupRevenue(entries, (e) => e.segment),
      /** Booking-side reconciliation, so the two engines can be compared. */
      financials: platformFinancials(bookings, settlements),
      recent: entries.slice(0, 12),
    });
  },

  /** Record a manual revenue adjustment — always audited. */
  async adjust(
    input: {
      amount: number;
      label: string;
      note?: string;
      merchantId?: string;
      merchantName?: string;
      organizationId?: string;
      currency?: string;
    },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<RevenueEntry> {
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      throw new ApiError({ kind: "validation", message: "Enter a non-zero amount." });
    }
    const entry = recordRevenue({
      at: new Date().toISOString(),
      source: "adjustment",
      status: "finalized",
      currency: input.currency ?? PRICING_CONFIG.currency,
      label: input.label,
      grossValue: 0,
      partnerShare: 0,
      amount: money(input.amount),
      merchantId: input.merchantId,
      merchantName: input.merchantName,
      organizationId: input.organizationId,
      note: input.note,
    });
    recordAudit({
      actor,
      action: "create",
      entity: "revenue_adjustment",
      entityId: entry.id,
      entityLabel: entry.reference,
      summary: `Revenue adjustment ${entry.reference} — ${entry.currency} ${entry.amount.toFixed(2)} · ${entry.label}`,
      to: entry.amount.toFixed(2),
    });
    return delay(entry);
  },
};

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export const insuranceAdminService = {
  async providers(): Promise<InsuranceProvider[]> {
    return delay(insuranceService.providers());
  },

  async listPlans(params: ListParams = {}): Promise<Paginated<InsurancePlan>> {
    return delay(
      queryList(insuranceService.allPlans(), {
        params,
        searchFields: (r) => [r.name, r.providerName, r.summary],
        sortValue: (row, field) =>
          (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          tier: (row, value) => row.tier === value,
          providerId: (row, value) => row.providerId === value,
        },
      }),
    );
  },

  async listPolicies(params: ListParams = {}): Promise<Paginated<InsurancePolicy>> {
    return delay(
      queryList(insuranceService.policies(), {
        params,
        searchFields: (r) => [r.reference, r.bookingRef, r.customerName, r.planName],
        sortValue: (row, field) =>
          field === "purchasedAt"
            ? new Date(row.purchasedAt).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          tier: (row, value) => row.tier === value,
          planId: (row, value) => row.planId === value,
          providerId: (row, value) => row.providerId === value,
        },
        defaultSort: (a, b) => b.purchasedAt.localeCompare(a.purchasedAt),
      }),
    );
  },

  async createPlan(
    input: InsurancePlanInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<InsurancePlan> {
    const plan = insurancePlanStore.create(input);
    recordAudit({
      actor,
      action: "create",
      entity: "insurance_plan",
      entityId: plan.id,
      entityLabel: plan.name,
      summary: `Created insurance plan ${plan.name} (${plan.providerName})`,
      to: `${plan.commissionValue}${plan.commissionType === "percent" ? "%" : " USD"}`,
    });
    return delay(plan);
  },

  async updatePlan(
    id: string,
    patch: Partial<InsurancePlanInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<InsurancePlan> {
    const result = insurancePlanStore.update(id, patch);
    if (!result) notFound("Insurance plan");
    const term = (p: InsurancePlan) =>
      `${p.price}${p.pricingModel === "percent_of_trip" ? "%" : " USD"} · commission ${p.commissionValue}${p.commissionType === "percent" ? "%" : " USD"}`;
    recordAudit({
      actor,
      action: "update",
      entity: "insurance_plan",
      entityId: id,
      entityLabel: result.after.name,
      summary: `Changed insurance plan ${result.after.name}`,
      from: term(result.before),
      to: term(result.after),
    });
    notify({
      category: "insurance",
      audience: ["admin"],
      title: "Insurance plan changed",
      body: `${result.after.name}: ${term(result.before)} → ${term(result.after)}`,
      href: "/dashboard/finance/insurance",
      tone: "warning",
    });
    return delay(result.after);
  },

  /** Roll-up plus the attach rate, which needs the booking count. */
  async summary(scope: DomainScope = SCOPE_NONE) {
    const base = insuranceService.summary();
    const bookings = getState().bookings.filter(
      (b) => inScope(scope, b) && b.status !== "failed",
    );
    const withPolicy = bookings.filter((b) => b.insurancePolicyId).length;
    const policies = insuranceService.policies();
    return delay({
      ...base,
      attachRate: bookings.length > 0 ? withPolicy / bookings.length : 0,
      byPlan: groupSum(
        policies,
        (p) => p.planId,
        (p) => money(p.platformRevenue - p.revenueReversed),
        (p) => p.planName,
      ),
      byProvider: groupSum(
        policies,
        (p) => p.providerId,
        (p) => money(p.platformRevenue - p.revenueReversed),
        (p) => p.providerName,
      ),
      byTier: groupSum(
        policies,
        (p) => p.tier,
        (p) => money(p.platformRevenue - p.revenueReversed),
      ),
    });
  },
};

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export const membershipAdminService = {
  async plans(): Promise<MembershipPlan[]> {
    return delay(membershipService.plans());
  },

  async listSubscriptions(
    params: ListParams = {},
  ): Promise<Paginated<MembershipSubscription>> {
    return delay(
      queryList(membershipService.subscriptions(), {
        params,
        searchFields: (r) => [r.reference, r.customerName, r.customerEmail, r.planName],
        sortValue: (row, field) =>
          field === "startAt" || field === "renewsAt"
            ? new Date(row[field]).getTime()
            : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          planCode: (row, value) => row.planCode === value,
          billingPeriod: (row, value) => row.billingPeriod === value,
        },
        defaultSort: (a, b) => b.startAt.localeCompare(a.startAt),
      }),
    );
  },

  async summary() {
    return delay(membershipService.summary());
  },

  async updatePlan(
    id: string,
    patch: Partial<MembershipPlanInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<MembershipPlan> {
    const result = membershipPlanStore.update(id, patch);
    if (!result) notFound("Membership plan");
    recordAudit({
      actor,
      action: "update",
      entity: "membership_plan",
      entityId: id,
      entityLabel: result.after.name,
      summary: `Changed membership plan ${result.after.name}`,
      from: `$${result.before.price} ${result.before.billingPeriod}`,
      to: `$${result.after.price} ${result.after.billingPeriod}`,
    });
    notify({
      category: "membership",
      audience: ["admin"],
      title: "Membership plan changed",
      body: `${result.after.name}: $${result.before.price} → $${result.after.price}`,
      href: "/dashboard/membership",
      tone: "warning",
    });
    return delay(result.after);
  },

  /**
   * Sell a membership. Writes the subscription *and* the revenue entry — this
   * is the one place membership revenue is recognised.
   */
  async subscribe(
    input: { customerEmail: string; customerName: string; planId: string; autoRenew?: boolean },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<MembershipSubscription> {
    const plan = membershipService.plan(input.planId) ?? notFound("Membership plan");
    if (plan.status !== "active") {
      throw new ApiError({ kind: "validation", message: `${plan.name} is not on sale.` });
    }
    const sub = membershipService.subscribe(input);
    if (plan.price > 0) {
      recordRevenue({
        at: sub.startAt,
        source: "membership",
        status: "finalized",
        currency: sub.currency,
        label: `${plan.name} — ${plan.billingPeriod === "annual" ? "annual" : "monthly"} subscription`,
        grossValue: plan.price,
        partnerShare: 0,
        amount: plan.price,
        customerEmail: sub.customerEmail,
        customerName: sub.customerName,
        planId: plan.id,
      });
    }
    recordAudit({
      actor,
      action: "create",
      entity: "membership",
      entityId: sub.id,
      entityLabel: sub.reference,
      summary: `${sub.customerName} subscribed to ${plan.name} (${sub.currency} ${plan.price})`,
      to: "active",
    });
    notify({
      category: "membership",
      audience: ["admin"],
      title: "New member",
      body: `${sub.customerName} · ${plan.name} · ${sub.currency} ${plan.price.toFixed(2)}`,
      href: "/dashboard/membership",
      tone: "success",
    });
    return delay(sub);
  },

  async cancel(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<MembershipSubscription> {
    const sub = membershipService.cancel(id);
    if (!sub) notFound("Membership");
    recordAudit({
      actor,
      action: "cancel",
      entity: "membership",
      entityId: id,
      entityLabel: sub.reference,
      summary: `Cancelled ${sub.planName} for ${sub.customerName} — benefits run to ${sub.renewsAt.slice(0, 10)}`,
      to: "cancelled",
    });
    return delay(sub);
  },

  /** Simulated renewal — no real recurring billing exists in the prototype. */
  async renew(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<MembershipSubscription> {
    const sub = membershipService.renew(id);
    if (!sub) notFound("Membership");
    if (sub.price > 0) {
      recordRevenue({
        at: new Date().toISOString(),
        source: "membership",
        status: "finalized",
        currency: sub.currency,
        label: `${sub.planName} — simulated renewal`,
        grossValue: sub.price,
        partnerShare: 0,
        amount: sub.price,
        customerEmail: sub.customerEmail,
        customerName: sub.customerName,
        planId: sub.planId,
        note: "Simulated renewal — the prototype has no recurring billing.",
      });
    }
    recordAudit({
      actor,
      action: "update",
      entity: "membership",
      entityId: id,
      entityLabel: sub.reference,
      summary: `Renewed ${sub.planName} for ${sub.customerName} to ${sub.renewsAt.slice(0, 10)}`,
      to: "active",
    });
    return delay(sub);
  },

  async refund(
    id: string,
    amount: number | undefined,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<MembershipSubscription> {
    const result = membershipService.refund(id, amount);
    if (!result) notFound("Membership");
    // Reverse the most recent revenue entry for this subscriber's plan.
    const candidates = storedEntriesFor({
      planId: result.subscription.planId,
      customerEmail: result.subscription.customerEmail,
    })
      .filter((e) => e.source === "membership" && e.net > 0)
      .sort((a, b) => b.at.localeCompare(a.at));
    if (candidates[0]) {
      reverseRevenue(candidates[0].id, result.refunded, "Membership refunded.");
    }
    recordAudit({
      actor,
      action: "refund",
      entity: "membership",
      entityId: id,
      entityLabel: result.subscription.reference,
      summary: `Refunded ${result.subscription.currency} ${result.refunded.toFixed(2)} of ${result.subscription.planName}`,
      to: "cancelled",
    });
    return delay(result.subscription);
  },
};

// ---------------------------------------------------------------------------
// Advertising
// ---------------------------------------------------------------------------

export const advertisingService = {
  async advertisers(): Promise<Advertiser[]> {
    return delay(adService.advertisers());
  },

  async listCampaigns(params: ListParams = {}): Promise<Paginated<AdCampaign>> {
    return delay(
      queryList(adService.campaigns(), {
        params,
        searchFields: (r) => [r.name, r.reference, r.advertiserName, r.creativeHeadline],
        sortValue: (row, field) =>
          field === "startAt" || field === "endAt"
            ? new Date(row[field]).getTime()
            : field === "spend"
              ? campaignSpend(row)
              : (row as unknown as Record<string, string | number>)[field],
        filterPredicates: {
          status: (row, value) => row.status === value,
          placement: (row, value) => row.placement === value,
          pricingModel: (row, value) => row.pricingModel === value,
          advertiserId: (row, value) => row.advertiserId === value,
        },
        defaultSort: (a, b) => b.startAt.localeCompare(a.startAt),
      }),
    );
  },

  async get(id: string): Promise<AdCampaign> {
    return delay(adService.campaign(id) ?? notFound("Campaign"));
  },

  async performance(id: string) {
    const campaign = adService.campaign(id) ?? notFound("Campaign");
    return delay({ campaign, ...campaignPerformance(campaign) });
  },

  async create(input: AdCampaignInput, actor: DomainActor = SYSTEM_ACTOR): Promise<AdCampaign> {
    const campaign = adService.create(input);
    recordAudit({
      actor,
      action: "create",
      entity: "ad_campaign",
      entityId: campaign.id,
      entityLabel: campaign.name,
      summary: `Created campaign ${campaign.name} — ${campaign.pricingModel.toUpperCase()} $${campaign.rate}, budget $${campaign.budget}`,
      to: campaign.status,
    });
    return delay(campaign);
  },

  async update(
    id: string,
    patch: Partial<AdCampaignInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<AdCampaign> {
    const result = adService.update(id, patch);
    if (!result) notFound("Campaign");
    recordAudit({
      actor,
      action: "update",
      entity: "ad_campaign",
      entityId: id,
      entityLabel: result.after.name,
      summary: `Updated campaign ${result.after.name}`,
      from: `$${result.before.budget} budget · ${result.before.status}`,
      to: `$${result.after.budget} budget · ${result.after.status}`,
    });
    return delay(result.after);
  },

  async setStatus(
    id: string,
    status: CampaignStatus,
    options: { actor?: DomainActor; note?: string } = {},
  ): Promise<AdCampaign> {
    const actor = options.actor ?? SYSTEM_ACTOR;
    const before = adService.campaign(id) ?? notFound("Campaign");
    const campaign = adService.setStatus(id, status, { by: actor.name, note: options.note });
    if (!campaign) notFound("Campaign");
    recordAudit({
      actor,
      action:
        status === "active" ? "approve" : status === "rejected" ? "reject" : "status_change",
      entity: "ad_campaign",
      entityId: id,
      entityLabel: campaign.name,
      summary: `Campaign ${campaign.name} → ${CAMPAIGN_STATUS_LABELS[status]}`,
      from: before.status,
      to: status,
    });
    if (status === "active" || status === "rejected") {
      notify({
        category: "advertising",
        audience: ["admin", "merchant"],
        title: status === "active" ? "Campaign approved" : "Campaign rejected",
        body: `${campaign.name} · ${campaign.advertiserName}`,
        href: "/dashboard/advertising",
        tone: status === "active" ? "success" : "danger",
        merchantId: adService.advertiser(campaign.advertiserId)?.merchantId,
      });
    }
    return delay(campaign);
  },

  /** Record delivery from a storefront placement. */
  async recordEvent(
    id: string,
    event: "impression" | "click" | "conversion",
    payload: { value?: number; count?: number } = {},
  ): Promise<AdCampaign | undefined> {
    return adService.recordEvent(id, event, payload);
  },

  /** Recognise unbilled spend as advertising revenue. */
  async bill(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<{ campaign: AdCampaign; amount: number }> {
    const result = adService.bill(id);
    if (!result) notFound("Campaign");
    if (result.amount <= 0) {
      throw new ApiError({
        kind: "validation",
        message: "This campaign has no unbilled spend.",
      });
    }
    recordRevenue({
      at: new Date().toISOString(),
      source: "advertising",
      status: result.campaign.status === "completed" ? "finalized" : "accrued",
      currency: result.campaign.currency,
      label: `${result.campaign.name} — ${result.campaign.pricingModel.toUpperCase()} billing`,
      grossValue: result.amount,
      partnerShare: 0,
      amount: result.amount,
      campaignId: result.campaign.id,
      advertiserId: result.campaign.advertiserId,
      merchantId: adService.advertiser(result.campaign.advertiserId)?.merchantId,
      note: spendExplanation(result.campaign),
    });
    recordAudit({
      actor,
      action: "update",
      entity: "ad_campaign",
      entityId: id,
      entityLabel: result.campaign.name,
      summary: `Billed ${result.campaign.currency} ${result.amount.toFixed(2)} on ${result.campaign.name} — ${spendExplanation(result.campaign)}`,
      to: result.amount.toFixed(2),
    });
    return delay(result);
  },

  async summary() {
    const base = adService.summary();
    const campaigns = adService.campaigns();
    return delay({
      ...base,
      byPlacement: groupSum(
        campaigns,
        (c) => c.placement,
        (c) => campaignSpend(c),
        (c) => PLACEMENT_LABELS[c.placement],
      ),
      byModel: groupSum(
        campaigns,
        (c) => c.pricingModel,
        (c) => campaignSpend(c),
        (c) => PRICING_MODEL_LABELS[c.pricingModel],
      ),
      byAdvertiser: groupSum(
        campaigns,
        (c) => c.advertiserId,
        (c) => campaignSpend(c),
        (c) => c.advertiserName,
      ),
    });
  },
};

// ---------------------------------------------------------------------------
// Revenue management
// ---------------------------------------------------------------------------

export const revenueManagementService = {
  async rules(scope: { propertyId?: string } = {}): Promise<PricingRule[]> {
    return delay(pricingRuleStore.list(scope));
  },

  async createRule(
    input: PricingRuleInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PricingRule> {
    const rule = pricingRuleStore.create(input, actor.name);
    recordAudit({
      actor,
      action: "create",
      entity: "pricing_rule",
      entityId: rule.id,
      entityLabel: rule.name,
      summary: `Created pricing rule ${rule.name} (${RULE_KIND_LABELS[rule.kind]})`,
      to: `${rule.adjustmentPercent}%`,
    });
    return delay(rule);
  },

  async updateRule(
    id: string,
    patch: Partial<PricingRuleInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PricingRule> {
    const result = pricingRuleStore.update(id, patch, actor.name);
    if (!result) notFound("Pricing rule");
    recordAudit({
      actor,
      action: "update",
      entity: "pricing_rule",
      entityId: id,
      entityLabel: result.after.name,
      summary: `Changed pricing rule ${result.after.name}`,
      from: `${result.before.adjustmentPercent}% @ ${Math.round(result.before.threshold * 100)}%`,
      to: `${result.after.adjustmentPercent}% @ ${Math.round(result.after.threshold * 100)}%`,
    });
    return delay(result.after);
  },

  async removeRule(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const removed = pricingRuleStore.remove(id);
    if (!removed) notFound("Pricing rule");
    recordAudit({
      actor,
      action: "delete",
      entity: "pricing_rule",
      entityId: id,
      entityLabel: removed.name,
      summary: `Deleted pricing rule ${removed.name}`,
    });
  },

  /**
   * Apply a recommendation. It writes an inventory override, so the change is
   * live for the very next quote — and it is audited like any rate change.
   */
  async apply(rec: Recommendation, actor: DomainActor = SYSTEM_ACTOR): Promise<number> {
    const days = applyRecommendation(rec, actor.name);
    recordAudit({
      actor,
      action: "update",
      entity: "rate",
      entityId: `${rec.roomTypeId}:${rec.date}`,
      entityLabel: `${rec.roomTypeName} · ${rec.date}`,
      summary: `Applied revenue-management recommendation — ${rec.message}`,
      to: rec.action.price ? `$${rec.action.price.toFixed(2)}` : RECOMMENDATION_LABELS[rec.kind],
    });
    notify({
      category: "revenue",
      audience: ["admin", "merchant"],
      title: "Rate updated by recommendation",
      body: rec.message,
      href: "/dashboard/catalog/revenue-management",
      tone: "success",
    });
    return delay(days, 120);
  },

  /** Booking pace, scoped to the caller. */
  async pace(filter: { merchantId?: string; listingId?: string } = {}) {
    return delay(bookingPace(filter));
  },

  async performance(filter: { merchantId?: string; listingId?: string } = {}) {
    return delay(bookingPerformance(filter));
  },
};

// ---------------------------------------------------------------------------
// Platform-level helpers
// ---------------------------------------------------------------------------

export const platformService = {
  /** Everything the overview page needs, in one call. */
  async overview(scope: DomainScope = SCOPE_NONE) {
    const state = getState();
    const bookings = state.bookings.filter((b) => inScope(scope, b));
    const settlements = state.settlements.filter((s) => inScope(scope, s));
    const refunds = state.refunds.filter((r) => inScope(scope, r));
    const financials = platformFinancials(bookings, settlements);

    const byMonth = groupSum(
      bookings,
      (b) => b.createdAt.slice(0, 7),
      (b) => b.money.total,
    ).sort((a, b) => a.key.localeCompare(b.key));

    return delay({
      financials,
      byMonth,
      byStatus: groupSum(bookings, (b) => b.status, () => 1),
      byProduct: groupSum(bookings, (b) => b.productKind, (b) => b.money.total),
      bySegment: groupSum(bookings, (b) => b.segment, (b) => b.money.total),
      byChannel: groupSum(bookings, (b) => b.channel, (b) => b.money.total),
      pendingRefunds: refunds.filter(
        (r) => r.status === "requested" || r.status === "under_review",
      ).length,
      failedBookings: bookings.filter((b) => b.status === "failed").length,
      needsAttention: bookings.filter((b) =>
        [
          "failed",
          "payment_pending",
          "cancellation_requested",
          "refund_pending",
          "refund_failed",
        ].includes(b.status),
      ).length,
      recentBookings: [...bookings]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    });
  },

  /** Reset the whole demo dataset (Settings action). */
  resetDemoData(actor: DomainActor = SYSTEM_ACTOR) {
    resetState();
    // Roles, feature flags, module records, platform settings and localization
    // all live in their own stores, so a reset that left a hand-edited access
    // model, tax rate or translation behind wouldn't be a reset at all.
    resetRoleRegistry();
    resetAllFlags();
    clearAllModuleState();
    resetPlatformConfig();
    resetTaxRules();
    resetLocaleSettings();
    recordAudit({
      actor,
      action: "update",
      entity: "system",
      entityId: "demo_data",
      entityLabel: "Demo dataset",
      summary:
        "Reset all demo data, roles, feature flags, module records, platform settings, tax rules and localization to the seeded state",
    });
  },

  subscribe,
};

export { PLATFORM_NOW, BOOKING_ACTIONS };
