import { createStubService } from "../../crud";
import type { Amenity } from "./types";
import type { AmenityFormValues } from "./schemas";
import { AMENITIES_SEED } from "./data";

/** Amenities catalog data source (in-memory stub; repository-ready). */
export const amenitiesService = createStubService<Amenity, AmenityFormValues>({
  seed: AMENITIES_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "category"],
  idPrefix: "amn",
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

export const amenityKeys = {
  all: ["catalog", "amenities"] as const,
  detail: (id: string) => ["catalog", "amenities", "detail", id] as const,
};
