"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Layers,
  MapPin,
  Store,
  Tag,
  Ticket,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useDomainValue } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { liveOffers, type StorefrontOffer } from "@/services/promotions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { HOME_SECTIONS } from "@/constants/home";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * PromoOffers — the campaigns running right now, read from the dashboard.
 *
 * Every card here is a live record from Promotions → Offers: the discount, the
 * code, the minimum spend and the eligibility are the platform's own rules, not
 * marketing copy, so a code copied from this band is one the checkout will
 * actually accept. Pausing or expiring an offer in the dashboard removes it
 * from the home page — there is no second list to keep in sync.
 */
export function PromoOffers({
  limit = 6,
  background = "surface",
}: {
  limit?: number;
  background?: "surface" | "muted";
}) {
  const offers = useDomainValue<StorefrontOffer[]>(
    () => liveOffers({ limit }),
    [limit],
  );

  if (offers.length === 0) return null;

  return (
    <Section background={background} id="offers">
      <SectionHeader
        {...HOME_SECTIONS.offers}
        action={
          <span className="inline-flex items-center gap-2 rounded-pill bg-accent-50 px-4 py-2 text-sm font-semibold text-accent-600">
            <Ticket className="size-4" aria-hidden="true" />
            {offers.length} campaign{offers.length === 1 ? "" : "s"} live
          </span>
        }
      />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer, index) => (
          <Reveal key={offer.id} step={index % 3} className="h-full">
            <OfferPromoCard offer={offer} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

/** OfferPromoCard — one live campaign: the discount, its rules and its code. */
function OfferPromoCard({ offer }: { offer: StorefrontOffer }) {
  const { money, date } = useLocale();

  const discountLabel =
    offer.discountType === "percent"
      ? `${offer.value}% off`
      : `${money(offer.value)} off`;

  // Under three days is genuine urgency and gets the danger tone; anything
  // longer is stated plainly as a closing date rather than a countdown.
  const urgent = offer.endsInDays <= 3;
  const endsLabel =
    offer.endsInDays === 0
      ? "Ends today"
      : offer.endsInDays <= 3
        ? `${offer.endsInDays} day${offer.endsInDays === 1 ? "" : "s"} left`
        : `Until ${date(offer.endAt, { day: "numeric", month: "short" })}`;

  const destinations =
    offer.destinations.length > 2
      ? `${offer.destinations.slice(0, 2).join(", ")} +${offer.destinations.length - 2} more`
      : offer.destinations.join(", ");

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Code ${code} copied`, {
        description: "Paste it at checkout to apply your discount.",
      });
    } catch {
      // Clipboard access can be denied; the code is on screen either way.
      toast.info(`Use code ${code} at checkout`);
    }
  };

  return (
    <article className="flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition duration-base ease-out-soft hover:-translate-y-1 hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="accent" size="md" className="bg-accent-500 text-white">
          {discountLabel}
        </Badge>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            urgent ? "text-danger" : "text-muted",
          )}
        >
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {endsLabel}
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold text-ink">{offer.name}</h3>
      <p className="mt-1.5 text-sm text-body">{offer.description}</p>

      <ul className="mt-4 flex-1 space-y-1.5 text-xs text-muted">
        <li className="flex items-baseline gap-1.5">
          <Layers className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
          Applies to {offer.appliesTo}
        </li>
        {destinations && (
          <li className="flex items-baseline gap-1.5">
            <MapPin className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
            {destinations}
          </li>
        )}
        {offer.minBookingAmount > 0 && (
          <li className="flex items-baseline gap-1.5">
            <Wallet className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
            Minimum spend {money(offer.minBookingAmount)}
          </li>
        )}
        {offer.eligibilityLabel && (
          <li className="flex items-baseline gap-1.5">
            <UserCheck className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
            {offer.eligibilityLabel}
          </li>
        )}
        {offer.merchantName && (
          <li className="flex items-baseline gap-1.5">
            <Store className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
            Offered by {offer.merchantName}
          </li>
        )}
      </ul>

      <div className="mt-5 flex items-center gap-2">
        {offer.promoCode ? (
          <button
            type="button"
            onClick={() => copyCode(offer.promoCode!)}
            aria-label={`Copy promo code ${offer.promoCode}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-field border border-dashed border-primary bg-primary-50 px-3 py-2.5 font-mono text-sm font-bold text-primary transition-colors hover:bg-primary-50/70"
          >
            <Tag className="size-3.5" aria-hidden="true" />
            {offer.promoCode}
          </button>
        ) : (
          <p className="flex-1 rounded-field bg-surface-muted px-3 py-2.5 text-center text-xs font-medium text-muted">
            Applied automatically
          </p>
        )}
        <Link
          href={offer.href}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-1.5")}
        >
          Browse
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {offer.remaining !== undefined && offer.remaining <= 100 && (
        <p className="mt-2.5 text-xs font-medium text-danger">
          Only {offer.remaining} redemption{offer.remaining === 1 ? "" : "s"} left
        </p>
      )}
    </article>
  );
}
