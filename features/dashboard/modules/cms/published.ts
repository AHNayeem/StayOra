/**
 * The published-content read model — the half the CMS was missing.
 *
 * The workflow was real (draft → review → scheduled → published, versioned and
 * audited) but publishing changed a status and nothing else: the public site
 * rendered static constants, so an editor could "publish" a page no visitor
 * would ever see.
 *
 * This module is the seam between the two. `publishedContent(slug)` returns the
 * live copy for a slug, or `null` when nothing has been published for it — and
 * the public pages render the CMS copy when it exists, falling back to the
 * constants they shipped with. That fallback is deliberate: it keeps the site
 * complete without forcing every marketing page into the CMS on day one.
 *
 * Reads are synchronous (`peek`) because the fallback must render in the same
 * pass — an async read would flash the static copy first. A real CMS API turns
 * this into a fetch in a Server Component and the call sites stay as they are.
 */

import { cmsService } from "./service";
import type { CmsPage } from "./types";

export interface PublishedContent {
  slug: string;
  title: string;
  excerpt: string;
  /** Plain text; blank lines separate paragraphs. */
  body: string;
  publishedAt?: string;
  version: number;
}

/** A page counts as live when published, or scheduled with its time passed. */
function isLive(page: CmsPage, nowMs: number): boolean {
  if (page.status === "published") return true;
  return (
    page.status === "scheduled" &&
    Boolean(page.publishAt) &&
    new Date(page.publishAt as string).getTime() <= nowMs
  );
}

function pages(): CmsPage[] {
  return cmsService.peek?.() ?? [];
}

/** Live content for one slug, or `null` when the page is not published. */
export function publishedContent(slug: string, nowMs = Date.now()): PublishedContent | null {
  const page = pages().find((p) => p.slug === slug && isLive(p, nowMs));
  if (!page) return null;
  return {
    slug: page.slug,
    title: page.title,
    excerpt: page.excerpt,
    body: page.body,
    publishedAt: page.publishedAt,
    version: page.version,
  };
}

/** Every live page of a type — e.g. all published blog posts. */
export function publishedByType(type: string, nowMs = Date.now()): PublishedContent[] {
  return pages()
    .filter((p) => p.type.toLowerCase() === type.toLowerCase() && isLive(p, nowMs))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      publishedAt: p.publishedAt,
      version: p.version,
    }));
}

/** Where a slug appears on the public site — shown in the CMS list. */
export function publicHref(slug: string): string {
  if (slug === "home") return "/";
  if (slug.startsWith("blog/")) return `/${slug}`;
  if (slug.startsWith("faq/")) return "/faqs";
  const map: Record<string, string> = {
    about: "/about-us",
    contact: "/contact-us",
    terms: "/terms-and-conditions",
    privacy: "/terms-and-conditions",
    partners: "/partner",
  };
  return map[slug] ?? `/${slug}`;
}
