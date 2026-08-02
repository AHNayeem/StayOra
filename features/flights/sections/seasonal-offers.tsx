"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Tag } from "lucide-react";
import { SEASONAL_OFFERS } from "@/lib/mock/routes";
import { useLocale } from "@/features/i18n";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Reveal } from "@/components/shared/reveal";

interface SeasonalOffersProps {
  offers: typeof SEASONAL_OFFERS;
  background?: "surface" | "muted";
}

/**
 * SeasonalOffers — campaign cards with copyable promo codes.
 *
 * The code is the payload, so it's a real copy-to-clipboard action with toast
 * feedback rather than decoration — these are the same codes the checkout's
 * promo field accepts.
 */
export function SeasonalOffers({ offers, background = "surface" }: SeasonalOffersProps) {
  const { date } = useLocale();

  if (offers.length === 0) return null;

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
    <Section background={background} id="offers">
      <SectionHeader
        title="Seasonal offers"
        description="Campaign fares and promo codes running right now."
        align="center"
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {offers.map((offer, i) => (
          <Reveal key={offer.id} step={i}>
            <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={offer.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
                <Badge
                  variant="accent"
                  className="absolute left-3 top-3 bg-accent-500 text-white"
                >
                  {offer.discountLabel}
                </Badge>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-semibold text-ink">{offer.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-body">{offer.description}</p>

                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                  <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                  Book by {date(offer.expiresOn, { day: "numeric", month: "long" })}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyCode(offer.code)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-field border border-dashed border-primary bg-primary-50 px-3 py-2.5 font-mono text-sm font-bold text-primary transition-colors hover:bg-primary-50/70"
                  >
                    <Tag className="size-3.5" aria-hidden="true" />
                    {offer.code}
                  </button>
                  <Link
                    href="/flights"
                    className={buttonVariants({ variant: "primary", size: "sm" })}
                  >
                    Search
                  </Link>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
