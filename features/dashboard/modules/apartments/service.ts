import { createStubService } from "../../crud";
import type { Apartment } from "./types";
import type { ApartmentFormValues } from "./schemas";
import { APARTMENTS_SEED } from "./data";

/** Apartments catalog data source (in-memory stub; repository-ready). */
export const apartmentsService = createStubService<Apartment, ApartmentFormValues>({
  seed: APARTMENTS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "city", "country"],
  idPrefix: "apt",
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

export const apartmentKeys = {
  all: ["catalog", "apartments"] as const,
  detail: (id: string) => ["catalog", "apartments", "detail", id] as const,
};
