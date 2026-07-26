import { createStubService } from "../../crud";
import { CACHE_SEED } from "./data";
import type { CacheStore, CacheSummary } from "./types";

/** Cache-stores data source (in-memory stub; repository-ready). */
export const cacheService = createStubService<CacheStore>({
  seed: CACHE_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "driver"],
  idPrefix: "cache",
});

export const cacheKeys = {
  all: ["system", "cache"] as const,
  summary: ["system", "cache", "summary"] as const,
};

/** Aggregate KPIs across every cache store — a seam a real backend can serve. */
export function getCacheSummary(): Promise<CacheSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = CACHE_SEED;
      const stores = rows.length;
      const hitSum = rows.reduce((acc, r) => acc + r.hitRate, 0);
      resolve({
        avgHitRate: stores ? Math.round((hitSum / stores) * 10) / 10 : 0,
        totalKeys: rows.reduce((acc, r) => acc + r.keys, 0),
        memoryMb: rows.reduce((acc, r) => acc + r.memoryMb, 0),
        stores,
      });
    }, 300);
  });
}

/** Flush a cache store — clears its keys and reclaims its memory. */
export async function flushCache(id: string): Promise<CacheStore> {
  return cacheService.update(id, { keys: 0, memoryMb: 0, evictions: 0 });
}
