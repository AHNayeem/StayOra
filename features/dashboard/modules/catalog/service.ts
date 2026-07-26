import { createStubService } from "../../crud";
import type { Hotel } from "./types";
import type { HotelFormValues } from "./schemas";
import { HOTELS_SEED } from "./data";

/** Hotels catalog data source (in-memory stub; repository-ready). */
export const hotelsService = createStubService<Hotel, HotelFormValues>({
  seed: HOTELS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "city", "country"],
  idPrefix: "htl",
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

export const hotelKeys = {
  all: ["catalog", "hotels"] as const,
  detail: (id: string) => ["catalog", "hotels", "detail", id] as const,
};
