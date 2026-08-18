"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Send } from "lucide-react";
import { ErrorState } from "../../components/state-views";
import { Alert, buttonVariants, FormSkeleton, StatusBadge } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { labelMap, toneMap } from "../../lib/status";
import { BlogDetailView } from "@/features/blog/ui/blog-detail-view";
import { buildBlogDetail } from "@/features/blog/service";
import { blogRepository } from "@/features/blog/repository";
import {
  BLOG_DASHBOARD_HREF,
  blogEditHref,
  blogPostHref,
} from "@/features/blog/links";
import { useBlogCategories } from "@/features/blog/hooks";
import { stripInline } from "@/lib/blog-content";
import { toast } from "@/lib/toast";
import { useBlogPost, useSetBlogPostStatus } from "./hooks";
import { BLOG_STATUSES } from "./types";

const statusTone = toneMap(BLOG_STATUSES);
const statusLabel = labelMap(BLOG_STATUSES);

/**
 * Preview a post before it goes live.
 *
 * It renders the *actual* {@link BlogDetailView} the public article uses rather
 * than a lookalike, so what an editor approves is what a reader gets — a second
 * preview layout would drift from the real page within a release or two.
 *
 * Preview never requires publishing: a draft is read straight from the store by
 * id, which is the whole point of having one. The bar above the article carries
 * the status, the SEO snippet the post will produce, and the publish action, so
 * "check it, then ship it" is one screen.
 */
export function BlogPreview({ id }: { id: string }) {
  const router = useRouter();
  const query = useBlogPost(id);
  const categories = useBlogCategories();
  const setStatus = useSetBlogPostStatus();

  if (query.isLoading) return <FormSkeleton />;

  if (query.error || !query.data) {
    return (
      <ErrorState
        title="Post not found"
        description="It may have been deleted. Head back to the list and try again."
        onRetry={() => router.push(BLOG_DASHBOARD_HREF)}
      />
    );
  }

  const post = query.data;
  const detail = buildBlogDetail(post, blogRepository.peek());
  const recent = blogRepository
    .peek()
    .filter((row) => row.status === "published" && row.id !== post.id)
    .slice(0, 4);

  const seoTitle = post.seo?.title ?? post.title;
  const seoDescription = post.seo?.description ?? stripInline(post.excerpt);

  const publish = () =>
    void setStatus
      .mutateAsync({ id: post.id, status: "published" })
      .then(() => toast.success(`${post.title} is live at /blog/${post.slug}`))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "That change wasn't allowed."),
      );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={BLOG_DASHBOARD_HREF} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          All posts
        </Link>
        <StatusBadge tone={statusTone[post.status]}>{statusLabel[post.status]}</StatusBadge>
        <span className="font-mono text-xs text-muted">/blog/{post.slug}</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Can anyPermission={["cms:update"]}>
            <Link href={blogEditHref(post)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Link>
          </Can>
          {post.status === "published" ? (
            <Link
              href={blogPostHref(post)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              View live
            </Link>
          ) : (
            <Can anyPermission={["cms:approve"]}>
              <button
                type="button"
                onClick={publish}
                disabled={setStatus.isPending}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                <Send className="size-4" aria-hidden="true" />
                Publish
              </button>
            </Can>
          )}
        </div>
      </div>

      {post.status !== "published" && (
        <Alert tone="info" title="Preview — this post isn't public yet">
          Only people with dashboard access can see this page. Publishing puts it on{" "}
          <code className="font-mono text-xs">/blogs</code> and at{" "}
          <code className="font-mono text-xs">/blog/{post.slug}</code>.
        </Alert>
      )}

      {/* The search snippet the post's SEO fields will produce — the one part of
          a published article an editor cannot check by looking at the page. */}
      <section
        aria-label="Search result preview"
        className="rounded-card border border-line bg-surface px-5 py-4"
      >
        <h2 className="text-sm font-semibold text-ink">Search result preview</h2>
        <p className="mt-3 text-xs text-muted">otithee.com › blog › {post.slug}</p>
        <p className="mt-1 text-base font-medium text-primary">{seoTitle}</p>
        <p className="mt-1 line-clamp-2 text-sm text-body">{seoDescription}</p>
        {(post.seo?.keywords?.length ?? 0) > 0 && (
          <p className="mt-2 text-xs text-muted">Keywords: {post.seo?.keywords?.join(", ")}</p>
        )}
      </section>

      {/* The article exactly as a reader would see it. */}
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <BlogDetailView detail={detail} categories={categories} recent={recent} preview />
      </div>
    </div>
  );
}
