"use client";

import Image from "next/image";
import {
  BedDouble,
  CalendarRange,
  Coffee,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";
import type { CheckoutQuote } from "@/features/booking";
import { cn } from "@/lib/utils";

interface OrderSummaryProps {
  listing: Listing;
  quote: CheckoutQuote;
  checkIn: string;
  checkOut: string;
  guests: number;
  units: number;
  /** Show the per-night table (long stays collapse it by default). */
  showNightly?: boolean;
}

/**
 * The checkout sidebar. Every figure comes from {@link CheckoutQuote} — the
 * component performs no arithmetic of its own beyond formatting, which is what
 * guarantees the number on screen is the number the domain will charge.
 */
export function OrderSummary({
  listing,
  quote,
  checkIn,
  checkOut,
  guests,
  units,
  showNightly = true,
}: OrderSummaryProps) {
  const { money, date } = useLocale();
  const vertical = VERTICALS[listing.vertical];
  const perNight = quote.nights > 0 && quote.stay.nights.length > 1;

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-card">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-card">
          <Image src={listing.image} alt="" fill sizes="80px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <span className="text-overline text-primary">{vertical.label}</span>
          <p className="truncate text-sm font-semibold text-ink">{listing.title}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {listing.location.label}
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        {checkIn && (
          <Line icon={CalendarRange}>
            {date(checkIn)}
            {checkOut && checkOut !== checkIn ? ` – ${date(checkOut)}` : ""}
            {perNight ? ` · ${quote.nights} night${quote.nights === 1 ? "" : "s"}` : ""}
          </Line>
        )}
        <Line icon={BedDouble}>
          {units} × {quote.stay.roomTypeName}
        </Line>
        <Line icon={Users}>
          {guests} {guests === 1 ? "guest" : "guests"}
        </Line>
        <Line icon={Sparkles}>{quote.stay.ratePlanName}</Line>
        {quote.stay.includesBreakfast && <Line icon={Coffee}>Breakfast included</Line>}
      </dl>

      {quote.available || quote.money.total > 0 ? (
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          {showNightly && perNight && (
            <details className="mb-1 rounded-field bg-surface-muted/50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-body">
                {quote.nights} nights × {money(quote.stay.averageNightly)} average
              </summary>
              <ul className="mt-2 space-y-1">
                {quote.stay.nights.map((night) => (
                  <li key={night.date} className="flex justify-between text-xs text-muted">
                    <span>
                      {date(night.date)}
                      {night.season === "peak" ? " · peak" : night.season === "weekend" ? " · weekend" : ""}
                    </span>
                    <span className="tabular-nums">{money(night.price)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <Row label={`${quote.stay.roomTypeName} × ${units}`}>
            {money(quote.stay.roomSubtotal)}
          </Row>

          {quote.addOns.map((addOn) => (
            <Row key={addOn.id} label={`${addOn.label} × ${addOn.quantity}`} muted>
              {money(addOn.total)}
            </Row>
          ))}

          {quote.discounts.map((discount) => (
            <div
              key={`${discount.kind}:${discount.ref}`}
              className="flex items-center justify-between text-emerald-600"
            >
              <dt className="flex min-w-0 items-center gap-1.5">
                <Tag className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{discount.label}</span>
              </dt>
              <dd className="font-medium">−{money(discount.amount)}</dd>
            </div>
          ))}

          <Row label={`Taxes (${Math.round((quote.money.taxes / (quote.money.netSale || 1)) * 100)}%)`}>
            {money(quote.money.taxes)}
          </Row>
          <Row label="Service fee">{money(quote.money.fees)}</Row>

          <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-base">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-bold text-accent-600">{money(quote.money.total)}</span>
          </div>

          {quote.pointsEarned > 0 && (
            <p className="pt-1 text-xs text-muted">
              Earns {quote.pointsEarned.toLocaleString()} loyalty points when your trip
              completes.
            </p>
          )}

          <p className="flex items-start gap-1.5 pt-2 text-xs text-muted">
            <ShieldCheck
              className={cn("mt-0.5 size-3.5 shrink-0", quote.refundable ? "text-emerald-600" : "text-amber-600")}
              aria-hidden="true"
            />
            {quote.stay.cancellationSummary}
          </p>
        </dl>
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
          Choose your dates to see the total.
        </p>
      )}
    </div>
  );
}

function Line({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-body">
      <Icon className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function Row({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", muted ? "text-muted" : "text-body")}>
      <dt className="min-w-0 truncate">{label}</dt>
      <dd className={cn("shrink-0 font-medium tabular-nums", muted ? "text-body" : "text-ink")}>
        {children}
      </dd>
    </div>
  );
}
