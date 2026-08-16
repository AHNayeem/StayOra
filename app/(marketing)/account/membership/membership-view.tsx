"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Crown, TriangleAlert, X } from "lucide-react";
import {
  MAX_DUNNING_ATTEMPTS,
  PERIOD_LABELS,
  benefitsFor,
  membershipAdminService,
  membershipService,
  type MembershipPlan,
  type MembershipSubscription,
} from "@/features/dashboard/domain";
import { useCustomerEmail, useDomainValue } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { StatusBadge } from "@/components/account/status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * Membership — compare plans, join, and see the current subscription.
 *
 * Everything here reads the membership domain: the plan list, the traveller's
 * live subscription and the benefits checkout will actually apply. Nothing on
 * this page decides what a member gets.
 */
export function MembershipView() {
  const { money, date } = useLocale();
  const email = useCustomerEmail();
  const [busy, setBusy] = useState<string | null>(null);

  const plans = useDomainValue<MembershipPlan[]>(() => membershipService.plans(), []);
  const current = useDomainValue<MembershipSubscription | undefined>(
    () => membershipService.current(email),
    [email],
  );
  const history = useDomainValue<MembershipSubscription[]>(
    () => membershipService.historyFor(email),
    [email],
  );
  const benefits = useDomainValue(() => benefitsFor(email), [email]);

  const join = async (plan: MembershipPlan) => {
    setBusy(plan.id);
    try {
      await membershipAdminService.subscribe({
        customerEmail: email,
        customerName: "Traveller",
        planId: plan.id,
      });
      toast.success(`${plan.name} is active — member pricing applies from now on`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <AccountPageHeader
        title="Membership"
        description="Member rates, waived fees and faster loyalty earning."
      />

      {current ? (
        <section className="mt-6 rounded-card border border-primary/25 bg-primary-50/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-field bg-primary/12 text-primary-700">
                <Crown className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-ink">{current.planName}</p>
                <p className="text-sm text-muted">
                  {money(current.price)} {PERIOD_LABELS[current.billingPeriod]} ·{" "}
                  {current.autoRenew ? "renews" : "expires"} {date(current.renewsAt)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Reference {current.reference} · {current.periodsBilled} period
                  {current.periodsBilled === 1 ? "" : "s"} billed
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge tone="success" label="Active" />
              {current.autoRenew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await membershipService.cancel(current.id);
                    toast.success("Auto-renew off — benefits run to the end of your period");
                  }}
                >
                  Turn off auto-renew
                </Button>
              )}
            </div>
          </div>

          {/* A declined renewal is the one thing a member has to act on, so it
              sits above the benefits rather than in a history row. */}
          {current.dunning && (
            <div className="mt-4 flex flex-wrap items-start gap-3 rounded-field border border-warning/40 bg-warning/10 p-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-ink">
                  We couldn&apos;t take {money(current.price)} for your renewal
                </p>
                <p className="mt-0.5 text-xs text-body">
                  {current.dunning.reason}{" "}
                  {current.dunning.nextRetryAt
                    ? `We'll try again on ${date(current.dunning.nextRetryAt)} — attempt ${current.dunning.attempts} of ${MAX_DUNNING_ATTEMPTS} so far.`
                    : `We've stopped trying after ${current.dunning.attempts} attempts.`}
                </p>
                <Link
                  href="/account/cards"
                  className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Update your card
                </Link>
              </div>
            </div>
          )}

          <dl className="mt-4 grid gap-3 border-t border-primary/20 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Benefit label="Service fee" value={`${Math.round(benefits.serviceFeeWaiver * 100)}% waived`} />
            <Benefit
              label="Member discount"
              value={
                benefits.memberDiscountPercent > 0
                  ? `${benefits.memberDiscountPercent}%${benefits.memberDiscountCap > 0 ? ` (up to ${money(benefits.memberDiscountCap)})` : ""}`
                  : "—"
              }
            />
            <Benefit label="Loyalty earning" value={`${benefits.pointsMultiplier}×`} />
            <Benefit
              label="Insurance"
              value={
                benefits.insuranceDiscountPercent > 0
                  ? `${benefits.insuranceDiscountPercent}% off`
                  : "—"
              }
            />
          </dl>
        </section>
      ) : (
        <p className="mt-6 text-sm text-body">
          You&rsquo;re on <strong>Otithee Free</strong>. Membership is optional — your
          bookings, loyalty points and coupons all work without it.
        </p>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = current?.planId === plan.id;
          return (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-card border p-5",
                isCurrent ? "border-primary bg-primary-50/40" : "border-line bg-surface",
              )}
            >
              <p className="text-sm font-semibold text-ink">{plan.name}</p>
              <p className="mt-0.5 text-xs text-muted">{plan.tagline}</p>
              <p className="mt-3 text-2xl font-bold text-ink">
                {plan.price > 0 ? money(plan.price) : "Free"}
                {plan.price > 0 && (
                  <span className="ml-1 text-xs font-normal text-muted">
                    {PERIOD_LABELS[plan.billingPeriod]}
                  </span>
                )}
              </p>
              {plan.compareAtPrice && plan.compareAtPrice > plan.price && (
                <p className="text-xs text-muted line-through">
                  {money(plan.compareAtPrice)}
                </p>
              )}

              <ul className="mt-4 flex-1 space-y-1.5">
                {plan.benefits.perks.map((perk) => (
                  <li key={perk} className="flex items-baseline gap-2 text-xs text-body">
                    <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
                    {perk}
                  </li>
                ))}
                {plan.benefits.perks.length === 0 && (
                  <li className="flex items-baseline gap-2 text-xs text-muted">
                    <X className="size-3 shrink-0" aria-hidden="true" />
                    No member benefits
                  </li>
                )}
              </ul>

              {plan.price > 0 && (
                <Button
                  className="mt-4"
                  variant={isCurrent ? "outline" : "primary"}
                  disabled={isCurrent || busy === plan.id}
                  loading={busy === plan.id}
                  onClick={() => join(plan)}
                >
                  {isCurrent ? "Your plan" : `Join ${plan.name}`}
                </Button>
              )}
            </article>
          );
        })}
      </section>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Membership history</h2>
          <ul className="mt-3 divide-y divide-line rounded-card border border-line">
            {history.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{row.planName}</p>
                  <p className="text-xs text-muted">
                    {date(row.startAt)} → {date(row.renewsAt)} · {row.reference}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {money(row.lifetimeRevenue)}
                </p>
                <StatusBadge
                  label={row.status}
                  tone={
                    row.status === "active"
                      ? "success"
                      : row.status === "expired"
                        ? "warning"
                        : "neutral"
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Benefit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
