/**
 * Domain layer barrel — the business core of the platform.
 *
 * Import business logic from here, never from a module's internals:
 *
 *   import { bookingService, quoteRefund, BOOKING_STATUSES } from "@/features/dashboard/domain";
 *
 * Layers:
 *   types      — the normalized data model (User/Booking/Refund/Offer/…)
 *   lifecycle  — state machines, status registries, cancellation policies
 *   money      — commission, tax, discount, refund and settlement maths
 *   seed       — the deterministic demo dataset
 *   store      — the persisted mutable state (localStorage on the client)
 *   services   — the async API surface every UI calls
 */

export * from "./types";
export * from "./lifecycle";
export * from "./money";
export {
  B2B_ACCOUNTS,
  COMBOS_SEED,
  DEMO_B2B_ACCOUNT_ID,
  DEMO_MERCHANT_ID,
  DESTINATION_OPTIONS,
  MERCHANTS,
  OFFERS_SEED,
} from "./seed";
export { getRevision, getState, resetState, subscribe } from "./store";
export type { DomainState } from "./store";
export {
  SYSTEM_ACTOR,
  auditService,
  b2bService,
  bookingService,
  comboService,
  commissionService,
  notificationService,
  offerService,
  platformService,
  refundService,
  settlementService,
} from "./services";
export type {
  B2BAccountInput,
  ComboInput,
  CreateBookingInput,
  DomainScope,
  OfferInput,
} from "./services";
