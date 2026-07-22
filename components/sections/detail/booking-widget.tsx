"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, ShieldCheck } from "lucide-react";
import type { Listing } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/ui/price-tag";
import { Stepper } from "@/components/ui/stepper";
import { controlClasses } from "@/components/ui/field";
import { BOOKING_CONFIG, SERVICE_FEE_RATE } from "@/constants/detail";
import {
  computeBookingPricing,
  defaultQuantities,
} from "@/lib/booking-pricing";
import { cn, formatPrice } from "@/lib/utils";

interface BookingWidgetProps {
  listing: Listing;
  className?: string;
}

/**
 * BookingWidget — the sticky booking-inquiry panel with a live price breakdown.
 * Config-driven per vertical ({@link BOOKING_CONFIG}): it renders the right date
 * mode (stay range, single date, or none) and quantity steppers, then computes
 * the subtotal, service fee and total in real time via {@link computeBookingPricing}.
 * The CTA carries the selection into the multi-step `/checkout` flow.
 */
export function BookingWidget({ listing, className }: BookingWidgetProps) {
  const config = BOOKING_CONFIG[listing.vertical];
  const baseId = useId();
  const router = useRouter();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    defaultQuantities(config),
  );

  const selection = { checkIn, checkOut, singleDate, quantities };
  const pricing = computeBookingPricing(listing, config, selection);
  const { unitPrice, duration, multiplierProduct, priceable } = pricing;
  const subtotal = pricing.subtotalUsd;
  const serviceFee = pricing.serviceFeeUsd;
  const total = pricing.totalUsd;

  const setQuantity = (key: string, value: number) =>
    setQuantities((prev) => ({ ...prev, [key]: value }));

  const handleCheckIn = (value: string) => {
    setCheckIn(value);
    if (checkOut && checkOut <= value) setCheckOut("");
  };

  const handleSubmit = () => {
    const params = new URLSearchParams({ v: listing.vertical, slug: listing.slug });
    if (config.dateMode === "range") {
      if (checkIn) params.set("in", checkIn);
      if (checkOut) params.set("out", checkOut);
    } else if (config.dateMode === "single" && singleDate) {
      params.set("on", singleDate);
    }
    for (const field of config.fields) {
      params.set(`q_${field.key}`, String(quantities[field.key] ?? field.default));
    }
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div
      className={cn(
        "rounded-panel border border-line bg-surface p-6 shadow-card",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <PriceTag price={listing.price} size="lg" showDiscount />
      </div>

      <div className="mt-5 flex flex-col gap-4">
            {config.dateMode === "range" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">{config.checkInLabel}</span>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => handleCheckIn(e.target.value)}
                    className={cn(controlClasses(false), "h-11")}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">{config.checkOutLabel}</span>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || undefined}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className={cn(controlClasses(false), "h-11")}
                  />
                </label>
              </div>
            )}

            {config.dateMode === "single" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">{config.singleDateLabel}</span>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className={cn(controlClasses(false), "h-11")}
                />
              </label>
            )}

            {config.fields.map((field) => (
              <div
                key={field.key}
                className="rounded-field border border-line px-4 py-3"
              >
                <Stepper
                  label={field.label}
                  hint={field.hint}
                  showLabel
                  value={quantities[field.key] ?? field.default}
                  min={field.min}
                  max={field.max}
                  onChange={(value) => setQuantity(field.key, value)}
                />
              </div>
            ))}
          </div>

          {priceable && subtotal > 0 ? (
            <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-sm">
              <Row
                label={
                  config.perDuration
                    ? `${formatPrice(unitPrice)} × ${duration} ${config.durationUnit}${duration === 1 ? "" : "s"}${
                        multiplierProduct > 1 ? ` × ${multiplierProduct}` : ""
                      }`
                    : `${formatPrice(unitPrice)} × ${multiplierProduct}`
                }
                value={formatPrice(subtotal)}
              />
              <Row label={`Service fee (${Math.round(SERVICE_FEE_RATE * 100)}%)`} value={formatPrice(serviceFee)} />
              <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-base font-bold text-ink">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-5 flex items-center gap-2 border-t border-line pt-5 text-sm text-muted">
              <CalendarCheck className="size-4 shrink-0" aria-hidden="true" />
              Select your dates to see the total price.
            </p>
          )}

          <Button
            fullWidth
            size="lg"
            className="mt-5"
            onClick={handleSubmit}
            disabled={!priceable}
            aria-describedby={`${baseId}-note`}
          >
            {config.ctaLabel}
          </Button>

          <p
            id={`${baseId}-note`}
            className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {config.note}
          </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-body">
      <dt>{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
