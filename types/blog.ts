/**
 * Blog detail types — the enriched payload behind `/blog/[slug]`. A {@link BlogPost}
 * (from `types/content`) carries only the card-level teaser; the article body,
 * tags, comments and related posts are derived on demand (see
 * `lib/blog-detail`) or, later, returned directly by a CMS.
 */

import type { BlogPost } from "./content";

/**
 * A single block of article content. Discriminated by `type` so the renderer can
 * switch exhaustively without casts — the same pattern the listing/detail layers
 * use for the vertical union.
 */
export type BlogBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; cite?: string };

/** A reader comment on a post. */
export interface BlogComment {
  id: string;
  author: string;
  avatar?: string;
  /** ISO date string. */
  date: string;
  body: string;
}

/** A blog category with the number of posts filed under it, for the sidebar. */
export interface BlogCategory {
  name: string;
  count: number;
}

/** The full payload for a blog details page. */
export interface BlogDetail {
  post: BlogPost;
  body: BlogBlock[];
  tags: string[];
  comments: BlogComment[];
  /** Other posts to surface in the "keep reading" rail. */
  related: BlogPost[];
}
