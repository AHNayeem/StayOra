/**
 * Blog service — the API the UI actually calls.
 *
 * The repository stores rows; this layer applies the *rules*: what the public
 * may see, which status transitions are legal, how a slug is suggested, and how
 * related posts are chosen. Keeping them here rather than in components is what
 * stops a draft from leaking onto the storefront the first time someone writes a
 * new page.
 *
 * Reads come in two flavours:
 *
 *  - `get*` — async, the shape a real API has. Used by server components, the
 *    sitemap and the dashboard.
 *  - `*Sync` — a synchronous read of the same store, for the client components
 *    that must resolve a post in their first render pass (a post the author
 *    created lives in `localStorage`, which the server cannot see).
 *
 * {@link BlogQuery} intentionally carries `page`/`limit`/`sort` alongside the
 * filters: it is the shape a server-side `GET /posts` takes, so moving search
 * and paging to the backend is a change of implementation, not of signature.
 */

import { ApiError } from "@/features/dashboard/data/errors";
import { postComments } from "@/lib/blog-detail";
import type {
  BlogCategory,
  BlogCategoryInput,
  BlogCategoryPatch,
  BlogDetail,
  BlogPost,
  BlogPostInput,
  BlogPostPatch,
  BlogStatus,
} from "@/types/blog";
import { blogRepository, normalizeTags } from "./repository";
import { slugify, uniqueSlug } from "./slug";

/** How a list of posts is narrowed. Defaults to "what the public sees". */
export interface BlogQuery {
  /** Free text matched against title, excerpt, slug, category, tags and author. */
  search?: string;
  /** Category *slug* or name — the public URL carries the slug. */
  category?: string;
  /** Exact tag match, case-insensitive. */
  tag?: string;
  /** Exact author name. */
  author?: string;
  /**
   * Status to include. Defaults to `published` — a caller has to *ask* for
   * drafts, so no public surface shows them by accident. `"any"` is for the
   * dashboard.
   */
  status?: BlogStatus | "any";
  /** Only posts flagged for the featured band. */
  featuredOnly?: boolean;
  /** Newest first by default. */
  sort?: "newest" | "oldest";
  /** 1-based. Applied after sorting, with {@link BlogQuery.limit} as the size. */
  page?: number;
  limit?: number;
  /** Exclude one post — used by the "keep reading" rail. */
  excludeId?: string;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/** The date a post is ordered and displayed by. */
export function postDate(post: BlogPost): string {
  return post.publishedAt ?? post.updatedAt;
}

/** Everything free-text search scans, lowercased. */
function haystack(post: BlogPost): string {
  return [post.title, post.excerpt, post.slug, post.category, post.author, ...(post.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matches(post: BlogPost, query: BlogQuery, categories: BlogCategory[]): boolean {
  const { search, category, tag, author, status = "published", featuredOnly, excludeId } = query;

  if (status !== "any" && post.status !== status) return false;
  if (excludeId && post.id === excludeId) return false;
  if (featuredOnly && !post.featured) return false;
  if (author && post.author !== author) return false;

  if (category) {
    // The public URL carries a slug; the dashboard facet carries a name. Accept
    // either rather than making every caller know which it holds.
    const wanted = categories.find(
      (row) => row.slug === category || row.name === category || row.id === category,
    );
    const label = wanted?.name ?? category;
    if (post.category !== label) return false;
  }

  if (tag) {
    const wanted = tag.toLowerCase();
    if (!(post.tags ?? []).some((value) => value.toLowerCase() === wanted)) return false;
  }

  if (search?.trim()) {
    if (!haystack(post).includes(search.trim().toLowerCase())) return false;
  }

  return true;
}

/**
 * Featured first, then by date — a stable order on server and client.
 *
 * Ties break on id so two posts published the same day never swap places
 * between renders.
 */
function comparator(sort: BlogQuery["sort"]) {
  const direction = sort === "oldest" ? -1 : 1;
  return (a: BlogPost, b: BlogPost): number => {
    if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
    const dates = postDate(b).localeCompare(postDate(a)) * direction;
    return dates !== 0 ? dates : a.id.localeCompare(b.id);
  };
}

/**
 * Apply a {@link BlogQuery} to rows already in hand.
 *
 * Exported because the client hooks hold the store's rows and must narrow them
 * with exactly the same rules the async getters use — two filters that drift
 * apart is how a draft ends up on the storefront.
 */
export function filterBlogPosts(
  rows: BlogPost[],
  query: BlogQuery = {},
  categories: BlogCategory[] = blogRepository.peekCategories(),
): BlogPost[] {
  const out = rows.filter((row) => matches(row, query, categories)).sort(comparator(query.sort));
  if (!query.limit) return out;
  const start = ((query.page ?? 1) - 1) * query.limit;
  return out.slice(start, start + query.limit);
}

/** Posts matching `query` — published only unless asked otherwise. */
export async function getBlogPosts(query: BlogQuery = {}): Promise<BlogPost[]> {
  const [rows, categories] = await Promise.all([
    blogRepository.list(),
    blogRepository.listCategories(),
  ]);
  return filterBlogPosts(rows, query, categories);
}

/** Synchronous equivalent of {@link getBlogPosts}, for client components. */
export function getBlogPostsSync(query: BlogQuery = {}): BlogPost[] {
  return filterBlogPosts(blogRepository.peek(), query);
}

/**
 * One post by its public slug, or `undefined`.
 *
 * Unpublished posts resolve to `undefined` so the route 404s: a draft URL shared
 * by mistake must not render. Pass `preview` for the dashboard, which is allowed
 * to see drafts and archives.
 */
export async function getBlogPostBySlug(
  slug: string,
  options: { preview?: boolean } = {},
): Promise<BlogPost | undefined> {
  const found = await blogRepository.getBySlug(slug);
  if (!found) return undefined;
  return options.preview || found.status === "published" ? found : undefined;
}

/** Synchronous equivalent of {@link getBlogPostBySlug}. */
export function getBlogPostBySlugSync(
  slug: string,
  options: { preview?: boolean } = {},
): BlogPost | undefined {
  const found = blogRepository.peek().find((row) => row.slug === slug);
  if (!found) return undefined;
  return options.preview || found.status === "published" ? found : undefined;
}

/** One post by internal id, whatever its status (dashboard read). */
export function getBlogPostById(id: string): Promise<BlogPost | undefined> {
  return blogRepository.getById(id);
}

/**
 * Posts to offer at the end of an article: same category first, then posts
 * sharing tags, then the newest of the rest — published only, never the post
 * itself.
 *
 * Ranked rather than filtered, so the rail is always full: a post with no
 * category siblings still gets three suggestions instead of an empty band.
 */
export function relatedBlogPosts(post: BlogPost, pool: BlogPost[], limit = 3): BlogPost[] {
  const tags = new Set((post.tags ?? []).map((tag) => tag.toLowerCase()));

  const scored = pool
    .filter((row) => row.id !== post.id && row.status === "published")
    .map((row) => {
      const shared = (row.tags ?? []).filter((tag) => tags.has(tag.toLowerCase())).length;
      return { row, score: (row.category === post.category ? 10 : 0) + shared };
    })
    .sort((a, b) => b.score - a.score || postDate(b.row).localeCompare(postDate(a.row)));

  return scored.slice(0, limit).map((entry) => entry.row);
}

/**
 * The full details payload for a post, or `undefined` for an unknown or
 * unpublished slug.
 *
 * The body and tags come off the record (an editor owns them); comments are
 * still derived, since there is no comment authoring surface to store them from.
 */
export async function getBlogDetail(
  slug: string,
  options: { preview?: boolean } = {},
): Promise<BlogDetail | undefined> {
  const post = await getBlogPostBySlug(slug, options);
  if (!post) return undefined;
  return buildBlogDetail(post, await blogRepository.list());
}

/** Assemble a {@link BlogDetail} from a post and the pool it lives in. */
export function buildBlogDetail(post: BlogPost, pool: BlogPost[]): BlogDetail {
  return {
    post,
    body: post.content,
    tags: post.tags ?? [],
    comments: postComments(post),
    related: relatedBlogPosts(post, pool),
  };
}

/**
 * Categories with the number of *published* posts filed under each.
 *
 * Hidden categories and categories with nothing published are dropped by
 * default: a sidebar facet that returns an empty list is a dead end.
 */
export async function getBlogCategories(
  options: { includeEmpty?: boolean; includeHidden?: boolean } = {},
): Promise<BlogCategory[]> {
  const [rows, categories] = await Promise.all([
    blogRepository.list(),
    blogRepository.listCategories(),
  ]);
  return withCounts(categories, rows, options);
}

/** Synchronous equivalent of {@link getBlogCategories}. */
export function getBlogCategoriesSync(
  options: { includeEmpty?: boolean; includeHidden?: boolean } = {},
): BlogCategory[] {
  return withCounts(blogRepository.peekCategories(), blogRepository.peek(), options);
}

/** Shared by both category readers so the counting rule exists once. */
export function withCounts(
  categories: BlogCategory[],
  posts: BlogPost[],
  { includeEmpty = false, includeHidden = false } = {},
): BlogCategory[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (post.status !== "published") continue;
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }
  return categories
    .map((category) => ({ ...category, count: counts.get(category.name) ?? 0 }))
    .filter((category) => includeHidden || category.status === "active")
    .filter((category) => includeEmpty || (category.count ?? 0) > 0);
}

/** Every tag in use on a published post, with its count, most-used first. */
export function getBlogTags(posts: BlogPost[] = blogRepository.peek()): {
  tag: string;
  count: number;
}[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const post of posts) {
    if (post.status !== "published") continue;
    for (const tag of post.tags ?? []) {
      const key = tag.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Distinct author names in the store, for the dashboard's author facet. */
export function getBlogAuthors(): string[] {
  return [...new Set(blogRepository.peek().map((row) => row.author))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/* -------------------------------------------------------------------------- */
/* Slugs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The slug to offer for a title — unique against everything already stored.
 *
 * Pass the id being edited so re-saving a post without retitling it doesn't
 * suggest `my-post-2`.
 */
export function suggestBlogSlug(title: string, ignoreId?: string): string {
  const rows = blogRepository.peek();
  const ignore = ignoreId ? rows.find((row) => row.id === ignoreId)?.slug : undefined;
  return uniqueSlug(title, rows.map((row) => row.slug), ignore);
}

/** Whether `slug` is free (ignoring the post being edited). */
export function isBlogSlugAvailable(slug: string, ignoreId?: string): boolean {
  const normalised = slugify(slug);
  if (!normalised) return false;
  return !blogRepository.peek().some((row) => row.slug === normalised && row.id !== ignoreId);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

export function createBlogPost(input: BlogPostInput): Promise<BlogPost> {
  return blogRepository.create(input);
}

/** Update a post. Fields absent from `patch` keep their current value. */
export function updateBlogPost(id: string, patch: BlogPostPatch): Promise<BlogPost> {
  return blogRepository.update(id, patch);
}

/**
 * Permanently remove a post.
 *
 * Reserved for posts that were never published — {@link archiveBlogPost} is the
 * reversible option the dashboard offers first, because deleting a live article
 * breaks every link to its slug.
 */
export function deleteBlogPost(id: string): Promise<void> {
  return blogRepository.remove(id);
}

/**
 * Legal status moves.
 *
 * Archiving is not a dead end: an archived post can be returned to draft,
 * reviewed and published again. What is *not* allowed is jumping straight from
 * archived to live — the copy and imagery get a look first.
 */
const TRANSITIONS: Record<BlogStatus, BlogStatus[]> = {
  draft: ["published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

/** Move a post through its lifecycle, rejecting illegal transitions. */
export async function setBlogPostStatus(id: string, status: BlogStatus): Promise<BlogPost> {
  const current = await blogRepository.getById(id);
  if (!current) {
    throw new ApiError({ kind: "not-found", message: "That post no longer exists." });
  }
  if (current.status === status) return current;

  if (!TRANSITIONS[current.status].includes(status)) {
    throw new ApiError({
      kind: "validation",
      message: `An ${current.status} post can't go straight to ${status}. Return it to draft first.`,
    });
  }
  return blogRepository.update(id, { status });
}

export const publishBlogPost = (id: string) => setBlogPostStatus(id, "published");
export const archiveBlogPost = (id: string) => setBlogPostStatus(id, "archived");
/** Take a post off the public site without archiving it. */
export const unpublishBlogPost = (id: string) => setBlogPostStatus(id, "draft");
/** Bring an archived post back for another look. Never straight to live. */
export const restoreBlogPost = (id: string) => setBlogPostStatus(id, "draft");

/** Promote or demote a post in the featured band. */
export function setBlogPostFeatured(id: string, featured: boolean): Promise<BlogPost> {
  return blogRepository.update(id, { featured });
}

/** Add tags to a post, normalised and de-duplicated against what it already has. */
export async function addBlogPostTags(id: string, tags: string[]): Promise<BlogPost> {
  const post = await blogRepository.getById(id);
  if (!post) throw new ApiError({ kind: "not-found", message: "That post no longer exists." });
  return blogRepository.update(id, { tags: normalizeTags([...(post.tags ?? []), ...tags]) });
}

export const createBlogCategory = (input: BlogCategoryInput): Promise<BlogCategory> =>
  blogRepository.createCategory(input);

export const updateBlogCategory = (id: string, patch: BlogCategoryPatch): Promise<BlogCategory> =>
  blogRepository.updateCategory(id, patch);

/** Refused while posts are still filed under the category. */
export const deleteBlogCategory = (id: string): Promise<void> =>
  blogRepository.removeCategory(id);

/** The slug to offer for a category name. */
export function suggestBlogCategorySlug(name: string, ignoreId?: string): string {
  const rows = blogRepository.peekCategories();
  const ignore = ignoreId ? rows.find((row) => row.id === ignoreId)?.slug : undefined;
  return uniqueSlug(name, rows.map((row) => row.slug), ignore);
}

/** Subscribe to store changes — used by the client hooks. */
export const subscribeToBlog = blogRepository.subscribe;
