import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { SHARED_ROOM_STATUS_VALUES } from "./types";

/** Shared room form schema — serves both create and edit. */
export const sharedRoomSchema = z.object({
  name: requiredString,
  city: requiredString,
  country: requiredString,
  beds: z.coerce.number().int().min(0, "Can't be negative"),
  pricePerBed: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  status: z.enum(SHARED_ROOM_STATUS_VALUES),
});

export type SharedRoomFormValues = z.infer<typeof sharedRoomSchema>;
