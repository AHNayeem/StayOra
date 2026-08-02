"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type {
  AncillarySelection,
  FlightContact,
  FlightOffer,
  FlightPassenger,
  EmergencyContact,
  SeatMap,
  VisaRequirement,
} from "@/types/flight";
import { getSeatMaps, getVisaRequirement } from "@/services/flight.service";
import { createFlightBooking } from "@/services/flight-checkout";
import { seatMapPrice } from "@/lib/mock/seatmap";
import { airportLabel } from "@/lib/mock/airports";
import { useAuth } from "@/features/auth";
import { useRequireAuth } from "@/features/auth/guards";
import { usePaymentSelection } from "@/components/checkout/payment-methods";
import { AuthGate } from "@/components/auth/auth-gate";
import { Container } from "@/components/ui/container";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { persistFlightBooking } from "../bookings-store";
import { offerHref } from "./booking-url";
import { TravellersStep } from "./travellers-step";
import { SeatStep, type SeatAssignments } from "./seat-step";
import { ExtrasStep } from "./extras-step";
import { ReviewStep } from "./review-step";
import { BookingConfirmation } from "./booking-confirmation";
import type { TravellersFormValues } from "./schemas";
import type { AppliedCoupon } from "../pricing/coupon-field";

const STEPS = ["Travellers", "Seats", "Extras", "Review & pay"] as const;
type StepIndex = 0 | 1 | 2 | 3;

interface FlightBookingFlowProps {
  offer: FlightOffer;
  /** Coupon carried over from the details page, if any. */
  initialCouponCode?: string;
}

/**
 * FlightBookingFlow — search → traveller details → seats → extras → review →
 * payment → confirmation, as one auth-guarded client flow.
 *
 * State lives here rather than in each step so moving backwards is lossless:
 * a traveller who returns from Review to fix a passport number finds their
 * seats and extras exactly as they left them. Every step reads and writes the
 * same objects, and only the final submit talks to the service.
 */
export function FlightBookingFlow({
  offer,
  initialCouponCode,
}: FlightBookingFlowProps) {
  const { isResolving, status } = useRequireAuth();
  const { user } = useAuth();

  if (isResolving || status !== "authenticated" || !user) {
    return (
      <Container className="py-16">
        <AuthGate label="Preparing your booking…" />
      </Container>
    );
  }

  return <BookingInner offer={offer} user={user} initialCouponCode={initialCouponCode} />;
}

function BookingInner({
  offer,
  user,
  initialCouponCode,
}: {
  offer: FlightOffer;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  initialCouponCode?: string;
}) {
  const [step, setStep] = useState<StepIndex>(0);

  // --- Collected across steps ----------------------------------------------
  const [travellerValues, setTravellerValues] = useState<TravellersFormValues>();
  const [passengers, setPassengers] = useState<FlightPassenger[]>([]);
  const [contact, setContact] = useState<FlightContact>();
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>();
  const [seats, setSeats] = useState<SeatAssignments>({});
  const [ancillaries, setAncillaries] = useState<AncillarySelection[]>([]);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  // --- Supporting data ------------------------------------------------------
  const [seatMaps, setSeatMaps] = useState<SeatMap[]>([]);
  const [visa, setVisa] = useState<VisaRequirement>();

  // --- Submission -----------------------------------------------------------
  const payment = usePaymentSelection(user.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState("");
  const [createdPnr, setCreatedPnr] = useState("");

  const destination = offer.slices[offer.slices.length - 1].toCode;

  // Seat maps are needed to price picks; visa status informs the traveller step.
  useEffect(() => {
    let cancelled = false;
    getSeatMaps(offer.id).then((maps) => {
      if (!cancelled) setSeatMaps(maps);
    });
    return () => {
      cancelled = true;
    };
  }, [offer.id]);

  useEffect(() => {
    let cancelled = false;
    getVisaRequirement(destination, user.country ?? "BD").then((result) => {
      if (!cancelled) setVisa(result);
    });
    return () => {
      cancelled = true;
    };
  }, [destination, user.country]);

  /** Seat surcharges, priced from the maps rather than trusted from state. */
  const seatsTotalUsd = seatMaps.reduce((sum, map) => {
    const ids = Object.values(seats[map.segmentId] ?? {});
    return sum + seatMapPrice(map, ids);
  }, 0);

  const goTo = (next: StepIndex) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async () => {
    if (submitting || !contact) return;
    setSubmitting(true);
    setError(null);

    try {
      const nowMs = Date.now();
      payment.persist(nowMs, contact.country);
      const { method, brand } = payment.resolve();

      // Fold each traveller's seat picks onto their record so the ticket and
      // boarding pass can render them without re-reading the maps.
      const withSeats: FlightPassenger[] = passengers.map((passenger) => {
        const perSegment: Record<string, string> = {};
        for (const [segmentId, bySegment] of Object.entries(seats)) {
          if (bySegment[passenger.id]) perSegment[segmentId] = bySegment[passenger.id];
        }
        return Object.keys(perSegment).length
          ? { ...passenger, seats: perSegment }
          : passenger;
      });

      const created = await createFlightBooking({
        offer,
        passengers: withSeats,
        contact,
        emergencyContact,
        ancillaries,
        seatsTotalUsd,
        couponCode: coupon?.code,
        couponDiscountUsd: coupon?.discountUsd ?? 0,
        paymentMethod: method,
        cardBrand: brand,
        billToName: user.name,
        nowMs,
      });

      persistFlightBooking(created);
      setCreatedId(created.flight.id);
      setCreatedRef(created.flight.reference);
      setCreatedPnr(created.flight.pnr);
      toast.success("Booking confirmed — tickets issued", {
        description: `Reference ${created.flight.reference}`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(
        "We couldn't complete your booking. No payment has been taken — please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --- Confirmation ---------------------------------------------------------
  if (createdId) {
    return (
      <BookingConfirmation
        bookingId={createdId}
        reference={createdRef}
        pnr={createdPnr}
        offer={offer}
        passengers={passengers}
        contact={contact!}
      />
    );
  }

  const routeLabel =
    offer.tripType === "round-trip"
      ? `${airportLabel(offer.slices[0].fromCode)} ⇄ ${airportLabel(offer.slices[0].toCode)}`
      : `${airportLabel(offer.slices[0].fromCode)} → ${airportLabel(destination)}`;

  return (
    <Container className="py-6 md:py-8">
      <div className="mb-6">
        <Link
          href={offerHref(offer.id)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to flight details
        </Link>
        <h1 className="mt-3 text-h3 text-ink">Complete your booking</h1>
        <p className="text-sm text-muted">{routeLabel}</p>
      </div>

      <ProgressSteps current={step} onStepClick={(i) => i < step && goTo(i as StepIndex)} />

      <div className="mt-6">
        {step === 0 && (
          <TravellersStep
            offer={offer}
            initial={travellerValues}
            defaults={{ name: user.name, email: user.email, country: user.country }}
            visa={visa}
            onSubmit={({ passengers: pax, contact: c, emergencyContact: ec, raw }) => {
              setPassengers(pax);
              setContact(c);
              setEmergencyContact(ec);
              setTravellerValues(raw);
              goTo(1);
            }}
          />
        )}

        {step === 1 && (
          <SeatStep
            offer={offer}
            passengers={passengers}
            value={seats}
            onChange={setSeats}
            onBack={() => goTo(0)}
            onNext={() => goTo(2)}
          />
        )}

        {step === 2 && (
          <ExtrasStep
            offer={offer}
            value={ancillaries}
            onChange={setAncillaries}
            onBack={() => goTo(1)}
            onNext={() => goTo(3)}
          />
        )}

        {step === 3 && contact && (
          <ReviewStep
            offer={offer}
            passengers={passengers}
            contact={contact}
            emergencyContact={emergencyContact}
            ancillaries={ancillaries}
            seats={seats}
            seatsTotalUsd={seatsTotalUsd}
            coupon={coupon}
            onCoupon={setCoupon}
            payment={payment}
            submitting={submitting}
            error={error}
            onBack={() => goTo(2)}
            onSubmit={onSubmit}
          />
        )}
      </div>

      {initialCouponCode && step === 0 && (
        <p className="mt-6 text-center text-sm text-muted">
          Your code <strong className="text-ink">{initialCouponCode}</strong> will be
          applied at the payment step.
        </p>
      )}
    </Container>
  );
}

/** Step indicator. Completed steps are clickable; future ones are not. */
function ProgressSteps({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onStepClick(i)}
              disabled={!done}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2",
                done && "cursor-pointer",
                !done && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-primary text-white",
                  active && "bg-primary text-white ring-4 ring-primary/20",
                  !done && !active && "bg-surface-muted text-muted",
                )}
              >
                {done ? <CheckCircle2 className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  active || done ? "text-ink" : "text-muted",
                )}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
