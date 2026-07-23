import type { Destination } from "@/types/content";
import { DestinationCard } from "@/components/cards/destination-card";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Carousel } from "@/components/shared/carousel";
import { HOME_SECTIONS } from "@/constants/home";

/**
 * DestinationSlider — the "trending destinations" band as a horizontal
 * {@link Carousel} of portrait {@link DestinationCard}s. Swipe on touch,
 * arrows on desktop. Distinct from the grid-based TopDestinations band below.
 */
export function DestinationSlider({ destinations }: { destinations: Destination[] }) {
  if (destinations.length === 0) return null;

  return (
    <Section background="surface">
      <Carousel
        ariaLabel="Trending destinations"
        itemClassName="w-[220px] sm:w-[250px]"
        header={<SectionHeader {...HOME_SECTIONS.slider} />}
        viewAll={{ href: "/destinations", label: "All destinations" }}
      >
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            className="h-full"
          />
        ))}
      </Carousel>
    </Section>
  );
}
