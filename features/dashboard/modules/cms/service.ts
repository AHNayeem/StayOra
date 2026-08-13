import { createStubService } from "../../crud";
import type { CmsPage } from "./types";
import type { CmsPageFormValues } from "./schemas";
import { CMS_PAGES_SEED } from "./data";

/** CMS pages data source (in-memory stub; repository-ready). */
export const cmsService = createStubService<CmsPage, CmsPageFormValues>({
  seed: CMS_PAGES_SEED,
  getId: (row) => row.id,
  searchFields: ["title", "slug", "type", "excerpt"],
  idPrefix: "cms",
  applyCreate: (input, id) => ({
    ...input,
    id,
    // Everything new starts as a draft regardless of what the form asked for —
    // the workflow, not the create form, is what puts a page live.
    status: "draft",
    version: 1,
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
  versions: (pageId: string) => ["cms", "versions", pageId] as const,
};
