"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  MERCHANT_PLAN_LIST,
  PLAN_FEATURE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  limitLabel,
  planFor,
  type MerchantPlan,
  type MerchantPlanId,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { Alert, Badge, Button, StatCard } from "../../ui";
import { ConfirmDialog } from "../../crud";
import { formatCurrency, formatDate } from "../../lib/format";
import { useCancelSubscription, useChangePlan } from "../merchants/hooks";
import { useOwnMerchant } from "./use-merchant";
import { NoMerchantAccount, WorkspaceSkeleton } from "./no-merchant";

/**
 * Merchant subscription plans.
 *
 * Plans change **capabilities and limits only** — never commission — so a
 * merchant's economics can't quietly move when they upgrade. Limits are read
 * from the plan book and enforced by the services, not by this screen.
 */
export function MerchantSubscriptionView() {
  const { merchantId, data: merchant, isLoading } = useOwnMerchant();
  const changePlan = useChangePlan();
  const cancel = useCancelSubscription();
  const [confirming, setConfirming] = useState<MerchantPlan | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (!merchantId) return <NoMerchantAccount />;
  if (isLoading && !merchant) return <WorkspaceSkeleton />;
  if (!merchant) return <NoMerchantAccount />;

  const current = planFor(merchant);
  const { subscription } = merchant;

  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" title="Demo billing">
        No payment is taken. Changing plan records the subscription and posts the fee to the
        platform revenue ledger so the Revenue Center reflects it.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current plan" value={current.name} icon="Crown" />
        <StatCard
          label="Billed"
          value={subscription.price > 0 ? `${formatCurrency(subscription.price, "USD")}/mo` : "Free"}
          icon="Wallet"
        />
        <StatCard
          label="Status"
          value={SUBSCRIPTION_STATUS_LABELS[subscription.status]}
          icon="ShieldCheck"
          hint={subscription.autoRenew ? "Auto-renews" : "Will not renew"}
        />
        <StatCard label="Renews" value={formatDate(subscription.renewsAt)} icon="Calendar" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {MERCHANT_PLAN_LIST.map((plan) => {
          const isCurrent = plan.id === current.id && subscription.status !== "cancelled";
          return (
            <section
              key={plan.id}
              className={cn(
                "flex flex-col rounded-card border bg-surface p-5 shadow-card",
                isCurrent ? "border-primary ring-1 ring-primary" : "border-line",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-ink">{plan.name}</h2>
                {isCurrent && <Badge variant="success">Current</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold text-ink">
                {plan.price > 0 ? formatCurrency(plan.price, "USD") : "Free"}
                {plan.price > 0 && <span className="text-sm font-normal text-muted">/month</span>}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-body">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-xs">
                <Limit label="Properties" value={limitLabel(plan.limits.properties)} />
                <Limit label="Listings" value={limitLabel(plan.limits.listings)} />
                <Limit label="Staff" value={limitLabel(plan.limits.staff)} />
                <Limit label="Live campaigns" value={limitLabel(plan.limits.activeCampaigns)} />
                <Limit label="Payout term" value={`${plan.limits.payoutTermDays} days`} />
              </dl>

              {plan.unlocks.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {plan.unlocks.map((f) => (
                    <li key={f}>· {PLAN_FEATURE_LABELS[f]}</li>
                  ))}
                </ul>
              )}

              <div className="mt-5">
                {isCurrent ? (
                  plan.id === "basic" ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      Your plan
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setCancelling(true)}
                    >
                      Cancel subscription
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    loading={changePlan.isPending}
                    onClick={() => setConfirming(plan)}
                  >
                    {plan.price > current.price ? "Upgrade" : "Switch"} to {plan.name}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        loading={changePlan.isPending}
        title={confirming ? `Move to ${confirming.name}?` : "Change plan"}
        message={
          confirming ? (
            <>
              {confirming.price > 0 ? (
                <>
                  You&apos;ll be billed {formatCurrency(confirming.price, "USD")} per month (demo —
                  no charge is taken).{" "}
                </>
              ) : (
                <>Basic is free. </>
              )}
              Your payout term becomes {confirming.limits.payoutTermDays} days.
            </>
          ) : null
        }
        confirmLabel="Confirm"
        onConfirm={async () => {
          if (!confirming) return;
          try {
            await changePlan.mutateAsync({
              id: merchant.id,
              planId: confirming.id as MerchantPlanId,
            });
            toast.success(`You're on ${confirming.name}`);
            setConfirming(null);
          } catch (error) {
            toast.error("Couldn't change plan", { description: getErrorMessage(error) });
          }
        }}
      />

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        loading={cancel.isPending}
        title="Cancel subscription?"
        message="You'll drop to the Basic plan's limits, and features above it stop being available."
        confirmLabel="Cancel subscription"
        onConfirm={async () => {
          try {
            await cancel.mutateAsync(merchant.id);
            toast.success("Subscription cancelled");
            setCancelling(false);
          } catch (error) {
            toast.error("Couldn't cancel", { description: getErrorMessage(error) });
          }
        }}
      />
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
