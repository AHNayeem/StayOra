import { createStubService } from "../../crud";
import type { Promotion } from "./types";
import type { PromotionFormValues } from "./schemas";
import { PROMOTIONS_SEED } from "./data";

/** Promotions data source (in-memory stub; repository-ready). */
export const promotionsService = createStubService<Promotion, PromotionFormValues>({
  seed: PROMOTIONS_SEED,
  getId: (row) => row.id,
  searchFields: ["code", "name", "type"],
  idPrefix: "promo",
  applyCreate: (input, id) => ({ ...input, id, redemptions: 0 }),
});

export const promotionKeys = {
  all: ["promotions"] as const,
  detail: (id: string) => ["promotions", "detail", id] as const,
};
