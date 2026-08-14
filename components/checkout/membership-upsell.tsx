"use client";

import { useState } from "react";
import { Check, Crown } from "lucide-react";
import Link from "next/link";
import {
  PERIOD_LABELS,
  membershipAdminService,
  membershipService,
  type MembershipPlan,
} from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * Membership offer at checkout.
 *
 * Deliberately restrained: one card, the honest saving on *this* booking, and a
 * link to the full comparison. Buying here creates a real subscription and a
 * real revenue entry, and the next quote reflects the benefits — nothing is
 * applied to the traveller's total unless they actually buy.
 */
export function MembershipUpsell({
  customerEmail,
  customerName,
  serviceFee,
  netSale,
}: {
  customerEmail: string;
  customerName: string;
  serviceFee: number;
  netSale: number;
}) {
  const { money } = useLocale();
  const [busy, setBusy] = useState(false);

  const plans = useDomainValue<MembershipPlan[]>(() => membershipService.plans(), []);
  // Lead with the cheapest paid plan — the honest entry point, not the dearest.
  const plan = plans.filter((p) => p.code !== "free").sort((a, b) => a.price - b.price)[0];
  if (!plan) return null;

  const memberDiscount = Math.min(
    plan.benefits.memberDiscountCap > 0 ? plan.benefits.memberDiscountCap : Infinity,
    netSale * (plan.benefits.memberDiscountPercent / 100),
  );
  const savingHere = memberDiscount + serviceFee * plan.benefits.serviceFeeWaiver;
  const worthIt = savingHere >= plan.price;

  return (
    <div className="rounded-card border border-primary/25 bg-primary-50/50 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary/12 text-primary-700">
          <Crown className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{plan.name}</p>
          <p className="text-xs text-muted">{plan.tagline}</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {plan.benefits.perks.slice(0, 4).map((perk) => (
              <li key={perk} className="flex items-baseline gap-1.5 text-xs text-body">
                <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
          <p
            className={cn(
              "mt-2 text-xs",
              worthIt ? "font-medium text-primary-700" : "text-muted",
            )}
          >
            {savingHere > 0
              ? `You'd save ${money(savingHere)} on this booking alone.`
              : "Benefits apply from your next booking."}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-ink">{money(plan.price)}</p>
          <p className="text-[11px] text-muted">{PERIOD_LABELS[plan.billingPeriod]}</p>
          <Button
            size="sm"
            className="mt-2"
            loading={busy}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await membershipAdminService.subscribe({
                  customerEmail,
                  customerName,
                  planId: plan.id,
                });
                toast.success(`${plan.name} active — member pricing applied`);
              } finally {
                setBusy(false);
              }
            }}
          >
            Join
          </Button>
        </div>
      </div>
      <Link
        href="/account/membership"
        className="mt-3 inline-block text-xs font-medium text-primary-700 underline"
      >
        Compare all plans
      </Link>
    </div>
  );
}
