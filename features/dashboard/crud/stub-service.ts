/**
 * Local CRUD engine — the reusable data source for modules with no domain
 * backing (no backend yet).
 *
 * `createStubService` turns a seed array into a full {@link ResourceService}:
 * list (with search / filters / sort / pagination), get, create, update and
 * remove, all behind a simulated network latency so loading and error states are
 * exercisable. The service signature matches a real repository, so each module
 * swaps `createStubService(...)` → `createResourceRepository(...)` later without
 * touching its hooks, columns or pages.
 *
 * **Persistence.** Writes are mirrored to `localStorage` under
 * `otithee:module:v1:<key>`, mirroring what the domain store does for booking
 * data. Before this, half the dashboard forgot every edit on reload while the
 * other half remembered — same UI, different behaviour. Hydration is lazy and
 * client-only, so SSR still renders the deterministic seed.
 */
import { ApiError } from "../data/errors";
import type { ID, ListParams, Paginated } from "../data/types";
import { paginate } from "../data/types";
import { registerModuleStore, readModuleState, writeModuleState } from "./module-store";
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
  /**
   * localStorage namespace for this dataset. Defaults to `idPrefix`, which is
   * already unique per module; pass an explicit key when two modules share a
   * prefix. Pass `false` to keep the data in memory only (derived or
   * high-churn datasets that should reset with the session).
   */
  persistKey?: string | false;
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
 * Create a local service backing one resource. Rows are hydrated from
 * localStorage on first client access and written back after every mutation, so
 * creates/updates/deletes survive a reload exactly as domain-backed modules do.
 * On the server the seed is used unchanged, which keeps SSR deterministic.
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
    persistKey,
  } = options;

  const storageKey =
    persistKey === false ? null : registerModuleStore(persistKey ?? idPrefix);

  // Own mutable copy so the seed constant is never mutated.
  let store: T[] = seed.map((row) => ({ ...row }));
  let hydrated = false;

  /**
   * The live rows. The first client-side read replaces the seed with whatever
   * was persisted; the server keeps the seed, so both renders are stable.
   */
  function rows(): T[] {
    if (storageKey && !hydrated && typeof window !== "undefined") {
      store = readModuleState(storageKey, store);
      hydrated = true;
    }
    return store;
  }

  function commit(next: T[]): void {
    store = next;
    if (storageKey) writeModuleState(storageKey, next);
  }

  const find = (id: ID): T | undefined => rows().find((row) => getId(row) === id);

  return {
    async list(params: ListParams = {}): Promise<Paginated<T>> {
      await delay(latencyMs);
      const { page = 1, pageSize = 10, sort, search, filters } = params;

      let out = [...rows()];

      // Search.
      const term = search?.trim().toLowerCase();
      if (term && searchFields.length > 0) {
        out = out.filter((row) =>
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
          out = out.filter((row) => predicate(row, value));
        }
      }

      // Sort.
      if (sort) {
        const accessor =
          sortAccessors[sort.field] ??
          ((row: T) => (row as Row)[sort.field] as string | number);
        const dir = sort.direction === "desc" ? -1 : 1;
        out = [...out].sort(
          (a, b) => compare(accessor(a) ?? "", accessor(b) ?? "") * dir,
        );
      }

      const total = out.length;
      const start = (page - 1) * pageSize;
      const items = out.slice(start, start + pageSize);
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
      commit([row, ...rows()]);
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
      commit(rows().map((row) => (getId(row) === id ? next : row)));
      return { ...next };
    },

    async remove(id: ID): Promise<void> {
      await delay(latencyMs);
      commit(rows().filter((row) => getId(row) !== id));
    },

    peek(): T[] {
      return rows().map((row) => ({ ...row }));
    },
  };
}
