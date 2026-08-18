/**
 * The canonical blog model — one type for the whole platform.
 *
 * A blog post is editorial content with a lifecycle: authors write it in the
 * dashboard, publishing puts it on `/blogs` and at `/blog/{slug}`, and archiving
 * takes it off both without losing it. The public site and the dashboard read
 * exactly this shape from `features/blog`, so there is no second post model to
 * keep in step.
 *
 * Two identifiers, deliberately distinct — the same split destinations use:
 *
 *  - `id` is internal and never appears in a public URL. Dashboard routes key
 *    off it, so retitling a post cannot orphan its edit screen.
 *  - `slug` is the public URL identifier and is unique across the store. Links
 *    are always built from it (see `features/blog/links`), never from the title.
 *
 * **Content is structured, not HTML.** `content` is a list of {@link BlogBlock}s
 * and inline emphasis is markdown-flavoured text (`**bold**`, `*italic*`,
 * `[label](href)`) parsed into React elements by `RichText`. Nothing is ever
 * handed to `dangerouslySetInnerHTML`, so an author cannot inject markup and a
 * future API can validate the block list field by field.
 */

export const BLOG_STATUS_VALUES = ["draft", "published", "archived"] as const;

/**
 * Lifecycle of a post.
 *
 *  - `draft` — authored, not on the public site. Also where an unpublished post
 *    lands, so "take it down and keep editing" is one move.
 *  - `published` — live: listed on `/blogs` and reachable at its slug.
 *  - `archived` — retired. Kept for the record and out of every public list,
 *    which is why archiving is offered instead of deleting.
 */
export type BlogStatus = (typeof BLOG_STATUS_VALUES)[number];

/**
 * Horizontal alignment for a block. Omitted means the theme's default (left in
 * LTR), so stored content never has to state the obvious.
 */
export type BlogAlign = "left" | "center" | "right";

/**
 * A single block of article content. Discriminated by `type` so the renderer can
 * switch exhaustively without casts — the same pattern the listing/detail layers
 * use for the vertical union, and adding a variant is a compile-time prompt to
 * handle it everywhere.
 *
 * `text` fields carry inline markdown (`**bold**`, `*italic*`, `[label](href)`);
 * see `lib/blog-content`.
 */
export type BlogBlock =
  | { type: "heading"; text: string; level?: 2 | 3; align?: BlogAlign }
  | { type: "paragraph"; text: string; align?: BlogAlign }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "quote"; text: string; cite?: string }
  | { type: "image"; src: string; alt: string; caption?: string };

/** Search-engine overrides; each falls back to the post's own copy. */
export interface BlogSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

/** A published article. */
export interface BlogPost {
  /** Internal identifier. Stable across retitles; used by dashboard routes. */
  id: string;
  /** Public URL identifier, unique across the store. */
  slug: string;

  title: string;
  /** One-line teaser used on cards and as the metadata fallback. */
  excerpt: string;
  /** The article body. Empty only while a post is being drafted. */
  content: BlogBlock[];

  /** Hero/card image URL. */
  image: string;
  /** Alt text for {@link image} — falls back to the title when blank. */
  imageAlt?: string;
  /** Additional photos an author can pull into the body. */
  gallery?: string[];

  /** The dashboard user who owns the post, when one is known. */
  authorId?: string;
  /** Display name shown on cards and the article header. */
  author: string;
  authorAvatar?: string;

  /** Category id from the category store; blank for an uncategorised draft. */
  categoryId?: string;
  /** Denormalised category name — what cards, badges and facets render. */
  category: string;

  tags?: string[];

  status: BlogStatus;
  /** Promoted on the home page and in the blog's featured band. */
  featured?: boolean;

  /**
   * ISO date the post went (or is dated as) live.
   *
   * Kept as the public "published on" date: cards, the article header, the
   * sitemap and ordering all read it. Undefined until the post is first
   * published.
   */
  publishedAt?: string;
  /** Estimated reading time in minutes, derived from the content on save. */
  readMinutes: number;

  seo?: BlogSeo;

  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/**
 * What a caller may supply when creating or updating a post.
 *
 * `id`, `createdAt`, `updatedAt` and `readMinutes` are the store's to set — a
 * client that could choose its own id would be able to overwrite an existing
 * record, and a hand-set reading time would drift from the content.
 */
export type BlogPostInput = Omit<
  BlogPost,
  "id" | "createdAt" | "updatedAt" | "readMinutes"
>;

/** A partial edit; unchanged fields are preserved by the store. */
export type BlogPostPatch = Partial<BlogPostInput>;

export const BLOG_CATEGORY_STATUS_VALUES = ["active", "hidden"] as const;

/** A hidden category still files its posts; it just isn't offered as a facet. */
export type BlogCategoryStatus = (typeof BLOG_CATEGORY_STATUS_VALUES)[number];

/**
 * A blog category — a first-class record, not a string typed into each post.
 *
 * `count` is filled in by the read model (`getBlogCategories`) with the number
 * of *published* posts filed under it, which is what the sidebar renders.
 */
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: BlogCategoryStatus;
  /** Published posts in this category. Present on read, never stored. */
  count?: number;
}

export type BlogCategoryInput = Omit<BlogCategory, "id" | "count">;
export type BlogCategoryPatch = Partial<BlogCategoryInput>;

/** A reader comment on a post. */
export interface BlogComment {
  id: string;
  author: string;
  avatar?: string;
  /** ISO date string. */
  date: string;
  body: string;
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
