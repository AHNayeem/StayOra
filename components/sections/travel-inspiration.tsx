import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { InspirationTheme } from "@/types/home";
import { Icon } from "@/components/shared/lucide-icon";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { HOME_SECTIONS } from "@/constants/home";
import { cn } from "@/lib/utils";

/** InspirationTile — an image entry point tinted for legible overlaid copy. */
function InspirationTile({
  theme,
  className,
  sizes,
}: {
  theme: InspirationTheme;
  className?: string;
  sizes: string;
}) {
  return (
    <Link
      href={theme.href}
      className={cn(
        "group relative block overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <Image
        src={theme.image}
        alt={theme.title}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-slow ease-out-soft group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/25 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
        <span className="mb-3 grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
          <Icon name={theme.icon} className="size-5" aria-hidden="true" />
        </span>
        <h3 className="flex items-center gap-1 text-lg font-semibold">
          {theme.title}
          <ArrowUpRight
            className="size-4 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </h3>
        <p className="text-sm text-white/85">{theme.subtitle}</p>
      </div>
    </Link>
  );
}

/**
 * TravelInspiration — a mood/interest bento grid. The first theme spans two
 * rows on desktop; the rest fill a responsive grid. Each tile deep-links to the
 * most relevant vertical or search.
 */
export function TravelInspiration({ themes }: { themes: InspirationTheme[] }) {
  if (themes.length === 0) return null;

  const [feature, ...rest] = themes;

  return (
    <Section background="surface">
      <SectionHeader {...HOME_SECTIONS.inspiration} />

      <div className="mt-10 grid auto-rows-[220px] grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <Reveal className="col-span-2 row-span-2">
          <InspirationTile
            theme={feature}
            className="h-full"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </Reveal>
        {rest.map((theme, index) => (
          <Reveal key={theme.id} step={(index % 3) + 1} className="col-span-1 h-full">
            <InspirationTile
              theme={theme}
              className="h-full"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
