import type { Offer } from "@/types/content";
import { OfferCard } from "@/components/cards/offer-card";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { HOME_SECTIONS } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";

/**
 * DealsSection — the "phenomenal deals" band: a scroll-revealing grid of
 * promotional {@link OfferCard}s.
 */
export function DealsSection({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) return null;

  return (
    <Section background="muted">
      <SectionHeader {...HOME_SECTIONS.deals} />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {offers.map((offer, index) => (
          <Reveal key={offer.id} step={index % 2} className="h-full">
            <OfferCard offer={offer} className="h-full" />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
