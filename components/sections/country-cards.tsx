import Image from "next/image";
import Link from "next/link";
import type { CountryHighlight } from "@/types/home";
import { PriceTag } from "@/components/ui/price-tag";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { HOME_SECTIONS } from "@/constants/home";

/** CountryTile — an image tile with flag, name, listing count and "from" price. */
function CountryTile({ country }: { country: CountryHighlight }) {
  return (
    <Link
      href={country.href}
      className="group relative block overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-[4/3]">
        <Image
          src={country.image}
          alt={country.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-slow ease-out-soft group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/20 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden="true">{country.flag}</span>
          {country.name}
        </p>
        <p className="text-sm text-white/85">
          {country.listingCount.toLocaleString()} places to stay
        </p>
        <PriceTag
          price={country.fromPrice}
          size="sm"
          from
          className="mt-1 [&_*]:!text-white"
        />
      </div>
    </Link>
  );
}

/**
 * CountryCards — a "browse by country" grid. Each tile deep-links into the
 * search results for that country. Distinct visual treatment from the
 * destination slider and the top-destinations grid.
 */
export function CountryCards({ countries }: { countries: CountryHighlight[] }) {
  if (countries.length === 0) return null;

  return (
    <Section background="surface">
      <SectionHeader {...HOME_SECTIONS.countries} align="center" />

      <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {countries.map((country, index) => (
          <Reveal key={country.code} step={index % 4} className="h-full">
            <CountryTile country={country} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
