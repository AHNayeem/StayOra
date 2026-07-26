import { createStubService } from "../../crud";
import type { SharedRoom } from "./types";
import type { SharedRoomFormValues } from "./schemas";
import { SHARED_ROOMS_SEED } from "./data";

/** Shared rooms catalog data source (in-memory stub; repository-ready). */
export const sharedRoomsService = createStubService<SharedRoom, SharedRoomFormValues>({
  seed: SHARED_ROOMS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "city", "country"],
  idPrefix: "shr",
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

export const sharedRoomKeys = {
  all: ["catalog", "shared-rooms"] as const,
  detail: (id: string) => ["catalog", "shared-rooms", "detail", id] as const,
};
