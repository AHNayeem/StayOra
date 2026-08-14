"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  Lock,
  Sparkles,
  Tag,
  UserCheck,
  X,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import { BOOKING_CONFIG } from "@/constants/detail";
import { VERTICALS, listingHref } from "@/constants/verticals";
import { AskAiButton } from "@/features/ai";
import { RecommendationRail } from "@/features/trip";
import { useAuth } from "@/features/auth";
import { useSavedTravelers } from "@/features/account/travelers-store";
import { useLocale } from "@/features/i18n";
import {
  DEMO_CUSTOMER,
  REDEEM_STEP,
  isPerNight,
  nightsBetween,
  track,
  unitNoun,
  type Booking,
  type InventoryHold,
  type PaymentAttempt,
  type RatePlanId,
} from "@/features/dashboard/domain";
import {
  abandonHold,
  addOnsFor,
  attemptPayment,
  confirmBooking,
  createHold,
  depositPlan,
  isRequestVertical,
  quoteCheckout,
  submitAuthentication,
  toBookingAddOn,
  useDomainValue,
  useLoyalty,
  useWalletCoupons,
  type CheckoutSelection,
} from "@/features/booking";
import {
  RoomRateSelector,
  defaultChoice,
  type RoomRateChoice,
} from "@/components/booking/room-rate-selector";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { controlClasses } from "@/components/ui/field";
import { OrderSummary } from "./order-summary";
import { AddOnsPicker } from "./add-ons-picker";
import { InsurancePicker } from "./insurance-picker";
import { MembershipUpsell } from "./membership-upsell";
import { HoldTimer } from "./hold-timer";
import {
  MockPaymentPicker,
  PaymentFailure,
  ThreeDsChallenge,
  useMockPayment,
} from "./mock-payment";
import { TravelerFields, emptyTraveler, type TravelerDraft } from "./traveler-fields";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TRAVELERS = 9;

export interface CheckoutIntent {
  checkIn: string;
  checkOut: string;
  units: number;
  guests: number;
  roomTypeId?: string;
  ratePlanId?: RatePlanId;
}

type Step = 0 | 1 | 2 | 3;

const STEP_LABELS = ["Your trip", "Travellers", "Payment", "Review"];

/**
 * The customer checkout.
 *
 * Its job is orchestration, not arithmetic: dates and room choice go into
 * {@link quoteCheckout}, the resulting quote drives every number on screen, and
 * {@link confirmBooking} turns it into the one booking record the dashboard also
 * reads. Inventory is held from the moment the traveller reaches the payment
 * step, so the last room can't be sold twice while they type.
 *
 * Guests may check out without an account; the booking is filed against the
 * email they give, and signing in with it later surfaces the booking in
 * `/account`.
 */
export function CheckoutFlow({
  listing,
  intent,
}: {
  listing: Listing;
  intent: CheckoutIntent;
}) {
  const { user } = useAuth();
  const { money, date } = useLocale();
  const savedTravelers = useSavedTravelers();
  const config = BOOKING_CONFIG[listing.vertical];
  const noun = unitNoun(listing.vertical);
  const requestOnly = isRequestVertical(listing.vertical);
  const perNight = isPerNight(listing.vertical);
  const needsDocuments = listing.vertical === "visa";

  // --- selection -----------------------------------------------------------
  const [checkIn, setCheckIn] = useState(intent.checkIn);
  const [checkOut, setCheckOut] = useState(intent.checkOut);
  const [units, setUnits] = useState(Math.max(1, intent.units));
  const [guests, setGuests] = useState(Math.max(1, intent.guests));
  const [choice, setChoice] = useState<RoomRateChoice | null>(
    intent.roomTypeId && intent.ratePlanId
      ? { roomTypeId: intent.roomTypeId, ratePlanId: intent.ratePlanId }
      : null,
  );

  // Resolve a starting room/rate once the dates are known.
  const resolvedChoice = useDomainValue(
    () => choice ?? defaultChoice(listing, checkIn, checkOut, units, guests),
    [choice?.roomTypeId, choice?.ratePlanId, listing.id, checkIn, checkOut, units, guests],
  );

  // --- extras --------------------------------------------------------------
  const offers = useMemo(() => addOnsFor(listing.vertical), [listing.vertical]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  // The chosen demo insurance plan. Priced by the domain, never here.
  const [insurancePlanId, setInsurancePlanId] = useState<string | undefined>();

  // --- traveller + contact -------------------------------------------------
  const [travelers, setTravelers] = useState<TravelerDraft[]>(() => [
    {
      fullName: user?.name ?? "",
      type: "adult",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    },
  ]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [consent, setConsent] = useState(false);

  // --- money ---------------------------------------------------------------
  const email = (travelers[0]?.email || user?.email || DEMO_CUSTOMER.email).toLowerCase();
  const loyalty = useLoyalty();
  const wallet = useWalletCoupons();
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<string | undefined>();
  const [points, setPoints] = useState(0);
  const [payLater, setPayLater] = useState(false);

  const nights = perNight ? nightsBetween(checkIn, checkOut) : 1;
  const addOnScale = { nights: Math.max(1, nights), guests, units };
  /** Stable dependency key for the ticked add-ons. */
  const addOnKey = selectedAddOns.join(",");

  const selection: CheckoutSelection = useMemo(
    () => ({
      listing,
      roomTypeId: resolvedChoice.roomTypeId,
      ratePlanId: resolvedChoice.ratePlanId,
      checkIn,
      checkOut: perNight ? checkOut : checkIn,
      units,
      guests,
      addOns: offers
        .filter((o) => selectedAddOns.includes(o.id))
        .map((o) => toBookingAddOn(o, addOnScale)),
      promoCode,
      pointsToRedeem: points,
      customerEmail: email,
      insurancePlanId,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      listing,
      resolvedChoice.roomTypeId,
      resolvedChoice.ratePlanId,
      checkIn,
      checkOut,
      units,
      guests,
      addOnKey,
      insurancePlanId,
      promoCode,
      points,
      email,
      nights,
      perNight,
    ],
  );

  const quote = useDomainValue(() => quoteCheckout(selection), [
    JSON.stringify({
      room: selection.roomTypeId,
      rate: selection.ratePlanId,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      units: selection.units,
      guests: selection.guests,
      addOns: selection.addOns.map((a) => `${a.id}:${a.quantity}`),
      insurancePlanId: selection.insurancePlanId,
      promoCode: selection.promoCode,
      points: selection.pointsToRedeem,
      email: selection.customerEmail,
    }),
  ]);

  // --- flow ----------------------------------------------------------------
  const [step, setStep] = useState<Step>(0);
  const [hold, setHold] = useState<InventoryHold | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  /** Guards against a double click or a re-entrant submit creating two bookings. */
  const submitting = useRef(false);

  const payment = useMockPayment();
  const plan = payLater ? depositPlan(quote.money.total, checkIn) : null;
  const amountNow = plan ? plan.depositAmount : quote.money.total;

  // Release the hold if the traveller leaves before confirming. The unmount
  // cleanup needs the *latest* hold, so it reads through refs that are kept in
  // step by their own effects rather than written during render.
  const holdRef = useRef<InventoryHold | null>(null);
  const confirmedRef = useRef<Booking | null>(null);
  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);
  useEffect(() => {
    confirmedRef.current = confirmed;
  }, [confirmed]);
  useEffect(
    () => () => {
      if (holdRef.current && !confirmedRef.current) abandonHold(holdRef.current.id);
    },
    [],
  );

  useEffect(() => {
    track("checkout_viewed", { listing: listing.slug, vertical: listing.vertical });
  }, [listing.slug, listing.vertical]);

  const releaseAndRequote = () => {
    setHold(null);
    setAttempt(null);
    setStep(0);
    toast.error("Your hold expired", {
      description: "We've released the rooms and refreshed the price.",
    });
  };

  // --- validation ----------------------------------------------------------
  const datesValid =
    config.dateMode === "none" ||
    (Boolean(checkIn) && (!perNight || (Boolean(checkOut) && nights >= 1)));
  const tripValid = datesValid && (quote.available || requestOnly);
  const lead = travelers[0];
  const travelersValid =
    travelers.every((t) => t.fullName.trim().length > 1) &&
    EMAIL_RE.test(lead?.email ?? "") &&
    (!needsDocuments || travelers.every((t) => (t.passportNumber ?? "").trim().length > 3));
  const paymentValid = requestOnly || consent;

  // --- actions -------------------------------------------------------------
  const goToPayment = () => {
    if (requestOnly) {
      setStep(2);
      return;
    }
    const result = createHold(selection, quote);
    if (!result.ok) {
      setHoldError(result.message);
      toast.error("Those dates just went", { description: result.message });
      setStep(0);
      return;
    }
    setHoldError(null);
    setHold(result.hold);
    setStep(2);
    scrollTop();
  };

  const runPayment = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setAuthError(null);

    const result = attemptPayment({
      intentId: hold?.id ?? `intent_${listing.slug}`,
      amount: amountNow,
      instrument: payment.instrument,
      outcome: payment.outcome,
      holdId: hold?.id,
      balanceDue: plan?.balanceAmount,
      balanceDueAt: plan?.balanceDueAt,
    });
    setAttempt(result);

    if (result.status === "captured") {
      await finalize(result);
      return;
    }
    // 3-D Secure or a decline — both leave the hold in place so the traveller
    // keeps their dates while they sort it out.
    submitting.current = false;
    setBusy(false);
    if (result.status === "failed") {
      toast.error("Payment failed", { description: result.failureMessage });
    }
  };

  const finalize = async (paidWith: PaymentAttempt | null) => {
    try {
      const booking = await confirmBooking({
        selection,
        quote,
        hold,
        attempt: paidWith,
        customer: {
          id: user?.id,
          name: lead?.fullName || user?.name || "Guest",
          email,
          phone: lead?.phone,
        },
        travelers,
        specialRequests: specialRequests.trim() || undefined,
        paymentPlan: plan ?? undefined,
        requestOnly,
      });
      setConfirmed(booking);
      setStep(3);
      scrollTop();
      toast.success(requestOnly ? "Request submitted" : "Booking confirmed!", {
        description: `Reference ${booking.reference}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong finishing your booking.";
      setHoldError(message);
      toast.error("We couldn't finish your booking", { description: message });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const onAuthenticate = async (code: string) => {
    if (!attempt) return;
    setBusy(true);
    const result = submitAuthentication(attempt.id, code);
    setAttempt(result.attempt);
    if (result.ok) {
      setAuthError(null);
      submitting.current = true;
      await finalize(result.attempt);
    } else {
      setAuthError(result.message);
      setBusy(false);
    }
  };

  const retryPayment = () => {
    setAttempt(null);
    setAuthError(null);
    setStep(2);
    scrollTop();
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoCode(code);
  };

  // The reason a code was refused is rendered next to the input rather than
  // thrown at a toast, so it stays on screen while they fix it.
  const rejected = quote.rejected[0];

  // --- confirmation --------------------------------------------------------
  if (step === 3 && confirmed) {
    return (
      <Confirmation
        booking={confirmed}
        listing={listing}
        isRequest={requestOnly}
        isGuest={!user}
      />
    );
  }

  const primaryLabel = requestOnly
    ? "Submit request"
    : payLater
      ? `Pay deposit ${money(amountNow)}`
      : `Pay ${money(amountNow)}`;

  return (
    <Container className="py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-4">
        <Link
          href={listingHref({ vertical: listing.vertical, slug: listing.slug })}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to listing
        </Link>
        <h1 className="text-h3 text-ink">{requestOnly ? "Complete your request" : "Checkout"}</h1>
        <ProgressSteps labels={STEP_LABELS} current={step} />
        {/* Advancing a step replaces the whole panel with no focus move, so
            without this the change is silent to a screen reader. */}
        <p aria-live="polite" className="sr-only">
          Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
        </p>
        {hold && step >= 2 && (
          <HoldTimer key={hold.id} hold={hold} onExpire={releaseAndRequote} />
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {holdError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-card border border-danger/30 bg-danger/8 p-4 text-sm text-danger"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {holdError}
            </p>
          )}

          {/* ---------------------------------------------------------- Trip */}
          {step === 0 && (
            <>
              <Section title="Your dates">
                {config.dateMode === "range" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Labelled label={config.checkInLabel ?? "Check-in"}>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(event) => {
                          setCheckIn(event.target.value);
                          if (checkOut && checkOut <= event.target.value) setCheckOut("");
                          setChoice(null);
                        }}
                        className={cn(controlClasses(false), "h-11")}
                      />
                    </Labelled>
                    <Labelled label={config.checkOutLabel ?? "Check-out"}>
                      <input
                        type="date"
                        value={checkOut}
                        min={checkIn || undefined}
                        onChange={(event) => {
                          setCheckOut(event.target.value);
                          setChoice(null);
                        }}
                        className={cn(controlClasses(false), "h-11")}
                      />
                    </Labelled>
                  </div>
                )}
                {config.dateMode === "single" && (
                  <Labelled label={config.singleDateLabel ?? "Date"}>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(event) => {
                        setCheckIn(event.target.value);
                        setCheckOut(event.target.value);
                        setChoice(null);
                      }}
                      className={cn(controlClasses(false), "h-11")}
                    />
                  </Labelled>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-field border border-line px-4 py-3">
                    <Stepper
                      label={noun.many[0].toUpperCase() + noun.many.slice(1)}
                      showLabel
                      value={units}
                      min={1}
                      max={8}
                      onChange={(value) => {
                        setUnits(value);
                        setChoice(null);
                      }}
                    />
                  </div>
                  <div className="rounded-field border border-line px-4 py-3">
                    <Stepper
                      label="Guests"
                      showLabel
                      value={guests}
                      min={1}
                      max={16}
                      onChange={(value) => {
                        setGuests(value);
                        setChoice(null);
                      }}
                    />
                  </div>
                </div>
              </Section>

              <Section
                title={`Choose your ${noun.one}`}
                hint="Prices are per stay and include the rate plan you pick."
              >
                <RoomRateSelector
                  listing={listing}
                  checkIn={checkIn}
                  checkOut={perNight ? checkOut : checkIn}
                  units={units}
                  guests={guests}
                  value={resolvedChoice}
                  onChange={setChoice}
                  variant="compact"
                />
              </Section>

              {(offers.length > 0 || true) && (
                <Section title="Add something extra" hint="Optional — add or remove any time before you pay.">
                  <AddOnsPicker
                    offers={offers}
                    selected={selectedAddOns}
                    onToggle={(id) =>
                      setSelectedAddOns((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                      )
                    }
                    scale={addOnScale}
                  />
                </Section>
              )}

              {quote.insuranceOffers.length > 0 && (
                <Section
                  title="Travel insurance"
                  hint="Optional cover for cancellation, medical costs and baggage."
                >
                  <InsurancePicker
                    offers={quote.insuranceOffers}
                    selectedPlanId={insurancePlanId}
                    onSelect={setInsurancePlanId}
                  />
                </Section>
              )}

              {quote.membership.code === "free" && (
                <Section
                  title="Otithee membership"
                  hint="Member rates and no service fee — optional, and never applied without a purchase."
                >
                  <MembershipUpsell
                    customerEmail={email}
                    customerName={travelers[0]?.fullName || user?.name || "Traveller"}
                    serviceFee={quote.money.fees}
                    netSale={quote.money.netSale}
                  />
                </Section>
              )}
            </>
          )}

          {/* --------------------------------------------------- Travellers */}
          {step === 1 && (
            <>
              {!user && (
                <p className="flex items-start gap-2 rounded-card border border-primary/25 bg-primary-50/60 p-4 text-sm text-body">
                  <UserCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    You&rsquo;re checking out as a guest.{" "}
                    <Link href="/login?next=/checkout" className="font-medium text-primary underline">
                      Sign in
                    </Link>{" "}
                    to use saved travellers, loyalty points and see this booking in your
                    account.
                  </span>
                </p>
              )}

              <Section title="Who's travelling?">
                <TravelerFields
                  travelers={travelers}
                  onChange={(index, patch) =>
                    setTravelers((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
                    )
                  }
                  onAdd={(prefill) =>
                    setTravelers((prev) =>
                      prev.length >= MAX_TRAVELERS ? prev : [...prev, prefill ?? emptyTraveler()],
                    )
                  }
                  onRemove={(index) =>
                    setTravelers((prev) => prev.filter((_, i) => i !== index))
                  }
                  savedTravelers={savedTravelers}
                  requireDocuments={needsDocuments}
                  max={MAX_TRAVELERS}
                />
              </Section>

              <Section title="Anything we should know?" hint="Optional">
                <textarea
                  value={specialRequests}
                  onChange={(event) => setSpecialRequests(event.target.value)}
                  rows={3}
                  placeholder="Early check-in, dietary needs, accessibility, a quiet room…"
                  className={cn(controlClasses(false), "resize-none py-2.5")}
                />
              </Section>
            </>
          )}

          {/* ------------------------------------------------------ Payment */}
          {step === 2 && (
            <>
              {attempt?.status === "requires_action" ? (
                <ThreeDsChallenge
                  attempt={attempt}
                  onSubmit={onAuthenticate}
                  onCancel={retryPayment}
                  busy={busy}
                  error={authError}
                />
              ) : attempt?.status === "failed" ? (
                <PaymentFailure attempt={attempt} onRetry={retryPayment} busy={busy} />
              ) : null}

              <Section title="Savings">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-ink">Promo or coupon code</p>
                    {promoCode && quote.discounts.some((d) => d.kind === "coupon") ? (
                      <div className="flex items-center justify-between rounded-field border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                          <Tag className="size-4" aria-hidden="true" />
                          {promoCode} applied
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoCode(undefined);
                            setPromoInput("");
                          }}
                          aria-label="Remove promo code"
                          className="grid size-7 place-items-center rounded-field text-emerald-700 hover:bg-emerald-500/15"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoInput}
                            onChange={(event) => setPromoInput(event.target.value)}
                            placeholder="Enter a code"
                            aria-label="Promo code"
                            className={cn(controlClasses(Boolean(rejected)), "h-11 flex-1 uppercase")}
                          />
                          <Button
                            variant="outline"
                            size="md"
                            onClick={applyPromo}
                            disabled={!promoInput.trim()}
                          >
                            Apply
                          </Button>
                        </div>
                        {rejected && (
                          <p role="alert" className="mt-2 text-sm text-danger">
                            {rejected.reason}
                          </p>
                        )}
                        {wallet.filter((c) => c.status === "active").length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {wallet
                              .filter((c) => c.status === "active")
                              .slice(0, 3)
                              .map((coupon) => (
                                <button
                                  key={coupon.id}
                                  type="button"
                                  onClick={() => {
                                    setPromoInput(coupon.code);
                                    setPromoCode(coupon.code);
                                  }}
                                  className="rounded-pill bg-surface-muted px-3 py-1 text-xs font-medium text-body transition-colors hover:bg-primary-50 hover:text-primary"
                                >
                                  {coupon.code} · {coupon.title}
                                </button>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {quote.maxPointsRedeemable >= REDEEM_STEP && (
                    <div className="rounded-field border border-line bg-surface-muted/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                          <Sparkles className="size-4 text-primary" aria-hidden="true" />
                          Use loyalty points
                        </p>
                        <p className="text-xs text-muted">
                          Balance {loyalty.balance.toLocaleString()} · up to{" "}
                          {quote.maxPointsRedeemable.toLocaleString()} here
                        </p>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={quote.maxPointsRedeemable}
                        step={REDEEM_STEP}
                        value={points}
                        onChange={(event) => setPoints(Number(event.target.value))}
                        aria-label="Loyalty points to redeem"
                        className="mt-3 w-full accent-(--color-primary)"
                      />
                      <p className="mt-1 text-sm text-body">
                        {points > 0
                          ? `Redeeming ${points.toLocaleString()} points — ${money(points * 0.01)} off`
                          : "Slide to apply points to this booking."}
                      </p>
                    </div>
                  )}
                </div>
              </Section>

              {!requestOnly && (
                <Section title="How would you like to pay?">
                  <MockPaymentPicker state={payment} />

                  <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-field border border-line p-3.5">
                    <input
                      type="checkbox"
                      checked={payLater}
                      onChange={(event) => setPayLater(event.target.checked)}
                      className="mt-0.5 size-4 rounded border-line text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-ink">Reserve now, pay later</span>
                      <span className="mt-0.5 block text-muted">
                        Pay a {money(depositPlan(quote.money.total, checkIn).depositAmount)}{" "}
                        deposit today; the balance of{" "}
                        {money(depositPlan(quote.money.total, checkIn).balanceAmount)} is due{" "}
                        {date(depositPlan(quote.money.total, checkIn).balanceDueAt!)}.
                      </span>
                    </span>
                  </label>
                </Section>
              )}

              <Section title="Cancellation policy">
                <p className="text-sm text-body">{quote.stay.cancellationSummary}</p>
                {!quote.refundable && (
                  <p className="mt-2 flex items-start gap-2 rounded-field bg-warning/10 p-3 text-sm text-amber-800">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    You chose a non-refundable rate. Switching to{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => {
                        setChoice({ roomTypeId: resolvedChoice.roomTypeId, ratePlanId: "flexible" });
                        setStep(0);
                      }}
                    >
                      a flexible rate
                    </button>{" "}
                    lets you cancel free of charge.
                  </p>
                )}
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-line text-primary focus:ring-primary"
                  />
                  <span>
                    I&rsquo;ve read and accept the{" "}
                    <Link href="/terms-and-conditions" className="font-medium text-primary underline">
                      terms
                    </Link>{" "}
                    and this booking&rsquo;s cancellation policy.
                  </span>
                </label>
              </Section>
            </>
          )}

          {/* ------------------------------------------------------- Footer */}
          <div className="flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={busy}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
            ) : (
              <span />
            )}

            {step === 0 && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setStep(1);
                  scrollTop();
                }}
                disabled={!tripValid}
              >
                Continue to travellers
              </Button>
            )}
            {step === 1 && (
              <Button variant="primary" size="lg" onClick={goToPayment} disabled={!travelersValid}>
                {requestOnly ? "Review request" : "Continue to payment"}
              </Button>
            )}
            {step === 2 && (
              <Button
                variant="primary"
                size="lg"
                onClick={requestOnly ? () => finalize(null) : runPayment}
                disabled={!paymentValid || busy || attempt?.status === "requires_action"}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Processing…
                  </>
                ) : (
                  <>
                    {!requestOnly && <Lock className="size-4" aria-hidden="true" />}
                    {primaryLabel}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <OrderSummary
            listing={listing}
            quote={quote}
            checkIn={checkIn}
            checkOut={perNight ? checkOut : checkIn}
            guests={guests}
            units={units}
          />
          {plan && (
            <div className="mt-3 rounded-card border border-primary/25 bg-primary-50/60 p-4 text-sm">
              <p className="flex justify-between font-medium text-ink">
                <span>Due today</span>
                <span>{money(plan.depositAmount)}</span>
              </p>
              <p className="mt-1 flex justify-between text-muted">
                <span>Balance {date(plan.balanceDueAt!)}</span>
                <span>{money(plan.balanceAmount)}</span>
              </p>
            </div>
          )}

          <AskAiButton
            label="Ask AI about this booking"
            prompt={`What is the cancellation policy for ${listing.title}?`}
            page={{
              label: listing.title,
              listing: {
                vertical: listing.vertical as Exclude<typeof listing.vertical, "flights">,
                slug: listing.slug,
                title: listing.title,
                destination: listing.location.label,
              },
              destination: listing.location.city ?? listing.location.label,
              suggestions: [
                `Summarize reviews for ${listing.title}`,
                `Compare ${listing.title} with something cheaper`,
                `Things to do in ${listing.location.city ?? listing.location.label}`,
              ],
            }}
            className="mt-3 w-full justify-center"
          />
        </aside>
      </div>
    </Container>
  );
}

function scrollTop(): void {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

function Confirmation({
  booking,
  listing,
  isRequest,
  isGuest,
}: {
  booking: Booking;
  listing: Listing;
  isRequest: boolean;
  isGuest: boolean;
}) {
  const { money, date } = useLocale();
  const vertical = VERTICALS[listing.vertical];

  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/12 text-emerald-600">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-h3 text-ink">
          {isRequest ? "Request submitted" : "You're all booked!"}
        </h1>
        <p className="mt-2 text-body">
          {isRequest
            ? "We've received your enquiry and will confirm availability by email shortly."
            : "A confirmation is in your inbox and the booking is in your account."}
        </p>

        <div className="mt-6 rounded-panel border border-line bg-surface p-5 text-left shadow-card">
          <Row label="Reference">
            <span className="font-mono font-semibold text-ink">{booking.reference}</span>
          </Row>
          <Row label={vertical.label}>
            <span className="max-w-[60%] truncate text-sm font-medium text-ink">
              {booking.productTitle}
            </span>
          </Row>
          {booking.stay && (
            <Row label="Room & rate">
              <span className="text-sm text-ink">
                {booking.stay.units} × {booking.stay.roomTypeName} · {booking.stay.ratePlanName}
              </span>
            </Row>
          )}
          <Row label="Dates">
            <span className="text-sm text-ink">
              {date(booking.startAt)} – {date(booking.endAt)}
            </span>
          </Row>
          <Row label={isRequest ? "Estimated total" : "Total"}>
            <span className="font-bold text-accent-600">{money(booking.money.total)}</span>
          </Row>
          {booking.paymentPlan?.kind === "deposit" && (
            <Row label="Balance due">
              <span className="text-sm text-ink">
                {money(booking.paymentPlan.balanceAmount)} by{" "}
                {date(booking.paymentPlan.balanceDueAt!)}
              </span>
            </Row>
          )}
        </div>

        {isGuest && (
          <p className="mt-4 rounded-card border border-line bg-surface-muted/50 p-4 text-sm text-body">
            You booked as a guest. Create an account with{" "}
            <strong className="text-ink">{booking.customer.email}</strong> and this booking
            will be waiting for you.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/account/bookings/${booking.id}`}
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            View booking
          </Link>
          <Link
            href="/account/bookings"
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            All bookings
          </Link>
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "md" })}>
            Keep exploring
          </Link>
        </div>
      </div>

      <RecommendationRail
        context={{
          destination: {
            city: listing.location.city ?? listing.location.label,
            country: listing.location.country ?? "",
            countryCode: listing.location.countryCode,
            label: listing.location.label,
          },
          departureDate: booking.startAt.slice(0, 10),
          returnDate: booking.endAt.slice(0, 10),
          travelers: { adults: booking.travelers.length, children: 0, infants: 0 },
          tripType: "one-way",
          currency: "USD",
          seededBy: listing.vertical,
          updatedAt: "",
        }}
        className="mx-auto mt-10 max-w-4xl"
        title={`What else for ${listing.location.city ?? listing.location.label}?`}
        subtitle="Add these to a trip and book them together next time"
        maxGroups={3}
        variant="compact"
      />
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ProgressSteps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {labels.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-primary text-white",
                active && "bg-primary text-white ring-4 ring-primary/20",
                !done && !active && "bg-surface-muted text-muted",
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            {/* `sr-only` rather than `hidden` below `sm`: the numbered circle
                alone gives a screen reader no idea what step 2 *is*. */}
            <span
              className={cn(
                "text-sm font-medium sr-only sm:not-sr-only sm:block",
                active || done ? "text-ink" : "text-muted",
              )}
            >
              {label}
            </span>
            {index < labels.length - 1 && (
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 mb-3 text-sm text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}
