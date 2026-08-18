"use client";

import { useMemo } from "react";
import { notFound } from "next/navigation";
import type { BlogDetail } from "@/types/blog";
import { Container } from "@/components/ui/container";
import { Spinner } from "@/components/ui/spinner";
import { useAllBlogPosts, useBlogCategories, useBlogPost, useBlogPosts } from "../hooks";
import { buildBlogDetail } from "../service";
import { BlogDetailView } from "./blog-detail-view";

interface BlogArticleProps {
  slug: string;
  /**
   * What the server resolved for this slug, or `null` when the server had never
   * heard of it. Rendered as-is until the browser's store has been read.
   */
  initial: BlogDetail | null;
}

/**
 * The article, reconciled with the browser's store.
 *
 * In the prototype the server can only see the seed — everything an editor has
 * written lives in `localStorage`. That creates two problems this component
 * solves together, which is why they are not two components:
 *
 *  1. **A post the server doesn't know.** Created in the dashboard, so `initial`
 *     is `null`. We wait for the store, then render it or hand control to the
 *     project's standard not-found page.
 *  2. **A post the server knows but has out of date.** A *seeded* article the
 *     editor has since retitled, rewritten or unpublished. Rendering the server's
 *     copy and stopping there would mean edits showed up on `/blogs` (a client
 *     list) but never on the article itself.
 *
 * SSR is unaffected: `useBlogPost` hands the server-render and hydration passes
 * the seed snapshot, so the markup React reconciles against is exactly what the
 * server produced, and the store's real contents arrive in the pass immediately
 * after. The page is therefore complete without JavaScript and correct with it.
 *
 * Once a backend serves the blog, the route resolves every slug server-side and
 * this component is deleted — nothing else depends on it.
 */
export function BlogArticle({ slug, initial }: BlogArticleProps) {
  const { post, resolved } = useBlogPost(slug);
  const pool = useAllBlogPosts();
  const categories = useBlogCategories();
  const recent = useBlogPosts({ limit: 4 });

  const detail = useMemo(
    () => (post ? buildBlogDetail(post, pool) : null),
    [post, pool],
  );

  // Before the store is readable, the server's answer is the best one there is.
  if (!resolved) {
    if (initial) {
      return <BlogDetailView detail={initial} categories={categories} recent={recent} />;
    }
    return (
      <main className="flex flex-1 items-center">
        <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20">
          <Spinner size="lg" label="Loading article" />
          <p className="text-sm text-muted">Loading article…</p>
        </Container>
      </main>
    );
  }

  // Resolved and absent means genuinely unknown *or* unpublished since the
  // server rendered — either way the reader gets the 404, not stale content.
  if (!detail) notFound();

  return <BlogDetailView detail={detail} categories={categories} recent={recent} />;
}
