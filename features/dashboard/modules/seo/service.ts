import { createStubService } from "../../crud";
import { SEO_SEED } from "./data";
import type { SeoEntry } from "./types";
import type { SeoFormValues } from "./schemas";

/** Per-route SEO metadata data source (in-memory stub; repository-ready). */
export const seoService = createStubService<SeoEntry, SeoFormValues>({
  seed: SEO_SEED,
  getId: (row) => row.id,
  searchFields: ["path", "title", "description"],
  idPrefix: "seo",
  applyCreate: (input, id) => ({
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }),
});

export const seoKeys = {
  all: ["cms", "seo"] as const,
};
