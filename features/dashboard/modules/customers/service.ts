import { createStubService } from "../../crud";
import type { Customer } from "./types";
import type { CustomerFormValues } from "./schemas";
import { CUSTOMERS_SEED } from "./data";

/** Customers data source (in-memory stub; repository-ready). */
export const customersService = createStubService<Customer, CustomerFormValues>({
  seed: CUSTOMERS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "email", "country"],
  idPrefix: "cus",
  applyCreate: (input, id) => ({
    ...input,
    id,
    bookings: 0,
    totalSpent: 0,
    currency: "USD",
    joinedAt: new Date().toISOString(),
  }),
  applyUpdate: (existing, input) => ({ ...existing, ...input }),
});

export const customerKeys = {
  all: ["customers"] as const,
  detail: (id: string) => ["customers", "detail", id] as const,
};
