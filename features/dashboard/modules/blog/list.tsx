"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Send,
  Star,
  StarOff,
  Tags,
} from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { buttonVariants, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import {
  BLOG_DASHBOARD_HREF,
  BLOG_HREF,
  blogEditHref,
  blogPostHref,
  blogPreviewHref,
} from "@/features/blog/links";
import { getBlogAuthors } from "@/features/blog/service";
import { toast } from "@/lib/toast";
import {
  useBlogList,
  useBlogSummary,
  useDeleteBlogPost,
  useSetBlogPostFeatured,
  useSetBlogPostStatus,
} from "./hooks";
import { getBlogCategoryOptions } from "./service";
import { BLOG_STATUSES, type BlogPost } from "./types";

const statusLabel = labelMap(BLOG_STATUSES);

/**
 * Blog posts list — KPIs, the status/category/author/featured facets and every
 * lifecycle action.
 *
 * Create and edit are full pages rather than a drawer: a post carries a long
 * body, SEO fields and a formatting toolbar, which a 400px drawer can't hold.
 *
 * Archive is offered before delete, and delete is only offered for posts that
 * were never published — removing a live article breaks every link to its slug,
 * including any that have been shared. Both destructive actions state their
 * consequence in the confirm rather than asking "are you sure?".
 */
export function BlogList() {
  const router = useRouter();
  const [archiving, setArchiving] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState<BlogPost | null>(null);

  const setStatus = useSetBlogPostStatus();
  const setFeatured = useSetBlogPostFeatured();
  const del = useDeleteBlogPost();
  const summary = useBlogSummary();

  const runStatus = (row: BlogPost, status: BlogPost["status"], message: string) =>
    void setStatus
      .mutateAsync({ id: row.id, status })
      .then(() => toast.success(message))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "That change wasn't allowed."),
      );

  const list = useBlogList((row) => (
    <RowActions
      label={`Actions for ${row.title}`}
      // "View" goes to the public article only when there is one; a draft opens
      // the preview instead, so the action is never a link to a 404.
      onView={() =>
        router.push(row.status === "published" ? blogPostHref(row) : blogPreviewHref(row))
      }
      onEdit={() => router.push(blogEditHref(row))}
      // Only a post that never went live may be hard-deleted.
      onDelete={row.status === "draft" ? () => setDeleting(row) : undefined}
      viewPermission={["cms:read"]}
      editPermission={["cms:update"]}
      deletePermission={["cms:delete"]}
      extra={
        <>
          <Can anyPermission={["cms:read"]}>
            <DropdownItem icon={<Eye />} onSelect={() => router.push(blogPreviewHref(row))}>
              Preview
            </DropdownItem>
          </Can>
          <Can anyPermission={["cms:approve"]}>
            {row.status !== "published" && (
              <DropdownItem
                icon={row.status === "archived" ? <RotateCcw /> : <Send />}
                onSelect={() =>
                  row.status === "archived"
                    ? runStatus(row, "draft", `${row.title} restored to draft`)
                    : runStatus(row, "published", `${row.title} is live`)
                }
              >
                {row.status === "archived" ? "Restore to draft" : "Publish"}
              </DropdownItem>
            )}
            {row.status === "published" && (
              <DropdownItem
                icon={<EyeOff />}
                onSelect={() => runStatus(row, "draft", `${row.title} unpublished`)}
              >
                Unpublish
              </DropdownItem>
            )}
            <DropdownItem
              icon={row.featured ? <StarOff /> : <Star />}
              onSelect={() =>
                void setFeatured
                  .mutateAsync({ id: row.id, featured: !row.featured })
                  .then(() =>
                    toast.success(
                      row.featured
                        ? `${row.title} removed from featured`
                        : `${row.title} is now featured`,
                    ),
                  )
              }
            >
              {row.featured ? "Unfeature" : "Feature"}
            </DropdownItem>
          </Can>
          <Can anyPermission={["cms:update"]}>
            {row.status !== "archived" && (
              <DropdownItem icon={<Archive />} onSelect={() => setArchiving(row)}>
                Archive
              </DropdownItem>
            )}
          </Can>
        </>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const category = list.filters.category ?? "";
  const author = list.filters.author ?? "";
  const featured = list.filters.featured ?? "";

  const activeFilters: ActiveFilter[] = [
    ...(status
      ? [{ key: "status", label: `Status: ${statusLabel[status as BlogPost["status"]]}` }]
      : []),
    ...(category ? [{ key: "category", label: `Category: ${category}` }] : []),
    ...(author ? [{ key: "author", label: `Author: ${author}` }] : []),
    ...(featured === "true" ? [{ key: "featured", label: "Featured only" }] : []),
  ];

  const confirmArchive = async () => {
    if (!archiving) return;
    await setStatus.mutateAsync({ id: archiving.id, status: "archived" });
    toast.success(`${archiving.title} archived and removed from the public blog`);
    setArchiving(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    toast.success(`${deleting.title} deleted`);
    setDeleting(null);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Posts" value={formatNumber(summary.data.total)} icon="FileText" />
            <StatCard
              label="Published"
              value={formatNumber(summary.data.published)}
              icon="CircleCheck"
            />
            <StatCard label="Drafts" value={formatNumber(summary.data.draft)} icon="Clock" />
            <StatCard label="Featured" value={formatNumber(summary.data.featured)} icon="Star" />
          </>
        )}
      </div>

      <ResourceListView<BlogPost>
        list={list}
        searchPlaceholder="Search title, slug, category, tag or author…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => list.setFilter("status", event.target.value)}
              options={[{ value: "", label: "All statuses" }, ...statusOptions(BLOG_STATUSES)]}
              wrapperClassName="w-40"
            />
            <Select
              aria-label="Filter by category"
              value={category}
              onChange={(event) => list.setFilter("category", event.target.value)}
              options={[{ value: "", label: "All categories" }, ...getBlogCategoryOptions()]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by author"
              value={author}
              onChange={(event) => list.setFilter("author", event.target.value)}
              options={[
                { value: "", label: "All authors" },
                ...getBlogAuthors().map((name) => ({ value: name, label: name })),
              ]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by featured"
              value={featured}
              onChange={(event) => list.setFilter("featured", event.target.value)}
              options={[
                { value: "", label: "Featured & not" },
                { value: "true", label: "Featured only" },
                { value: "false", label: "Not featured" },
              ]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <>
            <Can anyPermission={["cms:update"]}>
              <Link
                href={`${BLOG_DASHBOARD_HREF}/categories`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Tags className="size-4" aria-hidden="true" />
                Categories
              </Link>
            </Can>
            <Can anyPermission={["cms:create"]}>
              <Link
                href={`${BLOG_DASHBOARD_HREF}/new`}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Create post
              </Link>
            </Can>
          </>
        }
        caption="Blog posts"
      />

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        onConfirm={confirmArchive}
        loading={setStatus.isPending}
        tone="danger"
        title="Archive post?"
        message={
          <>
            <strong className="font-semibold text-ink">{archiving?.title}</strong> will be
            removed from <code className="font-mono text-xs">/blogs</code> and its own page
            will stop resolving. Nothing is deleted — you can restore it to draft at any
            time.
          </>
        }
        confirmLabel="Archive post"
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete draft post?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.title}</strong> and all its
            content, imagery and SEO settings will be permanently removed. This can&apos;t be
            undone — archive it instead if you may want it back.
          </>
        }
        confirmLabel="Delete post"
      />

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
        <ExternalLink className="size-3.5" aria-hidden="true" />
        Published posts appear immediately on{" "}
        <Link href={BLOG_HREF} className="underline hover:text-primary">
          /blogs
        </Link>
        .
      </p>
    </>
  );
}
