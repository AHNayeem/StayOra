"use client";

import { PiggyBank, Receipt } from "lucide-react";
import type { TripPricing } from "@/types/trip";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

interface TripSummaryProps {
  pricing: TripPricing;
  /** Bundle name, when one is applied. */
  comboName?: string;
  couponCode?: string;
  /** Show the platform commission line (B2B / agency view). */
  showCommission?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * TripSummary — the money panel shared by the trip cart and the trip checkout.
 *
 * One component so the number the traveller sees in the cart is provably the
 * number they pay: both surfaces render the same {@link TripPricing} object,
 * produced by `priceTrip`. Individual products, bundle saving, taxes, fees and
 * the final total are each their own line, because a bundled total with no
 * breakdown is the fastest way to lose trust at checkout.
 */
export function TripSummary({
  pricing,
  comboName,
  couponCode,
  showCommission = false,
  className,
  children,
}: TripSummaryProps) {
  const { money } = useLocale();

  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-card",
        className,
      )}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <Receipt className="size-4 text-primary" aria-hidden="true" />
        Trip summary
      </h2>

      <ul className="mt-4 space-y-2.5 border-b border-line pb-4">
        {pricing.lines.map((line) => (
          <li key={line.itemId} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{line.title}</span>
              <span className="text-xs text-muted">{line.merchantName}</span>
            </span>
            <span className="shrink-0 font-medium text-ink">{money(line.baseUsd)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Products subtotal" value={money(pricing.subtotalUsd)} />

        {pricing.bundleDiscountUsd > 0 && (
          <Row
            label={
              comboName
                ? `${comboName} bundle`
                : `Bundle saving (${pricing.bundleRatePct}%)`
            }
            value={`−${money(pricing.bundleDiscountUsd)}`}
            tone="positive"
          />
        )}

        {pricing.couponDiscountUsd > 0 && (
          <Row
            label={couponCode ? `Promo ${couponCode}` : "Promo code"}
            value={`−${money(pricing.couponDiscountUsd)}`}
            tone="positive"
          />
        )}

        <Row label="Taxes" value={money(pricing.taxesUsd)} />
        <Row label="Service fees" value={money(pricing.feesUsd)} />

        {showCommission && (
          <Row
            label="Platform commission (incl.)"
            value={money(pricing.commissionUsd)}
            tone="muted"
          />
        )}
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm font-semibold text-ink">Total</span>
        <span className="text-h4 font-bold text-accent-600">{money(pricing.totalUsd)}</span>
      </div>

      {pricing.savingsUsd > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-field bg-emerald-500/8 px-3 py-2 text-sm font-medium text-emerald-700">
          <PiggyBank className="size-4 shrink-0" aria-hidden="true" />
          You save {money(pricing.savingsUsd)} versus booking separately (
          {money(pricing.separatelyUsd)})
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("text-muted", tone === "muted" && "text-xs")}>{label}</dt>
      <dd
        className={cn(
          "font-medium",
          tone === "positive" ? "text-emerald-600" : "text-ink",
          tone === "muted" && "text-xs text-muted",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
