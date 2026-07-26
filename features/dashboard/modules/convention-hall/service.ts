import { createStubService } from "../../crud";
import type { ConventionHall } from "./types";
import type { ConventionHallFormValues } from "./schemas";
import { CONVENTION_HALLS_SEED } from "./data";

/** Convention halls catalog data source (in-memory stub; repository-ready). */
export const conventionHallsService = createStubService<
  ConventionHall,
  ConventionHallFormValues
>({
  seed: CONVENTION_HALLS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "city", "country"],
  idPrefix: "cvh",
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

export const conventionHallKeys = {
  all: ["catalog", "convention-halls"] as const,
  detail: (id: string) => ["catalog", "convention-halls", "detail", id] as const,
};
