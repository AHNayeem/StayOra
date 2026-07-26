import { createStubService } from "../../crud";
import type { Activity } from "./types";
import type { ActivityFormValues } from "./schemas";
import { ACTIVITIES_SEED } from "./data";

/** Activities catalog data source (in-memory stub; repository-ready). */
export const activitiesService = createStubService<Activity, ActivityFormValues>({
  seed: ACTIVITIES_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "city", "country"],
  idPrefix: "act",
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

export const activityKeys = {
  all: ["catalog", "activities"] as const,
  detail: (id: string) => ["catalog", "activities", "detail", id] as const,
};
