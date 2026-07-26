import type { StorageBucket, StorageStatus } from "./types";

const GB = 1024 ** 3;
const TB = 1024 ** 4;

type Seed = [
  name: string,
  driver: string,
  region: string,
  usedBytes: number,
  capacityBytes: number,
  files: number,
  status: StorageStatus,
];

const SEED: Seed[] = [
  ["property-media", "S3", "eu-west-1", 3.4 * TB, 5 * TB, 184200, "healthy"],
  ["user-uploads", "S3", "eu-west-1", 820 * GB, 1 * TB, 96400, "filling"],
  ["invoices-pdf", "S3", "us-east-1", 42 * GB, 500 * GB, 38100, "healthy"],
  ["backups", "S3 Glacier", "eu-west-1", 8.1 * TB, 10 * TB, 2400, "filling"],
  ["avatars", "GCS", "europe-west2", 12 * GB, 100 * GB, 21800, "healthy"],
  ["exports-temp", "Local", "primary", 188 * GB, 200 * GB, 5400, "full"],
];

export const STORAGE_SEED: StorageBucket[] = SEED.map(
  ([name, driver, region, usedBytes, capacityBytes, files, status], i) => ({
    id: `store_${400 + i}`,
    name,
    driver,
    region,
    usedBytes: Math.round(usedBytes),
    capacityBytes: Math.round(capacityBytes),
    files,
    status,
  }),
);
