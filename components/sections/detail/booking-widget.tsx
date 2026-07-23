"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import type { BookingAddOn, BookingWidgetConfig } from "@/constants/detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import { controlClasses } from "@/components/ui/field";
import { useLocale } from "@/features/i18n";
import { BOOKING_CONFIG } from "@/constants/detail";
import {
  computeBookingPricing,
  defaultQuantities,
  guestsFromSelection,
} from "@/lib/booking-pricing";
import { cn } from "@/lib/utils";

interface BookingWidgetProps {
  listing: Listing;
  className?: string;
}

type WidgetTab = "booking" | "inquiry";

/** Zero-pad small counts to two digits, e.g. 1 → "01" (matches the reference). */
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * BookingWidget — the sticky booking panel with two tabs. **Online Booking**
 * drives a live price estimate (dates, quantities and optional extra services)
 * and carries the selection into `/checkout`; **Inquiry Form** lets a visitor
 * send a question instead of booking outright. Config-driven per vertical via
 * {@link BOOKING_CONFIG}, so the same layout serves stays, tours, transport, etc.
 */
export function BookingWidget({ listing, className }: BookingWidgetProps) {
  const config = BOOKING_CONFIG[listing.vertical];
  const [tab, setTab] = useState<WidgetTab>("booking");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-panel border border-line bg-linear-to-b from-primary-50 via-surface to-surface shadow-card",
        className,
      )}
    >
      <div className="p-6 sm:p-7">
        <header className="text-center">
          <h3 className="text-h3 font-bold text-ink">{config.title}</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-body">
            {config.subtitle}
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Booking options"
          className="mt-6 grid grid-cols-2 gap-3"
        >
          <TabButton
            active={tab === "booking"}
            onClick={() => setTab("booking")}
          >
            Online Booking
          </TabButton>
          <TabButton
            active={tab === "inquiry"}
            onClick={() => setTab("inquiry")}
          >
            Inquiry Form
          </TabButton>
        </div>

        <div className="mt-6">
          {tab === "booking" ? (
            <OnlineBooking listing={listing} config={config} />
          ) : (
            <InquiryForm listing={listing} config={config} />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Online booking tab                                                         */
/* -------------------------------------------------------------------------- */

function OnlineBooking({
  listing,
  config,
}: {
  listing: Listing;
  config: BookingWidgetConfig;
}) {
  const baseId = useId();
  const router = useRouter();
  const { money } = useLocale();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    defaultQuantities(config),
  );
  const [addOns, setAddOns] = useState<Record<string, boolean>>({});

  const selection = { checkIn, checkOut, singleDate, quantities };
  const pricing = computeBookingPricing(listing, config, selection);
  const { unitPrice, duration, multiplierProduct, priceable } = pricing;
  const subtotal = pricing.subtotalUsd;

  const guests = guestsFromSelection(config, quantities);
  const addOnCost = (addOn: BookingAddOn) =>
    addOn.perPerson ? addOn.price * guests : addOn.price;
  const selectedAddOns = useMemo(
    () => (config.addOns ?? []).filter((a) => addOns[a.key]),
    [config.addOns, addOns],
  );
  const addOnsTotal = priceable
    ? selectedAddOns.reduce((sum, a) => sum + addOnCost(a), 0)
    : 0;
  const total = subtotal + addOnsTotal;

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
    for (const addOn of selectedAddOns) params.append("addon", addOn.key);
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div>
      {/* Dates */}
      {config.dateMode !== "none" && (
        <div>
          <p className="text-sm font-bold text-ink">Select Your Booking Date:</p>

          {config.dateMode === "range" && (
            <>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold text-ink">
                      {config.checkInLabel}
                    </span>
                    {config.checkInTime && (
                      <span className="text-xs text-muted">{config.checkInTime}</span>
                    )}
                  </span>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="ml-auto flex flex-col text-right leading-tight">
                  <span className="font-semibold text-ink">
                    {config.checkOutLabel}
                  </span>
                  {config.checkOutTime && (
                    <span className="text-xs text-muted">{config.checkOutTime}</span>
                  )}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="date"
                  aria-label={config.checkInLabel}
                  value={checkIn}
                  onChange={(e) => handleCheckIn(e.target.value)}
                  className={cn(controlClasses(false), "h-11")}
                />
                <input
                  type="date"
                  aria-label={config.checkOutLabel}
                  value={checkOut}
                  min={checkIn || undefined}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={cn(controlClasses(false), "h-11")}
                />
              </div>
            </>
          )}

          {config.dateMode === "single" && (
            <label className="mt-3 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">
                {config.singleDateLabel}
              </span>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className={cn(controlClasses(false), "h-11")}
              />
            </label>
          )}
        </div>
      )}

      {/* Quantities */}
      <div className="mt-6 flex flex-col gap-5 border-t border-line pt-6">
        {config.fields.map((field) => (
          <div
            key={field.key}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex flex-col">
              <span className="text-base font-bold text-ink">{field.label}:</span>
              {field.hint && (
                <span className="text-xs text-muted">{field.hint}</span>
              )}
            </span>
            <div className="flex items-center gap-3">
              {field.multiplier && (
                <span className="text-lg font-bold text-ink">
                  {money(unitPrice)}
                </span>
              )}
              <Stepper
                label={field.label}
                value={quantities[field.key] ?? field.default}
                min={field.min}
                max={field.max}
                onChange={(value) => setQuantity(field.key, value)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Extra services */}
      {config.addOns && config.addOns.length > 0 && (
        <div className="mt-6 border-t border-line pt-6">
          <p className="text-base font-bold text-ink">Other Extra Services</p>
          <ul className="mt-4 flex flex-col gap-3">
            {config.addOns.map((addOn) => (
              <li key={addOn.key}>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={Boolean(addOns[addOn.key])}
                    onChange={(e) =>
                      setAddOns((prev) => ({
                        ...prev,
                        [addOn.key]: e.target.checked,
                      }))
                    }
                    className="peer size-5 shrink-0 cursor-pointer appearance-none rounded-sm border border-line bg-surface transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  />
                  <span className="flex-1 text-sm text-ink">{addOn.label}</span>
                  <span className="text-sm font-semibold text-ink">
                    {money(addOn.price)}
                    {addOn.perPerson && (
                      <span className="font-normal text-muted"> /Per Person</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {priceable && subtotal > 0 ? (
        <div className="mt-6 rounded-field border border-line bg-surface/70 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-sm font-bold text-ink">{config.summaryNoun}</span>
            <div className="flex items-center gap-2">
              <SummarySeg value={money(unitPrice)} label="Price" />
              <span className="text-muted">×</span>
              <SummarySeg value={pad2(multiplierProduct)} label="QTY" />
              {config.perDuration && (
                <>
                  <span className="text-muted">×</span>
                  <SummarySeg
                    value={String(duration)}
                    label={`${config.durationUnit ?? "day"}s`}
                  />
                </>
              )}
            </div>
            <span className="text-sm font-bold text-ink">{money(subtotal)}</span>
          </div>

          {selectedAddOns.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-sm">
              {selectedAddOns.map((addOn) => (
                <li key={addOn.key} className="flex items-center justify-between">
                  <span className="text-body">
                    {addOn.label}
                    {addOn.perPerson && (
                      <span className="text-muted"> × {guests}</span>
                    )}
                  </span>
                  <span className="font-medium text-ink">
                    {money(addOnCost(addOn))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-6 flex items-center gap-2 border-t border-line pt-6 text-sm text-muted">
          <CalendarCheck className="size-4 shrink-0" aria-hidden="true" />
          Select your dates to see the total price.
        </p>
      )}

      {priceable && subtotal > 0 && (
        <div className="mt-5 flex items-center justify-center gap-2 border-t border-line pt-5 text-lg">
          <span className="font-bold text-ink">Total Amount:</span>
          <span className="font-bold text-primary">{money(total)}</span>
        </div>
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

/* -------------------------------------------------------------------------- */
/* Inquiry form tab                                                           */
/* -------------------------------------------------------------------------- */

function InquiryForm({
  listing,
  config,
}: {
  listing: Listing;
  config: BookingWidgetConfig;
}) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-field border border-primary-100 bg-primary-50 px-5 py-8 text-center">
        <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
        <p className="text-base font-bold text-ink">Inquiry sent</p>
        <p className="max-w-xs text-sm text-body">
          Thanks for reaching out about {listing.title}. Our team will reply by
          email shortly.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <Input label="Full name" name="name" autoComplete="name" required />
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Input
        label="Phone number"
        name="phone"
        type="tel"
        autoComplete="tel"
      />
      <Textarea
        label="Your message"
        name="message"
        rows={4}
        placeholder={`I'd like to know more about ${listing.title}…`}
        required
      />
      <Button type="submit" fullWidth size="lg">
        {config.dateMode === "none" ? "Send Enquiry" : "Send Inquiry"}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        We usually reply within a few hours.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-12 rounded-field text-sm font-bold transition-colors",
        active
          ? "bg-primary text-white shadow-card"
          : "border border-line bg-surface text-primary hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}

function SummarySeg({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col items-center leading-tight">
      <span className="text-sm font-bold text-ink">{value}</span>
      <span className="text-[0.625rem] uppercase tracking-wide text-muted">
        {label}
      </span>
    </span>
  );
}
