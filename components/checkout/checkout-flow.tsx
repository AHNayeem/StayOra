"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import type { CardBrand } from "@/types/traveler";
import { BOOKING_CONFIG } from "@/constants/detail";
import { VERTICALS, listingHref } from "@/constants/verticals";
import {
  computeBookingPricing,
  guestsFromSelection,
  roomsFromSelection,
  type BookingSelection,
} from "@/lib/booking-pricing";
import { useAuth } from "@/features/auth";
import { useRequireAuth } from "@/features/auth/guards";
import { useSavedCards, addCard } from "@/features/account/cards-store";
import { useSavedTravelers } from "@/features/account/travelers-store";
import { addCreatedBooking } from "@/features/account/created-bookings";
import {
  applyPromoCode,
  createBooking,
  fallbackDates,
  isRequestVertical,
} from "@/services/checkout";
import { useLocale } from "@/features/i18n";
import { AuthGate } from "@/components/auth/auth-gate";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { controlClasses } from "@/components/ui/field";
import { OrderSummary } from "./order-summary";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_GUEST_NAMES = 8;

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  paypal: "PayPal",
};

function brandFromNumber(digits: string): CardBrand {
  if (digits.startsWith("4")) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (digits.startsWith("5") || digits.startsWith("2")) return "mastercard";
  return "visa";
}

interface CheckoutFlowProps {
  listing: Listing;
  selection: BookingSelection;
}

/**
 * CheckoutFlow — the multi-step booking checkout. Auth-guarded (guests bounce to
 * `/login?next=/checkout…`). Step 1 confirms trip details and travellers, step 2
 * takes payment (or, for visa/convention requests, reviews the enquiry), then a
 * confirmation screen shows the reference and links into `/account/bookings`.
 * On submit it calls {@link createBooking} and persists the result client-side
 * via {@link addCreatedBooking}, so the booking shows across the account area.
 */
export function CheckoutFlow({ listing, selection: initial }: CheckoutFlowProps) {
  const { isResolving, status } = useRequireAuth();
  const { user } = useAuth();

  if (isResolving || status !== "authenticated" || !user) {
    return (
      <Container className="py-16">
        <AuthGate label="Preparing your checkout…" />
      </Container>
    );
  }

  return <CheckoutInner listing={listing} initial={initial} user={user} />;
}

function CheckoutInner({
  listing,
  initial,
  user,
}: {
  listing: Listing;
  initial: BookingSelection;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  const { money } = useLocale();
  const config = BOOKING_CONFIG[listing.vertical];
  const vertical = VERTICALS[listing.vertical];
  const isRequest = isRequestVertical(listing.vertical);
  const savedCards = useSavedCards();
  const savedTravelers = useSavedTravelers();

  // --- Editable selection (dates + quantities) -----------------------------
  const [selection, setSelection] = useState<BookingSelection>(initial);
  const pricing = computeBookingPricing(listing, config, selection);
  const guests = guestsFromSelection(config, selection.quantities);

  // --- Traveller + contact details -----------------------------------------
  const [guestNames, setGuestNames] = useState<string[]>([user.name]);
  const [contactName, setContactName] = useState(user.name);
  const [contactEmail, setContactEmail] = useState(user.email);
  const [contactCountry, setContactCountry] = useState(user.country ?? "");
  const [requests, setRequests] = useState("");

  // --- Payment --------------------------------------------------------------
  const defaultCard = savedCards.find((c) => c.isDefault) ?? savedCards[0];
  const [methodId, setMethodId] = useState<string>(defaultCard ? defaultCard.id : "new");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState(user.name);
  const [cardExpiry, setCardExpiry] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  // --- Promo ----------------------------------------------------------------
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountUsd: number } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // --- Flow state -----------------------------------------------------------
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState<string>("");

  const discountUsd = promo?.discountUsd ?? 0;
  const finalTotal = Math.max(0, pricing.totalUsd - discountUsd);

  const newCardDigits = cardNumber.replace(/\D/g, "");
  const newCardValid =
    newCardDigits.length >= 12 && cardHolder.trim().length > 1 && /^\d{1,2}\s*\/\s*\d{2,4}$/.test(cardExpiry);

  const detailsValid =
    contactName.trim().length > 1 &&
    EMAIL_RE.test(contactEmail) &&
    pricing.priceable &&
    (config.dateMode !== "single" || Boolean(selection.singleDate));

  const paymentValid =
    isRequest || methodId !== "new" || newCardValid;

  const setQuantity = (key: string, value: number) =>
    setSelection((prev) => ({ ...prev, quantities: { ...prev.quantities, [key]: value } }));

  const setGuestName = (index: number, value: string) =>
    setGuestNames((prev) => prev.map((n, i) => (i === index ? value : n)));

  const addGuestName = (value = "") =>
    setGuestNames((prev) => (prev.length >= MAX_GUEST_NAMES ? prev : [...prev, value]));

  const removeGuestName = (index: number) =>
    setGuestNames((prev) => prev.filter((_, i) => i !== index));

  const onApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoError(null);
    const result = await applyPromoCode(promoInput, pricing.subtotalUsd);
    setPromoBusy(false);
    if (result.ok) {
      setPromo({ code: result.coupon.code, discountUsd: result.discountUsd });
      toast.success(`Promo applied — you saved ${money(result.discountUsd)}`);
    } else {
      setPromo(null);
      setPromoError(result.reason);
    }
  };

  const resolvePaymentMethod = (): { method: string; brand: CardBrand } => {
    if (isRequest) return { method: "Pay on confirmation", brand: "visa" };
    if (methodId === "paypal") return { method: "PayPal", brand: "paypal" };
    if (methodId === "new") {
      const brand = brandFromNumber(newCardDigits);
      return { method: `${BRAND_LABEL[brand]} •••• ${newCardDigits.slice(-4)}`, brand };
    }
    const card = savedCards.find((c) => c.id === methodId);
    if (card) return { method: `${BRAND_LABEL[card.brand]} •••• ${card.last4}`, brand: card.brand };
    return { method: "Card", brand: "visa" };
  };

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const nowMs = Date.now();

    // Persist a freshly-typed card so it's there next time.
    if (!isRequest && methodId === "new" && saveCard && newCardValid) {
      const [mm, yy] = cardExpiry.split("/");
      addCard({
        id: `card_${nowMs.toString(36)}`,
        brand: brandFromNumber(newCardDigits),
        last4: newCardDigits.slice(-4),
        expMonth: Number(mm),
        expYear: Number(yy.length === 2 ? `20${yy}` : yy),
        holder: cardHolder.trim(),
        isDefault: savedCards.length === 0,
        billingCountry: contactCountry || undefined,
      });
    }

    const { method, brand } = resolvePaymentMethod();
    const dates =
      config.dateMode === "range"
        ? { checkIn: selection.checkIn, checkOut: selection.checkOut }
        : config.dateMode === "single"
          ? { checkIn: selection.singleDate, checkOut: selection.singleDate }
          : fallbackDates(nowMs);

    const names = guestNames.map((n) => n.trim()).filter(Boolean);

    const created = await createBooking({
      listing,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      nights: pricing.duration,
      guests,
      rooms: roomsFromSelection(selection.quantities),
      subtotalUsd: pricing.subtotalUsd,
      serviceFeeUsd: pricing.serviceFeeUsd,
      discountUsd,
      totalUsd: finalTotal,
      couponCode: promo?.code,
      guestNames: names,
      specialRequests: requests.trim() || undefined,
      paymentMethod: method,
      cardBrand: brand,
      billTo: {
        name: contactName.trim(),
        email: contactEmail.trim(),
        country: contactCountry || undefined,
      },
      cancellationPolicy: isRequest
        ? "Our team will confirm availability and pricing before any payment is taken."
        : "Free cancellation up to 48 hours before check-in. Cancellations after that are subject to the property's policy.",
      nowMs,
    });

    addCreatedBooking(created);
    setCreatedId(created.booking.id);
    setCreatedRef(created.booking.reference);
    setSubmitting(false);
    setStep(2);
    toast.success(isRequest ? "Request submitted!" : "Booking confirmed!", {
      description: `Reference ${created.booking.reference}`,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => setStep(0);

  const stepLabels = ["Details", isRequest ? "Review" : "Payment", "Confirmation"];
  const payCta = isRequest ? "Submit request" : `Pay ${money(finalTotal)}`;

  // --- Confirmation screen --------------------------------------------------
  if (step === 2 && createdId) {
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
              : "A confirmation has been sent to your email. Your booking is now in your account."}
          </p>

          <div className="mt-6 rounded-panel border border-line bg-surface p-5 text-left shadow-card">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-sm text-muted">Reference</span>
              <span className="font-mono font-semibold text-ink">{createdRef}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm text-muted">{vertical.label}</span>
              <span className="max-w-[60%] truncate text-sm font-medium text-ink">
                {listing.title}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted">{isRequest ? "Estimated total" : "Total paid"}</span>
              <span className="font-bold text-accent-600">{money(finalTotal)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={`/account/bookings/${createdId}`}
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
      </Container>
    );
  }

  // --- Steps 1–2 ------------------------------------------------------------
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
        <h1 className="text-h3 text-ink">{isRequest ? "Complete your request" : "Checkout"}</h1>
        <ProgressSteps labels={stepLabels} current={step} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {step === 0 ? (
            <DetailsStep
              config={config}
              selection={selection}
              onCheckIn={(v) =>
                setSelection((p) => ({
                  ...p,
                  checkIn: v,
                  checkOut: p.checkOut && p.checkOut <= v ? "" : p.checkOut,
                }))
              }
              onCheckOut={(v) => setSelection((p) => ({ ...p, checkOut: v }))}
              onSingleDate={(v) => setSelection((p) => ({ ...p, singleDate: v }))}
              onQuantity={setQuantity}
              contactName={contactName}
              onContactName={setContactName}
              contactEmail={contactEmail}
              onContactEmail={setContactEmail}
              contactCountry={contactCountry}
              onContactCountry={setContactCountry}
              guestNames={guestNames}
              onGuestName={setGuestName}
              onAddGuest={addGuestName}
              onRemoveGuest={removeGuestName}
              savedTravelerNames={savedTravelers.map((t) => t.fullName)}
              requests={requests}
              onRequests={setRequests}
            />
          ) : isRequest ? (
            <ReviewStep
              contactName={contactName}
              contactEmail={contactEmail}
              guestNames={guestNames.map((n) => n.trim()).filter(Boolean)}
              requests={requests}
            />
          ) : (
            <PaymentStep
              savedCards={savedCards}
              methodId={methodId}
              onMethod={setMethodId}
              cardNumber={cardNumber}
              onCardNumber={setCardNumber}
              cardHolder={cardHolder}
              onCardHolder={setCardHolder}
              cardExpiry={cardExpiry}
              onCardExpiry={setCardExpiry}
              saveCard={saveCard}
              onSaveCard={setSaveCard}
              promoInput={promoInput}
              onPromoInput={setPromoInput}
              onApplyPromo={onApplyPromo}
              promoBusy={promoBusy}
              promoError={promoError}
              promo={promo}
              onClearPromo={() => {
                setPromo(null);
                setPromoInput("");
                setPromoError(null);
              }}
            />
          )}

          <div className="flex items-center justify-between gap-3">
            {step === 1 ? (
              <Button variant="outline" size="md" onClick={goBack} disabled={submitting}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step === 0 ? (
              <Button variant="primary" size="lg" onClick={goNext} disabled={!detailsValid}>
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={onSubmit}
                disabled={!paymentValid || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Processing…
                  </>
                ) : (
                  <>
                    {!isRequest && <Lock className="size-4" aria-hidden="true" />}
                    {payCta}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <OrderSummary
            listing={listing}
            config={config}
            pricing={pricing}
            selection={selection}
            guests={guests}
            discountUsd={discountUsd}
            couponCode={promo?.code}
          />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {isRequest ? "No payment taken today" : "Secure checkout · you can cancel for free"}
          </p>
        </aside>
      </div>
    </Container>
  );
}

// --------------------------------------------------------------------------
// Progress indicator
// --------------------------------------------------------------------------

function ProgressSteps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-primary text-white",
                active && "bg-primary text-white ring-4 ring-primary/20",
                !done && !active && "bg-surface-muted text-muted",
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-medium sm:block",
                active || done ? "text-ink" : "text-muted",
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// --------------------------------------------------------------------------
// Step 1 — Trip details
// --------------------------------------------------------------------------

interface DetailsStepProps {
  config: (typeof BOOKING_CONFIG)[keyof typeof BOOKING_CONFIG];
  selection: BookingSelection;
  onCheckIn: (v: string) => void;
  onCheckOut: (v: string) => void;
  onSingleDate: (v: string) => void;
  onQuantity: (key: string, v: number) => void;
  contactName: string;
  onContactName: (v: string) => void;
  contactEmail: string;
  onContactEmail: (v: string) => void;
  contactCountry: string;
  onContactCountry: (v: string) => void;
  guestNames: string[];
  onGuestName: (i: number, v: string) => void;
  onAddGuest: (v?: string) => void;
  onRemoveGuest: (i: number) => void;
  savedTravelerNames: string[];
  requests: string;
  onRequests: (v: string) => void;
}

function DetailsStep(props: DetailsStepProps) {
  const {
    config,
    selection,
    onCheckIn,
    onCheckOut,
    onSingleDate,
    onQuantity,
    contactName,
    onContactName,
    contactEmail,
    onContactEmail,
    contactCountry,
    onContactCountry,
    guestNames,
    onGuestName,
    onAddGuest,
    onRemoveGuest,
    savedTravelerNames,
    requests,
    onRequests,
  } = props;

  const unusedTravellers = savedTravelerNames.filter((n) => !guestNames.includes(n));

  return (
    <div className="space-y-6">
      <Section title="Your trip">
        {config.dateMode === "range" && (
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label={config.checkInLabel ?? "Check-in"}>
              <input
                type="date"
                value={selection.checkIn}
                onChange={(e) => onCheckIn(e.target.value)}
                className={cn(controlClasses(false), "h-11")}
              />
            </FieldLabel>
            <FieldLabel label={config.checkOutLabel ?? "Check-out"}>
              <input
                type="date"
                value={selection.checkOut}
                min={selection.checkIn || undefined}
                onChange={(e) => onCheckOut(e.target.value)}
                className={cn(controlClasses(false), "h-11")}
              />
            </FieldLabel>
          </div>
        )}
        {config.dateMode === "single" && (
          <FieldLabel label={config.singleDateLabel ?? "Date"}>
            <input
              type="date"
              value={selection.singleDate}
              onChange={(e) => onSingleDate(e.target.value)}
              className={cn(controlClasses(false), "h-11")}
            />
          </FieldLabel>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.key} className="rounded-field border border-line px-4 py-3">
              <Stepper
                label={field.label}
                hint={field.hint}
                showLabel
                value={selection.quantities[field.key] ?? field.default}
                min={field.min}
                max={field.max}
                onChange={(v) => onQuantity(field.key, v)}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contact details">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldLabel label="Full name">
            <input
              type="text"
              value={contactName}
              onChange={(e) => onContactName(e.target.value)}
              className={cn(controlClasses(false), "h-11")}
            />
          </FieldLabel>
          <FieldLabel label="Email">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => onContactEmail(e.target.value)}
              className={cn(controlClasses(false), "h-11")}
            />
          </FieldLabel>
          <FieldLabel label="Country (optional)">
            <input
              type="text"
              value={contactCountry}
              onChange={(e) => onContactCountry(e.target.value)}
              placeholder="e.g. US"
              className={cn(controlClasses(false), "h-11")}
            />
          </FieldLabel>
        </div>
      </Section>

      <Section title="Guests">
        <div className="space-y-2">
          {guestNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => onGuestName(i, e.target.value)}
                placeholder={i === 0 ? "Lead guest" : `Guest ${i + 1}`}
                className={cn(controlClasses(false), "h-11 flex-1")}
              />
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => onRemoveGuest(i)}
                  aria-label={`Remove guest ${i + 1}`}
                  className="grid size-10 shrink-0 place-items-center rounded-field text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
        {guestNames.length < MAX_GUEST_NAMES && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onAddGuest("")}
              className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3.5 py-1.5 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Add guest
            </button>
            {unusedTravellers.slice(0, 4).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onAddGuest(n)}
                className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-3.5 py-1.5 text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {n}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Special requests (optional)">
        <textarea
          value={requests}
          onChange={(e) => onRequests(e.target.value)}
          rows={3}
          placeholder="Anything the host should know — early check-in, dietary needs, accessibility…"
          className={cn(controlClasses(false), "resize-none py-2.5")}
        />
      </Section>
    </div>
  );
}

// --------------------------------------------------------------------------
// Step 2a — Payment
// --------------------------------------------------------------------------

interface PaymentStepProps {
  savedCards: ReturnType<typeof useSavedCards>;
  methodId: string;
  onMethod: (id: string) => void;
  cardNumber: string;
  onCardNumber: (v: string) => void;
  cardHolder: string;
  onCardHolder: (v: string) => void;
  cardExpiry: string;
  onCardExpiry: (v: string) => void;
  saveCard: boolean;
  onSaveCard: (v: boolean) => void;
  promoInput: string;
  onPromoInput: (v: string) => void;
  onApplyPromo: () => void;
  promoBusy: boolean;
  promoError: string | null;
  promo: { code: string; discountUsd: number } | null;
  onClearPromo: () => void;
}

function PaymentStep(props: PaymentStepProps) {
  const {
    savedCards,
    methodId,
    onMethod,
    cardNumber,
    onCardNumber,
    cardHolder,
    onCardHolder,
    cardExpiry,
    onCardExpiry,
    saveCard,
    onSaveCard,
    promoInput,
    onPromoInput,
    onApplyPromo,
    promoBusy,
    promoError,
    promo,
    onClearPromo,
  } = props;

  return (
    <div className="space-y-6">
      <Section title="Payment method">
        <div className="space-y-2">
          {savedCards.map((card) => (
            <MethodRow
              key={card.id}
              id={card.id}
              selected={methodId === card.id}
              onSelect={onMethod}
              icon={<CreditCard className="size-5 text-primary" aria-hidden="true" />}
              title={`${BRAND_LABEL[card.brand]} •••• ${card.last4}`}
              subtitle={`Expires ${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`}
            />
          ))}

          <MethodRow
            id="new"
            selected={methodId === "new"}
            onSelect={onMethod}
            icon={<Plus className="size-5 text-primary" aria-hidden="true" />}
            title="Pay with a new card"
          />

          {methodId === "new" && (
            <div className="grid gap-3 rounded-card border border-line bg-surface-muted/40 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel label="Card number">
                  <input
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => onCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    maxLength={23}
                    className={cn(controlClasses(false), "h-11")}
                  />
                </FieldLabel>
              </div>
              <FieldLabel label="Cardholder name">
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => onCardHolder(e.target.value)}
                  className={cn(controlClasses(false), "h-11")}
                />
              </FieldLabel>
              <FieldLabel label="Expiry (MM/YY)">
                <input
                  value={cardExpiry}
                  onChange={(e) => onCardExpiry(e.target.value)}
                  placeholder="11/28"
                  maxLength={5}
                  className={cn(controlClasses(false), "h-11")}
                />
              </FieldLabel>
              <label className="flex items-center gap-2 text-sm text-body sm:col-span-2">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => onSaveCard(e.target.checked)}
                  className="size-4 rounded border-line text-primary focus:ring-primary"
                />
                Save this card for next time
              </label>
            </div>
          )}

          <MethodRow
            id="paypal"
            selected={methodId === "paypal"}
            onSelect={onMethod}
            icon={<span className="text-sm font-bold text-indigo-600">Pay</span>}
            title="PayPal"
            subtitle="You'll confirm in a mock PayPal window"
          />
        </div>
      </Section>

      <Section title="Promo code">
        {promo ? (
          <div className="flex items-center justify-between rounded-field border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Tag className="size-4" aria-hidden="true" />
              {promo.code} applied
            </span>
            <button
              type="button"
              onClick={onClearPromo}
              aria-label="Remove promo code"
              className="grid size-7 place-items-center rounded-field text-emerald-700 hover:bg-emerald-500/15"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => onPromoInput(e.target.value)}
              placeholder="Enter a code"
              className={cn(controlClasses(false), "h-11 flex-1 uppercase")}
            />
            <Button variant="outline" size="md" onClick={onApplyPromo} disabled={promoBusy || !promoInput.trim()}>
              {promoBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Apply"}
            </Button>
          </div>
        )}
        {promoError && <p className="mt-2 text-sm text-danger">{promoError}</p>}
      </Section>
    </div>
  );
}

function MethodRow({
  id,
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors",
        selected ? "border-primary bg-primary-50" : "border-line bg-surface hover:border-primary/40",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-field bg-surface-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-primary bg-primary text-white" : "border-line",
        )}
      >
        {selected && <Check className="size-3" aria-hidden="true" />}
      </span>
    </button>
  );
}

// --------------------------------------------------------------------------
// Step 2b — Review (request verticals)
// --------------------------------------------------------------------------

function ReviewStep({
  contactName,
  contactEmail,
  guestNames,
  requests,
}: {
  contactName: string;
  contactEmail: string;
  guestNames: string[];
  requests: string;
}) {
  return (
    <div className="space-y-6">
      <Section title="Review your request">
        <dl className="space-y-3 text-sm">
          <ReviewRow label="Contact">
            {contactName} · {contactEmail}
          </ReviewRow>
          {guestNames.length > 0 && (
            <ReviewRow label="Travellers">{guestNames.join(", ")}</ReviewRow>
          )}
          {requests.trim() && <ReviewRow label="Notes">{requests}</ReviewRow>}
        </dl>
        <div className="mt-4 flex items-start gap-2 rounded-field bg-surface-muted/60 p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-body">
            No payment is taken now. Our team reviews availability and pricing, then emails you a
            confirmation to complete the booking.
          </p>
        </div>
      </Section>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line pb-3 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink sm:text-right">{children}</dd>
    </div>
  );
}

// --------------------------------------------------------------------------
// Shared bits
// --------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
