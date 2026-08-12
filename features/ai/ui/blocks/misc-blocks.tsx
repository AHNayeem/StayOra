"use client";

import Link from "next/link";
import { Info, Plane, Quote, Star, TriangleAlert } from "lucide-react";
import type { AIBlock } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { RatingStars } from "@/components/ui/rating-stars";
import { airportLabel } from "@/lib/mock/airports";
import { cn } from "@/lib/utils";
import { AiText } from "./ai-text";
import { BlockShell } from "./block-shell";

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

type BookingsBlock = Extract<AIBlock, { kind: "bookings" }>;

const STATUS_TONE: Record<string, string> = {
  upcoming: "bg-primary-50 text-primary-700",
  completed: "bg-surface-muted text-body",
  cancelled: "bg-danger/10 text-danger",
  pending: "bg-accent-50 text-accent-600",
};

/** BookingsBlock — the traveller's own trips, read from the account service. */
export function BookingsBlock({ block }: { block: BookingsBlock }) {
  const { money, date } = useLocale();

  return (
    <BlockShell title={block.title}>
      <ul className="divide-y divide-line">
        {block.stays.map((booking) => (
          <li key={booking.id}>
            <Link
              href={`/account/bookings/${booking.id}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{booking.title}</p>
                <p className="truncate text-xs text-muted">
                  {booking.location} · {date(booking.checkIn, { month: "short", day: "numeric" })} –{" "}
                  {date(booking.checkOut, { month: "short", day: "numeric" })}
                </p>
                <p className="mt-1 text-xs text-muted">Ref {booking.reference}</p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "inline-block rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold capitalize",
                    STATUS_TONE[booking.status] ?? STATUS_TONE.completed,
                  )}
                >
                  {booking.status}
                </span>
                <p className="mt-1 text-sm font-semibold text-ink">{money(booking.totalUsd)}</p>
              </div>
            </Link>
          </li>
        ))}

        {block.flights.map((booking) => {
          const first = booking.slices[0];
          const last = booking.slices[booking.slices.length - 1];
          return (
            <li key={booking.id}>
              <Link
                href={`/account/flights/${booking.id}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
                  <Plane className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {airportLabel(first.fromCode)} → {airportLabel(last.toCode)}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {booking.airlineCode} · {date(first.departLocal, { month: "short", day: "numeric" })} ·
                    PNR {booking.pnr}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      "inline-block rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold capitalize",
                      STATUS_TONE[booking.status] ?? STATUS_TONE.completed,
                    )}
                  >
                    {booking.status}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {money(booking.grandTotalUsd)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Visa                                                                        */
/* -------------------------------------------------------------------------- */

type VisaBlock = Extract<AIBlock, { kind: "visa" }>;

const VISA_TONE: Record<string, string> = {
  "visa-free": "bg-primary-50 text-primary-700",
  "on-arrival": "bg-accent-50 text-accent-600",
  "e-visa": "bg-accent-50 text-accent-600",
  required: "bg-danger/10 text-danger",
  unknown: "bg-surface-muted text-body",
};

const VISA_LABEL: Record<string, string> = {
  "visa-free": "Visa free",
  "on-arrival": "Visa on arrival",
  "e-visa": "e-Visa available",
  required: "Visa required",
  unknown: "Unknown",
};

/**
 * VisaBlock — indicative entry requirements.
 *
 * Presented as guidance with an explicit prototype disclaimer, and always
 * paired with a link into the visa vertical rather than an assertion that the
 * traveller may or may not enter. Getting this wrong strands someone at an
 * airport, so the UI is deliberately cautious.
 */
export function VisaBlock({ block }: { block: VisaBlock }) {
  const { money } = useLocale();
  const { requirement } = block;

  return (
    <BlockShell title={`Entry requirements · ${requirement.destinationCountry}`}>
      <div className="p-4">
        <span
          className={cn(
            "inline-block rounded-pill px-3 py-1 text-xs font-semibold",
            VISA_TONE[requirement.status] ?? VISA_TONE.unknown,
          )}
        >
          {VISA_LABEL[requirement.status] ?? requirement.status}
        </span>
        <p className="mt-2 text-sm text-body">{requirement.note}</p>
        {requirement.href && (
          <Link
            href={requirement.href}
            className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
          >
            Browse visa services →
          </Link>
        )}
      </div>

      {block.services.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {block.services.map((service) => (
            <li key={service.listing.id}>
              <Link
                href={service.href}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{service.listing.title}</p>
                  {service.reason && (
                    <p className="truncate text-xs text-muted">
                      <AiText text={service.reason} />
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold text-accent-600">
                  {money(service.listing.price.amount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

type ReviewsBlock = Extract<AIBlock, { kind: "reviews" }>;

/**
 * ReviewsBlock — a summary mined from the listing's own reviews. Theme counts
 * are literal ("mentioned in 3 reviews"), and the quotes are unedited, so the
 * summary can always be checked against the source.
 */
export function ReviewsBlock({ block }: { block: ReviewsBlock }) {
  return (
    <BlockShell title={`What guests say · ${block.listingTitle}`} moreHref={block.href} moreLabel="All reviews">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="text-2xl font-bold text-ink">{block.summary.average.toFixed(1)}</span>
        <div>
          <RatingStars value={block.summary.average} size="sm" />
          <p className="text-xs text-muted">
            {block.summary.total.toLocaleString()} reviews
          </p>
        </div>
      </div>

      {block.themes.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-4 py-3">
          {block.themes.map((theme) => (
            <li
              key={theme.label}
              className="inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2.5 py-1 text-xs text-body"
            >
              <Star
                className={cn(
                  "size-3",
                  theme.sentiment === "positive" ? "fill-rating text-rating" : "text-muted",
                )}
                aria-hidden="true"
              />
              <span className="font-medium text-ink">{theme.label}</span>
              <span className="text-muted">· {theme.mentions}</span>
            </li>
          ))}
        </ul>
      )}

      <ul className="divide-y divide-line border-t border-line">
        {block.quotes.map((review) => (
          <li key={review.id} className="flex gap-2 px-4 py-3">
            <Quote className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
            <div>
              <p className="text-xs text-body">{review.body}</p>
              <p className="mt-1 text-xs font-medium text-muted">
                {review.author} · {review.rating}/5
              </p>
            </div>
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Facts & notices                                                             */
/* -------------------------------------------------------------------------- */

type FactsBlock = Extract<AIBlock, { kind: "facts" }>;

/** FactsBlock — a plain label/value table for capability and detail answers. */
export function FactsBlock({ block }: { block: FactsBlock }) {
  return (
    <BlockShell title={block.title}>
      <dl className="divide-y divide-line">
        {block.items.map((item) => (
          <div key={item.label} className="flex gap-3 px-4 py-2 text-xs">
            <dt className="w-24 shrink-0 font-semibold text-ink">{item.label}</dt>
            <dd className="flex-1 text-body">
              <AiText text={item.value} />
            </dd>
          </div>
        ))}
      </dl>
    </BlockShell>
  );
}

type NoticeBlock = Extract<AIBlock, { kind: "notice" }>;

/** NoticeBlock — a caveat the assistant is obliged to surface, not hide. */
export function NoticeBlock({ block }: { block: NoticeBlock }) {
  const warning = block.tone === "warning";
  const Icon = warning ? TriangleAlert : Info;
  return (
    <p
      className={cn(
        "flex gap-2 rounded-card border px-3 py-2.5 text-xs",
        warning
          ? "border-danger/30 bg-danger/5 text-danger"
          : "border-line bg-surface-muted text-body",
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <AiText text={block.text} />
      </span>
    </p>
  );
}
