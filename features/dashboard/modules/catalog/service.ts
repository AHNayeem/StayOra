import { createStubService } from "../../crud";
import type { Hotel } from "./types";
import { HOTELS_SEED } from "./data";

/** Hotels catalog data source (in-memory stub; repository-ready). */
export const hotelsService = createStubService<Hotel>({
  seed: HOTELS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "city", "country"],
  idPrefix: "htl",
});

export const hotelKeys = {
  all: ["catalog", "hotels"] as const,
  detail: (id: string) => ["catalog", "hotels", "detail", id] as const,
};
