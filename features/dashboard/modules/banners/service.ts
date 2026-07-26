import { createStubService } from "../../crud";
import type { Banner } from "./types";
import type { BannerFormValues } from "./schemas";
import { BANNERS_SEED } from "./data";

/** Banners data source (in-memory stub; repository-ready). */
export const bannersService = createStubService<Banner, BannerFormValues>({
  seed: BANNERS_SEED,
  getId: (row) => row.id,
  searchFields: ["title", "subtitle", "ctaLabel"],
  idPrefix: "banner",
  applyCreate: (input, id) => ({ ...input, id, impressions: 0, clicks: 0 }),
});

export const bannerKeys = {
  all: ["banners"] as const,
  detail: (id: string) => ["banners", "detail", id] as const,
};
