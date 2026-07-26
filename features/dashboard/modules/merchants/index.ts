/** Merchants module — feature-first: types, schema, service, columns, hooks, UI. */
export * from "./types";
export { createMerchantSchema } from "./schemas";
export type { CreateMerchantValues } from "./schemas";
export { merchantsService, merchantKeys } from "./service";
export { getMerchantDetail } from "./detail";
export type {
  MerchantDetail,
  MerchantKyc,
  MerchantDocument,
  MerchantWallet,
  MerchantSettlement,
  MerchantAuditEntry,
  KycStatus,
  DocumentStatus,
  SettlementStatus,
} from "./detail";
export { merchantColumns } from "./columns";
export {
  useMerchants,
  useMerchant,
  useMerchantDetail,
  useCreateMerchant,
  useSetMerchantStatus,
  useUpdateMerchant,
  useDeleteMerchant,
} from "./hooks";
export { MerchantsList } from "./list";
export { MerchantDetailView } from "./merchant-detail-view";
export { MerchantCreateForm, MerchantForm } from "./create-form";
