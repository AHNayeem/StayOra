"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, MapPin, Package, Sparkles } from "lucide-react";
import { useDomainValue } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { getTripCart, updateTripContext, useAddToTrip } from "@/features/trip";
import { comboDeals, type StorefrontCombo } from "@/services/promotions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { VERTICALS } from "@/constants/verticals";
import { HOME_SECTIONS } from "@/constants/home";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * ComboDeals — the bundles a visitor can book today, straight from the
 * dashboard's Promotions → Combos.
 *
 * The saving shown is the domain's own `comboTotals` arithmetic and the
 * "packages left" is its real inventory, so this band can't advertise a bundle
 * the platform has already sold out of. Applying one drops its components into
 * the trip cart as separate, individually-cancellable items — each keeping its
 * own merchant — which is exactly how a bundle is booked everywhere else.
 */
export function ComboDeals({
  limit = 3,
  background = "muted",
}: {
  limit?: number;
  background?: "surface" | "muted";
}) {
  const combos = useDomainValue<StorefrontCombo[]>(
    () => comboDeals({ limit }),
    [limit],
  );

  if (combos.length === 0) return null;

  return (
    <Section background={background} id="combos">
      <SectionHeader
        {...HOME_SECTIONS.combos}
        action={
          <Link href="/trip" className={buttonVariants({ variant: "outline", size: "md" })}>
            Build your own trip
          </Link>
        }
      />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo, index) => (
          <Reveal key={combo.id} step={index % 3} className="h-full">
            <ComboDealCard combo={combo} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

/** ComboDealCard — one bundle: what's inside, what it saves, how many are left. */
function ComboDealCard({ combo }: { combo: StorefrontCombo }) {
  const { money } = useLocale();
  const { applyCombo } = useAddToTrip();
  const router = useRouter();

  const soldPct = combo.inventory > 0 ? Math.round((combo.sold / combo.inventory) * 100) : 0;
  const scarce = combo.seatsLeft <= 20;

  const addToTrip = () => {
    const cart = getTripCart();
    // A visitor arriving straight from the home page has no trip yet — the
    // bundle's own destination is what anchors it, so the cart's rails and
    // recommendations are relevant the moment they land there.
    if (!cart.context.destination) {
      updateTripContext(
        {
          destination: {
            city: combo.destination,
            country: "",
            label: combo.destination,
          },
          seededBy: combo.items[0]?.kind,
        },
        new Date().toISOString(),
      );
    }

    applyCombo(combo.suggestion);
    toast.success(`${combo.name} added to your trip`, {
      description: `You're saving ${money(combo.savings)} against booking the components separately.`,
    });
    router.push("/trip");
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-base ease-out-soft hover:-translate-y-1 hover:shadow-card-hover">
      <div className="border-b border-line bg-accent-50/50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {combo.destination}
            </p>
            <h3 className="mt-1.5 text-base font-semibold text-ink">{combo.name}</h3>
          </div>
          <Badge variant="accent" size="md" className="shrink-0 bg-accent-500 text-white">
            Save {combo.savingsPercent}%
          </Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-body">{combo.description}</p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Package className="size-3.5 shrink-0 text-accent-600" aria-hidden="true" />
          {combo.items.length} products in this bundle
        </p>

        <ul className="mt-3 flex-1 space-y-2.5">
          {combo.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5 text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-field bg-surface-muted text-muted">
                <VerticalIcon
                  name={VERTICALS[item.kind]?.icon ?? ""}
                  className="size-3.5"
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{item.title}</span>
                <span className="block truncate text-xs text-muted">
                  {item.detail} · {item.merchantName}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">{money(item.priceUsd)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-muted">Booked separately</dt>
            <dd className="text-muted line-through">{money(combo.individualTotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="font-semibold text-ink">Bundle price</dt>
            <dd className="text-xl font-bold text-accent-600">{money(combo.comboPrice)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="inline-flex items-center gap-1 text-primary-700">
              <Sparkles className="size-3.5" aria-hidden="true" />
              You save
            </dt>
            <dd className="font-semibold text-primary-700">{money(combo.savings)}</dd>
          </div>
        </dl>

        {/* Scarcity is the domain's real inventory, not a decorative meter. */}
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-pill bg-surface-muted">
            <div
              className="h-full w-(--sold) rounded-pill bg-accent"
              style={{ "--sold": `${soldPct}%` } as CSSProperties}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
            <span className={cn(scarce ? "font-semibold text-danger" : "text-muted")}>
              {combo.seatsLeft} of {combo.inventory} packages left
            </span>
            <span className="inline-flex items-center gap-1 text-muted">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {combo.endsInDays === 0 ? "Ends today" : `${combo.endsInDays} days left`}
            </span>
          </div>
        </div>

        <Button variant="primary" size="md" fullWidth className="mt-4" onClick={addToTrip}>
          Add bundle to trip
        </Button>
        <p className="mt-2 line-clamp-2 text-xs text-muted">{combo.terms}</p>
      </div>
    </article>
  );
}
