"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import type { RecommendationGroup, TripContext, TripItem } from "@/types/trip";
import { getRecommendations } from "@/services/recommendation";
import { useLocale } from "@/features/i18n";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/ui/card-image";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useTripCart } from "../trip-store";
import { useAddToTrip } from "../use-add-to-trip";
import { hasDestination } from "../context";

interface RecommendationRailProps {
  /** Override the trip context (e.g. a flight page before anything is added). */
  context?: TripContext;
  /** Override the chosen items used for de-duplication. */
  items?: TripItem[];
  /** Heading, e.g. "Complete your Dubai trip". */
  title?: string;
  subtitle?: string;
  maxGroups?: number;
  perGroup?: number;
  className?: string;
  /** Compact single-row variant for confirmation screens. */
  variant?: "full" | "compact";
}

/**
 * RecommendationRail — "Complete your Dubai trip".
 *
 * Reads the trip context, asks {@link getRecommendations} what belongs with it,
 * and renders one tab per category. Every card offers the three things the
 * traveller actually needs: **View** the product, **Add to trip**, or **Skip**
 * it — skipping is local and non-destructive, so a dismissed category simply
 * stops taking up space on this page.
 *
 * Renders nothing at all when there is no destination yet, rather than filling
 * the page with generic inventory.
 */
export function RecommendationRail({
  context: contextOverride,
  items: itemsOverride,
  title,
  subtitle,
  maxGroups = 4,
  perGroup = 6,
  className,
  variant = "full",
}: RecommendationRailProps) {
  const cart = useTripCart();
  const context = contextOverride ?? cart.context;

  /**
   * What to de-duplicate against.
   *
   * The cart's products count only when the cart is for the *same* destination
   * — otherwise a Paris hotel already in the trip would suppress the hotel rail
   * on a Dubai flight page, which is exactly backwards.
   */
  const items = useMemo(() => {
    if (itemsOverride) return itemsOverride;
    const sameDestination =
      !contextOverride ||
      contextOverride.destination?.city?.toLowerCase() ===
        cart.context.destination?.city?.toLowerCase();
    return sameDestination ? cart.items : [];
  }, [itemsOverride, contextOverride, cart.context.destination?.city, cart.items]);

  const enabled = hasDestination(context);

  /**
   * Everything that should re-run the engine, collapsed into one key: the
   * destination, the dates, the party and what's already chosen.
   */
  const key = useMemo(
    () =>
      [
        context.destination?.city,
        context.departureDate,
        context.returnDate,
        context.travelers.adults,
        context.travelers.children,
        context.seededBy,
        items.map((i) => i.id).join(","),
      ].join("|"),
    [context, items],
  );

  // Results are stored *with* the key they were fetched for, so a context
  // change invalidates them during render rather than through a second effect
  // pass — the same "adjust state when props change" pattern the flight results
  // view uses, and the reason no setState happens in the effect body below.
  const [result, setResult] = useState<{ key: string; groups: RecommendationGroup[] }>({
    key: "",
    groups: [],
  });
  const [active, setActive] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);

  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setActive(0);
    setSkipped([]);
  }

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getRecommendations(context, { items, maxGroups, perGroup }).then((groups) => {
      if (!cancelled) setResult({ key, groups });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, maxGroups, perGroup]);

  const groups = result.key === key ? result.groups : null;
  const visible = (groups ?? []).filter((g) => !skipped.includes(g.key));
  if (!enabled) return null;
  if (groups !== null && visible.length === 0) return null;

  const city = context.destination?.city;
  const group = visible[Math.min(active, Math.max(0, visible.length - 1))];

  return (
    <section
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-card md:p-6",
        className,
      )}
      aria-label={title ?? `Recommendations for ${city}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Complete your trip
          </p>
          <h2 className="mt-1 text-h4 font-bold text-ink">
            {title ?? (city ? `Complete your ${city} trip` : "Complete your trip")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {subtitle ??
              (group?.reason ?? "Matched to your destination, dates and travellers")}
          </p>
        </div>
        <Link
          href="/trip"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View trip
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      {groups === null ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-card" />
          ))}
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Recommendation categories"
            className="mt-4 flex flex-wrap gap-2"
          >
            {visible.map((g, i) => (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors",
                  i === active
                    ? "border-primary bg-primary-50 text-primary-700"
                    : "border-line text-body hover:border-primary hover:text-primary",
                )}
              >
                <VerticalIcon name={g.icon} className="size-4" aria-hidden="true" />
                {g.title}
                <span className="text-xs text-muted">{g.subtitle}</span>
              </button>
            ))}
          </div>

          {group && (
            <>
              <div
                className={cn(
                  "mt-5 grid gap-4",
                  variant === "compact"
                    ? "sm:grid-cols-2 lg:grid-cols-3"
                    : "sm:grid-cols-2 lg:grid-cols-3",
                )}
              >
                {group.items
                  .slice(0, variant === "compact" ? 3 : perGroup)
                  .map((product) => (
                    <RecommendationCard
                      key={product.id}
                      product={product}
                      inTrip={items.some(
                        (i) => i.ref.source === "catalog" && i.ref.listingId === product.id,
                      )}
                    />
                  ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSkipped((prev) => [...prev, group.key])}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                  Skip {group.title.toLowerCase()}
                </button>
                <span className="text-sm text-muted">·</span>
                <span className="text-sm text-muted">
                  Maybe later — your trip is saved as you go
                </span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

function RecommendationCard({
  product,
  inTrip,
}: {
  product: RecommendationGroup["items"][number];
  inTrip: boolean;
}) {
  const { money } = useLocale();
  const { addBySlug, pendingSlug } = useAddToTrip();
  const busy = pendingSlug === product.slug;

  const onAdd = async () => {
    const item = await addBySlug(product.kind, product.slug);
    if (item) {
      toast.success(`${product.title} added to your trip`, {
        description: item.detail,
      });
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-shadow hover:shadow-card">
      <div className="relative aspect-16/10 overflow-hidden bg-surface-muted">
        <CardImage
          src={product.image}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
          className="object-cover"
        />
        {product.badge && (
          <span className="absolute left-3 top-3">
            <Badge variant="dark" size="sm">
              {product.badge}
            </Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-primary">{product.reason}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink">
          {product.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{product.location}</span>
        </p>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          {product.rating !== undefined && (
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <Star className="size-3.5 fill-accent-500 text-accent-500" aria-hidden="true" />
              {product.rating.toFixed(1)}
            </span>
          )}
          {product.capacity !== undefined && <span>Up to {product.capacity}</span>}
        </div>

        <p className="mt-3 text-sm">
          <span className="text-base font-bold text-ink">{money(product.priceUsd)}</span>{" "}
          <span className="text-xs text-muted">{product.priceUnit}</span>
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Button
            variant={inTrip ? "outline" : "primary"}
            size="sm"
            onClick={onAdd}
            disabled={busy || inTrip}
            className="flex-1"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : inTrip ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                In trip
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden="true" />
                Add to trip
              </>
            )}
          </Button>
          <Link
            href={product.href}
            className="rounded-field border border-line px-3 py-2 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
