"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Flame, MapPin } from "lucide-react";
import type { FlashDeal } from "@/types/home";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PriceTag } from "@/components/ui/price-tag";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { HOME_SECTIONS } from "@/constants/home";
import { cn } from "@/lib/utils";

/** Split a second count into padded H / M / S segments. */
function segments(total: number) {
  const clamped = Math.max(0, total);
  return {
    h: String(Math.floor(clamped / 3600)).padStart(2, "0"),
    m: String(Math.floor((clamped % 3600) / 60)).padStart(2, "0"),
    s: String(clamped % 60).padStart(2, "0"),
  };
}

/**
 * Countdown — ticks a relative "ends in" timer down to zero. The initial value
 * equals `seconds` on both server and client (deterministic, no hydration
 * mismatch); the interval callback decrements state (set-state inside a timer
 * callback, not the effect body).
 */
function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { h, m, s } = segments(remaining);
  const parts: { label: string; value: string }[] = [
    { label: "hrs", value: h },
    { label: "min", value: m },
    { label: "sec", value: s },
  ];

  return (
    <div className="flex items-center gap-1.5" aria-label={`Ends in ${h}:${m}:${s}`}>
      {parts.map((part, index) => (
        <div key={part.label} className="flex items-center gap-1.5">
          <span className="flex flex-col items-center">
            <span className="min-w-9 rounded-field bg-ink px-1.5 py-1 text-center text-sm font-bold text-white tabular-nums">
              {part.value}
            </span>
            <span className="mt-1 text-[0.625rem] text-muted uppercase">{part.label}</span>
          </span>
          {index < parts.length - 1 && (
            <span className="-mt-4 text-sm font-bold text-muted">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** FlashDealCard — a single time-limited drop with countdown + scarcity meter. */
function FlashDealCard({ deal }: { deal: FlashDeal }) {
  const claimedPct = Math.round((deal.claimed / deal.total) * 100);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-base ease-out-soft hover:-translate-y-1 hover:shadow-card-hover">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={deal.image}
          alt={deal.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-slow ease-out-soft group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-pill bg-danger px-2.5 py-1 text-xs font-bold text-white">
          <Flame className="size-3.5" aria-hidden="true" />-{deal.discountPct}%
        </span>
        <Link
          href={deal.href}
          aria-label={deal.title}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold text-ink">{deal.title}</h3>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-body">
            <MapPin className="size-3.5" aria-hidden="true" />
            {deal.location}
          </p>
        </div>

        <PriceTag price={deal.price} size="sm" showDiscount />

        {/* Scarcity meter — width driven by a CSS var to keep styling in classes. */}
        <div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-surface-muted">
            <div
              className="h-full w-(--claimed) rounded-pill bg-accent"
              style={{ "--claimed": `${claimedPct}%` } as CSSProperties}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {deal.claimed} of {deal.total} claimed
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
          <Countdown seconds={deal.endsInSeconds} />
          <Link
            href={deal.href}
            className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
          >
            Grab it
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * FlashDeals — the "ends soon" band: a scroll-revealing grid of time-limited
 * {@link FlashDealCard}s, each with a live countdown and a scarcity meter.
 */
export function FlashDeals({ deals }: { deals: FlashDeal[] }) {
  if (deals.length === 0) return null;

  return (
    <section className="bg-surface-muted py-16 md:py-24">
      <Container>
        <SectionHeader
          {...HOME_SECTIONS.flash}
          action={
            <span className="inline-flex items-center gap-2 rounded-pill bg-danger/10 px-4 py-2 text-sm font-semibold text-danger">
              <Flame className="size-4" aria-hidden="true" />
              Limited time
            </span>
          }
        />

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map((deal, index) => (
            <Reveal key={deal.id} step={index % 4} className="h-full">
              <FlashDealCard deal={deal} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
