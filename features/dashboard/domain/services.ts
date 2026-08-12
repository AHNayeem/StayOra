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
import { paginate } from "../data/types";
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
  commissionRateFor,
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
  AuditAction,
  AuditLogEntry,
  B2BAccount,
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
// Infrastructure helpers
// ---------------------------------------------------------------------------

/** Simulated network latency so loading states are real. */
const LATENCY = 320;

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function notFound(what: string): never {
  throw new ApiError({ kind: "not-found", message: `${what} could not be found.` });
}

function forbidden(message: string): never {
  throw new ApiError({ kind: "forbidden", message });
}

/**
 * The data a caller is allowed to see. Merchants are pinned to their own
 * `merchantId`, agencies to their `organizationId`, customers to `customerId`.
 * Passing an empty scope means "platform-wide" (admin/finance/support).
 */
export interface DomainScope {
  merchantId?: string;
  organizationId?: string;
  customerId?: string;
}

const SCOPE_NONE: DomainScope = {};

function inScope(
  scope: DomainScope,
  row: {
    merchant?: { id: string };
    merchantId?: string;
    customer?: { id: string; organizationId?: string };
    organizationId?: string;
    accountId?: string;
  },
): boolean {
  if (scope.merchantId) {
    const id = row.merchantId ?? row.merchant?.id;
    if (id !== scope.merchantId) return false;
  }
  if (scope.organizationId) {
    const id = row.organizationId ?? row.accountId ?? row.customer?.organizationId;
    if (id !== scope.organizationId) return false;
  }
  if (scope.customerId && row.customer?.id !== scope.customerId) return false;
  return true;
}

interface QueryOptions<T> {
  params?: ListParams;
  searchFields?: (row: T) => string[];
  sortValue?: (row: T, field: string) => string | number | undefined;
  filterPredicates?: Record<string, (row: T, value: string) => boolean>;
  defaultSort?: (a: T, b: T) => number;
}

/** Generic in-memory list pipeline: search → filter → sort → paginate. */
function queryList<T>(rows: T[], options: QueryOptions<T> = {}): Paginated<T> {
  const { params = {}, searchFields, sortValue, filterPredicates = {}, defaultSort } = options;
  const { page = 1, pageSize = 10, sort, search, filters } = params;
  let out = [...rows];

  const term = search?.trim().toLowerCase();
  if (term && searchFields) {
    out = out.filter((row) =>
      searchFields(row).some((value) => value?.toLowerCase().includes(term)),
    );
  }

  if (filters) {
    for (const [key, raw] of Object.entries(filters)) {
      if (raw === undefined || raw === null || raw === "") continue;
      const value = String(raw);
      const predicate =
        filterPredicates[key] ??
        ((row: T) => String((row as Record<string, unknown>)[key] ?? "") === value);
      out = out.filter((row) => predicate(row, value));
    }
  }

  if (sort && sortValue) {
    const dir = sort.direction === "desc" ? -1 : 1;
    out.sort((a, b) => {
      const av = sortValue(a, sort.field) ?? "";
      const bv = sortValue(b, sort.field) ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  } else if (defaultSort) {
    out.sort(defaultSort);
  }

  const total = out.length;
  const start = (page - 1) * pageSize;
  return paginate(out.slice(start, start + pageSize), { page, pageSize, total });
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** The system actor, used when no signed-in principal is supplied. */
export const SYSTEM_ACTOR: DomainActor = {
  id: "system",
  name: "System",
  role: "System",
};

// ---------------------------------------------------------------------------
// Audit + notifications (recorded by every mutating service call)
// ---------------------------------------------------------------------------

export interface RecordAuditInput {
  actor: DomainActor;
  action: AuditAction;
  entity: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  from?: string;
  to?: string;
}

function recordAudit(input: RecordAuditInput): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: nextId("aud"),
    at: new Date().toISOString(),
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    summary: input.summary,
    from: input.from,
    to: input.to,
    ip: "127.0.0.1",
  };
  mutate((draft) => draft.auditLog.unshift(entry));
  return entry;
}

export interface NotifyInput {
  category: PlatformNotification["category"];
  audience: NotificationAudience[];
  title: string;
  body: string;
  href?: string;
  tone?: PlatformNotification["tone"];
  merchantId?: string;
  organizationId?: string;
  customerId?: string;
}

function notify(input: NotifyInput): PlatformNotification {
  const notification: PlatformNotification = {
    id: nextId("ntf"),
    createdAt: new Date().toISOString(),
    read: false,
    tone: input.tone ?? "neutral",
    ...input,
  };
  mutate((draft) => draft.notifications.unshift(notification));
  return notification;
}

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
          );
          booking.payment.status =
            booking.money.refunded >= booking.money.total ? "refunded" : "partially_refunded";
          // Keep the commission ledger and settlement in step.
          const entry = draft.commissions.find((c) => c.bookingId === booking.id);
          if (entry) {
            entry.reversed = booking.money.commissionReversed;
            entry.status = "reversed";
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
    return delay(result);
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
    const base = combo ? combo.comboPrice : input.baseAmount;

    const b2b = account
      ? priceB2B({
          publicRate: base,
          netRateDiscount: account.netRateDiscount,
          markupRate: account.defaultMarkupRate,
        })
      : null;

    const discounts: Booking["discounts"] = [];
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

    const commissionRate = commissionRateFor(input.productKind, merchant.commissionRate);
    const priced = priceBooking({
      base: b2b ? b2b.netRate : base,
      markup: b2b ? b2b.markup : 0,
      discount: money(discounts.reduce((n, d) => n + d.amount, 0)),
      commissionRate,
    });

    const nights = Math.max(
      0,
      Math.round(
        (new Date(input.endAt).getTime() - new Date(input.startAt).getTime()) / 86_400_000,
      ),
    );
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
      travelers: (input.travelerNames?.length
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
      cancellationPolicyId: combo
        ? combo.cancellationPolicyId
        : defaultPolicyFor(input.productKind),
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
          );
          booking.payment.status =
            booking.money.refunded >= booking.money.total ? "refunded" : "partially_refunded";
          const entry = draft.commissions.find((c) => c.bookingId === booking.id);
          if (entry) {
            entry.reversed = booking.money.commissionReversed;
            entry.status = "reversed";
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
      Object.assign(row, patch);
      return { row: structuredClone(row), from };
    });
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
      summary: `Updated B2B account ${account.row.name}`,
      from: account.from,
      to: account.row.status,
    });
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
    });
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
    });
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
    recordAudit({
      actor,
      action: "update",
      entity: "system",
      entityId: "demo_data",
      entityLabel: "Demo dataset",
      summary: "Reset all demo data to the seeded state",
    });
  },

  subscribe,
};

export { PLATFORM_NOW, BOOKING_ACTIONS };
