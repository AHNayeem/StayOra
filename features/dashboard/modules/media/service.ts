import { createStubService } from "../../crud";
import { MEDIA_SEED } from "./data";
import type { MediaAsset, MediaSummary } from "./types";
import type { MediaFormValues } from "./schemas";

/** Media assets data source (in-memory stub; repository-ready). */
export const mediaService = createStubService<MediaAsset, MediaFormValues>({
  seed: MEDIA_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "folder", "uploadedBy"],
  idPrefix: "media",
  applyCreate: (input, id) => ({
    id,
    name: input.name,
    type: input.type,
    folder: input.folder,
    url: `https://cdn.otithee.example/${input.folder}/${input.name}`,
    size: Math.round(input.sizeKb * 1024),
    dimensions: input.dimensions ?? "",
    uploadedBy: "You",
    uploadedAt: new Date().toISOString(),
  }),
});

export const mediaKeys = {
  all: ["cms", "media"] as const,
  summary: ["cms", "media", "summary"] as const,
};

/**
 * Library-wide KPIs. A dedicated seam function (not derived in the component)
 * so a real backend can serve pre-aggregated totals unchanged.
 */
export function getMediaSummary(): Promise<MediaSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = MEDIA_SEED;
      resolve({
        totalAssets: rows.length,
        images: rows.filter((r) => r.type === "image").length,
        storageUsed: rows.reduce((sum, r) => sum + r.size, 0),
        folders: new Set(rows.map((r) => r.folder)).size,
      });
    }, 300);
  });
}
