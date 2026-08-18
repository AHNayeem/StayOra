"use client";

/**
 * Client-side reads of the blog store.
 *
 * The public blog pages are server-rendered from the seed, which is all the
 * server can see: a post the author created lives in the browser's
 * `localStorage`. These hooks bridge the gap — the server's markup renders
 * first, then the store's real contents arrive in the effect immediately after
 * hydration. It is the same seam `features/destinations/hooks.ts` uses, and it
 * disappears the day a real API backs the blog.
 */

import { useMemo, useSyncExternalStore } from "react";
import type { BlogCategory, BlogPost } from "@/types/blog";
import { blogRepository } from "./repository";
import {
  filterBlogPosts,
  getBlogTags,
  withCounts,
  type BlogQuery,
} from "./service";

const {
  subscribe,
  snapshot,
  seedSnapshot,
  categoriesSnapshot,
  categoriesSeedSnapshot,
} = blogRepository;

/** A store that never changes — only its server/client snapshots differ. */
const neverChanges = () => () => {};

/**
 * `false` while the server's markup is being rendered or hydrated, `true` once
 * React is running on the client.
 *
 * Read through `useSyncExternalStore` rather than an effect: setting state in an
 * effect trips the project's cascading-render rule, and this is the same
 * mechanism the store snapshots already use.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, () => true, () => false);
}

/** Every post in the store, whatever its status. */
export function useAllBlogPosts(): BlogPost[] {
  return useSyncExternalStore(subscribe, snapshot, seedSnapshot);
}

/** Every category record, whatever its status and count. */
export function useAllBlogCategories(): BlogCategory[] {
  return useSyncExternalStore(subscribe, categoriesSnapshot, categoriesSeedSnapshot);
}

/**
 * Posts matching `query` — published only unless the query says otherwise,
 * exactly as the async service getters behave.
 */
export function useBlogPosts(query: BlogQuery = {}): BlogPost[] {
  const rows = useAllBlogPosts();
  const categories = useAllBlogCategories();
  // Queries are built inline at call sites, so compare by value rather than by
  // object identity or every render recomputes the list.
  const key = JSON.stringify(query);
  return useMemo(
    () => filterBlogPosts(rows, JSON.parse(key) as BlogQuery, categories),
    [rows, key, categories],
  );
}

/**
 * One post by slug, or `undefined` when no such published post exists.
 *
 * `resolved` is what callers act on: it is `false` for the hydration pass, where
 * only the server's seed is visible, and `true` once the browser's store has
 * been read. A 404 must wait for `resolved` — otherwise a post created in the
 * dashboard would flash "not found" on every visit.
 */
export function useBlogPost(
  slug: string,
  options: { preview?: boolean } = {},
): { post: BlogPost | undefined; resolved: boolean } {
  const rows = useAllBlogPosts();
  const hydrated = useHydrated();

  const post = useMemo(() => {
    const found = rows.find((row) => row.slug === slug);
    if (!found) return undefined;
    return options.preview || found.status === "published" ? found : undefined;
  }, [rows, slug, options.preview]);

  return { post, resolved: hydrated };
}

/** Categories with published-post counts, for sidebars and filter controls. */
export function useBlogCategories(
  options: { includeEmpty?: boolean; includeHidden?: boolean } = {},
): BlogCategory[] {
  const rows = useAllBlogPosts();
  const categories = useAllBlogCategories();
  const key = JSON.stringify(options);
  return useMemo(
    () => withCounts(categories, rows, JSON.parse(key) as typeof options),
    [categories, rows, key],
  );
}

/** Tags in use on published posts, most-used first. */
export function useBlogTags(): { tag: string; count: number }[] {
  const rows = useAllBlogPosts();
  return useMemo(() => getBlogTags(rows), [rows]);
}
