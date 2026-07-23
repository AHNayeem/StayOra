import type { TravelPackage } from "@/types/home";
import { PackageCard } from "@/components/cards/package-card";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Carousel } from "@/components/shared/carousel";
import { HOME_SECTIONS } from "@/constants/home";

/**
 * TrendingPackages — a carousel of curated {@link PackageCard} bundles
 * (flights + stay + experiences). Links through to the tours vertical.
 */
export function TrendingPackages({ packages }: { packages: TravelPackage[] }) {
  if (packages.length === 0) return null;

  return (
    <Section background="muted">
      <Carousel
        ariaLabel="Trending travel packages"
        itemClassName="w-[300px] sm:w-[350px]"
        header={<SectionHeader {...HOME_SECTIONS.packages} />}
        viewAll={{ href: "/tours", label: "All packages" }}
      >
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} className="h-full" />
        ))}
      </Carousel>
    </Section>
  );
}
