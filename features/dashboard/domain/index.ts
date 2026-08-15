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
 *   commission-rules    — the configurable commission book
 *   revenue             — the platform revenue ledger (all sources)
 *   insurance           — demo insurance plans, policies and their margin
 *   membership          — paid membership plans, subscriptions and benefits
 *   advertising         — advertisers, campaigns, placements and ad revenue
 *   revenue-management  — occupancy/ADR/RevPAR, pricing rules, recommendations
 *   inventory  — room types, rate plans, availability, holds
 *   payments   — the mock gateway (authorize / 3DS / retry / capture)
 *   engagement — loyalty points, wallet coupons, referrals
 *   support    — the ticket store shared by customer and admin
 *   reviews    — verified-stay reviews and moderation
 *   messaging  — mock email/SMS/push/WhatsApp delivery
 *   telemetry  — analytics + error seams (PostHog/Sentry shaped)
 *   seed       — the deterministic demo dataset
 *   store      — the persisted mutable state (localStorage on the client)
 *   services   — the async API surface every UI calls
 */

export * from "./types";
export * from "./merchants";
export * from "./catalogue";
export * from "./disputes";
export * from "./payouts";
export * from "./lifecycle";
export * from "./money";
export * from "./commission-rules";
export * from "./revenue";
export * from "./insurance";
export * from "./membership";
export * from "./advertising";
export * from "./revenue-management";
export * from "./inventory";
export * from "./payments";
export * from "./engagement";
export * from "./support";
export * from "./reviews";
export * from "./telemetry";
export * from "./amendments";
export {
  CATEGORY_LABELS as MESSAGE_CATEGORY_LABELS,
  CHANNELS as MESSAGE_CHANNELS,
  CHANNEL_LABELS,
  MESSAGE_TEMPLATES,
  findTemplate,
  messagingService,
} from "./messaging";
export type {
  DeliveryStatus,
  MessageCategory,
  MessageChannel,
  MessageTemplate,
  NotificationPreferences,
  OutboundMessage,
  SendInput,
} from "./messaging";
export { DEMO_CUSTOMER, DEMO_CUSTOMER_PHONE } from "./seed-extra";
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
  getMerchant,
  merchantRef,
  merchantService,
  tradingMerchants,
} from "./merchant-service";
export type {
  BankDetailsInput,
  MerchantProfileInput,
  PropertyInput,
  RegisterMerchantInput,
  StaffInput,
  UploadDocumentInput,
} from "./merchant-service";
export {
  AD_RATE_CARD,
  ASSUMED_CTR,
  MERCHANT_PLACEMENTS,
  advertiserForMerchant,
  campaignsForMerchant,
  estimateSpend,
  merchantAdvertisingService,
} from "./merchant-advertising";
export type { MerchantCampaignInput, SpendEstimate } from "./merchant-advertising";
export { disputeService } from "./dispute-service";
export { payoutService } from "./payout-service";
export {
  allCatalogueItems,
  catalogueForMerchant,
  catalogueService,
  filterLive,
  getCatalogueItem,
  isListingLive,
} from "./catalogue-service";
export {
  SYSTEM_ACTOR,
  advertisingService,
  auditService,
  b2bService,
  bookingService,
  comboService,
  commissionRuleService,
  commissionService,
  insuranceAdminService,
  membershipAdminService,
  notificationService,
  offerService,
  platformService,
  refundService,
  revenueManagementService,
  revenueService,
  settlementService,
} from "./services";
export type {
  B2BAccountInput,
  ComboInput,
  CreateBookingInput,
  DomainScope,
  OfferInput,
} from "./services";
