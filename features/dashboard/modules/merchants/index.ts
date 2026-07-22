/** Merchants module — feature-first: types, schema, service, columns, hooks, UI. */
export * from "./types";
export { createMerchantSchema } from "./schemas";
export type { CreateMerchantValues } from "./schemas";
export { merchantsService, merchantKeys } from "./service";
export { merchantColumns } from "./columns";
export {
  useMerchants,
  useMerchant,
  useCreateMerchant,
  useSetMerchantStatus,
} from "./hooks";
export { MerchantsList } from "./list";
export { MerchantCreateForm } from "./create-form";
