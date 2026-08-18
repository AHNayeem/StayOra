/**
 * Destination service — the API the UI actually calls.
 *
 * The repository stores rows; this layer applies the *rules*: what the public may
 * see, which status transitions are legal, and how a slug is suggested. Keeping
 * them here rather than in components is what stops an archived destination from
 * leaking onto the storefront the first time someone writes a new page.
 *
 * Reads come in two flavours:
 *
 *  - `get*` — async, the shape a real API has. Used by server components, the
 *    sitemap and the dashboard.
 *  - `*Sync` — a synchronous read of the same store, for the client components
 *    that must resolve a destination in their first render pass (a destination
 *    the editor created lives in `localStorage`, which the server cannot see).
 */

import { ApiError } from "@/features/dashboard/data/errors";
import type {
  Destination,
  DestinationInput,
  DestinationPatch,
  DestinationStatus,
} from "@/types/destination";
import { destinationRepository } from "./repository";
import { slugify, uniqueSlug } from "./slug";

/** How a list of destinations is narrowed. Defaults to "what the public sees". */
export interface DestinationQuery {
  /** Free text matched against name, country and region. */
  search?: string;
  /** Exact country match. */
  country?: string;
  /**
   * Status to include. Defaults to `published` — a caller has to *ask* for
   * drafts, so no public surface shows them by accident. `"any"` is for the
   * dashboard.
   */
  status?: DestinationStatus | "any";
  /** Only destinations flagged for the featured band. */
  featuredOnly?: boolean;
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

function matches(destination: Destination, query: DestinationQuery): boolean {
  const { search, country, status = "published", featuredOnly } = query;

  if (status !== "any" && destination.status !== status) return false;
  if (country && destination.country !== country) return false;
  if (featuredOnly && !destination.featured) return false;

  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    const haystack = [
      destination.name,
      destination.country,
      destination.region,
      destination.shortDescription,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }

  return true;
}

/** Featured first, then alphabetical — a stable order on server and client. */
function byPromotion(a: Destination, b: Destination): number {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  return a.name.localeCompare(b.name);
}

/**
 * Apply a {@link DestinationQuery} to rows already in hand.
 *
 * Exported because the client hooks hold the store's rows and must narrow them
 * with exactly the same rules the async getters use — two filters that drift
 * apart is how a draft ends up on the storefront.
 */
export function filterDestinations(
  rows: Destination[],
  query: DestinationQuery = {},
): Destination[] {
  const out = rows.filter((row) => matches(row, query)).sort(byPromotion);
  return query.limit ? out.slice(0, query.limit) : out;
}

/** Destinations matching `query` — published only unless asked otherwise. */
export async function getDestinations(query: DestinationQuery = {}): Promise<Destination[]> {
  return filterDestinations(await destinationRepository.list(), query);
}

/** Synchronous equivalent of {@link getDestinations}, for client components. */
export function getDestinationsSync(query: DestinationQuery = {}): Destination[] {
  return filterDestinations(destinationRepository.peek(), query);
}

/**
 * One destination by its public slug, or `undefined`.
 *
 * Unpublished destinations resolve to `undefined` so the route 404s: a draft URL
 * shared by mistake must not render. Pass `preview` for the dashboard, which is
 * allowed to see drafts and archives.
 */
export async function getDestinationBySlug(
  slug: string,
  options: { preview?: boolean } = {},
): Promise<Destination | undefined> {
  const found = await destinationRepository.getBySlug(slug);
  if (!found) return undefined;
  return options.preview || found.status === "published" ? found : undefined;
}

/** Synchronous equivalent of {@link getDestinationBySlug}. */
export function getDestinationBySlugSync(
  slug: string,
  options: { preview?: boolean } = {},
): Destination | undefined {
  const found = destinationRepository.peek().find((row) => row.slug === slug);
  if (!found) return undefined;
  return options.preview || found.status === "published" ? found : undefined;
}

/** One destination by internal id, whatever its status (dashboard read). */
export function getDestinationById(id: string): Promise<Destination | undefined> {
  return destinationRepository.getById(id);
}

/** Countries that currently have at least one published destination. */
export function getDestinationCountries(): string[] {
  const countries = new Set(
    destinationRepository
      .peek()
      .filter((row) => row.status === "published")
      .map((row) => row.country),
  );
  return [...countries].sort((a, b) => a.localeCompare(b));
}

/**
 * Resolve a free-text place label to a published destination.
 *
 * Search suggestions are labels drawn from the listing corpus — "Bali,
 * Indonesia", "Cox's Bazar, Bangladesh" — not ids. When one of them *is* a
 * destination we sell a guide for, the result should open that guide instead of a
 * keyword search, which is what this lookup decides. Anything it doesn't
 * recognise stays a search, so no suggestion becomes a dead link.
 */
export function matchPublishedDestination(term: string): Destination | undefined {
  const city = term.split(",")[0]?.trim();
  if (!city) return undefined;
  const wanted = slugify(city);
  if (!wanted) return undefined;

  return destinationRepository
    .peek()
    .find((row) => row.status === "published" && (row.slug === wanted || slugify(row.name) === wanted));
}

/* -------------------------------------------------------------------------- */
/* Slugs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The slug to offer for a name — unique against everything already stored.
 *
 * Pass the id being edited so re-saving "Paris" without renaming it doesn't
 * suggest `paris-2`.
 */
export function suggestDestinationSlug(name: string, ignoreId?: string): string {
  const rows = destinationRepository.peek();
  const ignore = ignoreId ? rows.find((row) => row.id === ignoreId)?.slug : undefined;
  return uniqueSlug(name, rows.map((row) => row.slug), ignore);
}

/** Whether `slug` is free (ignoring the record being edited). */
export function isDestinationSlugAvailable(slug: string, ignoreId?: string): boolean {
  const normalised = slugify(slug);
  if (!normalised) return false;
  return !destinationRepository
    .peek()
    .some((row) => row.slug === normalised && row.id !== ignoreId);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

export function createDestination(input: DestinationInput): Promise<Destination> {
  return destinationRepository.create(input);
}

/** Update a destination. Fields absent from `patch` keep their current value. */
export function updateDestination(id: string, patch: DestinationPatch): Promise<Destination> {
  return destinationRepository.update(id, patch);
}

/**
 * Permanently remove a destination.
 *
 * Reserved for records that were never published — {@link archiveDestination} is
 * the reversible option the dashboard offers first, because deleting a live
 * destination breaks every link to its slug.
 */
export function deleteDestination(id: string): Promise<void> {
  return destinationRepository.remove(id);
}

/**
 * Legal status moves.
 *
 * Archiving is not a dead end: an archived destination can be returned to draft,
 * reviewed and published again. What is *not* allowed is jumping straight from
 * archived to live — the copy and imagery get a look first.
 */
const TRANSITIONS: Record<DestinationStatus, DestinationStatus[]> = {
  draft: ["published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

/** Move a destination through its lifecycle, rejecting illegal transitions. */
export async function setDestinationStatus(
  id: string,
  status: DestinationStatus,
): Promise<Destination> {
  const current = await destinationRepository.getById(id);
  if (!current) {
    throw new ApiError({ kind: "not-found", message: "That destination no longer exists." });
  }
  if (current.status === status) return current;

  if (!TRANSITIONS[current.status].includes(status)) {
    throw new ApiError({
      kind: "validation",
      message: `An ${current.status} destination can't go straight to ${status}. Return it to draft first.`,
    });
  }
  return destinationRepository.update(id, { status });
}

export const publishDestination = (id: string) => setDestinationStatus(id, "published");
export const archiveDestination = (id: string) => setDestinationStatus(id, "archived");
/** Take a destination off the public site without archiving it. */
export const unpublishDestination = (id: string) => setDestinationStatus(id, "draft");

/** Subscribe to store changes — used by the client hooks. */
export const subscribeToDestinations = destinationRepository.subscribe;
