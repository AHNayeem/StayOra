"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, BookmarkPlus } from "lucide-react";
import type { BookingVertical } from "@/types/booking";
import { VERTICALS } from "@/constants/verticals";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/features/i18n";
import { saveSearch, type SavedSearchQuery } from "@/features/dashboard/domain";
import { useAuth } from "@/features/auth";
import { toast } from "@/lib/toast";

/**
 * "Save this search" — the entry point for saved searches and price alerts.
 *
 * The criteria are already in the listing page's filter state; this turns them
 * into a stored search and, optionally, an alert the `alerts:price` job watches.
 * A signed-out visitor is told what signing in buys them rather than being shown
 * a control that would silently save to nobody.
 */
export function SaveSearchButton({
  vertical,
  query,
  bounds,
  resultCount,
  cheapestUsd,
  href,
}: {
  vertical: BookingVertical;
  query: SavedSearchQuery;
  /** Full price range of the dataset — used to describe an untouched filter. */
  bounds: { min: number; max: number };
  resultCount: number;
  /** Cheapest current match, base USD — seeds the alert target. */
  cheapestUsd: number;
  href: string;
}) {
  const { user } = useAuth();
  const { money } = useLocale();
  const [open, setOpen] = useState(false);
  const [withAlert, setWithAlert] = useState(true);
  const [target, setTarget] = useState("");

  const label = describeSearch(vertical, query, bounds);
  // Default to a 10% drop on the cheapest match — a target worth waiting for.
  const suggested = cheapestUsd > 0 ? Math.max(1, Math.round(cheapestUsd * 0.9)) : 0;

  function handleSave() {
    if (!user) return;
    const parsed = Number(target);
    const targetUsd = withAlert ? (Number.isFinite(parsed) && parsed > 0 ? parsed : suggested) : undefined;
    saveSearch({
      customerEmail: user.email,
      customerName: user.name,
      vertical,
      label,
      query,
      href,
      targetUsd,
    });
    setOpen(false);
    toast.success(targetUsd ? "Search saved with a price alert" : "Search saved", {
      description: targetUsd
        ? `We'll write to you when it drops to ${money(targetUsd)} or less.`
        : "Find it under Account → Saved searches.",
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<BookmarkPlus className="size-4" />}
        onClick={() => {
          setTarget(suggested ? String(suggested) : "");
          setOpen(true);
        }}
        className="h-9 px-4 text-xs"
      >
        Save search
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Save this search"
        description={label}
      >
        {user ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-body">
              {resultCount} {resultCount === 1 ? "match" : "matches"} right now
              {cheapestUsd > 0 ? `, from ${money(cheapestUsd)}` : ""}.
            </p>

            <div className="rounded-card border border-line p-3">
              <Checkbox
                checked={withAlert}
                onChange={(e) => setWithAlert(e.target.checked)}
                label={
                  <span className="flex items-center gap-1.5 font-medium">
                    <BellRing className="size-4 text-primary" aria-hidden="true" />
                    Alert me when the price drops
                  </span>
                }
                hint="We re-run this search regularly and write to you the first time a match reaches your target."
              />
            </div>

            {withAlert && (
              <Input
                label="Tell me when it's at or below (USD)"
                type="number"
                min={1}
                step="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                hint={
                  suggested > 0
                    ? `Suggested ${money(suggested)} — 10% below today's cheapest match.`
                    : undefined
                }
              />
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                {withAlert ? "Save and watch" : "Save search"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-body">
              Sign in to keep this search and be told when the price drops.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Not now
              </Button>
              <Link
                href={`/login?next=${encodeURIComponent(href)}`}
                className="inline-flex h-9 items-center rounded-field bg-primary px-4 text-sm font-medium text-on-primary"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Human summary of a set of criteria — the label a saved search is listed by. */
export function describeSearch(
  vertical: BookingVertical,
  query: SavedSearchQuery,
  bounds: { min: number; max: number },
): string {
  const parts: string[] = [VERTICALS[vertical].labelPlural];
  if (query.search.trim()) parts.push(`“${query.search.trim()}”`);
  for (const values of Object.values(query.facets)) {
    if (values.length > 0) parts.push(values.slice(0, 2).join(", "));
  }
  const narrowed = query.minPrice > bounds.min || query.maxPrice < bounds.max;
  if (narrowed) parts.push(`$${Math.round(query.minPrice)}–$${Math.round(query.maxPrice)}`);
  return parts.join(" · ");
}
