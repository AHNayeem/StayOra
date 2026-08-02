"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plane } from "lucide-react";
import type { PopularRoute } from "@/types/flight";
import { formatDuration } from "@/lib/flight-time";
import { useLocale } from "@/features/i18n";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/shared/reveal";
import { AirlineLogo } from "../airline-logo";
import { routeSearchHref } from "../route-links";

interface PopularRoutesProps {
  routes: PopularRoute[];
  title?: string;
  subtitle?: string;
  background?: "surface" | "muted";
  /** Compact grid without imagery — used on the results empty state. */
  variant?: "cards" | "list";
}

/**
 * PopularRoutes — merchandised city pairs, each linking straight into a
 * pre-filled search rather than a static page. That's the point: a route card
 * should put you one click from real fares, not one click from another page
 * that then asks you to fill in the form.
 */
export function PopularRoutes({
  routes,
  title = "Popular routes",
  subtitle = "The city pairs our travellers fly most, with the lowest fare we've seen recently.",
  background = "surface",
  variant = "cards",
}: PopularRoutesProps) {
  const { money } = useLocale();

  if (routes.length === 0) return null;

  if (variant === "list") {
    return (
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <li key={`${route.fromCode}-${route.toCode}`}>
            <Link
              href={routeSearchHref(route)}
              className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 transition-colors hover:border-primary"
            >
              <AirlineLogo code={route.airlineCode} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {route.fromCity} → {route.toCity}
                </span>
                <span className="block text-xs text-muted">
                  {route.direct ? "Non-stop" : "1 stop"} · {formatDuration(route.durationMinutes)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[0.6875rem] text-muted">from</span>
                <span className="block text-sm font-bold text-accent-600">
                  {money(route.fromUsd)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Section background={background} id="routes">
      <SectionHeader title={title} description={subtitle} align="center" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route, i) => (
          <Reveal key={`${route.fromCode}-${route.toCode}`} step={i % 3}>
            <Link
              href={routeSearchHref(route)}
              className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all hover:-translate-y-1 hover:border-primary"
            >
              <span className="relative block aspect-video overflow-hidden">
                <Image
                  src={route.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <span className="truncate">{route.fromCode}</span>
                      <Plane className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{route.toCode}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-white/80">
                      {route.fromCity} to {route.toCity}
                    </span>
                  </span>
                  {route.direct && (
                    <Badge variant="dark" size="sm" className="shrink-0 bg-white/95 text-ink">
                      Non-stop
                    </Badge>
                  )}
                </span>
              </span>

              <span className="flex flex-1 items-center gap-3 p-4">
                <AirlineLogo code={route.airlineCode} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted">
                    {formatDuration(route.durationMinutes)}
                    {route.direct ? " · Non-stop" : " · 1 stop"}
                  </span>
                  <span className="block text-sm font-medium text-ink">
                    Fares from{" "}
                    <span className="font-bold text-accent-600">{money(route.fromUsd)}</span>
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
