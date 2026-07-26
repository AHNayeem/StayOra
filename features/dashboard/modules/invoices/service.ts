import { createStubService } from "../../crud";
import type { Invoice } from "./types";
import { INVOICES_SEED } from "./data";

/** Invoices data source (in-memory stub; repository-ready). */
export const invoicesService = createStubService<Invoice>({
  seed: INVOICES_SEED,
  getId: (row) => row.id,
  searchFields: ["number", "merchant"],
  idPrefix: "inv",
});

export const invoiceKeys = {
  all: ["finance", "invoices"] as const,
};
