/**
 * Storage buckets — projected from the files the platform actually references.
 *
 * There is no object store in the prototype, and this screen no longer implies
 * one: every bucket's *file count* is a real count of things that reference a
 * file — catalogue images, media library entries, merchant documents, generated
 * invoices — and the byte figures are those counts multiplied by a stated
 * average size. The distinction is on the screen, not just in this comment.
 */

import { ApiError } from "../../data/errors";
import type { ID, ListParams, Paginated } from "../../data/types";
import { paginate } from "../../data/types";
import type { ResourceService } from "../../crud";
import { allCatalogueItems } from "../../domain/catalogue-service";
import { getState } from "../../domain/store";
import { mediaService } from "../media/service";
import type { StorageBucket, StorageSummary } from "./types";

const MB = 1024 ** 2;
const GB = 1024 ** 3;

interface BucketSource {
  id: string;
  name: string;
  driver: string;
  region: string;
  files: () => number;
  /** Stated average file size — the byte totals below are files × this. */
  averageBytes: number;
  capacityBytes: number;
}

const SOURCES: BucketSource[] = [
  {
    id: "bkt_catalogue",
    name: "catalogue-images",
    driver: "Referenced URLs",
    region: "n/a (prototype)",
    files: () => allCatalogueItems().filter((item) => Boolean(item.image)).length,
    averageBytes: 420 * 1024,
    capacityBytes: 5 * GB,
  },
  {
    id: "bkt_media",
    name: "media-library",
    driver: "Referenced URLs",
    region: "n/a (prototype)",
    files: () => mediaService.peek?.().length ?? 0,
    averageBytes: 1.2 * MB,
    capacityBytes: 10 * GB,
  },
  {
    id: "bkt_documents",
    name: "merchant-documents",
    driver: "Referenced URLs",
    region: "n/a (prototype)",
    files: () =>
      getState().merchants.reduce((sum, merchant) => sum + merchant.documents.length, 0),
    averageBytes: 800 * 1024,
    capacityBytes: 2 * GB,
  },
  {
    id: "bkt_invoices",
    name: "invoices",
    driver: "Generated on demand",
    region: "n/a (prototype)",
    files: () => getState().bookings.filter((b) => Boolean(b.invoiceNumber)).length,
    averageBytes: 90 * 1024,
    capacityBytes: 1 * GB,
  },
];

function toBucket(source: BucketSource): StorageBucket {
  const files = source.files();
  const usedBytes = Math.round(files * source.averageBytes);
  const ratio = usedBytes / source.capacityBytes;
  return {
    id: source.id,
    name: source.name,
    driver: source.driver,
    region: source.region,
    usedBytes,
    capacityBytes: source.capacityBytes,
    files,
    status: ratio > 0.9 ? "full" : ratio > 0.7 ? "filling" : "healthy",
  };
}

function rows(): StorageBucket[] {
  return SOURCES.map(toBucket);
}

export const storageService: ResourceService<StorageBucket, never, Partial<StorageBucket>> = {
  async list(params: ListParams = {}): Promise<Paginated<StorageBucket>> {
    const { page = 1, pageSize = 10, search } = params;
    let out = rows();
    const term = search?.trim().toLowerCase();
    if (term) {
      out = out.filter((row) =>
        `${row.name} ${row.driver} ${row.region}`.toLowerCase().includes(term),
      );
    }
    const total = out.length;
    const start = (page - 1) * pageSize;
    return paginate(out.slice(start, start + pageSize), { page, pageSize, total });
  },

  async get(id: ID): Promise<StorageBucket> {
    const row = rows().find((r) => r.id === id);
    if (!row) throw new ApiError({ kind: "not-found", message: "Unknown bucket." });
    return row;
  },

  async create(): Promise<StorageBucket> {
    throw new ApiError({
      kind: "validation",
      message: "Buckets mirror the platform's own file references — there is nothing to create.",
    });
  },

  async update(id: ID): Promise<StorageBucket> {
    return storageService.get(id);
  },

  async remove(): Promise<void> {
    throw new ApiError({ kind: "validation", message: "Buckets cannot be deleted." });
  },

  peek: rows,
};

export const storageKeys = {
  all: ["system", "storage"] as const,
  summary: ["system", "storage", "summary"] as const,
};

export async function getStorageSummary(): Promise<StorageSummary> {
  const all = rows();
  return {
    usedBytes: all.reduce((acc, r) => acc + r.usedBytes, 0),
    capacityBytes: all.reduce((acc, r) => acc + r.capacityBytes, 0),
    files: all.reduce((acc, r) => acc + r.files, 0),
    buckets: all.length,
  };
}
