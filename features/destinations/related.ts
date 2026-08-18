/**
 * What else is bookable in a destination.
 *
 * A destination page is only interesting if it shows inventory, and the platform
 * already has a location on every listing (`listing.location`) — so this module
 * *matches* against that rather than introducing a second location system. No
 * listing gains a `destinationId`; nothing about the catalogue changes.
 *
 * Matching is by token overlap on the city, topped up by country, the same
 * approach `lib/mock/destination-extras.ts` uses to pair flights with ground
 * inventory: the two datasets spell places differently ("Malé" against
 * "Maldives", "Ubud" against "Bali"), so string equality would find nothing.
 *
 * Everything here is synchronous and pure so a server render and the client's
 * first paint produce the same rails — including for a destination the editor has
 * only just created, which exists in the browser and not on the server.
 *
 * When listings carry a real `destinationId`, replace {@link matchesDestination}
 * with an id comparison and the rest of the file stands.
 */

import type { Listing } from "@/types/catalog";
import type { Destination } from "@/types/destination";
import { ALL_LISTINGS } from "@/features/discovery/catalog-index";
import { isListingLive } from "@/features/dashboard/domain/catalogue-service";

/**
 * Words too generic to prove two places are the same — "New York" and "New
 * Delhi" share one and nothing else.
 */
const WEAK_TOKENS = new Set(["new", "city", "the", "san", "saint", "st", "port", "island", "islands"]);

function tokenise(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && !WEAK_TOKENS.has(token));
}

/** How closely a listing belongs to a destination. Higher is nearer. */
function proximity(listing: Listing, destination: Destination): 0 | 1 | 2 {
  const place = new Set([
    ...tokenise(listing.location.city),
    ...tokenise(listing.location.label),
  ]);
  const wanted = [...tokenise(destination.name), ...tokenise(destination.region)];
  if (wanted.some((token) => place.has(token))) return 2;

  const country = new Set([
    ...tokenise(listing.location.country),
    ...tokenise(listing.location.label),
  ]);
  if (tokenise(destination.country).some((token) => country.has(token))) return 1;

  return 0;
}

/** Whether a listing sits in (or near enough to) a destination to be offered. */
export function matchesDestination(listing: Listing, destination: Destination): boolean {
  return proximity(listing, destination) > 0;
}

/** In-destination first, then in-country; best rated inside each band. */
function rank(destination: Destination) {
  return (a: Listing, b: Listing): number =>
    proximity(b, destination) - proximity(a, destination) ||
    (b.rating ?? 0) - (a.rating ?? 0) ||
    a.id.localeCompare(b.id);
}

const STAY_VERTICALS = new Set(["hotels", "apartments", "resorts", "shared-rooms"]);
const EXPERIENCE_VERTICALS = new Set(["tours", "activities"]);

export interface DestinationRelations {
  /** Hotels, resorts, apartments and shared rooms in the destination. */
  stays: Listing[];
  /** Tours and activities. */
  experiences: Listing[];
  /** Airport transfers and local transport. */
  transport: Listing[];
  /** Total live listings matched, across every vertical. */
  listingCount: number;
  /** Other published destinations worth a look — same country first. */
  related: Destination[];
}

export interface RelationOptions {
  /** Rows per rail. */
  limit?: number;
  /** Related destinations to return. */
  relatedLimit?: number;
  /**
   * Pool to match against. Defaults to the whole catalogue, filtered to what the
   * approval workflow says customers may see — so a destination page never links
   * to a listing whose own detail route would 404.
   */
  pool?: Listing[];
  /** Candidates for "related destinations" — pass the published set. */
  destinations?: Destination[];
}

/** Everything a destination page needs beyond the destination itself. */
export function destinationRelations(
  destination: Destination,
  options: RelationOptions = {},
): DestinationRelations {
  const { limit = 6, relatedLimit = 4, pool, destinations = [] } = options;

  const candidates = (pool ?? ALL_LISTINGS).filter(
    (listing) => matchesDestination(listing, destination) && isListingLive(listing.id),
  );
  const ordered = [...candidates].sort(rank(destination));

  const related = destinations
    .filter((row) => row.id !== destination.id && row.status === "published")
    .sort((a, b) => {
      const sameCountry = Number(b.country === destination.country) -
        Number(a.country === destination.country);
      return sameCountry || a.name.localeCompare(b.name);
    })
    .slice(0, relatedLimit);

  return {
    stays: ordered.filter((l) => STAY_VERTICALS.has(l.vertical)).slice(0, limit),
    experiences: ordered.filter((l) => EXPERIENCE_VERTICALS.has(l.vertical)).slice(0, limit),
    transport: ordered.filter((l) => l.vertical === "transport").slice(0, limit),
    listingCount: candidates.length,
    related,
  };
}
