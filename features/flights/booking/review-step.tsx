"use client";

import {
  ArrowLeft,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import type {
  AncillarySelection,
  FlightContact,
  FlightOffer,
  FlightPassenger,
  EmergencyContact,
} from "@/types/flight";
import { ancillaryLines, ancillaryUnitNoun } from "@/lib/mock/ancillaries";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { PASSENGER_TYPE_LABEL } from "@/lib/mock/passengers";
import { airportLabel } from "@/lib/mock/airports";
import { findCountry } from "@/constants/geo";
import { formatDuration } from "@/lib/flight-time";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PaymentMethodPicker,
  type PaymentSelection,
} from "@/components/checkout/payment-methods";
import { SegmentTimeline } from "../results/segment-timeline";
import { FareBreakdownPanel } from "../pricing/fare-breakdown";
import { CouponField, type AppliedCoupon } from "../pricing/coupon-field";
import type { SeatAssignments } from "./seat-step";

interface ReviewStepProps {
  offer: FlightOffer;
  passengers: FlightPassenger[];
  contact: FlightContact;
  emergencyContact?: EmergencyContact;
  ancillaries: AncillarySelection[];
  seats: SeatAssignments;
  seatsTotalUsd: number;
  coupon: AppliedCoupon | null;
  onCoupon: (coupon: AppliedCoupon | null) => void;
  payment: PaymentSelection;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

/**
 * ReviewStep — everything the traveller is about to buy, then payment.
 *
 * Review and payment are one screen rather than two. Splitting them adds a click
 * without adding information, and it separates the total from the button that
 * charges it — which is precisely the moment the two should be adjacent.
 */
export function ReviewStep({
  offer,
  passengers,
  contact,
  emergencyContact,
  ancillaries,
  seats,
  seatsTotalUsd,
  coupon,
  onCoupon,
  payment,
  submitting,
  error,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const { money } = useLocale();

  const lines = ancillaryLines(ancillaries, offer.passengers);
  const ancillariesUsd = lines.reduce((sum, l) => sum + l.totalUsd, 0);
  const grandTotal = Math.max(
    0,
    offer.fare.totalUsd + seatsTotalUsd + ancillariesUsd - (coupon?.discountUsd ?? 0),
  );

  const country = findCountry(contact.country);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      {/* ---- Review ---------------------------------------------------------- */}
      <div className="min-w-0 space-y-5">
        {/* Itinerary */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Your itinerary</h2>
          <div className="space-y-6">
            {offer.slices.map((slice, i) => (
              <div key={slice.id}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {offer.slices.length > 1
                      ? offer.tripType === "round-trip"
                        ? i === 0
                          ? "Outbound"
                          : "Return"
                        : `Flight ${i + 1}`
                      : "Journey"}
                  </Badge>
                  <span className="text-sm text-muted">
                    {airportLabel(slice.fromCode)} → {airportLabel(slice.toCode)} ·{" "}
                    {formatDuration(slice.durationMinutes)} ·{" "}
                    {slice.stops === 0 ? "non-stop" : `${slice.stops} stop`}
                  </span>
                </div>
                <SegmentTimeline slice={slice} />
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
            {CABIN_LABEL[offer.cabin]} · {offer.fareBrand} fare ·{" "}
            {offer.refundable ? "Refundable" : "Non-refundable"} ·{" "}
            {offer.baggage.checkedKg > 0
              ? `${offer.baggage.checkedKg} kg checked baggage`
              : "Cabin baggage only"}
          </p>
        </section>

        {/* Travellers */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Travellers</h2>
          <ul className="space-y-3">
            {passengers.map((passenger) => {
              const seatIds = Object.values(seats)
                .map((bySegment) => bySegment[passenger.id])
                .filter(Boolean);
              return (
                <li
                  key={passenger.id}
                  className="flex flex-wrap items-start gap-3 rounded-field border border-line p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-field bg-surface-muted text-muted">
                    <User className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {passenger.title} {passenger.firstName} {passenger.lastName}
                    </p>
                    <p className="text-xs text-muted">
                      {PASSENGER_TYPE_LABEL[passenger.type]} · Born{" "}
                      {passenger.dateOfBirth} ·{" "}
                      {passenger.documentType === "passport" ? "Passport" : "National ID"}{" "}
                      {passenger.documentNumber}
                    </p>
                    {passenger.frequentFlyerNumber && (
                      <p className="text-xs text-muted">
                        Frequent flyer: {passenger.frequentFlyerAirline}{" "}
                        {passenger.frequentFlyerNumber}
                      </p>
                    )}
                  </div>
                  {seatIds.length > 0 && (
                    <span className="flex shrink-0 gap-1">
                      {seatIds.map((seatId) => (
                        <Badge key={seatId} variant="primary" size="sm">
                          {seatId}
                        </Badge>
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Contact */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-3 text-base font-semibold text-ink">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Email</dt>
              <Mail className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <dd className="text-body">{contact.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Phone</dt>
              <Phone className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <dd className="text-body">
                {contact.phoneCountryCode} {contact.phone}
                {country && ` · ${country.name}`}
              </dd>
            </div>
            {emergencyContact && (
              <div className="flex items-start gap-2 border-t border-line pt-2">
                <dt className="text-muted">Emergency:</dt>
                <dd className="text-body">
                  {emergencyContact.name} ({emergencyContact.relationship}) ·{" "}
                  {emergencyContact.phoneCountryCode} {emergencyContact.phone}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Extras */}
        {lines.length > 0 && (
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-ink">Extras</h2>
            <ul className="space-y-2 text-sm">
              {lines.map((line) => (
                <li
                  key={line.option.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 text-body">
                    <span className="block truncate">{line.option.label}</span>
                    <span className="block text-xs text-muted">
                      {line.units} {ancillaryUnitNoun(line.option, line.units)} ×{" "}
                      {line.option.free ? "included" : money(line.option.priceUsd)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-ink">
                    {line.option.free ? "Free" : money(line.totalUsd)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Payment — the shared picker, identical to the stay checkout */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Payment method</h2>
          <PaymentMethodPicker selection={payment} />
        </section>
      </div>

      {/* ---- Sticky total ---------------------------------------------------- */}
      <aside className="lg:sticky lg:top-24">
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Price summary</h2>

          <FareBreakdownPanel
            fare={offer.fare}
            seatsUsd={seatsTotalUsd}
            ancillaries={lines}
            couponDiscountUsd={coupon?.discountUsd ?? 0}
            couponCode={coupon?.code}
          />

          <div className="mt-4 border-t border-line pt-4">
            <CouponField
              subtotalUsd={offer.fare.totalUsd + seatsTotalUsd + ancillariesUsd}
              value={coupon}
              onChange={onCoupon}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-field border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onSubmit}
            disabled={submitting || !payment.isValid}
            className="mt-5"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Issuing tickets…
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden="true" />
                Pay {money(grandTotal)}
              </>
            )}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            Secure payment · e-tickets issued instantly
          </p>

          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onBack}
            disabled={submitting}
            leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
            className="mt-2"
          >
            Back to extras
          </Button>
        </div>

        <p className="mt-3 px-1 text-xs text-muted">
          By paying you accept the airline&apos;s conditions of carriage and Otithee&apos;s{" "}
          <a href="/terms-and-conditions" className="text-primary hover:underline">
            terms and conditions
          </a>
          .
        </p>
      </aside>
    </div>
  );
}
