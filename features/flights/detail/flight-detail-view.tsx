"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Armchair,
  Clock,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { FlightOffer, FlightSearchQuery } from "@/types/flight";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { airportLabel } from "@/lib/mock/airports";
import { totalDuration } from "@/lib/mock/flights";
import { formatDuration } from "@/lib/flight-time";
import { PASSENGER_TYPE_LABEL } from "@/lib/mock/passengers";
import { useLocale } from "@/features/i18n";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AirlineLogo } from "../airline-logo";
import { FlightBadges } from "../results/flight-badges";
import { SegmentTimeline } from "../results/segment-timeline";
import { FareBreakdownPanel } from "../pricing/fare-breakdown";
import { CouponField, type AppliedCoupon } from "../pricing/coupon-field";
import { searchHref } from "../query-url";
import { bookingHref } from "../booking/booking-url";
import { FareRules } from "./fare-rules";
import { AirportInfo } from "./airport-info";
import { CabinAmenities } from "./cabin-amenities";
import { SeatMapPreview } from "./seat-map-preview";

interface FlightDetailViewProps {
  offer: FlightOffer;
  /** The query this offer came from, for the "back to results" link. */
  query: FlightSearchQuery;
}

/**
 * FlightDetailView — everything about one offer, and the decision to book it.
 *
 * The sticky summary rail is the spine: it carries the price, the coupon field
 * and the CTA, so the traveller can read fare rules and amenities without ever
 * losing sight of what they'd pay. A coupon applied here is carried into the
 * booking flow rather than re-entered.
 */
export function FlightDetailView({ offer, query }: FlightDetailViewProps) {
  const router = useRouter();
  const { money } = useLocale();
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [starting, setStarting] = useState(false);

  const airline = AIRLINES_BY_CODE[offer.airlineCode];
  const first = offer.slices[0];
  const last = offer.slices[offer.slices.length - 1];

  const passengerSummary = useMemo(
    () =>
      offer.fare.lines
        .map(
          (line) =>
            `${line.count} ${PASSENGER_TYPE_LABEL[line.type].toLowerCase()}${line.count === 1 ? "" : "s"}`,
        )
        .join(", "),
    [offer.fare.lines],
  );

  const routeLabel =
    offer.tripType === "round-trip"
      ? `${airportLabel(first.fromCode)} ⇄ ${airportLabel(first.toCode)}`
      : `${airportLabel(first.fromCode)} → ${airportLabel(last.toCode)}`;

  const onBook = () => {
    setStarting(true);
    router.push(bookingHref(offer.id, coupon?.code));
  };

  return (
    <>
      <div className="border-b border-line bg-surface-muted/60">
        <Container className="py-4">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Flights", href: "/flights" },
              { label: "Results", href: searchHref(query) },
              { label: routeLabel },
            ]}
          />
          <Link
            href={searchHref(query)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to results
          </Link>
        </Container>
      </div>

      <Container className="py-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          {/* ---- Main column ------------------------------------------------ */}
          <div className="min-w-0 space-y-6">
            {/* Header */}
            <header className="rounded-card border border-line bg-surface p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <AirlineLogo code={offer.airlineCode} size="lg" />
                  <div className="min-w-0">
                    <h1 className="truncate text-h4 text-ink">{routeLabel}</h1>
                    <p className="text-sm text-muted">
                      {airline?.name ?? offer.airlineCode}
                      {offer.mixedAirlines && " + partner airlines"} ·{" "}
                      {CABIN_LABEL[offer.cabin]} · {offer.fareBrand}
                    </p>
                  </div>
                </div>
                <FlightBadges badges={offer.badges} promoLabel={offer.promoLabel} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                <Fact
                  icon={<Clock className="size-4" aria-hidden="true" />}
                  label="Total journey"
                  value={formatDuration(totalDuration(offer))}
                />
                <Fact
                  icon={<Users className="size-4" aria-hidden="true" />}
                  label="Travellers"
                  value={passengerSummary}
                />
                <Fact
                  icon={<Armchair className="size-4" aria-hidden="true" />}
                  label="Seats left"
                  value={`${offer.seatsAvailable} at this fare`}
                />
                <Fact
                  icon={<ShieldCheck className="size-4" aria-hidden="true" />}
                  label="Fare type"
                  value={offer.refundable ? "Refundable" : "Non-refundable"}
                />
              </dl>
            </header>

            {/* Journey timeline */}
            <section
              aria-labelledby="itinerary-heading"
              className="rounded-card border border-line bg-surface p-5 shadow-card"
            >
              <h2 id="itinerary-heading" className="mb-4 text-base font-semibold text-ink">
                Your itinerary
              </h2>
              <div className="space-y-8">
                {offer.slices.map((slice, i) => (
                  <div key={slice.id}>
                    {offer.slices.length > 1 && (
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {offer.tripType === "round-trip"
                            ? i === 0
                              ? "Outbound"
                              : "Return"
                            : `Flight ${i + 1}`}
                        </Badge>
                        <span className="text-sm text-muted">
                          {airportLabel(slice.fromCode)} → {airportLabel(slice.toCode)} ·{" "}
                          {formatDuration(slice.durationMinutes)} ·{" "}
                          {slice.stops === 0
                            ? "non-stop"
                            : `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    )}
                    <SegmentTimeline slice={slice} animated />
                  </div>
                ))}
              </div>
            </section>

            <CabinAmenities offer={offer} />
            <SeatMapPreview offer={offer} />
            <FareRules offer={offer} />
            {offer.slices.map((slice) => (
              <AirportInfo key={slice.id} slice={slice} />
            ))}
          </div>

          {/* ---- Sticky booking rail ---------------------------------------- */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-card border border-line bg-surface p-5 shadow-card">
              <h2 className="mb-4 text-base font-semibold text-ink">Price breakdown</h2>

              <FareBreakdownPanel
                fare={offer.fare}
                couponDiscountUsd={coupon?.discountUsd ?? 0}
                couponCode={coupon?.code}
              />

              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-sm font-medium text-ink">Have a promo code?</p>
                <CouponField
                  subtotalUsd={offer.fare.totalUsd}
                  value={coupon}
                  onChange={setCoupon}
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onBook}
                disabled={starting}
                className="mt-5"
              >
                {starting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Holding this fare…
                  </>
                ) : (
                  "Continue to booking"
                )}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
                Fare re-confirmed before payment
              </p>

              <Link
                href={searchHref(query)}
                className={`${buttonVariants({ variant: "ghost", size: "sm", fullWidth: true })} mt-2`}
              >
                Compare other flights
              </Link>
            </div>

            {offer.seatsAvailable <= 5 && (
              <p className="mt-3 rounded-field border border-danger/30 bg-danger/5 px-4 py-3 text-center text-sm font-medium text-danger">
                Only {offer.seatsAvailable} seats left at {money(offer.fare.perAdultUsd)} per
                traveller
              </p>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
