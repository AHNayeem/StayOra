/**
 * Merchants module — the admin-facing merchant register and review console.
 *
 * The entity, its lifecycle and its rules live in the domain
 * (`@/features/dashboard/domain`); this module is presentation plus the query
 * bindings. Merchant-facing onboarding lives in `../merchant-onboarding`.
 */
export * from "./types";
export * from "./schemas";
export { merchantService, merchantKeys } from "./service";
export { merchantColumns } from "./columns";
export {
  useMerchants,
  useMerchant,
  useMerchantCatalogue,
  useMerchantPerformance,
  useOnboardingProgress,
  useRegisterMerchant,
  useUpdateMerchantProfile,
  useSetMerchantStatus,
  useSetCommission,
  useUploadDocument,
  useRemoveDocument,
  useReviewDocument,
  useSubmitKyc,
  useDecideKyc,
  useAcceptContract,
  useSaveBankDetails,
  useDecideBank,
  useSubmitApplication,
  useAddStaff,
  useUpdateStaff,
  useRemoveStaff,
  useAddProperty,
  useUpdateProperty,
  useRemoveProperty,
  useConnectChannel,
  useDisconnectChannel,
  useCompleteChannelSync,
  useChangePlan,
  useCancelSubscription,
} from "./hooks";
export { MerchantsList } from "./list";
export { MerchantDetailView } from "./merchant-detail-view";
export { MerchantCreateForm, MerchantForm } from "./create-form";
export { OnboardingChecklist, ProgressBar } from "./onboarding-progress";
export { ReasonDialog, ConfirmActionDialog } from "./review-dialogs";
