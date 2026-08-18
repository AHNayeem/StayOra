/**
 * Blog link building — the one place a blog URL is constructed.
 *
 * Every blog href in the app comes from here, so a link can only ever point at a
 * real slug. Building `/blog/${title}` at a call site is exactly how a card ends
 * up linking to a 404, which is why the post record is the argument rather than
 * a string.
 *
 * Note the asymmetry, which is historical and deliberate: the *index* lives at
 * `/blogs` and an *article* at `/blog/{slug}`. `/blog` redirects to the index so
 * both spellings work.
 */

import type { BlogCategory, BlogPost } from "@/types/blog";

/** Public index of every published post. */
export const BLOG_HREF = "/blogs";

/** The canonical public URL for a post. */
export function blogPostHref(post: Pick<BlogPost, "slug">): string {
  return `/blog/${post.slug}`;
}

/** The index filtered to one category — a real URL, so it can be shared. */
export function blogCategoryHref(category: Pick<BlogCategory, "slug">): string {
  return `${BLOG_HREF}?category=${encodeURIComponent(category.slug)}`;
}

/** The index filtered to one tag. */
export function blogTagHref(tag: string): string {
  return `${BLOG_HREF}?tag=${encodeURIComponent(tag)}`;
}

/** Where the dashboard lists posts. */
export const BLOG_DASHBOARD_HREF = "/dashboard/blog";

/** Where the dashboard edits this post — keyed by id, never by slug. */
export function blogEditHref(post: Pick<BlogPost, "id">): string {
  return `${BLOG_DASHBOARD_HREF}/${post.id}/edit`;
}

/** The dashboard preview of this post, which works before it is published. */
export function blogPreviewHref(post: Pick<BlogPost, "id">): string {
  return `${BLOG_DASHBOARD_HREF}/${post.id}/preview`;
}
