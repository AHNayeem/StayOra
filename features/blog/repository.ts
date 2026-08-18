/**
 * The blog repository — the single source of truth for posts and categories.
 *
 *   UI  →  service.ts  →  BlogRepository  →  mock store (+ localStorage)
 *
 * Everything that reads or writes a post goes through this interface: the public
 * index, the article route, the home rail, the sitemap and the dashboard. There
 * is no second copy of the data and no component holds its own literals, which
 * is what makes "publish in the dashboard" show up on the public site.
 *
 * **Swapping in a backend.** Implement {@link BlogRepository} against HTTP and
 * change the one line at the bottom of this file:
 *
 *   export const blogRepository = createApiBlogRepository();
 *
 * The async methods map 1:1 onto REST verbs. `peek` is the only method a network
 * repository cannot implement directly — it is a synchronous read the prototype
 * needs so a server render and the client's first paint agree; a real
 * implementation returns its cache, or the callers become server reads and it
 * disappears.
 *
 * **Persistence.** Writes land in `localStorage` through the same
 * `crud/module-store` helpers the dashboard's other no-backend modules use, so a
 * post survives navigation and reload and "Reset demo data" clears the blog
 * along with everything else. On the server there is no storage, so `peek`
 * returns the seed — which keeps SSR deterministic and means a post created in
 * the browser is resolved on the client (see `features/blog/hooks.ts`).
 */

import { ApiError } from "@/features/dashboard/data/errors";
import {
  readModuleState,
  registerModuleStore,
  writeModuleState,
} from "@/features/dashboard/crud/module-store";
import { BLOG_CATEGORIES_SEED } from "@/constants/blog-categories";
import { BLOG_POSTS_SEED } from "@/constants/blog-posts";
import { readingMinutes } from "@/lib/blog-content";
import type {
  BlogCategory,
  BlogCategoryInput,
  BlogCategoryPatch,
  BlogPost,
  BlogPostInput,
  BlogPostPatch,
} from "@/types/blog";
import { slugify, uniqueSlug } from "./slug";

/** Simulated latency, matching the rest of the service layer. */
const LATENCY = 300;

/** Fired on every local mutation so open views re-read the store. */
const CHANGE_EVENT = "otithee:blog:change";

export interface BlogRepository {
  /** Every post, whatever its status. Filtering is the service's job. */
  list(): Promise<BlogPost[]>;
  getById(id: string): Promise<BlogPost | undefined>;
  getBySlug(slug: string): Promise<BlogPost | undefined>;
  create(input: BlogPostInput): Promise<BlogPost>;
  /** Partial update; fields left out keep their current value. */
  update(id: string, patch: BlogPostPatch): Promise<BlogPost>;
  remove(id: string): Promise<void>;

  listCategories(): Promise<BlogCategory[]>;
  createCategory(input: BlogCategoryInput): Promise<BlogCategory>;
  updateCategory(id: string, patch: BlogCategoryPatch): Promise<BlogCategory>;
  /** Refused while any post is still filed under the category. */
  removeCategory(id: string): Promise<void>;

  /**
   * Synchronous snapshot of every post.
   *
   * Server components and the first client paint must resolve a post in the same
   * render pass — an async read would flash an empty page or, worse, a 404 for a
   * slug that exists.
   */
  peek(): BlogPost[];
  peekCategories(): BlogCategory[];
  /**
   * The same rows as {@link peek} but as a *stable* array reference: its
   * identity changes only when something is written.
   *
   * `useSyncExternalStore` compares snapshots with `Object.is` and re-renders
   * forever if handed a fresh array each call, so React reads through this while
   * everything else uses `peek`.
   */
  snapshot(): BlogPost[];
  categoriesSnapshot(): BlogCategory[];
  /**
   * The untouched seed — what the server rendered.
   *
   * Hydration must be given the server's value, not the browser's, or React
   * reconciles against markup that was produced without `localStorage`. The
   * store's real contents arrive in the effect immediately after.
   */
  seedSnapshot(): BlogPost[];
  categoriesSeedSnapshot(): BlogCategory[];
  /** Notifies on local writes and on writes from another tab. */
  subscribe(listener: () => void): () => void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function delay<T>(value: T): Promise<T> {
  if (process.env.NODE_ENV === "test") return Promise.resolve(value);
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

/**
 * Reject a write because of the value the caller supplied.
 *
 * Raised as `validation` rather than `conflict` so `applyServerErrors` puts the
 * message on the offending field — a slug clash is something the author fixes in
 * the form, not a generic failure banner.
 */
function invalid(message: string, field?: string): never {
  throw new ApiError({
    kind: "validation",
    message,
    fieldErrors: field ? { [field]: [message] } : undefined,
  });
}

function notFound(what: string, id: string): never {
  throw new ApiError({ kind: "not-found", message: `${what} ${id} could not be found.` });
}

/**
 * Normalise a tag list: trimmed, de-duplicated case-insensitively, first
 * spelling wins.
 *
 * Done in the store rather than the form so tags typed by an API client are
 * normalised too — otherwise "Bali", "bali" and " Bali " become three facets.
 */
export function normalizeTags(tags: readonly string[] | undefined): string[] {
  const seen = new Map<string, string>();
  for (const raw of tags ?? []) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (tag && !seen.has(tag.toLowerCase())) seen.set(tag.toLowerCase(), tag);
  }
  return [...seen.values()];
}

/**
 * The prototype repository: the seed, plus whatever the editor has changed,
 * persisted per browser.
 */
export function createMockBlogRepository(
  seed: BlogPost[] = BLOG_POSTS_SEED,
  categorySeed: BlogCategory[] = BLOG_CATEGORIES_SEED,
): BlogRepository {
  const postsKey = registerModuleStore("blog-posts");
  const categoriesKey = registerModuleStore("blog-categories");

  const pristine: BlogPost[] = seed.map((row) => ({ ...row }));
  const pristineCategories: BlogCategory[] = categorySeed.map((row) => ({ ...row }));
  let rows: BlogPost[] = pristine;
  let categories: BlogCategory[] = pristineCategories;
  let hydrated = false;
  let categoriesHydrated = false;

  /**
   * The live rows. The first browser read replaces the seed with whatever was
   * persisted; the server keeps the seed, so both renders are stable.
   */
  function all(): BlogPost[] {
    if (!hydrated && isBrowser()) {
      rows = readModuleState(postsKey, rows);
      hydrated = true;
    }
    return rows;
  }

  function allCategories(): BlogCategory[] {
    if (!categoriesHydrated && isBrowser()) {
      categories = readModuleState(categoriesKey, categories);
      categoriesHydrated = true;
    }
    return categories;
  }

  function announce(): void {
    if (isBrowser()) window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function commit(next: BlogPost[]): void {
    rows = next;
    writeModuleState(postsKey, next);
    announce();
  }

  function commitCategories(next: BlogCategory[]): void {
    categories = next;
    writeModuleState(categoriesKey, next);
    announce();
  }

  /**
   * A fresh id that cannot collide with a persisted one.
   *
   * Generated from the highest id already stored rather than a counter, because
   * a module-level counter resets on reload and would hand the next create an id
   * an earlier session already used.
   */
  function nextId(prefix: string, existing: { id: string }[], floor: number): string {
    const highest = existing.reduce((max, row) => {
      const n = Number.parseInt(row.id.replace(/^\D+/, ""), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, floor);
    return `${prefix}${highest + 1}`;
  }

  function requireIndex(id: string): number {
    const index = all().findIndex((row) => row.id === id);
    if (index === -1) notFound("Post", id);
    return index;
  }

  /**
   * Settle the slug for a write.
   *
   * A blank slug is derived from the title; a supplied slug is normalised so an
   * author cannot type a URL the router would never match. Either way a clash
   * with *another* post is a conflict the caller has to resolve — the store never
   * re-points an existing URL at new content, because that would silently
   * hijack a published article's address.
   */
  function resolveSlug(
    desired: string | undefined,
    title: string,
    currentId?: string,
  ): string {
    const taken = all().filter((row) => row.id !== currentId).map((row) => row.slug);
    const requested = desired?.trim();

    if (!requested) return uniqueSlug(title, taken);

    const normalised = slugify(requested);
    if (!normalised) invalid("Enter a slug using letters and numbers.", "slug");
    if (taken.includes(normalised)) {
      invalid(
        `The slug “${normalised}” is already used by another post. Try “${uniqueSlug(
          normalised,
          taken,
        )}”.`,
        "slug",
      );
    }
    return normalised;
  }

  /** Keep the denormalised category name in step with the referenced record. */
  function resolveCategory(
    categoryId: string | undefined,
    fallbackName: string,
  ): { categoryId?: string; category: string } {
    if (!categoryId) return { category: fallbackName };
    const found = allCategories().find((row) => row.id === categoryId);
    if (!found) invalid("Pick a category that still exists.", "categoryId");
    return { categoryId: found.id, category: found.name };
  }

  function resolveCategorySlug(
    desired: string | undefined,
    name: string,
    currentId?: string,
  ): string {
    const taken = allCategories()
      .filter((row) => row.id !== currentId)
      .map((row) => row.slug);
    const requested = desired?.trim();
    if (!requested) return uniqueSlug(name, taken);

    const normalised = slugify(requested);
    if (!normalised) invalid("Enter a slug using letters and numbers.", "slug");
    if (taken.includes(normalised)) {
      invalid(`The slug “${normalised}” is already used by another category.`, "slug");
    }
    return normalised;
  }

  return {
    list: () => delay(all().map((row) => ({ ...row }))),

    getById: (id) => delay(all().find((row) => row.id === id)).then((row) => row && { ...row }),

    getBySlug: (slug) =>
      delay(all().find((row) => row.slug === slug)).then((row) => row && { ...row }),

    async create(input) {
      const now = new Date().toISOString();
      const category = resolveCategory(input.categoryId, input.category);
      const row: BlogPost = {
        ...input,
        ...category,
        id: nextId("blg_", all(), 1000),
        slug: resolveSlug(input.slug, input.title),
        tags: normalizeTags(input.tags),
        // Reading time is derived, never supplied — a hand-set "5 min read"
        // drifts from the article the moment anyone edits it.
        readMinutes: readingMinutes(input.content),
        // Publishing on create dates the post now; a draft has no date yet.
        publishedAt:
          input.status === "published" ? (input.publishedAt ?? now) : input.publishedAt,
        createdAt: now,
        updatedAt: now,
      };
      commit([row, ...all()]);
      return delay({ ...row });
    },

    async update(id, patch) {
      const index = requireIndex(id);
      const existing = all()[index];
      const content = patch.content ?? existing.content;
      const category =
        patch.categoryId !== undefined || patch.category !== undefined
          ? resolveCategory(
              patch.categoryId ?? existing.categoryId,
              patch.category ?? existing.category,
            )
          : { categoryId: existing.categoryId, category: existing.category };

      const next: BlogPost = {
        ...existing,
        ...patch,
        ...category,
        // Unchanged fields are preserved, including the slug: `patch.slug`
        // absent means "leave the URL alone", not "regenerate it".
        slug:
          patch.slug === undefined
            ? existing.slug
            : resolveSlug(patch.slug, patch.title ?? existing.title, id),
        tags: patch.tags === undefined ? existing.tags : normalizeTags(patch.tags),
        content,
        readMinutes: readingMinutes(content),
        // First publish stamps the date; later edits leave it alone, so an
        // article doesn't jump to the top of the index every time it's fixed.
        publishedAt:
          patch.publishedAt !== undefined
            ? patch.publishedAt
            : patch.status === "published" && !existing.publishedAt
              ? new Date().toISOString()
              : existing.publishedAt,
        updatedAt: new Date().toISOString(),
      };
      const rowsNext = [...all()];
      rowsNext[index] = next;
      commit(rowsNext);
      return delay({ ...next });
    },

    async remove(id) {
      requireIndex(id);
      commit(all().filter((row) => row.id !== id));
      await delay(undefined);
    },

    listCategories: () => delay(allCategories().map((row) => ({ ...row }))),

    async createCategory(input) {
      const row: BlogCategory = {
        ...input,
        id: nextId("blgcat_", allCategories(), 100),
        slug: resolveCategorySlug(input.slug, input.name),
      };
      commitCategories([...allCategories(), row]);
      return delay({ ...row });
    },

    async updateCategory(id, patch) {
      const index = allCategories().findIndex((row) => row.id === id);
      if (index === -1) notFound("Category", id);
      const existing = allCategories()[index];
      const next: BlogCategory = {
        ...existing,
        ...patch,
        slug:
          patch.slug === undefined
            ? existing.slug
            : resolveCategorySlug(patch.slug, patch.name ?? existing.name, id),
      };
      const rowsNext = [...allCategories()];
      rowsNext[index] = next;
      commitCategories(rowsNext);

      // The name is denormalised onto every post for rendering, so a rename has
      // to reach them or cards and facets would show the old label forever.
      if (patch.name && patch.name !== existing.name) {
        const touched = all().map((post) =>
          post.categoryId === id ? { ...post, category: next.name } : post,
        );
        commit(touched);
      }
      return delay({ ...next });
    },

    async removeCategory(id) {
      const existing = allCategories().find((row) => row.id === id);
      if (!existing) notFound("Category", id);
      const inUse = all().filter((post) => post.categoryId === id).length;
      if (inUse > 0) {
        invalid(
          `“${existing.name}” still has ${inUse} post${inUse === 1 ? "" : "s"} filed under it. Move them first, or hide the category instead.`,
        );
      }
      commitCategories(allCategories().filter((row) => row.id !== id));
      await delay(undefined);
    },

    peek: () => all().map((row) => ({ ...row })),
    peekCategories: () => allCategories().map((row) => ({ ...row })),

    snapshot: () => all(),
    categoriesSnapshot: () => allCategories(),

    seedSnapshot: () => pristine,
    categoriesSeedSnapshot: () => pristineCategories,

    subscribe(listener) {
      if (!isBrowser()) return () => {};
      window.addEventListener(CHANGE_EVENT, listener);
      // Another tab's dashboard writing to localStorage counts as a change.
      window.addEventListener("storage", listener);
      return () => {
        window.removeEventListener(CHANGE_EVENT, listener);
        window.removeEventListener("storage", listener);
      };
    },
  };
}

/**
 * The repository the whole app uses. Replace this construction — and nothing
 * else — to move the blog onto a real API.
 */
export const blogRepository: BlogRepository = createMockBlogRepository();
