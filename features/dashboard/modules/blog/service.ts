/**
 * Dashboard data source for blog posts and categories.
 *
 * This is an *adapter*, not a second store: every read and write goes to the same
 * `features/blog` repository the public site uses, which is what makes "publish"
 * in this module change `/blogs` immediately. It exists only to present that
 * repository as the {@link ResourceService} the dashboard's list engine expects —
 * search, facets, sorting and pagination.
 *
 * Search here is client-side because the prototype's store is in memory, but the
 * signature is the API's: `ListParams` in, `Paginated` out. When the blog moves
 * to a backend, `features/blog/repository.ts` changes and this file does not.
 */

import { ApiError } from "../../data/errors";
import type { ID, ListParams, Paginated } from "../../data/types";
import { paginate } from "../../data/types";
import type { ResourceService } from "../../crud";
import { blogRepository } from "@/features/blog/repository";
import { postDate } from "@/features/blog/service";
import type {
  BlogCategory,
  BlogCategoryInput,
  BlogCategoryPatch,
  BlogPost,
  BlogPostInput,
  BlogPostPatch,
} from "@/types/blog";
import type { BlogSummary } from "./types";

/**
 * Fields free-text search scans: title, slug, category, tags and author — the
 * five an editor actually remembers a post by.
 */
function haystack(row: BlogPost): string {
  return [row.title, row.slug, row.category, row.author, ...(row.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Facets the list toolbar offers. Unknown keys fall through to no-ops. */
const FILTERS: Record<string, (row: BlogPost, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  category: (row, value) => row.category === value,
  author: (row, value) => row.author === value,
  featured: (row, value) => String(Boolean(row.featured)) === value,
};

function sortValue(row: BlogPost, field: string): string | number {
  switch (field) {
    case "title":
      return row.title;
    case "category":
      return row.category;
    case "author":
      return row.author;
    case "status":
      return row.status;
    case "publishedAt":
      return new Date(postDate(row)).getTime();
    case "createdAt":
      return new Date(row.createdAt).getTime();
    case "updatedAt":
    default:
      return new Date(row.updatedAt).getTime();
  }
}

export const blogService: ResourceService<BlogPost, BlogPostInput, BlogPostPatch> = {
  async list(params: ListParams = {}): Promise<Paginated<BlogPost>> {
    const { page = 1, pageSize = 10, sort, search, filters } = params;
    let rows = await blogRepository.list();

    const term = search?.trim().toLowerCase();
    if (term) rows = rows.filter((row) => haystack(row).includes(term));

    if (filters) {
      for (const [key, raw] of Object.entries(filters)) {
        if (raw === undefined || raw === null || raw === "") continue;
        const predicate = FILTERS[key];
        if (predicate) rows = rows.filter((row) => predicate(row, String(raw)));
      }
    }

    const direction = sort?.direction === "desc" ? -1 : 1;
    const field = sort?.field ?? "updatedAt";
    rows = [...rows].sort((a, b) => {
      const av = sortValue(a, field);
      const bv = sortValue(b, field);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * direction;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    return paginate(rows.slice(start, start + pageSize), { page, pageSize, total });
  },

  async get(id: ID): Promise<BlogPost> {
    const row = await blogRepository.getById(String(id));
    if (!row) {
      throw new ApiError({ kind: "not-found", message: "That post could not be found." });
    }
    return row;
  },

  create: (input) => blogRepository.create(input),
  update: (id, input) => blogRepository.update(String(id), input),
  remove: (id) => blogRepository.remove(String(id)),
  peek: () => blogRepository.peek(),
};

/** The same adapter for categories, so the category screen reuses the list engine. */
export const blogCategoryService: ResourceService<
  BlogCategory,
  BlogCategoryInput,
  BlogCategoryPatch
> = {
  async list(params: ListParams = {}): Promise<Paginated<BlogCategory>> {
    const { page = 1, pageSize = 20, search, filters } = params;
    let rows = await blogRepository.listCategories();
    const posts = blogRepository.peek();

    const term = search?.trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) =>
        `${row.name} ${row.slug} ${row.description ?? ""}`.toLowerCase().includes(term),
      );
    }
    const status = filters?.status;
    if (status) rows = rows.filter((row) => row.status === status);

    // Counts are attached on read rather than stored, so they cannot go stale
    // when a post is published, moved or deleted.
    rows = rows
      .map((row) => ({
        ...row,
        count: posts.filter((post) => post.categoryId === row.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const total = rows.length;
    const start = (page - 1) * pageSize;
    return paginate(rows.slice(start, start + pageSize), { page, pageSize, total });
  },

  async get(id: ID): Promise<BlogCategory> {
    const row = (await blogRepository.listCategories()).find((c) => c.id === String(id));
    if (!row) {
      throw new ApiError({ kind: "not-found", message: "That category could not be found." });
    }
    return row;
  },

  create: (input) => blogRepository.createCategory(input),
  update: (id, input) => blogRepository.updateCategory(String(id), input),
  remove: (id) => blogRepository.removeCategory(String(id)),
  peek: () => blogRepository.peekCategories(),
};

export const blogKeys = {
  all: ["blog-posts"] as const,
  summary: ["blog-posts", "summary"] as const,
  detail: (id: string) => ["blog-posts", id] as const,
  categories: ["blog-categories"] as const,
};

/** Aggregate KPIs for the list header — a seam a real backend serves directly. */
export function getBlogSummary(): Promise<BlogSummary> {
  const rows = blogRepository.peek();
  const published = rows.filter((row) => row.status === "published");
  return Promise.resolve({
    total: rows.length,
    published: published.length,
    draft: rows.filter((row) => row.status === "draft").length,
    archived: rows.filter((row) => row.status === "archived").length,
    featured: rows.filter((row) => row.featured).length,
    categories: new Set(published.map((row) => row.category)).size,
  });
}

/** Category names already in use, for the list's category facet. */
export function getBlogCategoryOptions(): { value: string; label: string }[] {
  return blogRepository
    .peekCategories()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({ value: row.name, label: row.name }));
}
