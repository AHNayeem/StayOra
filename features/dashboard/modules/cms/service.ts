import { createStubService } from "../../crud";
import type { CmsPage } from "./types";
import type { CmsPageFormValues } from "./schemas";
import { CMS_PAGES_SEED } from "./data";

/** CMS pages data source (in-memory stub; repository-ready). */
export const cmsService = createStubService<CmsPage, CmsPageFormValues>({
  seed: CMS_PAGES_SEED,
  getId: (row) => row.id,
  searchFields: ["title", "slug", "type"],
  idPrefix: "cms",
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

export const cmsKeys = {
  all: ["cms", "pages"] as const,
};
