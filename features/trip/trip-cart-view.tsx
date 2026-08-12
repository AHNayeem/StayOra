"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Luggage,
  MapPin,
  Package,
  Trash2,
  Users,
} from "lucide-react";
import type { ComboSuggestion } from "@/types/trip";
import { travelerCount } from "@/types/trip";
import { VERTICALS } from "@/constants/verticals";
import { getComboSuggestions } from "@/services/recommendation";
import { checkAvailability, priceTrip } from "@/services/trip.service";
import { useLocale } from "@/features/i18n";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardImage } from "@/components/ui/card-image";
import { Stepper } from "@/components/ui/stepper";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { toast } from "@/lib/toast";
import {
  clearTrip,
  removeTripItem,
  setTripCombo,
  updateTripItem,
  useTripCart,
} from "./trip-store";
import { useAddToTrip } from "./use-add-to-trip";
import { RecommendationRail } from "./components/recommendation-rail";
import { TripSummary } from "./components/trip-summary";

/**
 * TripCartView — "My Dubai Trip".
 *
 * Everything the traveller has gathered, priced as one trip but itemised per
 * product and per provider, with the bundle saving shown explicitly. Products
 * can be removed or re-quantified here; nothing is booked until checkout.
 */
export function TripCartView() {
  const cart = useTripCart();
  const { money, date } = useLocale();
  const { applyCombo } = useAddToTrip();
  const [combos, setCombos] = useState<{ key: string; items: ComboSuggestion[] }>({
    key: "",
    items: [],
  });

  // Bundles are only worth asking about once there are several products in a
  // known destination. The key is stored alongside the result so a change
  // invalidates it during render rather than through a setState in the effect.
  const comboKey = `${cart.context.destination?.city ?? ""}|${cart.items.map((i) => i.kind).join(",")}`;
  const eligibleForCombos = cart.items.length >= 2 && Boolean(cart.context.destination?.city);

  useEffect(() => {
    if (!eligibleForCombos) return;
    let cancelled = false;
    getComboSuggestions(cart.context, cart.items, new Date().toISOString()).then((result) => {
      if (!cancelled) setCombos({ key: comboKey, items: result });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comboKey, eligibleForCombos]);

  const suggestions = combos.key === comboKey ? combos.items : [];
  const combo = suggestions.find((c) => c.comboId === cart.comboId);
  const suggestion = suggestions.find((c) => c.comboId !== cart.comboId);

  // The bundle price replaces the sum of its parts once applied.
  const pricing = priceTrip({
    items: cart.items,
    combo:
      cart.comboId && combo ? { comboId: cart.comboId, comboPrice: combo.comboPrice } : null,
  });

  if (cart.items.length === 0) return <EmptyTrip />;

  const city = cart.context.destination?.city;
  const people = travelerCount(cart.context.travelers);

  return (
    <Container className="py-8 md:py-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Luggage className="size-3.5" aria-hidden="true" />
            Unified booking
          </p>
          <h1 className="mt-1 text-h2 text-ink">
            {city ? `My ${city} trip` : "My trip"}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {cart.context.departureDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {date(cart.context.departureDate, { dateStyle: "medium" })}
                {cart.context.returnDate &&
                  ` – ${date(cart.context.returnDate, { dateStyle: "medium" })}`}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {people} traveller{people === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Package className="size-4" aria-hidden="true" />
              {cart.items.length} product{cart.items.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearTrip();
            toast.info("Trip cleared");
          }}
          className="text-sm font-medium text-muted transition-colors hover:text-danger"
        >
          Clear trip
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <ul className="space-y-4">
            {cart.items.map((item) => {
              const availability = checkAvailability(item);
              const config = VERTICALS[item.kind];
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row"
                >
                  <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-field bg-surface-muted sm:h-24 sm:w-32">
                    <CardImage
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <VerticalIcon
                            name={config.icon}
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {config.label}
                        </p>
                        <h2 className="mt-0.5 truncate text-sm font-semibold text-ink">
                          {item.href ? (
                            <Link href={item.href} className="hover:text-primary">
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </h2>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            {item.destination}
                          </span>
                          <span>{item.detail}</span>
                          <span>Sold by {item.merchantName}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeTripItem(item.id);
                          if (cart.comboId) setTripCombo(null);
                        }}
                        aria-label={`Remove ${item.title} from trip`}
                        className="grid size-9 shrink-0 place-items-center rounded-field text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                      {item.ref.source === "catalog" ? (
                        <div className="rounded-field border border-line px-3 py-1.5">
                          <Stepper
                            label={item.unitLabel === "night" ? "Rooms / units" : "Quantity"}
                            value={item.quantity}
                            min={1}
                            max={10}
                            onChange={(value) =>
                              updateTripItem(item.id, { quantity: value })
                            }
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted">
                          {item.startDate}
                          {item.endDate && item.endDate !== item.startDate
                            ? ` → ${item.endDate}`
                            : ""}
                        </span>
                      )}
                      <p className="text-right">
                        <span className="block text-base font-bold text-ink">
                          {money(item.subtotalUsd)}
                        </span>
                        <span className="text-xs text-muted">
                          {money(item.unitPriceUsd)} × {item.units} × {item.quantity}
                        </span>
                      </p>
                    </div>

                    {!availability.available && (
                      <p className="mt-3 flex items-start gap-2 rounded-field bg-danger/8 px-3 py-2 text-xs text-danger">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        {availability.message} This component will fail at booking —
                        adjust it or remove it.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Bundle offer — the platform's own combo, priced by its own maths. */}
          {suggestion && (
            <ComboCard
              suggestion={suggestion}
              onApply={() => {
                applyCombo(suggestion);
                toast.success(`${suggestion.name} applied`, {
                  description: `You save ${money(suggestion.savingsUsd)} on the bundle.`,
                });
              }}
            />
          )}

          {combo && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-emerald-500/30 bg-emerald-500/8 p-4">
              <p className="text-sm font-medium text-emerald-700">
                {combo.name} applied — bundle price {money(combo.comboPrice)}
              </p>
              <button
                type="button"
                onClick={() => setTripCombo(null)}
                className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
              >
                Remove bundle
              </button>
            </div>
          )}

          <RecommendationRail
            title="Add more to your trip"
            subtitle="Related to what you've already chosen"
            maxGroups={3}
          />
        </div>

        <aside className="lg:sticky lg:top-24">
          <TripSummary pricing={pricing} comboName={cart.comboName}>
            <Link
              href="/trip/checkout"
              className={`${buttonVariants({ variant: "primary", size: "lg", fullWidth: true })}`}
            >
              Continue to checkout
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-center text-xs text-muted">
              Each product is booked with its own provider and keeps its own
              cancellation policy.
            </p>
          </TripSummary>
        </aside>
      </div>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */

function ComboCard({
  suggestion,
  onApply,
}: {
  suggestion: ComboSuggestion;
  onApply: () => void;
}) {
  const { money } = useLocale();

  return (
    <section className="rounded-card border border-accent-500/40 bg-accent-50/60 p-5">
      <h2 className="text-base font-bold text-ink">Save with a bundle</h2>
      <p className="mt-1 text-sm text-body">{suggestion.description}</p>

      <ul className="mt-4 space-y-1.5 text-sm">
        {suggestion.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-body">
              {item.title}
              <span className="text-muted"> · {item.detail}</span>
            </span>
            <span className="shrink-0 text-muted">{money(item.priceUsd)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1.5 border-t border-accent-500/30 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Normal total</dt>
          <dd className="text-ink line-through">{money(suggestion.separatelyUsd)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="font-semibold text-ink">Bundle price</dt>
          <dd className="font-bold text-accent-600">{money(suggestion.comboPrice)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-emerald-700">You save</dt>
          <dd className="font-semibold text-emerald-700">{money(suggestion.savingsUsd)}</dd>
        </div>
      </dl>

      <Button variant="primary" size="md" className="mt-4" onClick={onApply}>
        Apply combo
      </Button>
      <p className="mt-2 text-xs text-muted">{suggestion.terms}</p>
    </section>
  );
}

function EmptyTrip() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary-50 text-primary">
          <Luggage className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-h3 text-ink">Your trip is empty</h1>
        <p className="mt-2 text-body">
          Start with a flight or a stay — once we know where and when you&apos;re going,
          we&apos;ll suggest the hotels, transfers and things to do that fit.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/flights" className={buttonVariants({ variant: "primary", size: "md" })}>
            Search flights
          </Link>
          <Link href="/hotels" className={buttonVariants({ variant: "outline", size: "md" })}>
            Browse hotels
          </Link>
        </div>
      </div>
    </Container>
  );
}
