/**
 * blog-detail.ts — the pure, deterministic builder that turns a bare
 * {@link BlogPost} into a page-ready {@link BlogDetail}. It assembles an article
 * body, tags, comments and related posts from the editorial pools in
 * `constants/blog`.
 *
 * Framework-free and side-effect-free — no React, no `Date.now`, no `Math.random`
 * (every pick is slug-seeded so server and client render identically). When a
 * real CMS arrives it can return {@link BlogDetail} directly and this builder
 * simply falls away.
 */

import type { BlogPost } from "@/types/content";
import type { BlogBlock, BlogComment, BlogDetail } from "@/types/blog";
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

/** Assemble the article body: intro → three sections (with a quote mid-way) → outro. */
function buildBody(post: BlogPost): BlogBlock[] {
  const seed = hashString(post.slug);
  const blocks: BlogBlock[] = [
    { type: "paragraph", text: INTRO_POOL[seed % INTRO_POOL.length] },
  ];

  const sections = pick(BODY_SECTIONS, seed % BODY_SECTIONS.length, 3);
  sections.forEach((section, index) => {
    blocks.push({ type: "heading", text: section.heading });
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

/** Four tags: the post's category first, then a stable sample from the pool. */
function buildTags(post: BlogPost): string[] {
  const seed = hashString(post.slug);
  const sampled = pick(TAG_POOL, seed % TAG_POOL.length, 4);
  return Array.from(new Set([post.category, ...sampled])).slice(0, 4);
}

/** A stable subset of comments for the post. */
function buildComments(post: BlogPost): BlogComment[] {
  const seed = hashString(post.slug);
  const count = 2 + (seed % 2); // 2 or 3
  return pick(COMMENT_POOL, seed % COMMENT_POOL.length, count).map((c, i) => ({
    id: `${post.id}-cmt-${i + 1}`,
    ...c,
  }));
}

/** Related posts: same category first, then fill with the newest others. */
function buildRelated(post: BlogPost, all: BlogPost[], limit = 3): BlogPost[] {
  const others = all.filter((p) => p.id !== post.id);
  const sameCategory = others.filter((p) => p.category === post.category);
  const rest = others.filter((p) => p.category !== post.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

/**
 * Build the full details payload for a post. Pure and deterministic — the single
 * place mock posts are enriched into page-ready content.
 */
export function buildBlogDetail(post: BlogPost, all: BlogPost[]): BlogDetail {
  return {
    post,
    body: buildBody(post),
    tags: buildTags(post),
    comments: buildComments(post),
    related: buildRelated(post, all),
  };
}
