import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Destination } from "@/types/content";
import { DestinationCard } from "@/components/cards/destination-card";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { HOME_SECTIONS } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

/**
 * FeaturedDestinations — a scroll-revealing grid of portrait destination tiles.
 */
export function FeaturedDestinations({ destinations }: { destinations: Destination[] }) {
  if (destinations.length === 0) return null;

  return (
    <Section background="muted">
      <SectionHeader
        {...HOME_SECTIONS.destinations}
        action={
          <Link
            href="/destinations"
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "gap-2")}
          >
            All destinations
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {destinations.map((destination, index) => (
          <Reveal key={destination.id} step={index % 3} className="h-full">
            <DestinationCard destination={destination} className="h-full" />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
