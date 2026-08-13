/**
 * Booking feature — the service layer between the customer UI and the domain.
 *
 *   UI  →  features/booking  →  features/dashboard/domain  →  persisted store
 *
 * Import from here, never from a file inside the folder.
 */

export {
  merchantForListing,
  productKindFor,
  toListingRef,
  toPropertyRef,
} from "./property";
export {
  bookingVertical,
  toInvoice,
  toPaymentTxns,
  toTravelerBooking,
  toTravelerStatus,
} from "./projection";
export { useDomainRevision, useDomainValue } from "./use-domain";
export {
  UNIFIED_STATUS_LABEL,
  UNIFIED_TYPE_LABEL,
  combineBookings,
  toUnifiedFromFlight,
  toUnifiedFromStay,
  toUnifiedFromTrip,
  toUnifiedStatus,
  type UnifiedBooking,
  type UnifiedBookingType,
  type UnifiedPaymentState,
  type UnifiedSource,
  type UnifiedStatus,
} from "./unified";
export {
  useUnifiedAdminBookings,
  useUnifiedCounts,
  useUnifiedCustomerBookings,
} from "./use-unified";
export {
  downloadICS,
  downloadText,
  downloadVoucher,
  printConfirmation,
  toICS,
  voucherText,
} from "./documents";
export {
  useCustomerBooking,
  useCustomerBookings,
  useCustomerDomainBookings,
  useCustomerEmail,
  useCustomerInbox,
  useCustomerInvoices,
  useCustomerPayments,
  useCustomerRefunds,
  useCustomerReviews,
  useCustomerTicket,
  useCustomerTickets,
  useLoyalty,
  useNotificationPreferences,
  useReviewInvitations,
  useUnreadCount,
  useWalletCoupons,
} from "./customer";
export {
  INSURANCE_OFFER,
  addOnsFor,
  quantityFor,
  scaleLabel,
  toBookingAddOn,
  type AddOnOffer,
  type AddOnScale,
} from "./add-ons";
export {
  HOLD_MINUTES,
  abandonHold,
  attemptPayment,
  confirmBooking,
  createHold,
  depositPlan,
  isRequestVertical,
  quoteCheckout,
  submitAuthentication,
  type CheckoutQuote,
  type CheckoutSelection,
  type ConfirmInput,
  type HoldResult,
  type PaymentRequest,
} from "./checkout-service";
