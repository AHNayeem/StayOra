import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { AutoListingCard } from "@/components/cards/auto-listing-card";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Carousel } from "@/components/shared/carousel";

interface ListingCarouselProps {
  items: Listing[];
  eyebrow?: string;
  title: string;
  description?: string;
  /** Vertical for the trailing "View all" link. */
  vertical?: BookingVertical;
  background?: "surface" | "muted";
  id?: string;
}

/**
 * ListingCarousel — the carousel counterpart to {@link "./featured-listings".FeaturedListings}:
 * a section header over a horizontally scrollable rail of listing cards. Used
 * for the home rails that read better as sliders (hotels, resorts, activities,
 * transport). Vertical-agnostic via {@link AutoListingCard}.
 */
export function ListingCarousel({
  items,
  eyebrow,
  title,
  description,
  vertical,
  background = "surface",
  id,
}: ListingCarouselProps) {
  if (items.length === 0) return null;

  const config = vertical ? VERTICALS[vertical] : undefined;

  return (
    <Section background={background} id={id}>
      <Carousel
        ariaLabel={title}
        itemClassName="w-[280px] sm:w-[330px]"
        header={<SectionHeader eyebrow={eyebrow} title={title} description={description} />}
        viewAll={
          config
            ? { href: config.href, label: `View all ${config.labelPlural}` }
            : undefined
        }
      >
        {items.map((item) => (
          <AutoListingCard key={item.id} listing={item} className="h-full" />
        ))}
      </Carousel>
    </Section>
  );
}
