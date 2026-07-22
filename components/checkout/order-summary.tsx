"use client";

import Image from "next/image";
import { CalendarRange, MapPin, Tag, Users } from "lucide-react";
import type { Listing } from "@/types/catalog";
import type { BookingWidgetConfig } from "@/constants/detail";
import type { BookingPricing, BookingSelection } from "@/lib/booking-pricing";
import { VERTICALS } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";

interface OrderSummaryProps {
  listing: Listing;
  config: BookingWidgetConfig;
  pricing: BookingPricing;
  selection: BookingSelection;
  guests: number;
  discountUsd: number;
  couponCode?: string;
}

/**
 * OrderSummary — the persistent checkout sidebar: the listing being booked, the
 * chosen dates/guests, and a live price breakdown (subtotal, service fee, any
 * promo discount, total) formatted in the visitor's currency.
 */
export function OrderSummary({
  listing,
  config,
  pricing,
  selection,
  guests,
  discountUsd,
  couponCode,
}: OrderSummaryProps) {
  const { money, date } = useLocale();
  const vertical = VERTICALS[listing.vertical];
  const total = Math.max(0, pricing.totalUsd - discountUsd);

  const dateLabel =
    config.dateMode === "range" && selection.checkIn && selection.checkOut
      ? `${date(selection.checkIn)} – ${date(selection.checkOut)}`
      : config.dateMode === "single" && selection.singleDate
        ? date(selection.singleDate)
        : null;

  const durationLabel = config.perDuration
    ? `${pricing.duration} ${config.durationUnit}${pricing.duration === 1 ? "" : "s"}`
    : null;

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-card">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-card">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            sizes="80px"
            className="object-cover"
          />
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
        {dateLabel && (
          <div className="flex items-center gap-2 text-body">
            <CalendarRange className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span>
              {dateLabel}
              {durationLabel ? ` · ${durationLabel}` : ""}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-body">
          <Users className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            {guests} {guests === 1 ? "guest" : "guests"}
          </span>
        </div>
      </dl>

      {pricing.priceable && pricing.subtotalUsd > 0 ? (
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <Row label="Subtotal">{money(pricing.subtotalUsd)}</Row>
          <Row label="Service fee">{money(pricing.serviceFeeUsd)}</Row>
          {discountUsd > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <dt className="flex items-center gap-1.5">
                <Tag className="size-3.5" aria-hidden="true" />
                {couponCode ? `Promo ${couponCode}` : "Discount"}
              </dt>
              <dd className="font-medium">−{money(discountUsd)}</dd>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-base">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-bold text-accent-600">{money(total)}</span>
          </div>
        </dl>
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
          Choose your dates to see the total.
        </p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-body">
      <dt>{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}
