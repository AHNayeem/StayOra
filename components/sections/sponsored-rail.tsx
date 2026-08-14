"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  adService,
  sponsoredFor,
  type AdCampaign,
  type AdPlacement,
  type ProductKind,
} from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { cn } from "@/lib/utils";

/**
 * Sponsored placements in the storefront.
 *
 * Two rules this component exists to enforce:
 *
 *  1. **Always labelled.** Every card carries a visible "Sponsored" tag. There
 *     is no configuration that turns it off.
 *  2. **Never during render.** Serving a placement is read-only; the impression
 *     is recorded once, in an effect, on the client — otherwise SSR and the
 *     client would disagree and the count would be wrong anyway.
 *
 * Delivery drives the campaign's spend, which drives advertising revenue, so
 * what a visitor sees here is what the Revenue Center eventually bills.
 */
export function SponsoredRail({
  placement,
  vertical,
  destination,
  limit = 2,
  title = "Sponsored",
  className,
}: {
  placement: AdPlacement;
  vertical?: ProductKind;
  destination?: string;
  limit?: number;
  title?: string;
  className?: string;
}) {
  const campaigns = useDomainValue<AdCampaign[]>(
    () => sponsoredFor(placement, { vertical, destination, limit }),
    [placement, vertical, destination, limit],
  );

  // One impression per campaign per mount — a ref, not state, so re-renders
  // caused by the store update can't double count.
  const counted = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const campaign of campaigns) {
      if (counted.current.has(campaign.id)) continue;
      counted.current.add(campaign.id);
      adService.recordEvent(campaign.id, "impression");
    }
  }, [campaigns]);

  if (campaigns.length === 0) return null;

  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6", className)}>
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Link
              href={
                campaign.landingSlug && campaign.landingVertical
                  ? `/${campaign.landingVertical}/${campaign.landingSlug}`
                  : "/search"
              }
              onClick={() => adService.recordEvent(campaign.id, "click")}
              className="group flex h-full items-start gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center rounded-pill bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Sponsored
                </span>
                <p className="mt-1.5 text-sm font-semibold text-ink">
                  {campaign.creativeHeadline}
                </p>
                <p className="mt-0.5 text-xs text-muted">{campaign.creativeBody}</p>
                <p className="mt-1.5 text-[11px] text-muted">
                  Paid promotion by {campaign.advertiserName}
                </p>
              </div>
              <ArrowRight
                className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
