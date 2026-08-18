"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { BlogCard } from "@/components/cards/blog-card";
import { Pagination } from "@/components/ui/pagination";
import { Reveal } from "@/components/shared/reveal";
import { useBlogCategories, useBlogPosts, useBlogTags } from "@/features/blog/hooks";
import { BlogSidebar } from "./blog-sidebar";

const PAGE_SIZE = 6;

interface BlogListingProps {
  /** Category slug from `?category=` — the URL a sidebar link produced. */
  initialCategory?: string;
  /** Tag from `?tag=` — narrows the list without occupying the category facet. */
  initialTag?: string;
  initialSearch?: string;
}

/**
 * BlogListing — the client orchestrator for `/blogs`: owns search, category and
 * page state, derives the visible posts, and lays out the card grid beside the
 * shared {@link BlogSidebar}. All state changes happen in event handlers (which
 * also reset paging), keeping effects free of setState.
 *
 * Posts come from the canonical store rather than a prop, for the same reason
 * `DestinationsIndex` does: the page still renders on the server from the seed
 * (the hooks hand SSR the seed snapshot, so the list is complete without
 * JavaScript) and *additionally* picks up posts the author published in this
 * browser, which the server cannot see in the prototype.
 *
 * Only `published` posts are ever returned — the status filter lives in the
 * service, so this component cannot accidentally show a draft.
 */
export function BlogListing({
  initialCategory = "",
  initialTag = "",
  initialSearch = "",
}: BlogListingProps) {
  const [query, setQuery] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);

  const categories = useBlogCategories();
  const tags = useBlogTags();
  const filtered = useBlogPosts(
    initialTag ? { search: query, category, tag: initialTag } : { search: query, category },
  );
  const recent = useBlogPosts({ limit: 4 });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
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
        tags={tags.slice(0, 12)}
        query={query}
        onQueryChange={handleQueryChange}
        activeCategory={category}
        onCategoryChange={handleCategoryChange}
      />
    </div>
  );
}
