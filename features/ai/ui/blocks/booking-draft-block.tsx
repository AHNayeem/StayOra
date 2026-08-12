"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ShieldCheck, Users } from "lucide-react";
import type { AIBlock } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { BlockShell } from "./block-shell";

type BookingDraftBlock = Extract<AIBlock, { kind: "booking-draft" }>;

/**
 * BookingDraftBlock — a prepared, unconfirmed booking.
 *
 * The CTA hands off to the site's normal `/checkout` flow with the selection
 * pre-filled; the assistant deliberately stops one step short of payment, and
 * the panel says so. Every figure comes from the same pricing function the
 * booking widget uses, so the total shown here is the total on the next page.
 */
export function BookingDraftBlock({ block }: { block: BookingDraftBlock }) {
  const { money, date } = useLocale();
  const { draft } = block;

  return (
    <BlockShell title="Booking draft — not confirmed">
      <div className="flex gap-3 p-4">
        <Link
          href={draft.href}
          className="relative size-20 shrink-0 overflow-hidden rounded-field bg-surface-muted"
        >
          <Image
            src={draft.listing.image}
            alt={draft.listing.title}
            fill
            sizes="80px"
            className="object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={draft.href}
            className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary"
          >
            {draft.listing.title}
          </Link>
          <p className="truncate text-xs text-muted">{draft.listing.location.label}</p>
          <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
            {draft.checkIn && draft.checkOut && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {date(draft.checkIn, { month: "short", day: "numeric" })} –{" "}
                {date(draft.checkOut, { month: "short", day: "numeric" })}
                {draft.nights > 0 && ` · ${draft.nights} night${draft.nights > 1 ? "s" : ""}`}
              </span>
            )}
            {draft.singleDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {date(draft.singleDate, { month: "short", day: "numeric" })}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden="true" />
              {draft.guests} {draft.guests === 1 ? "guest" : "guests"}
            </span>
          </p>
        </div>
      </div>

      <dl className="divide-y divide-line border-t border-line text-sm">
        <Row label="Subtotal" value={money(draft.subtotalUsd)} />
        <Row label="Taxes & service fee" value={money(draft.serviceFeeUsd)} />
        <Row label="Total" value={money(draft.totalUsd)} emphasis />
      </dl>

      <p className="flex gap-2 border-t border-line px-4 py-3 text-xs text-body">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        {draft.cancellationPolicy}
      </p>

      <div className="border-t border-line p-4">
        <Link
          href={draft.checkoutHref}
          className="flex h-11 w-full items-center justify-center rounded-pill bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          Continue to booking
        </Link>
        <p className="mt-2 text-center text-xs text-muted">
          You won&apos;t be charged until you confirm on the checkout page.
        </p>
      </div>
    </BlockShell>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <dt className={emphasis ? "font-semibold text-ink" : "text-body"}>{label}</dt>
      <dd className={emphasis ? "text-base font-bold text-accent-600" : "font-medium text-ink"}>
        {value}
      </dd>
    </div>
  );
}
