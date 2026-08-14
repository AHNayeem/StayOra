/**
 * Report generation — derived from the domain, never from fixtures.
 *
 * Every report reads the same booking ledger, revenue ledger and settlement
 * records the dashboards read, so a report can never disagree with a screen.
 * Each returns its own columns, which is what lets one view render all ten.
 *
 * A real backend replaces these bodies with `httpClient` calls; the shapes are
 * already what a reporting endpoint would return.
 */

import {
  SOURCE_LABELS,
  REVENUE_SOURCES,
  groupRevenue,
  revenueLedger,
  revenueMixByMonth,
  summarizeRevenue,
  type RevenueFilters,
} from "../../domain/revenue";
import { getState } from "../../domain/store";
import { money } from "../../domain/money";
import { campaignPerformance, campaignSpend } from "../../domain/advertising";
import { membershipService } from "../../domain/membership";
import { insuranceService } from "../../domain/insurance";
import { bookingPace } from "../../domain/revenue-management";
import type { DomainScope } from "../../domain/services";
import type {
  ReportColumn,
  ReportFilters,
  ReportResult,
  ReportRow,
} from "./types";
import { REPORT_DEFS } from "./types";

const CURRENCY = "USD";

function delay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Turn a range key into an inclusive ISO window ending now. */
export function windowFor(filters: ReportFilters): { from?: string; to?: string } {
  if (filters.from || filters.to) return { from: filters.from, to: filters.to };
  const months = filters.range === "3m" ? 3 : filters.range === "6m" ? 6 : filters.range === "12m" ? 12 : 0;
  if (months === 0) return {};
  const to = new Date();
  const from = new Date(to.getTime());
  from.setUTCMonth(from.getUTCMonth() - months);
  return { from: from.toISOString(), to: to.toISOString() };
}

function toRevenueFilters(filters: ReportFilters, scope: DomainScope): RevenueFilters {
  const window = windowFor(filters);
  return {
    ...window,
    merchantId: filters.merchantId || scope.merchantId,
    organizationId: filters.organizationId || scope.organizationId,
    segment: (filters.segment as RevenueFilters["segment"]) || undefined,
  };
}

const CURRENCY_COL = (key: string, header: string): ReportColumn => ({
  key,
  header,
  format: "currency",
  align: "right",
});
const NUMBER_COL = (key: string, header: string): ReportColumn => ({
  key,
  header,
  format: "number",
  align: "right",
});

// ---------------------------------------------------------------------------
// Individual reports
// ---------------------------------------------------------------------------

function platformRevenueReport(filters: ReportFilters, scope: DomainScope): ReportResult {
  const entries = revenueLedger(toRevenueFilters(filters, scope), scope);
  const summary = summarizeRevenue(entries);
  const mix = revenueMixByMonth(entries);
  const present = REVENUE_SOURCES.filter((s) =>
    summary.bySource.some((row) => row.source === s),
  );

  return {
    id: "platform-revenue",
    name: "Platform Revenue Report",
    description: "Every platform revenue source by month, net of reversals.",
    currency: summary.currency,
    columns: [
      { key: "period", header: "Month", format: "month" },
      ...present.map((s) => CURRENCY_COL(s, SOURCE_LABELS[s])),
      CURRENCY_COL("total", "Net platform revenue"),
    ],
    rows: mix.map((row) => ({
      period: row.month,
      ...Object.fromEntries(present.map((s) => [s, row.bySource[s] ?? 0])),
      total: row.total,
    })),
    stats: [
      { label: "Gross booking value", value: fmt(summary.gmv), icon: "Wallet" },
      { label: "Partner revenue", value: fmt(summary.partnerRevenue), icon: "Store" },
      {
        label: "Net platform revenue",
        value: fmt(summary.netPlatformRevenue),
        icon: "CircleDollarSign",
        hint: `${fmt(summary.reversals + summary.subsidies)} reversed or subsidised`,
      },
      { label: "Take rate", value: `${summary.takeRate.toFixed(1)}%`, icon: "Percent" },
    ],
    trend: mix.map((row) => ({ period: row.month, value: row.total })),
    trendLabels: { primary: "Net platform revenue" },
    note: "Booking commission, service fees, the insurance margin and cancellation fees are derived from the booking ledger; membership, advertising and B2B subscriptions come from stored revenue entries. Tax is excluded — it is never platform revenue.",
  };
}

function commissionReport(filters: ReportFilters, scope: DomainScope): ReportResult {
  const window = windowFor(filters);
  const rows = getState().commissions.filter((c) => {
    if (scope.merchantId && c.merchantId !== scope.merchantId) return false;
    if (filters.merchantId && c.merchantId !== filters.merchantId) return false;
    if (window.from && c.createdAt < window.from) return false;
    if (window.to && c.createdAt > window.to) return false;
    return true;
  });

  const byMerchant = new Map<string, ReportRow>();
  for (const entry of rows) {
    const row = byMerchant.get(entry.merchantId) ?? {
      merchant: entry.merchantName,
      bookings: 0,
      netSale: 0,
      commission: 0,
      reversed: 0,
      net: 0,
      merchantEarning: 0,
      rate: 0,
    };
    row.bookings = Number(row.bookings) + 1;
    row.netSale = money(Number(row.netSale) + entry.netSale);
    row.commission = money(Number(row.commission) + entry.commission);
    row.reversed = money(Number(row.reversed) + entry.reversed);
    row.net = money(Number(row.net) + entry.commission - entry.reversed);
    row.merchantEarning = money(Number(row.merchantEarning) + entry.merchantEarning);
    row.rate =
      Number(row.netSale) > 0
        ? money((Number(row.net) / Number(row.netSale)) * 100)
        : 0;
    byMerchant.set(entry.merchantId, row);
  }

  const list = [...byMerchant.values()].sort((a, b) => Number(b.net) - Number(a.net));
  const totalNet = money(list.reduce((n, r) => n + Number(r.net), 0));
  const totalSale = money(list.reduce((n, r) => n + Number(r.netSale), 0));

  return {
    id: "commission",
    name: "Commission Report",
    description: "Commission accrued, reversed and settled, by merchant.",
    currency: CURRENCY,
    columns: [
      { key: "merchant", header: "Merchant" },
      NUMBER_COL("bookings", "Bookings"),
      CURRENCY_COL("netSale", "Net sale"),
      CURRENCY_COL("commission", "Commission accrued"),
      CURRENCY_COL("reversed", "Reversed"),
      CURRENCY_COL("net", "Net commission"),
      { key: "rate", header: "Effective rate", format: "percent", align: "right" },
      CURRENCY_COL("merchantEarning", "Merchant earning"),
    ],
    rows: list,
    stats: [
      { label: "Net commission", value: fmt(totalNet), icon: "Percent" },
      { label: "Net sales", value: fmt(totalSale), icon: "Wallet" },
      {
        label: "Effective take rate",
        value: totalSale > 0 ? `${((totalNet / totalSale) * 100).toFixed(1)}%` : "—",
        icon: "TrendingUp",
      },
      { label: "Merchants", value: String(list.length), icon: "Store" },
    ],
    trend: monthlyTrend(rows, (c) => c.createdAt, (c) => money(c.commission - c.reversed)),
    trendLabels: { primary: "Net commission" },
    note: "Rates come from the commission rule book; nothing here recomputes a percentage.",
  };
}

function insuranceReport(): ReportResult {
  const policies = insuranceService.policies();
  const byPlan = new Map<string, ReportRow>();
  for (const p of policies) {
    const row = byPlan.get(p.planId) ?? {
      plan: p.planName,
      provider: p.providerName,
      policies: 0,
      premium: 0,
      providerShare: 0,
      platformRevenue: 0,
      refunded: 0,
    };
    row.policies = Number(row.policies) + 1;
    row.premium = money(Number(row.premium) + p.premium);
    row.providerShare = money(Number(row.providerShare) + p.providerShare);
    row.platformRevenue = money(
      Number(row.platformRevenue) + p.platformRevenue - p.revenueReversed,
    );
    row.refunded = money(Number(row.refunded) + p.refunded);
    byPlan.set(p.planId, row);
  }
  const list = [...byPlan.values()].sort(
    (a, b) => Number(b.platformRevenue) - Number(a.platformRevenue),
  );

  return {
    id: "insurance-revenue",
    name: "Insurance Revenue Report",
    description: "Premium, provider payable and platform margin by plan.",
    currency: CURRENCY,
    columns: [
      { key: "plan", header: "Plan" },
      { key: "provider", header: "Provider" },
      NUMBER_COL("policies", "Policies"),
      CURRENCY_COL("premium", "Gross premium"),
      CURRENCY_COL("providerShare", "Provider payable"),
      CURRENCY_COL("platformRevenue", "Platform revenue"),
      CURRENCY_COL("refunded", "Refunded"),
    ],
    rows: list,
    stats: [
      {
        label: "Gross premium",
        value: fmt(list.reduce((n, r) => n + Number(r.premium), 0)),
        icon: "ShieldCheck",
      },
      {
        label: "Platform revenue",
        value: fmt(list.reduce((n, r) => n + Number(r.platformRevenue), 0)),
        icon: "CircleDollarSign",
      },
      { label: "Policies", value: String(policies.length), icon: "Receipt" },
      { label: "Plans", value: String(list.length), icon: "Layers" },
    ],
    trend: monthlyTrend(policies, (p) => p.purchasedAt, (p) =>
      money(p.platformRevenue - p.revenueReversed),
    ),
    trendLabels: { primary: "Insurance revenue" },
    note: "Demo products only — no underwriter is connected and no cover exists.",
  };
}

function membershipReport(): ReportResult {
  const subs = membershipService.subscriptions();
  const byPlan = new Map<string, ReportRow>();
  for (const s of subs) {
    const row = byPlan.get(s.planCode) ?? {
      plan: s.planName,
      billing: s.billingPeriod,
      members: 0,
      active: 0,
      cancelled: 0,
      revenue: 0,
      refunded: 0,
    };
    row.members = Number(row.members) + 1;
    if (s.status === "active") row.active = Number(row.active) + 1;
    if (s.status !== "active") row.cancelled = Number(row.cancelled) + 1;
    row.revenue = money(Number(row.revenue) + s.lifetimeRevenue);
    row.refunded = money(Number(row.refunded) + s.refunded);
    byPlan.set(s.planCode, row);
  }
  const list = [...byPlan.values()];
  const summary = membershipService.summary();

  return {
    id: "membership-revenue",
    name: "Membership Revenue Report",
    description: "Subscriptions, revenue and churn by plan.",
    currency: CURRENCY,
    columns: [
      { key: "plan", header: "Plan" },
      { key: "billing", header: "Billing" },
      NUMBER_COL("members", "Members"),
      NUMBER_COL("active", "Active"),
      NUMBER_COL("cancelled", "Cancelled / expired"),
      CURRENCY_COL("revenue", "Revenue"),
      CURRENCY_COL("refunded", "Refunded"),
    ],
    rows: list,
    stats: [
      { label: "Active members", value: String(summary.active), icon: "Crown" },
      { label: "Revenue", value: fmt(summary.revenue), icon: "CircleDollarSign" },
      { label: "Monthly recurring", value: fmt(summary.mrr), icon: "TrendingUp" },
      {
        label: "Churn",
        value: String(summary.cancelled + summary.expired),
        icon: "ArrowLeftRight",
      },
    ],
    trend: monthlyTrend(subs, (s) => s.startAt, (s) => s.price),
    trendLabels: { primary: "New subscription revenue" },
    note: "Renewal is simulated — the prototype has no recurring billing.",
  };
}

function advertisingReport(): ReportResult {
  const campaigns = getState().adCampaigns;
  return {
    id: "advertising-revenue",
    name: "Advertising Campaign Revenue Report",
    description: "Delivery, spend and recognised revenue by campaign.",
    currency: CURRENCY,
    columns: [
      { key: "campaign", header: "Campaign" },
      { key: "advertiser", header: "Advertiser" },
      { key: "model", header: "Model" },
      NUMBER_COL("impressions", "Impressions"),
      NUMBER_COL("clicks", "Clicks"),
      NUMBER_COL("conversions", "Bookings"),
      CURRENCY_COL("attributedValue", "Attributed value"),
      CURRENCY_COL("spend", "Spend"),
      CURRENCY_COL("billed", "Revenue recognised"),
      { key: "status", header: "Status" },
    ],
    rows: campaigns.map((c) => ({
      campaign: c.name,
      advertiser: c.advertiserName,
      model: c.pricingModel.toUpperCase(),
      impressions: c.metrics.impressions,
      clicks: c.metrics.clicks,
      conversions: c.metrics.conversions,
      attributedValue: c.metrics.attributedValue,
      spend: campaignSpend(c),
      billed: c.billed,
      status: c.status.replace(/_/g, " "),
    })),
    stats: [
      {
        label: "Revenue recognised",
        value: fmt(campaigns.reduce((n, c) => n + c.billed, 0)),
        icon: "Megaphone",
      },
      {
        label: "Unbilled spend",
        value: fmt(campaigns.reduce((n, c) => n + campaignPerformance(c).unbilled, 0)),
        icon: "Clock",
      },
      {
        label: "Attributed bookings",
        value: fmt(campaigns.reduce((n, c) => n + c.metrics.attributedValue, 0)),
        icon: "TrendingUp",
      },
      {
        label: "Active campaigns",
        value: String(campaigns.filter((c) => c.status === "active").length),
        icon: "Target",
      },
    ],
    trend: monthlyTrend(campaigns, (c) => c.startAt, (c) => c.billed),
    trendLabels: { primary: "Advertising revenue" },
    note: "Spend is derived from each campaign's own delivery by its pricing model, and capped at its budget. Only billed spend is revenue.",
  };
}

function b2bReport(scope: DomainScope): ReportResult {
  const state = getState();
  const accounts = state.b2bAccounts.filter(
    (a) => !scope.organizationId || a.id === scope.organizationId,
  );
  const rows: ReportRow[] = accounts.map((account) => {
    const bookings = state.bookings.filter(
      (b) => b.customer.organizationId === account.id,
    );
    const invoices = state.b2bInvoices.filter((i) => i.accountId === account.id);
    const subscription = state.revenueEntries
      .filter((e) => e.source === "b2b_subscription" && e.organizationId === account.id)
      .reduce((n, e) => n + e.net, 0);
    return {
      account: account.name,
      model: account.commercialModel.replace(/_/g, " "),
      tier: account.tier,
      bookings: bookings.length,
      grossValue: money(bookings.reduce((n, b) => n + b.money.total, 0)),
      markup: money(bookings.reduce((n, b) => n + b.money.markup, 0)),
      platformMargin: money(
        bookings.reduce((n, b) => n + b.money.commission - b.money.commissionReversed, 0),
      ),
      subscription: money(subscription),
      outstanding: money(invoices.reduce((n, i) => n + i.balance, 0)),
      creditUsed: account.creditUsed,
      creditLimit: account.creditLimit,
    };
  });

  return {
    id: "b2b-revenue",
    name: "B2B Revenue Report",
    description: "Volume, markup, platform margin and outstanding credit by account.",
    currency: CURRENCY,
    columns: [
      { key: "account", header: "Account" },
      { key: "model", header: "Commercial model" },
      { key: "tier", header: "Tier" },
      NUMBER_COL("bookings", "Bookings"),
      CURRENCY_COL("grossValue", "Gross value"),
      CURRENCY_COL("markup", "Agency markup"),
      CURRENCY_COL("platformMargin", "Platform margin"),
      CURRENCY_COL("subscription", "Subscription revenue"),
      CURRENCY_COL("outstanding", "Outstanding"),
      CURRENCY_COL("creditLimit", "Credit limit"),
    ],
    rows,
    stats: [
      {
        label: "Platform margin",
        value: fmt(rows.reduce((n, r) => n + Number(r.platformMargin), 0)),
        icon: "Handshake",
      },
      {
        label: "Agency markup",
        value: fmt(rows.reduce((n, r) => n + Number(r.markup), 0)),
        icon: "TrendingUp",
      },
      {
        label: "Outstanding credit",
        value: fmt(rows.reduce((n, r) => n + Number(r.outstanding), 0)),
        icon: "Landmark",
      },
      { label: "Accounts", value: String(rows.length), icon: "Building2" },
    ],
    trend: monthlyTrend(
      state.bookings.filter((b) => b.segment === "b2b"),
      (b) => b.createdAt,
      (b) => money(b.money.commission - b.money.commissionReversed),
    ),
    trendLabels: { primary: "B2B platform margin" },
  };
}

function merchantSettlementReport(filters: ReportFilters, scope: DomainScope): ReportResult {
  const state = getState();
  const merchantIds = new Set(
    state.bookings
      .filter((b) => !scope.merchantId || b.merchant.id === scope.merchantId)
      .filter((b) => !filters.merchantId || b.merchant.id === filters.merchantId)
      .map((b) => b.merchant.id),
  );

  const rows: ReportRow[] = [...merchantIds].map((id) => {
    const bookings = state.bookings.filter((b) => b.merchant.id === id);
    const settlements = state.settlements.filter((s) => s.merchantId === id);
    return {
      merchant: bookings[0]?.merchant.name ?? id,
      bookings: bookings.length,
      grossSales: money(bookings.reduce((n, b) => n + b.money.base + b.money.markup, 0)),
      discounts: money(bookings.reduce((n, b) => n + b.money.discount, 0)),
      commission: money(
        bookings.reduce((n, b) => n + b.money.commission - b.money.commissionReversed, 0),
      ),
      refunds: money(bookings.reduce((n, b) => n + b.money.refunded, 0)),
      netPayable: money(bookings.reduce((n, b) => n + b.money.netSettlement, 0)),
      paid: money(
        settlements.filter((s) => s.status === "paid").reduce((n, s) => n + s.netPayable, 0),
      ),
      pending: money(
        settlements.filter((s) => s.status !== "paid").reduce((n, s) => n + s.netPayable, 0),
      ),
    };
  });
  rows.sort((a, b) => Number(b.netPayable) - Number(a.netPayable));

  return {
    id: "merchant-settlement",
    name: "Merchant Settlement Report",
    description: "Gross sales, commission, refunds and net payable by merchant.",
    currency: CURRENCY,
    columns: [
      { key: "merchant", header: "Merchant" },
      NUMBER_COL("bookings", "Bookings"),
      CURRENCY_COL("grossSales", "Gross sales"),
      CURRENCY_COL("discounts", "Discounts"),
      CURRENCY_COL("commission", "Commission"),
      CURRENCY_COL("refunds", "Refunds"),
      CURRENCY_COL("netPayable", "Net payable"),
      CURRENCY_COL("paid", "Paid out"),
      CURRENCY_COL("pending", "Pending"),
    ],
    rows,
    stats: [
      {
        label: "Net payable",
        value: fmt(rows.reduce((n, r) => n + Number(r.netPayable), 0)),
        icon: "PiggyBank",
      },
      {
        label: "Paid out",
        value: fmt(rows.reduce((n, r) => n + Number(r.paid), 0)),
        icon: "BanknoteArrowDown",
      },
      {
        label: "Pending",
        value: fmt(rows.reduce((n, r) => n + Number(r.pending), 0)),
        icon: "Clock",
      },
      { label: "Merchants", value: String(rows.length), icon: "Store" },
    ],
    trend: monthlyTrend(state.bookings, (b) => b.createdAt, (b) => b.money.netSettlement),
    trendLabels: { primary: "Merchant net payable" },
  };
}

function payoutReport(scope: DomainScope): ReportResult {
  const settlements = getState().settlements.filter(
    (s) => !scope.merchantId || s.merchantId === scope.merchantId,
  );
  return {
    id: "payout",
    name: "Payout Report",
    description: "Every settlement batch and where it is in the payout chain.",
    currency: CURRENCY,
    columns: [
      { key: "reference", header: "Batch" },
      { key: "merchant", header: "Merchant" },
      { key: "period", header: "Period" },
      NUMBER_COL("bookings", "Bookings"),
      CURRENCY_COL("grossSales", "Gross sales"),
      CURRENCY_COL("commission", "Commission"),
      CURRENCY_COL("refundAdjustment", "Refund adjustment"),
      CURRENCY_COL("netPayable", "Net payable"),
      { key: "method", header: "Method" },
      { key: "status", header: "Status" },
    ],
    rows: settlements.map((s) => ({
      reference: s.reference,
      merchant: s.merchantName,
      period: `${s.periodStart.slice(0, 10)} → ${s.periodEnd.slice(0, 10)}`,
      bookings: s.bookingCount,
      grossSales: s.grossSales,
      commission: s.commission,
      refundAdjustment: s.refundAdjustment,
      netPayable: s.netPayable,
      method: s.method,
      status: s.status.replace(/_/g, " "),
    })),
    stats: [
      {
        label: "Paid",
        value: fmt(
          settlements.filter((s) => s.status === "paid").reduce((n, s) => n + s.netPayable, 0),
        ),
        icon: "CircleCheck",
      },
      {
        label: "In flight",
        value: fmt(
          settlements
            .filter((s) => s.status === "processing" || s.status === "scheduled")
            .reduce((n, s) => n + s.netPayable, 0),
        ),
        icon: "Clock",
      },
      {
        label: "On hold",
        value: fmt(
          settlements.filter((s) => s.status === "on_hold").reduce((n, s) => n + s.netPayable, 0),
        ),
        icon: "Pause",
      },
      { label: "Batches", value: String(settlements.length), icon: "Layers" },
    ],
    trend: monthlyTrend(settlements, (s) => s.periodStart, (s) => s.netPayable),
    trendLabels: { primary: "Net payable" },
  };
}

function refundReport(scope: DomainScope): ReportResult {
  const state = getState();
  const refunds = state.refunds.filter(
    (r) => !scope.merchantId || r.merchant.id === scope.merchantId,
  );
  return {
    id: "refund-reversal",
    name: "Refund & Commission Reversal Report",
    description: "Refunds paid and the commission given back with them.",
    currency: CURRENCY,
    columns: [
      { key: "reference", header: "Refund" },
      { key: "booking", header: "Booking" },
      { key: "merchant", header: "Merchant" },
      { key: "reason", header: "Reason" },
      CURRENCY_COL("originalAmount", "Booking total"),
      CURRENCY_COL("refundAmount", "Refunded"),
      CURRENCY_COL("commissionReversed", "Commission reversed"),
      CURRENCY_COL("insuranceRefund", "Insurance returned"),
      CURRENCY_COL("cancellationFee", "Cancellation fee"),
      CURRENCY_COL("platformCancellationFee", "Platform admin fee"),
      { key: "status", header: "Status" },
    ],
    rows: refunds.map((r) => ({
      reference: r.reference,
      booking: r.bookingRef,
      merchant: r.merchant.name,
      reason: r.reason.replace(/_/g, " "),
      originalAmount: r.originalAmount,
      refundAmount: r.refundAmount,
      commissionReversed: r.commissionReversed,
      insuranceRefund: r.insuranceRefund ?? 0,
      cancellationFee: r.cancellationFee,
      platformCancellationFee: r.platformCancellationFee ?? 0,
      status: r.status.replace(/_/g, " "),
    })),
    stats: [
      {
        label: "Refunded",
        value: fmt(refunds.reduce((n, r) => n + r.refundAmount, 0)),
        icon: "BanknoteArrowDown",
      },
      {
        label: "Commission reversed",
        value: fmt(refunds.reduce((n, r) => n + r.commissionReversed, 0)),
        icon: "ArrowLeftRight",
      },
      {
        label: "Platform admin fees kept",
        value: fmt(refunds.reduce((n, r) => n + (r.platformCancellationFee ?? 0), 0)),
        icon: "Scale",
      },
      { label: "Refunds", value: String(refunds.length), icon: "Receipt" },
    ],
    trend: monthlyTrend(refunds, (r) => r.requestedAt, (r) => r.refundAmount),
    trendLabels: { primary: "Refunded" },
    note: "Commission is reversed strictly in proportion to the refunded share, so a partial refund never returns the whole commission.",
  };
}

function revenueManagementReport(scope: DomainScope): ReportResult {
  const pace = bookingPace({ merchantId: scope.merchantId });
  const state = getState();
  const rows: ReportRow[] = pace.map((p) => {
    const monthBookings = state.bookings.filter(
      (b) =>
        b.createdAt.slice(0, 7) === p.period &&
        (!scope.merchantId || b.merchant.id === scope.merchantId),
    );
    const revenue = money(monthBookings.reduce((n, b) => n + b.money.netSale, 0));
    return {
      period: p.period,
      bookings: p.bookings,
      roomNights: p.roomNights,
      revenue,
      adr: p.roomNights > 0 ? money(revenue / p.roomNights) : 0,
      averageLengthOfStay: p.averageLengthOfStay,
      averageLeadTime: p.averageLeadTime,
      cancellationRate: money(p.cancellationRate * 100),
    };
  });

  const totalNights = rows.reduce((n, r) => n + Number(r.roomNights), 0);
  const totalRevenue = rows.reduce((n, r) => n + Number(r.revenue), 0);

  return {
    id: "revenue-management",
    name: "Revenue Management Report",
    description: "Room nights, ADR, lead time and cancellation rate by month.",
    currency: CURRENCY,
    columns: [
      { key: "period", header: "Month", format: "month" },
      NUMBER_COL("bookings", "Bookings"),
      NUMBER_COL("roomNights", "Room nights"),
      CURRENCY_COL("revenue", "Net sales"),
      CURRENCY_COL("adr", "ADR"),
      { key: "averageLengthOfStay", header: "Avg length of stay", align: "right" },
      { key: "averageLeadTime", header: "Avg lead time (days)", align: "right" },
      { key: "cancellationRate", header: "Cancellation rate", format: "percent", align: "right" },
    ],
    rows,
    stats: [
      { label: "Room nights", value: String(totalNights), icon: "BedDouble" },
      { label: "Net sales", value: fmt(totalRevenue), icon: "Wallet" },
      {
        label: "ADR",
        value: totalNights > 0 ? fmt(totalRevenue / totalNights) : "—",
        icon: "Coins",
      },
      {
        label: "Average lead time",
        value: rows.length
          ? `${Math.round(rows.reduce((n, r) => n + Number(r.averageLeadTime), 0) / rows.length)} days`
          : "—",
        icon: "Clock",
      },
    ],
    trend: rows.map((r) => ({
      period: String(r.period),
      value: Number(r.revenue),
      secondary: Number(r.bookings),
    })),
    trendLabels: { primary: "Net sales", secondary: "Bookings" },
    note: "Pace is measured by the month a booking was made, not the month it stays.",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthlyTrend<T>(
  rows: T[],
  dateOf: (row: T) => string,
  valueOf: (row: T) => number,
): ReportResult["trend"] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = dateOf(row).slice(0, 7);
    map.set(key, money((map.get(key) ?? 0) + valueOf(row)));
  }
  return [...map.entries()]
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Reports data source — every report derived from the live domain. */
export const reportsService = {
  defs: () => REPORT_DEFS,

  async run(
    id: string,
    filters: ReportFilters = {},
    scope: DomainScope = {},
  ): Promise<ReportResult> {
    switch (id) {
      case "commission":
        return delay(commissionReport(filters, scope));
      case "insurance-revenue":
        return delay(insuranceReport());
      case "membership-revenue":
        return delay(membershipReport());
      case "advertising-revenue":
        return delay(advertisingReport());
      case "b2b-revenue":
        return delay(b2bReport(scope));
      case "merchant-settlement":
        return delay(merchantSettlementReport(filters, scope));
      case "payout":
        return delay(payoutReport(scope));
      case "refund-reversal":
        return delay(refundReport(scope));
      case "revenue-management":
        return delay(revenueManagementReport(scope));
      default:
        return delay(platformRevenueReport(filters, scope));
    }
  },

  /** Revenue grouped for the Revenue Center's own drill-downs. */
  async revenueBy(
    key: "merchant" | "product" | "destination",
    filters: ReportFilters = {},
    scope: DomainScope = {},
  ) {
    const entries = revenueLedger(toRevenueFilters(filters, scope), scope);
    const keyOf =
      key === "merchant"
        ? (e: (typeof entries)[number]) => e.merchantId
        : key === "product"
          ? (e: (typeof entries)[number]) => e.productKind
          : (e: (typeof entries)[number]) => e.destination;
    return delay(groupRevenue(entries, keyOf));
  },
};

export const reportKeys = {
  run: (id: string, filters: ReportFilters, scopeKey: string) =>
    ["reports", "run", id, JSON.stringify(filters), scopeKey] as const,
};
