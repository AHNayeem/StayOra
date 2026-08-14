"use client";

import { Check, ShieldCheck, X } from "lucide-react";
import type { InsuranceQuote } from "@/features/dashboard/domain";
import { COVERAGE_LABELS, INSURANCE_DISCLAIMER } from "@/features/dashboard/domain";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

/**
 * Travel insurance selection at checkout.
 *
 * Plans are priced by the domain before they reach this component — the premium
 * shown is exactly what will be charged, and the member discount (when the
 * traveller has one) is already applied. These are demo products: the notice
 * below is not optional.
 */
export function InsurancePicker({
  offers,
  selectedPlanId,
  onSelect,
}: {
  offers: InsuranceQuote[];
  selectedPlanId?: string;
  onSelect: (planId: string | undefined) => void;
}) {
  const { money } = useLocale();
  if (offers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-ink">Protect your trip</p>
          <p className="text-xs text-muted">{INSURANCE_DISCLAIMER}</p>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-3">
        {offers.map((offer) => {
          const selected = offer.plan.id === selectedPlanId;
          return (
            <li key={offer.plan.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(selected ? undefined : offer.plan.id)}
                className={cn(
                  "flex h-full w-full flex-col rounded-card border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary-50"
                    : "border-line bg-surface hover:border-primary/40",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{offer.plan.name}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border-2",
                      selected ? "border-primary bg-primary text-white" : "border-line",
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted">{offer.plan.summary}</span>

                <span className="mt-2 block">
                  <span className="text-base font-bold text-ink">
                    {money(offer.premium)}
                  </span>
                  {offer.discount > 0 && (
                    <span className="ml-2 text-xs text-muted line-through">
                      {money(offer.listPremium)}
                    </span>
                  )}
                </span>
                {offer.discount > 0 && (
                  <span className="text-[11px] font-medium text-primary-700">
                    Member price
                  </span>
                )}

                <ul className="mt-3 space-y-1">
                  {offer.plan.coverage.slice(0, 4).map((item) => (
                    <li key={item.key} className="flex items-baseline gap-1.5 text-[11px]">
                      {item.limit > 0 ? (
                        <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <X className="size-3 shrink-0 text-muted" aria-hidden="true" />
                      )}
                      <span className={item.limit > 0 ? "text-body" : "text-muted"}>
                        {COVERAGE_LABELS[item.key] ?? item.label}
                        {item.limit > 0 && (
                          <span className="ml-1 tabular-nums text-muted">
                            {money(item.limit)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedPlanId && (
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          className="text-xs font-medium text-muted underline hover:text-ink"
        >
          Continue without insurance
        </button>
      )}
    </div>
  );
}
