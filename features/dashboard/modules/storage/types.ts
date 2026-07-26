import type { StatusDef } from "../../lib/status";

export const STORAGE_STATUS_VALUES = ["healthy", "filling", "full"] as const;
export type StorageStatus = (typeof STORAGE_STATUS_VALUES)[number];

/** A storage bucket / disk and its capacity utilisation. */
export interface StorageBucket {
  id: string;
  name: string;
  driver: string;
  region: string;
  usedBytes: number;
  capacityBytes: number;
  files: number;
  status: StorageStatus;
}

export interface StorageSummary {
  usedBytes: number;
  capacityBytes: number;
  files: number;
  buckets: number;
}

export const STORAGE_STATUSES: readonly StatusDef<StorageStatus>[] = [
  { value: "healthy", label: "Healthy", tone: "success" },
  { value: "filling", label: "Filling up", tone: "warning" },
  { value: "full", label: "Near full", tone: "danger" },
];

/** Human-readable byte size (binary units). */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(value >= 100 || exp === 0 ? 0 : 1)} ${units[exp]}`;
}
