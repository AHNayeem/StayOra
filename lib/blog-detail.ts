/**
 * blog-detail.ts — deterministic editorial builders for the blog.
 *
 * Two jobs, both pure and side-effect-free (no React, no `Date.now`, no
 * `Math.random` — every pick is slug-seeded so server and client render
 * identically):
 *
 *  1. {@link seedBody} / {@link seedTags} assemble article content for the
 *     *seed* posts from the pools in `constants/blog`. They run once, when the
 *     seed is built — a post's body then lives on the record like any other
 *     field, so an editor can change it. This is the difference from the
 *     previous design, where every article body was derived at render time and
 *     therefore uneditable.
 *  2. {@link postComments} still derives reader comments per post. Comments are
 *     reader-generated, not authored, so there is nothing for the dashboard to
 *     edit and no reason to store them until a real comments API exists.
 */

import type { BlogBlock, BlogComment, BlogPost } from "@/types/blog";
import {
  BODY_SECTIONS,
  COMMENT_POOL,
  INTRO_POOL,
  OUTRO_POOL,
  QUOTE_POOL,
  TAG_POOL,
} from "@/constants/blog";

/** Small, stable string hash → non-negative int. Seeds deterministic picks. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

/** Pick `count` consecutive items from a pool, wrapping around from `offset`. */
function pick<T>(pool: T[], offset: number, count: number): T[] {
  return Array.from(
    { length: Math.min(count, pool.length) },
    (_, i) => pool[(offset + i) % pool.length],
  );
}

/**
 * Article content for a seed post: intro → three sections (with a pull-quote
 * mid-way) → outro. Byte-for-byte what `/blog/{slug}` rendered before content
 * became a stored field, so no existing article changed when it moved.
 */
export function seedBody(slug: string): BlogBlock[] {
  const seed = hashString(slug);
  const blocks: BlogBlock[] = [
    { type: "paragraph", text: INTRO_POOL[seed % INTRO_POOL.length] },
  ];

  const sections = pick(BODY_SECTIONS, seed % BODY_SECTIONS.length, 3);
  sections.forEach((section, index) => {
    blocks.push({ type: "heading", text: section.heading, level: 2 });
    section.paragraphs.forEach((text) => blocks.push({ type: "paragraph", text }));
    if (section.list) blocks.push({ type: "list", items: section.list });
    // Drop a pull-quote after the first section.
    if (index === 0) {
      blocks.push({ type: "quote", ...QUOTE_POOL[seed % QUOTE_POOL.length] });
    }
  });

  blocks.push({ type: "paragraph", text: OUTRO_POOL[seed % OUTRO_POOL.length] });
  return blocks;
}

/** Four tags for a seed post: its category first, then a stable pool sample. */
export function seedTags(slug: string, category: string): string[] {
  const seed = hashString(slug);
  const sampled = pick(TAG_POOL, seed % TAG_POOL.length, 4);
  return Array.from(new Set([category, ...sampled])).slice(0, 4);
}

/** A stable subset of reader comments for a post. */
export function postComments(post: Pick<BlogPost, "id" | "slug">): BlogComment[] {
  const seed = hashString(post.slug);
  const count = 2 + (seed % 2); // 2 or 3
  return pick(COMMENT_POOL, seed % COMMENT_POOL.length, count).map((c, i) => ({
    id: `${post.id}-cmt-${i + 1}`,
    ...c,
  }));
}
