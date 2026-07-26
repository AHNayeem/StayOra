import type { CacheStore, CacheStatus } from "./types";

type Seed = [
  name: string,
  driver: string,
  hitRate: number,
  keys: number,
  memoryMb: number,
  evictions: number,
  status: CacheStatus,
];

const SEED: Seed[] = [
  ["Page cache", "Redis", 96.4, 18240, 512, 120, "healthy"],
  ["Search results", "Redis", 88.1, 42100, 1024, 940, "healthy"],
  ["Session store", "Redis", 99.2, 9800, 256, 12, "healthy"],
  ["API rate limits", "Redis", 94.7, 3200, 48, 0, "healthy"],
  ["Pricing quotes", "Memcached", 72.5, 15600, 384, 4200, "degraded"],
  ["Geo lookups", "Memcached", 91.0, 6400, 96, 60, "healthy"],
];

export const CACHE_SEED: CacheStore[] = SEED.map(
  ([name, driver, hitRate, keys, memoryMb, evictions, status], i) => ({
    id: `cache_${300 + i}`,
    name,
    driver,
    hitRate,
    keys,
    memoryMb,
    evictions,
    status,
  }),
);
