import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { AutoListingCard } from "@/components/cards/auto-listing-card";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

type Columns = 2 | 3 | 4;

const columnClass: Record<Columns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

interface FeaturedListingsProps {
  items: Listing[];
  eyebrow?: string;
  title: string;
  description?: string;
  /** Vertical for the trailing "View all" link. */
  vertical?: BookingVertical;
  background?: "surface" | "muted";
  columns?: Columns;
  id?: string;
}

/**
 * FeaturedListings — the reusable home rail: a section header (with an optional
 * "View all" link) over a responsive grid of listing cards. Vertical-agnostic —
 * it renders whatever {@link Listing}s it's given via {@link AutoListingCard},
 * so the same component drives the Tours, Hotels, Activities, Transport and Visa
 * bands. Grid items reveal on scroll with a per-row cascade.
 */
export function FeaturedListings({
  items,
  eyebrow,
  title,
  description,
  vertical,
  background = "surface",
  columns = 3,
  id,
}: FeaturedListingsProps) {
  if (items.length === 0) return null;

  const viewAll = vertical ? VERTICALS[vertical] : undefined;

  return (
    <Section background={background} id={id}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          viewAll && (
            <Link
              href={viewAll.href}
              className={cn(buttonVariants({ variant: "outline", size: "md" }), "gap-2")}
            >
              View all {viewAll.labelPlural}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )
        }
      />

      <div className={cn("mt-10 grid grid-cols-1 gap-6 lg:gap-7", columnClass[columns])}>
        {items.map((item, index) => (
          <Reveal key={item.id} step={index % columns} className="h-full">
            <AutoListingCard listing={item} className="h-full" />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
