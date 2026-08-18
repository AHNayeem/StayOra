/**
 * Blog slugs.
 *
 * The algorithm is shared (`lib/slug`) so posts, categories and destinations all
 * form URLs the same way. This module only binds the blog's fallback word, so a
 * title that slugifies to nothing lands on `post` rather than a generic
 * placeholder.
 */

import { uniqueSlug as unique } from "@/lib/slug";

export { slugify, isValidSlug } from "@/lib/slug";

/**
 * `base`, or the first free `base-N`, among the slugs already in use.
 *
 * Pass the slug being edited as `ignore` so re-saving a post without retitling
 * it doesn't push it to `my-post-2`.
 */
export function uniqueSlug(base: string, taken: Iterable<string>, ignore?: string): string {
  return unique(base, taken, ignore, "post");
}
