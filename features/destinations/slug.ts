/**
 * Destination slugs.
 *
 * The algorithm itself is shared (`lib/slug`) so destinations, blog posts and
 * categories all form URLs the same way. This module only binds the destination
 * fallback word, so a name that slugifies to nothing lands on `destination`
 * rather than a generic placeholder.
 */

import { uniqueSlug as unique } from "@/lib/slug";

export { slugify, isValidSlug } from "@/lib/slug";

/**
 * `base`, or the first free `base-N`, among the destination slugs in use.
 *
 * Pass the slug being edited as `ignore` so re-saving a record without renaming
 * it doesn't suggest `paris-2`.
 */
export function uniqueSlug(base: string, taken: Iterable<string>, ignore?: string): string {
  return unique(base, taken, ignore, "destination");
}
