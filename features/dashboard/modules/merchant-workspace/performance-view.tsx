"use client";

import Link from "next/link";
import {
  HEALTH_TIER_LABELS,
  HEALTH_TIER_TONES,
  HEALTH_WEIGHTS,
  planAllows,
} from "@/features/dashboard/domain";
import { Alert, StatCard, StatusBadge } from "../../ui";
import { formatCurrency, formatNumber } from "../../lib/format";
import { useMerchantPerformance, useOnboardingProgress } from "../merchants/hooks";
import { ProgressBar } from "../merchants/onboarding-progress";
import { useOwnMerchant } from "./use-merchant";
import { NoMerchantAccount, WorkspaceSkeleton } from "./no-merchant";

/**
 * Merchant performance & health.
 *
 * Every number is derived on read from this merchant's bookings, reviews and
 * onboarding completeness — nothing is stored, so this page and the settlement
 * ledger cannot disagree. The composite score's weights are shown rather than
 * hidden, because a score a merchant can't reason about is worse than none.
 */
export function MerchantPerformanceView() {
  const { merchantId, data: merchant, isLoading } = useOwnMerchant();
  const performance = useMerchantPerformance(merchantId ?? "");
  const progress = useOnboardingProgress(merchantId ?? "");

  if (!merchantId) return <NoMerchantAccount />;
  if ((isLoading && !merchant) || !performance.data) return <WorkspaceSkeleton />;
  if (!merchant) return <NoMerchantAccount />;

  const p = performance.data;
  const advanced = planAllows(merchant, "advanced_analytics");

  const factors = [
    {
      label: "Review score",
      weight: HEALTH_WEIGHTS.reviewScore,
      value: p.reviewCount ? `${p.reviewScore} / 5` : "No reviews yet",
      percent: (p.reviewScore / 5) * 100,
      hint: `${formatNumber(p.reviewCount)} reviews`,
    },
    {
      label: "Cancellation rate",
      weight: HEALTH_WEIGHTS.cancellationRate,
      value: `${p.cancellationRate}%`,
      percent: Math.max(0, 100 - p.cancellationRate * 3),
      hint: `${formatNumber(p.cancelledBookings)} of ${formatNumber(p.bookings)} bookings`,
    },
    {
      label: "Review response rate",
      weight: HEALTH_WEIGHTS.responseRate,
      value: `${p.responseRate}%`,
      percent: p.responseRate,
      hint: "Share of reviews you replied to",
    },
    {
      label: "Listing completeness",
      weight: HEALTH_WEIGHTS.listingCompleteness,
      value: `${p.listingCompleteness}%`,
      percent: p.listingCompleteness,
      hint: progress.data
        ? `${progress.data.completed} of ${progress.data.total} onboarding steps`
        : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" title="Demo data">
        These figures come from the seeded booking and review dataset. They show how the metric is
        built, not a real benchmark.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross booking value"
          value={formatCurrency(p.grossBookingValue, p.currency)}
          icon="LineChart"
          hint={`${formatNumber(p.bookings)} bookings`}
        />
        <StatCard
          label="Your earnings"
          value={formatCurrency(p.netEarnings, p.currency)}
          icon="Wallet"
          hint="Net of commission and refunds"
        />
        <StatCard
          label="Average order value"
          value={formatCurrency(p.averageOrderValue, p.currency)}
          icon="Receipt"
        />
        <StatCard
          label="Cancellation rate"
          value={`${p.cancellationRate}%`}
          icon="AlertTriangle"
          hint={`${formatNumber(p.cancelledBookings)} cancelled`}
        />
      </div>

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Health score</h2>
            <p className="mt-0.5 text-xs text-muted">
              A weighted composite of the four factors below.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-ink">{Math.round(p.healthScore)}/100</span>
            <StatusBadge tone={HEALTH_TIER_TONES[p.tier]}>{HEALTH_TIER_LABELS[p.tier]}</StatusBadge>
          </div>
        </div>
        <ProgressBar percent={p.healthScore} label="Health score" className="mt-4" />

        <ul className="mt-5 flex flex-col gap-4">
          {factors.map((factor) => (
            <li key={factor.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">{factor.label}</span>
                <span className="text-xs text-muted">
                  {factor.value} · {Math.round(factor.weight * 100)}% of the score
                </span>
              </div>
              <ProgressBar percent={factor.percent} label={factor.label} className="mt-1.5" />
              {factor.hint && <p className="mt-1 text-xs text-muted">{factor.hint}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">What to do next</h2>
        <ul className="mt-3 space-y-2 text-sm text-body">
          {p.responseRate < 80 && (
            <li>
              · Reply to more reviews —{" "}
              <Link href="/dashboard/reviews" className="font-medium text-primary hover:underline">
                open reviews
              </Link>
              .
            </li>
          )}
          {p.listingCompleteness < 100 && (
            <li>
              · Finish your profile —{" "}
              <Link href="/dashboard/onboarding" className="font-medium text-primary hover:underline">
                onboarding checklist
              </Link>
              .
            </li>
          )}
          {p.cancellationRate > 10 && (
            <li>
              · Your cancellation rate is above 10%. Check availability accuracy in{" "}
              <Link href="/dashboard/catalog/rates" className="font-medium text-primary hover:underline">
                rates &amp; availability
              </Link>
              .
            </li>
          )}
          {!advanced && (
            <li>
              · Advanced analytics are available on Professional and Premium —{" "}
              <Link
                href="/dashboard/merchant/subscription"
                className="font-medium text-primary hover:underline"
              >
                compare plans
              </Link>
              .
            </li>
          )}
          {p.responseRate >= 80 && p.listingCompleteness === 100 && p.cancellationRate <= 10 && (
            <li>· Nothing outstanding — your account is in good shape.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
