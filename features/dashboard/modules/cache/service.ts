/**
 * Cache stores — projected from what the platform would actually cache.
 *
 * The seeded numbers here were invented. Each store below is now a real
 * dataset: the number of keys is the number of entries that exist (catalogue
 * items, listing detail pages, inventory calendars, FX rates, search index
 * entries), so flushing one and watching the count return means something.
 *
 * What is *simulated* and labelled as such: hit rate and memory. A prototype
 * with no cache layer cannot measure a hit rate, so it is derived
 * deterministically from the key count and reset by a flush — believable
 * behaviour without claiming a Redis exists.
 */

import { ApiError } from "../../data/errors";
import type { ID, ListParams, Paginated } from "../../data/types";
import { paginate } from "../../data/types";
import type { ResourceService } from "../../crud";
import { readModuleState, writeModuleState } from "../../crud/module-store";
import { allCatalogueItems } from "../../domain/catalogue-service";
import { getState } from "../../domain/store";
import { fxRateBoard } from "../../domain/fx";
import type { CacheStore, CacheSummary } from "./types";

const STORAGE_KEY = "cache-flushes";

/** When each store was last flushed — the only state this module owns. */
type FlushLog = { id: string; at: string }[];

function flushes(): FlushLog {
  return readModuleState<{ id: string; at: string }>(STORAGE_KEY, []);
}

interface StoreSource {
  id: string;
  name: string;
  driver: string;
  /** How many entries this cache would hold right now. */
  keys: () => number;
  /** Average bytes per entry, for the memory estimate. */
  bytesPerKey: number;
}

const SOURCES: StoreSource[] = [
  {
    id: "cache_catalogue",
    name: "catalogue",
    driver: "Derived (in-memory)",
    keys: () => allCatalogueItems().length,
    bytesPerKey: 2_400,
  },
  {
    id: "cache_inventory",
    name: "inventory-calendar",
    driver: "Derived (in-memory)",
    keys: () => Object.keys(getState().inventoryConsumed).length,
    bytesPerKey: 96,
  },
  {
    id: "cache_fx",
    name: "fx-rates",
    driver: "Derived (in-memory)",
    keys: () => fxRateBoard().length,
    bytesPerKey: 160,
  },
  {
    id: "cache_bookings",
    name: "booking-read-model",
    driver: "Derived (in-memory)",
    keys: () => getState().bookings.length,
    bytesPerKey: 3_100,
  },
  {
    id: "cache_messages",
    name: "notification-templates",
    driver: "Derived (in-memory)",
    keys: () => getState().outbox.length,
    bytesPerKey: 640,
  },
];

/** Hours since a store was flushed — drives the simulated hit rate. */
function hoursSinceFlush(id: string, nowMs: number): number {
  const entry = flushes().find((f) => f.id === id);
  if (!entry) return 72;
  return (nowMs - new Date(entry.at).getTime()) / 3_600_000;
}

function toStore(source: StoreSource, nowMs = Date.now()): CacheStore {
  const keys = source.keys();
  // A cache warms up: right after a flush it misses, then settles in the 90s.
  const warmth = Math.min(1, hoursSinceFlush(source.id, nowMs) / 6);
  const hitRate = keys === 0 ? 0 : Math.round((55 + warmth * 40) * 10) / 10;
  return {
    id: source.id,
    name: source.name,
    driver: source.driver,
    hitRate,
    keys,
    memoryMb: Math.round(((keys * source.bytesPerKey) / 1_048_576) * 100) / 100,
    evictions: 0,
    status: hitRate < 70 ? "degraded" : "healthy",
  };
}

function rows(): CacheStore[] {
  return SOURCES.map((source) => toStore(source));
}

export const cacheService: ResourceService<CacheStore, never, Partial<CacheStore>> = {
  async list(params: ListParams = {}): Promise<Paginated<CacheStore>> {
    const { page = 1, pageSize = 10, search } = params;
    let out = rows();
    const term = search?.trim().toLowerCase();
    if (term) out = out.filter((row) => `${row.name} ${row.driver}`.toLowerCase().includes(term));
    const total = out.length;
    const start = (page - 1) * pageSize;
    return paginate(out.slice(start, start + pageSize), { page, pageSize, total });
  },

  async get(id: ID): Promise<CacheStore> {
    const row = rows().find((r) => r.id === id);
    if (!row) throw new ApiError({ kind: "not-found", message: "Unknown cache store." });
    return row;
  },

  async create(): Promise<CacheStore> {
    throw new ApiError({
      kind: "validation",
      message: "Cache stores are defined by the data they hold, not created by hand.",
    });
  },

  async update(id: ID): Promise<CacheStore> {
    return cacheService.get(id);
  },

  async remove(): Promise<void> {
    throw new ApiError({ kind: "validation", message: "Cache stores cannot be deleted." });
  },

  peek: rows,
};

export const cacheKeys = {
  all: ["system", "cache"] as const,
  summary: ["system", "cache", "summary"] as const,
};

export async function getCacheSummary(): Promise<CacheSummary> {
  const all = rows();
  const stores = all.length;
  const hitSum = all.reduce((acc, r) => acc + r.hitRate, 0);
  return {
    avgHitRate: stores ? Math.round((hitSum / stores) * 10) / 10 : 0,
    totalKeys: all.reduce((acc, r) => acc + r.keys, 0),
    memoryMb: Math.round(all.reduce((acc, r) => acc + r.memoryMb, 0) * 100) / 100,
    stores,
  };
}

/** Flush a store: the hit rate drops and climbs back as it warms up again. */
export async function flushCache(id: string): Promise<CacheStore> {
  const at = new Date().toISOString();
  const log = flushes().filter((f) => f.id !== id);
  writeModuleState(STORAGE_KEY, [...log, { id, at }]);
  return cacheService.get(id);
}
