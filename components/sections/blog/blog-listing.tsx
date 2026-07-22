"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import type { BlogCategory } from "@/types/blog";
import type { BlogPost } from "@/types/content";
import { BlogCard } from "@/components/cards/blog-card";
import { Pagination } from "@/components/ui/pagination";
import { Reveal } from "@/components/shared/reveal";
import { BlogSidebar } from "./blog-sidebar";

const PAGE_SIZE = 6;

interface BlogListingProps {
  posts: BlogPost[];
  categories: BlogCategory[];
  recent: BlogPost[];
}

/**
 * BlogListing — the client orchestrator for `/blogs`: owns search, category and
 * page state, derives the visible posts with `useMemo`, and lays out the card
 * grid beside the shared {@link BlogSidebar}. All state changes happen in event
 * handlers (which also reset paging), keeping effects free of setState.
 */
export function BlogListing({ posts, categories, recent }: BlogListingProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...posts]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .filter((post) => (category ? post.category === category : true))
      .filter((post) =>
        needle
          ? post.title.toLowerCase().includes(needle) ||
            post.excerpt.toLowerCase().includes(needle) ||
            post.category.toLowerCase().includes(needle)
          : true,
      );
  }, [posts, query, category]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
      <div>
        {visible.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {visible.map((post, index) => (
                <Reveal key={post.id} step={index % 2} className="h-full">
                  <BlogCard post={post} className="h-full" />
                </Reveal>
              ))}
            </div>
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
              className="mt-12"
            />
          </>
        ) : (
          <div className="flex flex-col items-center rounded-panel border border-dashed border-line bg-surface-muted px-6 py-16 text-center">
            <SearchX className="size-10 text-muted" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold text-ink">No articles found</h2>
            <p className="mt-2 max-w-sm text-body">
              Try a different search term or clear the category filter.
            </p>
          </div>
        )}
      </div>

      <BlogSidebar
        categories={categories}
        recent={recent}
        query={query}
        onQueryChange={handleQueryChange}
        activeCategory={category}
        onCategoryChange={handleCategoryChange}
      />
    </div>
  );
}
