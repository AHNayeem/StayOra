/**
 * The merchant workspace — the screens a merchant runs their business from.
 *
 * Everything here is scoped to the signed-in principal's own merchant account
 * (see {@link useOwnMerchant}), so none of these views can reach another
 * merchant's data even by accident.
 */
export { MerchantStaffView } from "./staff-view";
export { MerchantPropertiesView } from "./properties-view";
export { MerchantSubscriptionView } from "./subscription-view";
export { MerchantPerformanceView } from "./performance-view";
export { MerchantAdvertisingView } from "./advertising-view";
export { MerchantCapabilityGuard } from "./capability-guard";
export { useOwnMerchant } from "./use-merchant";
export { NoMerchantAccount, WorkspaceSkeleton } from "./no-merchant";
