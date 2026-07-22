/**
 * In-memory CRUD engine — the reusable data source for Phase 4 (no backend yet).
 *
 * `createStubService` turns a seed array into a full {@link ResourceService}:
 * list (with search / filters / sort / pagination), get, create, update and
 * remove, all behind a simulated network latency so loading and error states are
 * exercisable. The service signature matches a real repository, so each module
 * swaps `createStubService(...)` → `createResourceRepository(...)` later without
 * touching its hooks, columns or pages.
 */
import { ApiError } from "../data/errors";
import type { ID, ListParams, Paginated } from "../data/types";
import { paginate } from "../data/types";
import type { ResourceService } from "./types";

type Row = Record<string, unknown>;

export interface StubServiceOptions<T, TCreate, TUpdate> {
  /** Initial dataset (copied; the original array is never mutated). */
  seed: T[];
  /** Stable id accessor. */
  getId: (row: T) => ID;
  /** Fields scanned by free-text `search` (case-insensitive substring). */
  searchFields?: (keyof T)[];
  /**
   * Per-field sort accessors. Falls back to the raw property value, so most
   * columns need no entry here.
   */
  sortAccessors?: Partial<Record<string, (row: T) => string | number>>;
  /**
   * Per-filter predicates. Falls back to loose string equality on the property
   * of the same name, so simple facet filters need no entry.
   */
  filterPredicates?: Record<string, (row: T, value: string) => boolean>;
  /** Build a stored entity from create input (id + server defaults supplied). */
  applyCreate?: (input: TCreate, id: ID) => T;
  /** Merge update input onto an existing entity. Defaults to a shallow spread. */
  applyUpdate?: (existing: T, input: TUpdate) => T;
  /** Simulated latency in ms (default 450). */
  latencyMs?: number;
  /** Prefix for generated ids (default "row"). */
  idPrefix?: string;
}

let idCounter = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/**
 * Create an in-memory service backing one resource. Data lives for the lifetime
 * of the module (module-scoped singleton), so creates/updates/deletes persist
 * across navigations within a session — enough to demo real CRUD flows.
 */
export function createStubService<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  options: StubServiceOptions<T, TCreate, TUpdate>,
): ResourceService<T, TCreate, TUpdate> {
  const {
    seed,
    getId,
    searchFields = [],
    sortAccessors = {},
    filterPredicates = {},
    applyCreate,
    applyUpdate,
    latencyMs = 450,
    idPrefix = "row",
  } = options;

  // Own mutable copy so the seed constant is never mutated.
  let store: T[] = seed.map((row) => ({ ...row }));

  const find = (id: ID): T | undefined => store.find((row) => getId(row) === id);

  return {
    async list(params: ListParams = {}): Promise<Paginated<T>> {
      await delay(latencyMs);
      const { page = 1, pageSize = 10, sort, search, filters } = params;

      let rows = [...store];

      // Search.
      const term = search?.trim().toLowerCase();
      if (term && searchFields.length > 0) {
        rows = rows.filter((row) =>
          searchFields.some((field) =>
            String((row as Row)[field as string] ?? "")
              .toLowerCase()
              .includes(term),
          ),
        );
      }

      // Filters.
      if (filters) {
        for (const [key, raw] of Object.entries(filters)) {
          if (raw === undefined || raw === null || raw === "") continue;
          const value = String(raw);
          const predicate =
            filterPredicates[key] ??
            ((row: T) => String((row as Row)[key] ?? "") === value);
          rows = rows.filter((row) => predicate(row, value));
        }
      }

      // Sort.
      if (sort) {
        const accessor =
          sortAccessors[sort.field] ??
          ((row: T) => (row as Row)[sort.field] as string | number);
        const dir = sort.direction === "desc" ? -1 : 1;
        rows = [...rows].sort(
          (a, b) => compare(accessor(a) ?? "", accessor(b) ?? "") * dir,
        );
      }

      const total = rows.length;
      const start = (page - 1) * pageSize;
      const items = rows.slice(start, start + pageSize);
      return paginate(items, { page, pageSize, total });
    },

    async get(id: ID): Promise<T> {
      await delay(latencyMs);
      const row = find(id);
      if (!row) {
        throw new ApiError({
          kind: "not-found",
          message: "The requested record could not be found.",
        });
      }
      return { ...row };
    },

    async create(input: TCreate): Promise<T> {
      await delay(latencyMs);
      const id: ID = `${idPrefix}_${(idCounter += 1)}`;
      const row = applyCreate
        ? applyCreate(input, id)
        : ({ ...(input as object), id } as T);
      store = [row, ...store];
      return { ...row };
    },

    async update(id: ID, input: TUpdate): Promise<T> {
      await delay(latencyMs);
      const existing = find(id);
      if (!existing) {
        throw new ApiError({
          kind: "not-found",
          message: "The record you tried to update no longer exists.",
        });
      }
      const next = applyUpdate
        ? applyUpdate(existing, input)
        : ({ ...existing, ...(input as object) } as T);
      store = store.map((row) => (getId(row) === id ? next : row));
      return { ...next };
    },

    async remove(id: ID): Promise<void> {
      await delay(latencyMs);
      store = store.filter((row) => getId(row) !== id);
    },
  };
}
