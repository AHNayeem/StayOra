/**
 * Shared data-layer types used by repositories, services and query hooks.
 * Keeping these in one place means every feature module speaks the same
 * pagination / list-params / status vocabulary.
 */

export type ID = string;

/** Sort direction shared with the DataTable's `SortState`. */
export type SortDirection = "asc" | "desc";

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

/**
 * Parameters for a list/collection request. All optional so callers pass only
 * what they need; repositories serialize these into query strings.
 */
export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: SortSpec | null;
  /** Free-text search term. */
  search?: string;
  /** Arbitrary column/facet filters, e.g. `{ status: "confirmed" }`. */
  filters?: Record<string, string | number | boolean | null | undefined>;
}

/** A page of results plus the metadata a table needs to paginate. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  /** Convenience flag derived from `page * pageSize < total`. */
  hasMore: boolean;
}

/** Lifecycle of an async read. */
export type QueryStatus = "idle" | "loading" | "success" | "error";

/** Lifecycle of an async write. */
export type MutationStatus = "idle" | "pending" | "success" | "error";

/** Build a {@link Paginated} envelope, computing `hasMore`. */
export function paginate<T>(
  items: T[],
  { page, pageSize, total }: { page: number; pageSize: number; total: number },
): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
  };
}
