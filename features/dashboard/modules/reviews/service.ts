import { createStubService } from "../../crud";
import type { Review } from "./types";
import { REVIEWS_SEED } from "./data";

/** Reviews data source (in-memory stub; repository-ready). */
export const reviewsService = createStubService<Review>({
  seed: REVIEWS_SEED,
  getId: (row) => row.id,
  searchFields: ["guest", "property", "title", "comment"],
  idPrefix: "rev",
});

export const reviewKeys = {
  all: ["reviews"] as const,
};
