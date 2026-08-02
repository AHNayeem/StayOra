"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Plane } from "lucide-react";
import type { FlightDeal } from "@/types/flight";
import { CABIN_SHORT_LABEL } from "@/lib/mock/fares";
import { useLocale } from "@/features/i18n";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Carousel } from "@/components/shared/carousel";
import { buttonVariants } from "@/components/ui/button";
import { AirlineLogo } from "../airline-logo";
import { dealSearchHref } from "../route-links";

interface FlightDealsProps {
  deals: FlightDeal[];
  title?: string;
  subtitle?: string;
  background?: "surface" | "muted";
  /** Show a "See all flights" action beside the heading. */
  viewAllHref?: string;
}

/**
 * FlightDeals — a carousel of merchandised fares.
 *
 * Each card links into a pre-filled search rather than to a fixed price, because
 * a fare that can't be re-quoted is a fare you can't sell. The struck-through
 * "was" price and the discount badge come from the deal record, so the saving
 * shown is the saving the fare model actually produces.
 */
export function FlightDeals({
  deals,
  title = "Featured flight deals",
  subtitle = "Hand-picked fares on the routes our travellers ask for most.",
  background = "muted",
  viewAllHref = "/flights",
}: FlightDealsProps) {
  const { money, date } = useLocale();

  if (deals.length === 0) return null;

  return (
    <Section background={background} id="deals">
      <Carousel
        ariaLabel={title}
        header={<SectionHeader title={title} description={subtitle} />}
        viewAll={{ href: viewAllHref, label: "Search all flights" }}
        itemClassName="w-[19rem] sm:w-[21rem]"
      >
        {deals.map((deal) => (
          <article
            key={deal.id}
            className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all hover:-translate-y-1 hover:border-primary"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              <Image
                src={deal.image}
                alt=""
                fill
                sizes="21rem"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 flex gap-1.5">
                <Badge variant="danger" size="sm" className="bg-danger text-white">
                  −{deal.discountPct}%
                </Badge>
                <Badge variant="dark" size="sm" className="bg-white/95 text-ink">
                  {CABIN_SHORT_LABEL[deal.cabin]}
                </Badge>
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center gap-2">
                <AirlineLogo code={deal.airlineCode} size="xs" />
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                  <span className="truncate">{deal.fromCity}</span>
                  <Plane className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                  <span className="truncate">{deal.toCity}</span>
                </p>
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {date(deal.departDate, { day: "numeric", month: "short" })}
                  {deal.returnDate
                    ? ` – ${date(deal.returnDate, { day: "numeric", month: "short" })}`
                    : " · One way"}
                </span>
              </p>

              <p className="mt-1 text-xs text-muted">{deal.note}</p>

              <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
                <p>
                  <span className="block text-[0.6875rem] text-muted line-through">
                    {money(deal.wasUsd)}
                  </span>
                  <span className="block text-lg font-bold text-accent-600">
                    {money(deal.fromUsd)}
                  </span>
                </p>
                <Link
                  href={dealSearchHref(deal)}
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                >
                  View fares
                </Link>
              </div>
            </div>
          </article>
        ))}
      </Carousel>
    </Section>
  );
}
