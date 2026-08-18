/**
 * The destination repository — the single source of truth for destination data.
 *
 *   UI  →  service.ts  →  DestinationRepository  →  mock store (+ localStorage)
 *
 * Everything that reads or writes a destination goes through this interface: the
 * public index, the detail route, the home rails, the sitemap and the dashboard.
 * There is no second copy of the data and no component holds its own literals,
 * which is what makes "publish in the dashboard" show up on the public site.
 *
 * **Swapping in a backend.** Implement {@link DestinationRepository} against
 * HTTP and change the one line at the bottom of this file:
 *
 *   export const destinationRepository = createApiDestinationRepository();
 *
 * The async methods map 1:1 onto REST verbs. `peek` is the only method a network
 * repository cannot implement directly — it is a synchronous read the prototype
 * needs so a server render and the client's first paint agree (see
 * {@link peek} below); a real implementation returns its cache, or the callers
 * become server reads and it disappears.
 *
 * **Persistence.** Writes land in `localStorage` through the same
 * `crud/module-store` helpers the dashboard's other no-backend modules use, so
 * edits survive a reload and "Reset demo data" clears destinations along with
 * everything else. On the server there is no storage, so `peek` returns the
 * seed — which keeps SSR deterministic and means a destination created in the
 * browser is resolved on the client (see `features/destinations/hooks.ts`).
 */

import { ApiError } from "@/features/dashboard/data/errors";
import {
  readModuleState,
  registerModuleStore,
  writeModuleState,
} from "@/features/dashboard/crud/module-store";
import { DESTINATIONS_SEED } from "@/constants/destinations";
import type {
  Destination,
  DestinationInput,
  DestinationPatch,
} from "@/types/destination";
import { slugify, uniqueSlug } from "./slug";

/** Simulated latency, matching the rest of the service layer. */
const LATENCY = 300;

/** Fired on every local mutation so open views re-read the store. */
const CHANGE_EVENT = "otithee:destinations:change";

export interface DestinationRepository {
  /** Every destination, whatever its status. Filtering is the service's job. */
  list(): Promise<Destination[]>;
  getById(id: string): Promise<Destination | undefined>;
  getBySlug(slug: string): Promise<Destination | undefined>;
  create(input: DestinationInput): Promise<Destination>;
  /** Partial update; fields left out keep their current value. */
  update(id: string, patch: DestinationPatch): Promise<Destination>;
  remove(id: string): Promise<void>;
  /**
   * Synchronous snapshot of every destination.
   *
   * Server components and the first client paint must resolve a destination in
   * the same render pass — an async read would flash an empty page or, worse,
   * a 404 for a slug that exists.
   */
  peek(): Destination[];
  /**
   * The same rows as {@link peek} but as a *stable* array reference: its
   * identity changes only when something is written.
   *
   * `useSyncExternalStore` compares snapshots with `Object.is` and re-renders
   * forever if handed a fresh array each call, so React reads through this while
   * everything else uses `peek`.
   */
  snapshot(): Destination[];
  /**
   * The untouched seed — what the server rendered.
   *
   * Hydration must be given the server's value, not the browser's, or React
   * reconciles against markup that was produced without `localStorage`. The
   * store's real contents arrive in the effect immediately after.
   */
  seedSnapshot(): Destination[];
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
 * message on the offending field — a slug clash is something the editor fixes in
 * the form, not a generic failure banner.
 */
function invalid(message: string, field?: string): never {
  throw new ApiError({
    kind: "validation",
    message,
    fieldErrors: field ? { [field]: [message] } : undefined,
  });
}

function notFound(id: string): never {
  throw new ApiError({
    kind: "not-found",
    message: `Destination ${id} could not be found.`,
  });
}

/**
 * The prototype repository: the seed, plus whatever the editor has changed,
 * persisted per browser.
 */
export function createMockDestinationRepository(
  seed: Destination[] = DESTINATIONS_SEED,
): DestinationRepository {
  const storageKey = registerModuleStore("destinations");

  const pristine: Destination[] = seed.map((row) => ({ ...row }));
  let rows: Destination[] = pristine;
  let hydrated = false;

  /**
   * The live rows. The first browser read replaces the seed with whatever was
   * persisted; the server keeps the seed, so both renders are stable.
   */
  function all(): Destination[] {
    if (!hydrated && isBrowser()) {
      rows = readModuleState(storageKey, rows);
      hydrated = true;
    }
    return rows;
  }

  function commit(next: Destination[]): void {
    rows = next;
    writeModuleState(storageKey, next);
    if (isBrowser()) window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  /**
   * A fresh id that cannot collide with a persisted one.
   *
   * Generated from the highest `dst_*` already stored rather than a counter,
   * because a module-level counter resets on reload and would hand the next
   * create an id an earlier session already used.
   */
  function nextId(): string {
    const highest = all().reduce((max, row) => {
      const n = Number.parseInt(row.id.replace(/^\D+/, ""), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 1000);
    return `dst_${highest + 1}`;
  }

  function requireIndex(id: string): number {
    const index = all().findIndex((row) => row.id === id);
    if (index === -1) notFound(id);
    return index;
  }

  /**
   * Settle the slug for a write.
   *
   * A blank slug is derived from the name; a supplied slug is normalised so an
   * editor cannot type a URL the router would never match. Either way a clash
   * with *another* record is a conflict the caller has to resolve — the store
   * never re-points an existing URL at new content.
   */
  function resolveSlug(
    desired: string | undefined,
    name: string,
    currentId?: string,
  ): string {
    const taken = all().filter((row) => row.id !== currentId).map((row) => row.slug);
    const requested = desired?.trim();

    if (!requested) return uniqueSlug(name, taken);

    const normalised = slugify(requested);
    if (!normalised) invalid("Enter a slug using letters and numbers.", "slug");
    if (taken.includes(normalised)) {
      invalid(
        `The slug “${normalised}” is already used by another destination. Try “${uniqueSlug(
          normalised,
          taken,
        )}”.`,
        "slug",
      );
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
      const row: Destination = {
        ...input,
        id: nextId(),
        slug: resolveSlug(input.slug, input.name),
        createdAt: now,
        updatedAt: now,
      };
      commit([row, ...all()]);
      return delay({ ...row });
    },

    async update(id, patch) {
      const index = requireIndex(id);
      const existing = all()[index];
      const next: Destination = {
        ...existing,
        ...patch,
        // Unchanged fields are preserved, including the slug: `patch.slug`
        // absent means "leave the URL alone", not "regenerate it".
        slug:
          patch.slug === undefined
            ? existing.slug
            : resolveSlug(patch.slug, patch.name ?? existing.name, id),
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

    peek: () => all().map((row) => ({ ...row })),

    snapshot: () => all(),

    seedSnapshot: () => pristine,

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
 * else — to move destinations onto a real API.
 */
export const destinationRepository: DestinationRepository =
  createMockDestinationRepository();
