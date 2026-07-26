/** Promotions module — coupons/offers (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { promotionSchema } from "./schemas";
export type { PromotionFormValues } from "./schemas";
export { promotionsService, promotionKeys } from "./service";
export { promotionColumns } from "./columns";
export {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
} from "./hooks";
export { PromotionsList } from "./list";
export { PromotionForm } from "./form";
