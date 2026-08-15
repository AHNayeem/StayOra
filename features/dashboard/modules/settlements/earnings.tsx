"use client";

import Link from "next/link";
import { useQuery } from "../../data";
import {
  Alert,
  CHART_COLORS,
  CategoryBarChart,
  ChartCard,
  Panel,
  PanelBody,
  PanelHeader,
  StatCard,
  StatusBadge,
  buttonVariants,
} from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { SETTLEMENT_STATUSES } from "../../domain/lifecycle";
import { MERCHANTS } from "../../domain/seed";
import {
  PAYOUT_METHOD_LABELS,
  PAYOUT_SCHEDULE_LABELS,
  nextPayoutDate,
} from "../../domain";
import { useMerchant } from "../merchants/hooks";
import { settlementService } from "../../domain/services";
import { useRbac } from "../../rbac/rbac-provider";
import { useRoleView } from "../../domain/use-domain";
import { useCommissionBreakdown } from "../commission/hooks";
import { PRODUCT_KIND_LABELS } from "../bookings/types";
import {
  settlementKeys,
  useMerchantBreakdown,
  useMerchantFinancials,
  useSettlements,
} from "./hooks";
import { PayoutTimeline } from "./payout-timeline";

const statusLabel = labelMap(SETTLEMENT_STATUSES);
const statusTone = toneMap(SETTLEMENT_STATUSES);

/**
 * Merchant financial dashboard — "my earnings".
 *
 * The merchant-facing counterpart of the admin commission dashboard: gross sales,
 * discounts, commission, refunds, net earnings, pending settlement, available
 * balance and payout history. Both pages call {@link merchantFinancials}, so a
 * merchant and an admin looking at the same business always see the same numbers.
 *
 * Platform roles can open it too — they see the demo merchant's position, which
 * is how support answers "what will I be paid?" questions.
 */
export function MerchantEarnings() {
  const { user } = useRbac();
  const { isMerchant } = useRoleView();
  const merchantId = user.merchantId ?? MERCHANTS[0].id;
  const merchant = MERCHANTS.find((m) => m.id === merchantId);
  const financials = useMerchantFinancials(merchantId);
  const mine = useMerchantBreakdown(merchantId);
  const breakdown = useCommissionBreakdown();
  const settlements = useSettlements();

  const payouts = useQuery({
    queryKey: [...settlementKeys.all, "merchant-history", merchantId],
    queryFn: () => settlementService.all({ merchantId }),
    staleTime: 10_000,
  });

  const f = financials.data;
  const currency = f?.currency ?? "USD";
  const productRows = (breakdown.data?.byProduct ?? []).slice(0, 8).map((r) => ({
    name: PRODUCT_KIND_LABELS[r.key as keyof typeof PRODUCT_KIND_LABELS] ?? r.label,
    value: r.value,
  }));
  // My own earnings, cut the ways a merchant actually asks about them.
  const ratePlanRows = (mine.data?.byRatePlan ?? []).map((r) => ({
    name: r.label,
    value: r.value,
  }));
  const monthRows = (mine.data?.byMonth ?? []).slice(-12).map((r) => ({
    name: r.key,
    value: r.value,
  }));
  const latestSettlement = payouts.data?.[0];

  // The payout instructions the merchant set up during onboarding — the same
  // record the Payouts screen pays against, so the two can't disagree.
  const profile = useMerchant(merchantId).data;
  const bank = profile?.bank;
  const nextPayout = latestSettlement
    ? nextPayoutDate(bank?.schedule ?? "monthly", new Date(latestSettlement.scheduledFor))
    : null;

  return (
    <div className="flex flex-col gap-5">
      {!isMerchant && (
        <Alert tone="info" title="Viewing a merchant's position">
          You&apos;re signed in with a platform role, so this shows{" "}
          <strong>{merchant?.name}</strong> as an example. A merchant account sees only
          its own figures here.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross sales"
          icon="Wallet"
          value={f ? formatCurrency(f.grossSales, currency) : "—"}
          hint={f ? `${formatNumber(f.bookingCount)} bookings · AOV ${formatCurrency(f.averageOrderValue, currency)}` : undefined}
        />
        <StatCard
          label="Commission"
          icon="Percent"
          value={f ? formatCurrency(f.commission, currency) : "—"}
          hint={f ? `Effective ${f.effectiveCommissionRate}%` : undefined}
        />
        <StatCard
          label="Net earnings"
          icon="PiggyBank"
          value={f ? formatCurrency(f.netEarnings, currency) : "—"}
          hint="After commission and refunds"
        />
        <StatCard
          label="Pending settlement"
          icon="Clock"
          value={f ? formatCurrency(f.pendingSettlement, currency) : "—"}
          hint={f ? `${formatCurrency(f.paidOut, currency)} already paid` : undefined}
        />
      </div>

      {profile && (
        <Panel flush>
          <PanelHeader
            title="Payout schedule"
            description="How and when your settlements are paid"
            actions={
              isMerchant ? (
                <Link
                  href="/dashboard/onboarding?step=bank"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Update details
                </Link>
              ) : undefined
            }
          />
          <PanelBody>
            {bank?.status !== "verified" && (
              <Alert tone="warning" title="Payouts are on hold" className="mb-4">
                {bank
                  ? "Your payout account has not been verified yet, so settlements can't be released."
                  : "You haven't added a payout account yet, so settlements can't be released."}
              </Alert>
            )}
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">Schedule</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {PAYOUT_SCHEDULE_LABELS[bank?.schedule ?? "monthly"]}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Terms</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {profile.contract.payoutTermDays} days after period close
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Method</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {bank ? PAYOUT_METHOD_LABELS[bank.method] : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Destination</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {bank ? `${bank.bankName} ${bank.accountNumberMasked}` : "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Last settlement</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {latestSettlement ? formatDate(latestSettlement.scheduledFor) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Next expected</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {nextPayout ? formatDate(nextPayout.toISOString()) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Commission</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {profile.commissionRate}% of {profile.commissionBasis} sale
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Awaiting payout</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {f ? formatCurrency(f.pendingSettlement, currency) : "—"}
                </dd>
              </div>
            </dl>
          </PanelBody>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel flush className="lg:col-span-1">
          <PanelHeader title="Earnings statement" description="This period, all bookings" />
          <PanelBody>
            <dl className="divide-y divide-line">
              <Row label="Gross sales" value={f?.grossSales} currency={currency} />
              <Row label="Discounts" value={f?.discounts} currency={currency} negative />
              <Row label="Net sales" value={f?.netSales} currency={currency} />
              <Row label="Platform commission" value={f?.commission} currency={currency} negative />
              <Row label="Refunds" value={f?.refunds} currency={currency} negative />
              <Row label="Net earnings" value={f?.netEarnings} currency={currency} strong />
              <Row label="Paid out" value={f?.paidOut} currency={currency} />
              <Row label="On hold" value={f?.onHold} currency={currency} />
              <Row label="Available balance" value={f?.availableBalance} currency={currency} strong />
            </dl>
          </PanelBody>
        </Panel>

        <ChartCard
          className="lg:col-span-2"
          title="Commission by product"
          description="Where the platform's cut comes from in your catalogue"
          loading={breakdown.isLoading}
          empty={breakdown.isSuccess && productRows.length === 0}
        >
          <CategoryBarChart
            data={productRows}
            xKey="name"
            valueKey="value"
            label="Commission"
            color={CHART_COLORS.accent}
            horizontal
            height={280}
            valueFormatter={(v) => formatCurrency(v, currency)}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Net earnings by rate plan"
          description="Which rate plans actually pay"
          loading={mine.isLoading}
          empty={mine.isSuccess && ratePlanRows.length === 0}
        >
          <CategoryBarChart
            data={ratePlanRows}
            xKey="name"
            valueKey="value"
            label="Net earnings"
            horizontal
            height={240}
            valueFormatter={(v) => formatCurrency(v, currency)}
          />
        </ChartCard>
        <ChartCard
          title="Net earnings by month"
          description="After commission and refunds"
          loading={mine.isLoading}
          empty={mine.isSuccess && monthRows.length === 0}
        >
          <CategoryBarChart
            data={monthRows}
            xKey="name"
            valueKey="value"
            label="Net earnings"
            color={CHART_COLORS.primary}
            height={240}
            valueFormatter={(v) => formatCurrency(v, currency)}
          />
        </ChartCard>
      </div>

      {latestSettlement && (
        <Panel flush>
          <PanelHeader
            title="Payout status"
            description={`${latestSettlement.reference} · ${formatCurrency(latestSettlement.netPayable, latestSettlement.currency)} · ${latestSettlement.method}`}
          />
          <PanelBody>
            <PayoutTimeline settlement={latestSettlement} />
          </PanelBody>
        </Panel>
      )}

      <Panel flush>
        <PanelHeader
          title="Settlement history"
          description="Each batch shows exactly what was deducted and why."
          actions={
            <Link
              href="/dashboard/finance/settlements"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              All settlements
            </Link>
          }
        />
        <PanelBody>
          {payouts.isLoading ? (
            <p className="text-sm text-muted">Loading settlement history…</p>
          ) : (payouts.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No settlements for this merchant yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {payouts.data?.slice(0, 8).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{s.reference}</p>
                    <p className="text-xs text-muted">
                      {formatDate(s.periodStart)} – {formatDate(s.periodEnd)} ·{" "}
                      {s.bookingCount} bookings · {s.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink">
                      {formatCurrency(s.netPayable, s.currency)}
                    </p>
                    <p className="text-xs tabular-nums text-danger">
                      −{formatCurrency(s.commission + s.refundAdjustment, s.currency)} deducted
                    </p>
                  </div>
                  <StatusBadge tone={statusTone[s.status]}>{statusLabel[s.status]}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      {/* The scoped settlement table, reused so filters/sort/export come free. */}
      <Panel flush>
        <PanelHeader title="All my payouts" description="Searchable, sortable, exportable." />
        <PanelBody>
          <p className="text-sm text-muted">
            {settlements.total} batch{settlements.total === 1 ? "" : "es"} in scope. Open{" "}
            <Link
              href="/dashboard/finance/settlements"
              className="font-medium text-primary hover:underline"
            >
              Settlements
            </Link>{" "}
            for the full console with filters and CSV export.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}

function Row({
  label,
  value,
  currency,
  negative,
  strong,
}: {
  label: string;
  value?: number;
  currency: string;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={strong ? "text-sm font-semibold text-ink" : "text-sm text-body"}>
        {label}
      </dt>
      <dd
        className={
          negative
            ? "text-sm font-medium tabular-nums text-danger"
            : strong
              ? "text-base font-bold tabular-nums text-ink"
              : "text-sm font-medium tabular-nums text-ink"
        }
      >
        {value === undefined
          ? "—"
          : `${negative && value > 0 ? "−" : ""}${formatCurrency(value, currency)}`}
      </dd>
    </div>
  );
}
