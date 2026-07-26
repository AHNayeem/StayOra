import { createStubService } from "../../crud";
import type { Category } from "./types";
import type { CategoryFormValues } from "./schemas";
import { CATEGORIES_SEED } from "./data";

/** Categories catalog data source (in-memory stub; repository-ready). */
export const categoriesService = createStubService<
  Category,
  CategoryFormValues
>({
  seed: CATEGORIES_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "slug"],
  idPrefix: "cat",
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

export const categoryKeys = {
  all: ["catalog", "categories"] as const,
  detail: (id: string) => ["catalog", "categories", "detail", id] as const,
};
