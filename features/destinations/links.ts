/**
 * Destination link building — the one place a destination URL is constructed.
 *
 * The `/destinations/bali` 404 this module exists to prevent came from link
 * hrefs assembled out of display text at the call site. Every destination link
 * in the app now comes from here, so a link can only point at a real slug.
 */

import type { Destination } from "@/types/destination";

/** Public index of every published destination. */
export const DESTINATIONS_HREF = "/destinations";

/** The canonical public URL for a destination. */
export function destinationHref(destination: Pick<Destination, "slug">): string {
  return `${DESTINATIONS_HREF}/${destination.slug}`;
}

/** Where the dashboard edits this destination — keyed by id, never by slug. */
export function destinationEditHref(destination: Pick<Destination, "id">): string {
  return `/dashboard/destinations/${destination.id}/edit`;
}
