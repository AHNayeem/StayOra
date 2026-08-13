"use client";

import { useState } from "react";
import Image from "next/image";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listingsByIds } from "./catalog-index";
import { COMPARE_LIMIT, clearCompare, removeFromCompare } from "./compare-store";
import { CompareDialog } from "./compare-dialog";

/**
 * The tray's contents — split from {@link CompareTray} because this is the half
 * that needs the catalogue index. Loaded on demand, so a visitor reading the
 * privacy policy never downloads the listing catalogue to render a bar they
 * haven't opened.
 */
export function CompareTrayBody({ ids }: { ids: string[] }) {
  const listings = listingsByIds(ids);
  const [open, setOpen] = useState(false);

  if (listings.length === 0) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Compare tray"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 shadow-menu backdrop-blur print:hidden"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4">
          <p aria-live="polite" className="text-sm font-medium text-ink">
            {listings.length} of {COMPARE_LIMIT} selected
          </p>

          <ul className="flex flex-1 flex-wrap items-center gap-2">
            {listings.map((listing) => (
              <li key={listing.id} className="relative">
                <span className="flex items-center gap-2 rounded-field border border-line bg-surface py-1 pl-1 pr-8">
                  <Image
                    src={listing.image}
                    alt=""
                    width={36}
                    height={28}
                    className="h-7 w-9 rounded-sm object-cover"
                  />
                  <span className="max-w-40 truncate text-xs font-medium text-ink">
                    {listing.title}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCompare(listing.id)}
                  aria-label={`Remove ${listing.title} from compare`}
                  className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearCompare}>
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              disabled={listings.length < 2}
            >
              <Scale className="size-4" aria-hidden="true" />
              Compare {listings.length}
            </Button>
          </div>
        </div>
      </div>

      {/* Mounted only while open: the comparison prices every column against the
          live inventory engine, and a closed dialog has no reason to. */}
      {open && (
        <CompareDialog open={open} onClose={() => setOpen(false)} listings={listings} />
      )}
    </>
  );
}
