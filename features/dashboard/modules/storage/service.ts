import { createStubService } from "../../crud";
import { STORAGE_SEED } from "./data";
import type { StorageBucket, StorageSummary } from "./types";

/** Storage-buckets data source (in-memory stub; repository-ready). */
export const storageService = createStubService<StorageBucket>({
  seed: STORAGE_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "driver", "region"],
  idPrefix: "store",
});

export const storageKeys = {
  all: ["system", "storage"] as const,
  summary: ["system", "storage", "summary"] as const,
};

/** Aggregate usage across every bucket — a seam a real backend can serve. */
export function getStorageSummary(): Promise<StorageSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = STORAGE_SEED;
      resolve({
        usedBytes: rows.reduce((acc, r) => acc + r.usedBytes, 0),
        capacityBytes: rows.reduce((acc, r) => acc + r.capacityBytes, 0),
        files: rows.reduce((acc, r) => acc + r.files, 0),
        buckets: rows.length,
      });
    }, 300);
  });
}
