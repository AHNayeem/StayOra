import { createStubService } from "../../crud";
import type { CmsPage } from "./types";
import { CMS_PAGES_SEED } from "./data";

/** CMS pages data source (in-memory stub; repository-ready). */
export const cmsService = createStubService<CmsPage>({
  seed: CMS_PAGES_SEED,
  getId: (row) => row.id,
  searchFields: ["title", "slug", "type"],
  idPrefix: "cms",
});

export const cmsKeys = {
  all: ["cms", "pages"] as const,
};
