import { createStubService } from "../../crud";
import type { CreateMerchantInput, Merchant } from "./types";
import { MERCHANTS_SEED } from "./data";

/** Merchants data source (in-memory stub; repository-ready). */
export const merchantsService = createStubService<Merchant, CreateMerchantInput>({
  seed: MERCHANTS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "email", "contactName", "country"],
  idPrefix: "mch",
  applyCreate: (input, id) => ({
    id,
    name: input.name,
    email: input.email,
    contactName: input.contactName,
    category: input.category,
    country: input.country,
    properties: 0,
    commissionRate: input.commissionRate,
    revenue: 0,
    currency: "USD",
    status: "pending",
    joinedAt: new Date(Date.UTC(2026, 6, 22)).toISOString(),
  }),
});

export const merchantKeys = {
  all: ["merchants"] as const,
  list: () => ["merchants", "list"] as const,
  detail: (id: string) => ["merchants", "detail", id] as const,
};
