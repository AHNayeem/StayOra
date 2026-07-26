import type { StatusDef } from "../../lib/status";

export const CACHE_STATUS_VALUES = ["healthy", "degraded"] as const;
export type CacheStatus = (typeof CACHE_STATUS_VALUES)[number];

/** A cache store and its live utilisation. */
export interface CacheStore {
  id: string;
  name: string;
  driver: string;
  hitRate: number;
  keys: number;
  memoryMb: number;
  evictions: number;
  status: CacheStatus;
}

export interface CacheSummary {
  avgHitRate: number;
  totalKeys: number;
  memoryMb: number;
  stores: number;
}

export const CACHE_STATUSES: readonly StatusDef<CacheStatus>[] = [
  { value: "healthy", label: "Healthy", tone: "success" },
  { value: "degraded", label: "Degraded", tone: "warning" },
];
