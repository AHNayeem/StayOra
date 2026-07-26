import { createStubService } from "../../crud";
import type { Ticket } from "./types";
import { TICKETS_SEED } from "./data";

/** Support tickets data source (in-memory stub; repository-ready). */
export const ticketsService = createStubService<Ticket, Ticket, Partial<Ticket>>({
  seed: TICKETS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "subject", "requester"],
  idPrefix: "tkt",
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }),
});

export const ticketKeys = {
  all: ["support", "tickets"] as const,
};
