import { createStubService } from "../../crud";
import type { Promotion } from "./types";
import { PROMOTIONS_SEED } from "./data";

/** Promotions data source (in-memory stub; repository-ready). */
export const promotionsService = createStubService<Promotion>({
  seed: PROMOTIONS_SEED,
  getId: (row) => row.id,
  searchFields: ["code", "name", "type"],
  idPrefix: "promo",
});

export const promotionKeys = {
  all: ["promotions"] as const,
};
