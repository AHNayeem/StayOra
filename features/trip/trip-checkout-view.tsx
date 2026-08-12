"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import type { B2BAccount } from "@/features/dashboard/domain/types";
import type { TripComponent } from "@/types/trip";
import { travelerCount } from "@/types/trip";
import { VERTICALS } from "@/constants/verticals";
import { CANCELLATION_POLICIES, b2bService } from "@/features/dashboard/domain";
import { defaultPolicyFor } from "@/features/dashboard/domain/money";
import { applyPromoCode } from "@/services/checkout";
import { checkAvailability, createTripBooking, priceTrip } from "@/services/trip.service";
import { useAuth } from "@/features/auth";
import { useRequireAuth } from "@/features/auth/guards";
import { useSavedTravelers } from "@/features/account/travelers-store";
import { addCreatedBooking } from "@/features/account/created-bookings";
import { addNotification } from "@/features/account/notifications-store";
import { useLocale } from "@/features/i18n";
import { AuthGate } from "@/components/auth/auth-gate";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { controlClasses } from "@/components/ui/field";
import {
  PaymentMethodPicker,
  usePaymentSelection,
} from "@/components/checkout/payment-methods";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { clearTripItems, useTripCart } from "./trip-store";
import { addTrip } from "./trips-store";
import { TripSummary } from "./components/trip-summary";
import { ComponentStatusBadge } from "./components/trip-status-badge";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TRAVELLERS = 9;

/**
 * TripCheckoutView — one checkout for a trip of several products.
 *
 * Deliberately the *same* checkout architecture as the single-product flow: the
 * same payment picker, the same promo seam, the same auth guard. What differs
 * is only what it produces — one platform booking per component instead of one,
 * each with its own provider, money and lifecycle.
 */
export function TripCheckoutView() {
  const { isResolving, status } = useRequireAuth();
  const { user } = useAuth();

  if (isResolving || status !== "authenticated" || !user) {
    return (
      <Container className="py-16">
        <AuthGate label="Preparing your trip checkout…" />
      </Container>
    );
  }

  return <CheckoutInner user={user} />;
}

function CheckoutInner({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const cart = useTripCart();
  const { money, date } = useLocale();
  const savedTravelers = useSavedTravelers();
  const payment = usePaymentSelection(user.name);

  // --- Agency (B2B) context -------------------------------------------------
  const [account, setAccount] = useState<B2BAccount | null>(null);
  useEffect(() => {
    if (!user.organizationId) return;
    let cancelled = false;
    b2bService
      .getAccount(user.organizationId)
      .then((result) => {
        if (!cancelled) setAccount(result);
      })
      .catch(() => setAccount(null));
    return () => {
      cancelled = true;
    };
  }, [user.organizationId]);

  const isB2B = Boolean(account && account.status === "active");

  // --- Traveller details ----------------------------------------------------
  const [travellerNames, setTravellerNames] = useState<string[]>([user.name]);
  const [contactName, setContactName] = useState(user.name);
  const [contactEmail, setContactEmail] = useState(user.email);
  const [contactCountry, setContactCountry] = useState(user.country ?? "");

  // --- Promo ----------------------------------------------------------------
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountUsd: number } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // --- Flow -----------------------------------------------------------------
  const [step, setStep] = useState<0 | 1>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    tripId: string;
    reference: string;
    components: TripComponent[];
  } | null>(null);

  const pricing = useMemo(
    () =>
      priceTrip({
        items: cart.items,
        couponDiscountUsd: promo?.discountUsd ?? 0,
        b2b:
          isB2B && account
            ? {
                netRateDiscount: account.netRateDiscount,
                markupRate: account.defaultMarkupRate,
              }
            : null,
      }),
    [cart.items, promo, isB2B, account],
  );

  const blocking = cart.items
    .map((item) => ({ item, availability: checkAvailability(item) }))
    .filter((row) => !row.availability.available);

  const detailsValid =
    contactName.trim().length > 1 &&
    EMAIL_RE.test(contactEmail) &&
    cart.items.length > 0;

  const onApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoError(null);
    const outcome = await applyPromoCode(promoInput, pricing.subtotalUsd);
    setPromoBusy(false);
    if (outcome.ok) {
      setPromo({ code: outcome.coupon.code, discountUsd: outcome.discountUsd });
      toast.success(`Promo applied — you saved ${money(outcome.discountUsd)}`);
    } else {
      setPromo(null);
      setPromoError(outcome.reason);
    }
  };

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const nowMs = Date.now();
    payment.persist(nowMs, contactCountry);
    const { method, brand } = payment.resolve();

    try {
      const created = await createTripBooking({
        context: cart.context,
        items: cart.items,
        pricing,
        customer: {
          name: contactName.trim(),
          email: contactEmail.trim(),
          country: contactCountry || undefined,
        },
        travelerNames: travellerNames.map((n) => n.trim()).filter(Boolean),
        segment: isB2B ? "b2b" : "b2c",
        organizationId: isB2B ? account?.id : undefined,
        organizationName: isB2B ? account?.name : undefined,
        paymentMethod: method,
        cardBrand: brand,
        combo: cart.comboId
          ? { comboId: cart.comboId, comboName: cart.comboName ?? "Bundle" }
          : null,
        couponCode: promo?.code,
        nowMs,
      });

      // Every confirmed component lands in the account area through the same
      // store the single-product and flight checkouts write to.
      for (const bundle of created.created) addCreatedBooking(bundle);
      addTrip(created.trip);

      addNotification({
        id: `ntf_${created.trip.id}`,
        type: "booking",
        title:
          created.failed.length > 0
            ? `${created.trip.reference} is partially confirmed`
            : `Your ${created.trip.destination} trip is confirmed`,
        body:
          created.failed.length > 0
            ? `${created.trip.components.length - created.failed.length} of ${created.trip.components.length} bookings confirmed. ${created.failed.length} need your attention.`
            : `${created.trip.components.length} bookings confirmed · ${created.trip.reference}`,
        date: new Date(nowMs).toISOString(),
        read: false,
        href: `/account/trips/${created.trip.id}`,
      });

      clearTripItems();
      setResult({
        tripId: created.trip.id,
        reference: created.trip.reference,
        components: created.trip.components,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (created.failed.length > 0) {
        toast.warning("Some bookings need attention", {
          description: `${created.failed.length} component${created.failed.length === 1 ? "" : "s"} couldn't be confirmed.`,
        });
      } else {
        toast.success("Trip booked!", { description: `Reference ${created.trip.reference}` });
      }
    } catch {
      toast.error("We couldn't complete your trip booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* --- Confirmation ------------------------------------------------------- */
  if (result) {
    const failed = result.components.filter((c) => c.status === "failed");
    const confirmed = result.components.filter((c) => c.status !== "failed");

    return (
      <Container className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <div
              className={cn(
                "mx-auto grid size-16 place-items-center rounded-full",
                failed.length > 0
                  ? "bg-accent-50 text-accent-600"
                  : "bg-emerald-500/12 text-emerald-600",
              )}
            >
              {failed.length > 0 ? (
                <AlertTriangle className="size-9" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-9" aria-hidden="true" />
              )}
            </div>
            <h1 className="mt-5 text-h3 text-ink">
              {failed.length > 0 ? "Your trip is partially confirmed" : "Your trip is booked"}
            </h1>
            <p className="mt-2 text-body">
              {failed.length > 0
                ? "We confirmed everything we could. The bookings below need another look — the rest of your trip is unaffected."
                : "Every component is confirmed. Each provider has your booking and its own reference."}
            </p>
            <p className="mt-3 font-mono text-sm font-semibold text-ink">{result.reference}</p>
          </div>

          <ul className="mt-6 space-y-3">
            {result.components.map((component) => (
              <li
                key={component.bookingId}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-card border bg-surface p-4",
                  component.status === "failed" ? "border-danger/40" : "border-line",
                )}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <VerticalIcon
                      name={VERTICALS[component.kind].icon}
                      className="size-3.5"
                      aria-hidden="true"
                    />
                    {VERTICALS[component.kind].label} · {component.merchantName}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                    {component.title}
                  </p>
                  <p className="font-mono text-xs text-muted">{component.reference}</p>
                  {component.failureNote && (
                    <p className="mt-1 text-xs text-danger">{component.failureNote}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <ComponentStatusBadge status={component.status} />
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {money(component.totalUsd)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={`/account/trips/${result.tripId}`}
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Manage this trip
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

          <p className="mt-6 text-center text-sm text-muted">
            {confirmed.length} of {result.components.length} bookings confirmed. Each one keeps
            its own cancellation policy — cancelling one never cancels the others.
          </p>
        </div>
      </Container>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-h3 text-ink">Nothing to check out</h1>
        <p className="mt-2 text-body">Add a flight, a stay or an activity to start a trip.</p>
        <Link
          href="/trip"
          className={`${buttonVariants({ variant: "primary", size: "md" })} mt-6`}
        >
          Back to my trip
        </Link>
      </Container>
    );
  }

  /* --- Steps -------------------------------------------------------------- */
  return (
    <Container className="py-8 md:py-10">
      <div className="mb-6">
        <Link
          href="/trip"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to my trip
        </Link>
        <h1 className="mt-3 text-h3 text-ink">
          Checkout · {cart.context.destination?.city ?? "your trip"}
        </h1>
        <ol className="mt-4 flex items-center gap-2">
          {["Travellers", "Payment", "Confirmation"].map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  i < step && "bg-primary text-white",
                  i === step && "bg-primary text-white ring-4 ring-primary/20",
                  i > step && "bg-surface-muted text-muted",
                )}
              >
                {i < step ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  i <= step ? "text-ink" : "text-muted",
                )}
              >
                {label}
              </span>
              {i < 2 && <span className="h-px flex-1 bg-line" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {isB2B && account && (
            <section className="flex items-start gap-3 rounded-card border border-primary/30 bg-primary-50 p-4">
              <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-primary-700">
                  Booking as {account.name} ({account.code})
                </p>
                <p className="text-primary-700/80">
                  Net rates apply ({account.netRateDiscount}% off public), plus your{" "}
                  {account.defaultMarkupRate}% markup. Settled on {account.settlementTerm}{" "}
                  terms against one consolidated invoice.
                </p>
              </div>
            </section>
          )}

          {blocking.length > 0 && (
            <section className="rounded-card border border-danger/40 bg-danger/5 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-danger">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {blocking.length} component{blocking.length === 1 ? "" : "s"} may not confirm
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-danger">
                {blocking.map((row) => (
                  <li key={row.item.id}>{row.availability.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-danger/80">
                You can still book — anything the provider rejects fails on its own and is
                refunded, leaving the rest of your trip confirmed.
              </p>
            </section>
          )}

          {step === 0 ? (
            <>
              <Section title="Trip components">
                <ul className="space-y-3">
                  {cart.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                          <VerticalIcon
                            name={VERTICALS[item.kind].icon}
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {VERTICALS[item.kind].label} · {item.merchantName}
                        </p>
                        <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                        <p className="text-xs text-muted">
                          {item.detail}
                          {item.startDate && ` · ${date(item.startDate, { dateStyle: "medium" })}`}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {CANCELLATION_POLICIES[defaultPolicyFor(item.kind)].summary}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {money(item.subtotalUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Contact details">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name">
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className={cn(controlClasses(false), "h-11")}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={cn(controlClasses(false), "h-11")}
                    />
                  </Field>
                  <Field label="Country (optional)">
                    <input
                      type="text"
                      value={contactCountry}
                      onChange={(e) => setContactCountry(e.target.value)}
                      placeholder="e.g. BD"
                      className={cn(controlClasses(false), "h-11")}
                    />
                  </Field>
                </div>
              </Section>

              <Section
                title={`Travellers (${travelerCount(cart.context.travelers)} on this trip)`}
              >
                <div className="space-y-2">
                  {travellerNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          setTravellerNames((prev) =>
                            prev.map((n, index) => (index === i ? e.target.value : n)),
                          )
                        }
                        placeholder={i === 0 ? "Lead traveller" : `Traveller ${i + 1}`}
                        className={cn(controlClasses(false), "h-11 flex-1")}
                      />
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTravellerNames((prev) => prev.filter((_, index) => index !== i))
                          }
                          aria-label={`Remove traveller ${i + 1}`}
                          className="grid size-10 shrink-0 place-items-center rounded-field text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {travellerNames.length < MAX_TRAVELLERS && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTravellerNames((prev) => [...prev, ""])}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3.5 py-1.5 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary"
                    >
                      <UserPlus className="size-4" aria-hidden="true" />
                      Add traveller
                    </button>
                    {savedTravelers
                      .filter((t) => !travellerNames.includes(t.fullName))
                      .slice(0, 4)
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTravellerNames((prev) => [...prev, t.fullName])}
                          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-3.5 py-1.5 text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          {t.fullName}
                        </button>
                      ))}
                  </div>
                )}
              </Section>
            </>
          ) : (
            <>
              <Section title="Payment method">
                <PaymentMethodPicker selection={payment} />
                {isB2B && (
                  <p className="mt-3 text-sm text-muted">
                    Agency bookings settle against your credit account; the card below is
                    kept on file for any balance.
                  </p>
                )}
              </Section>

              <Section title="Promo code">
                {promo ? (
                  <div className="flex items-center justify-between rounded-field border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                      <Tag className="size-4" aria-hidden="true" />
                      {promo.code} applied across your trip
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPromo(null);
                        setPromoInput("");
                        setPromoError(null);
                      }}
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
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Enter a code"
                      className={cn(controlClasses(false), "h-11 flex-1 uppercase")}
                    />
                    <Button
                      variant="outline"
                      size="md"
                      onClick={onApplyPromo}
                      disabled={promoBusy || !promoInput.trim()}
                    >
                      {promoBusy ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}
                {promoError && <p className="mt-2 text-sm text-danger">{promoError}</p>}
              </Section>

              <Section title="Cancellation & terms">
                <ul className="space-y-2 text-sm text-body">
                  {cart.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <span className="min-w-0 truncate">{item.title}</span>
                      <span className="shrink-0 text-muted">
                        {CANCELLATION_POLICIES[defaultPolicyFor(item.kind)].label}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">
                  Each component is booked with its own provider under its own policy.
                  Cancelling one refunds only that component.
                </p>
              </Section>
            </>
          )}

          <div className="flex items-center justify-between gap-3">
            {step === 1 ? (
              <Button variant="outline" size="md" onClick={() => setStep(0)} disabled={submitting}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step === 0 ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={!detailsValid}
              >
                Continue to payment
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={onSubmit}
                disabled={!payment.isValid || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Booking your trip…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" aria-hidden="true" />
                    Pay {money(pricing.totalUsd)}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <TripSummary
            pricing={pricing}
            comboName={cart.comboName}
            couponCode={promo?.code}
            showCommission={isB2B}
          />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {cart.items.length} bookings · {new Set(cart.items.map((i) => i.merchantId)).size}{" "}
            providers · one payment
          </p>
        </aside>
      </div>
    </Container>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
