"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import type { BlogCategory } from "@/types/blog";
import type { BlogPost } from "@/types/content";
import { controlClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Format an ISO date as "18 Jun 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface BlogSidebarProps {
  categories: BlogCategory[];
  recent: BlogPost[];
  /** Interactive search value (listing page only). */
  query?: string;
  onQueryChange?: (value: string) => void;
  /** Active category — "" means all (listing page only). */
  activeCategory?: string;
  onCategoryChange?: (name: string) => void;
}

/**
 * BlogSidebar — the shared sidebar for the blog listing and details pages. On the
 * listing it drives search and category filtering (controlled by the parent); on
 * a details page (no handlers passed) categories become links back to the blog.
 */
export function BlogSidebar({
  categories,
  recent,
  query,
  onQueryChange,
  activeCategory,
  onCategoryChange,
}: BlogSidebarProps) {
  const interactive = Boolean(onCategoryChange);

  return (
    <aside className="flex flex-col gap-8">
      {onQueryChange && (
        <div>
          <label htmlFor="blog-search" className="sr-only">
            Search articles
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted"
              aria-hidden="true"
            />
            <input
              id="blog-search"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search articles…"
              className={cn(controlClasses(false), "h-11 pl-10")}
            />
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-ink">Categories</h2>
        <ul className="mt-4 flex flex-col gap-1">
          {interactive && (
            <li>
              <button
                type="button"
                onClick={() => onCategoryChange?.("")}
                aria-current={activeCategory === "" ? "true" : undefined}
                className={cn(
                  "flex w-full items-center justify-between rounded-field px-3 py-2 text-sm transition-colors",
                  activeCategory === ""
                    ? "bg-primary-50 font-semibold text-primary-700"
                    : "text-body hover:bg-surface-muted",
                )}
              >
                All articles
              </button>
            </li>
          )}
          {categories.map((category) => {
            const isActive = interactive && activeCategory === category.name;
            const inner = (
              <>
                <span>{category.name}</span>
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-semibold",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-surface-muted text-muted",
                  )}
                >
                  {category.count}
                </span>
              </>
            );
            const classes = cn(
              "flex w-full items-center justify-between rounded-field px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary-50 font-semibold text-primary-700"
                : "text-body hover:bg-surface-muted",
            );
            return (
              <li key={category.name}>
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onCategoryChange?.(category.name)}
                    aria-current={isActive ? "true" : undefined}
                    className={classes}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link href="/blogs" className={classes}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Recent posts</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {recent.map((post) => (
              <li key={post.id}>
                <Link href={`/blog/${post.slug}`} className="group flex gap-3">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-card">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      sizes="64px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="flex flex-col">
                    <span className="line-clamp-2 text-sm font-semibold text-ink group-hover:text-primary">
                      {post.title}
                    </span>
                    <span className="mt-1 text-xs text-muted">
                      {formatDate(post.date)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
