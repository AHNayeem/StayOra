/**
 * The merchant domain — one authoritative model for every merchant surface.
 *
 * Before this file the platform carried two contradictory merchants: the
 * compact {@link MerchantRef} denormalized onto bookings (percentage commission)
 * and a separate `Merchant` row behind the admin screen (ratio commission, its
 * own ids, its own names). They are now one entity: {@link Merchant} lives here,
 * {@link toMerchantRef} projects the booking-time snapshot, and **commission is
 * a percentage everywhere** (`12` means 12%).
 *
 * Nothing here imports React, the store, or the seed — it is pure model + rules,
 * so the same code can run server-side once there is a backend. Persistence and
 * transitions live in `merchant-service.ts`.
 */

import { VERTICAL_LABELS, type BookingVertical } from "@/types/booking";
import type { CommissionBasis, MerchantRef, ProductKind } from "./types";

export { VERTICAL_LABELS };
export type { BookingVertical };

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * The merchant application/account lifecycle.
 *
 * `approved` is the only trading state: a merchant that is not approved cannot
 * publish catalogue, and `canTrade` is the single predicate that says so.
 */
export const MERCHANT_STATUS_VALUES = [
  "draft",
  "submitted",
  "under_review",
  "action_required",
  "approved",
  "rejected",
  "suspended",
] as const;

export type MerchantStatus = (typeof MERCHANT_STATUS_VALUES)[number];

export const MERCHANT_STATUS_LABELS: Record<MerchantStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  action_required: "Action required",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export const MERCHANT_STATUS_TONES: Record<MerchantStatus, StatusTone> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  action_required: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
};

/** Legal moves. A rejected merchant reapplies by going back to `draft`. */
export const MERCHANT_TRANSITIONS: Record<MerchantStatus, readonly MerchantStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "action_required", "approved", "rejected"],
  under_review: ["approved", "rejected", "action_required"],
  action_required: ["submitted"],
  approved: ["suspended"],
  rejected: ["draft"],
  suspended: ["approved", "rejected"],
};

export function canTransitionMerchant(from: MerchantStatus, to: MerchantStatus): boolean {
  return MERCHANT_TRANSITIONS[from].includes(to);
}

/** Only an approved merchant may sell. Everything downstream keys off this. */
export function canTrade(merchant: Pick<Merchant, "status">): boolean {
  return merchant.status === "approved";
}

// ---------------------------------------------------------------------------
// Documents & KYC
// ---------------------------------------------------------------------------

export const MERCHANT_DOCUMENT_TYPES = [
  "business_registration",
  "tax_certificate",
  "ownership_proof",
  "operating_licence",
  "identity_document",
  "bank_confirmation",
  "supporting",
] as const;

export type MerchantDocumentType = (typeof MERCHANT_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<MerchantDocumentType, string> = {
  business_registration: "Business registration certificate",
  tax_certificate: "Tax registration (VAT/GST)",
  ownership_proof: "Ownership / shareholding proof",
  operating_licence: "Operating licence",
  identity_document: "Authorised signatory ID",
  bank_confirmation: "Bank account confirmation letter",
  supporting: "Supporting document",
};

/** Document types an application cannot be submitted without. */
export const REQUIRED_DOCUMENT_TYPES: readonly MerchantDocumentType[] = [
  "business_registration",
  "tax_certificate",
  "identity_document",
];

export const DOCUMENT_STATUS_VALUES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
] as const;

export type MerchantDocumentStatus = (typeof DOCUMENT_STATUS_VALUES)[number];

export const DOCUMENT_STATUS_LABELS: Record<MerchantDocumentStatus, string> = {
  pending: "Awaiting review",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export const DOCUMENT_STATUS_TONES: Record<MerchantDocumentStatus, StatusTone> = {
  pending: "neutral",
  under_review: "info",
  approved: "success",
  rejected: "danger",
};

/**
 * An uploaded merchant document.
 *
 * `fileUrl` is a mock object-store path, never a real upload — the prototype
 * records the *metadata* a real S3/R2 + antivirus + OCR pipeline would produce
 * so the screens, statuses and re-upload flow are exercisable today.
 */
export interface MerchantDocument {
  id: string;
  merchantId: string;
  type: MerchantDocumentType;
  label: string;
  fileName: string;
  /** Mock storage path. A real build swaps this for a signed URL. */
  fileUrl: string;
  sizeKb: number;
  status: MerchantDocumentStatus;
  rejectionReason?: string;
  uploadedAt: string;
  verifiedAt?: string;
  reviewedBy?: string;
  /** Set when a rejected document has been replaced. */
  supersedesId?: string;
}

export const KYC_STATUS_VALUES = [
  "unsubmitted",
  "submitted",
  "under_review",
  "verified",
  "rejected",
] as const;

export type KycStatus = (typeof KYC_STATUS_VALUES)[number];

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  unsubmitted: "Not submitted",
  submitted: "Submitted",
  under_review: "Under review",
  verified: "Verified",
  rejected: "Rejected",
};

export const KYC_STATUS_TONES: Record<KycStatus, StatusTone> = {
  unsubmitted: "neutral",
  submitted: "info",
  under_review: "info",
  verified: "success",
  rejected: "danger",
};

/** A person with a material interest in the business. */
export interface BeneficialOwner {
  id: string;
  fullName: string;
  role: string;
  ownershipPercent: number;
  nationality: string;
  /** Masked in the UI; the prototype never stores a real number. */
  idNumberMasked: string;
}

/**
 * The compliance record.
 *
 * **No real verification happens.** An admin moves this by hand; there is no
 * Onfido/Sumsub call and nothing here should be read as a verified identity.
 */
export interface MerchantKyc {
  status: KycStatus;
  legalName: string;
  registrationNo: string;
  taxId: string;
  beneficialOwners: BeneficialOwner[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

// ---------------------------------------------------------------------------
// Commercial terms & payout
// ---------------------------------------------------------------------------

/**
 * The commercial agreement the merchant accepted.
 *
 * `commissionRate` here is the contracted rate in **percent** and is the source
 * of `Merchant.commissionRate`; the two can never disagree because the service
 * writes both from one input.
 */
export interface MerchantContract {
  version: string;
  /** Percent, e.g. `12` for 12%. */
  commissionRate: number;
  commissionBasis: CommissionBasis;
  /** Days after period close before a payout is released. */
  payoutTermDays: number;
  /** Notice period for terminating the agreement, days. */
  noticeDays: number;
  clauses: string[];
  acceptedAt?: string;
  acceptedBy?: string;
  /** Recorded for the audit trail, exactly as a real e-signature flow would. */
  acceptedIp?: string;
}

export const PAYOUT_METHODS = ["bank_transfer", "wire", "payoneer", "wise"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  bank_transfer: "Local bank transfer",
  wire: "International wire (SWIFT)",
  payoneer: "Payoneer",
  wise: "Wise",
};

export const PAYOUT_SCHEDULES = ["weekly", "biweekly", "monthly"] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

export const PAYOUT_SCHEDULE_LABELS: Record<PayoutSchedule, string> = {
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
};

export type BankStatus = "unverified" | "pending" | "verified" | "rejected";

export const BANK_STATUS_LABELS: Record<BankStatus, string> = {
  unverified: "Not verified",
  pending: "Verification pending",
  verified: "Verified",
  rejected: "Rejected",
};

/**
 * Where settlements are paid.
 *
 * **No banking verification happens.** The account number is stored masked and
 * `status` is moved by an admin — a real build routes this through a payout
 * provider's account-verification API.
 */
export interface MerchantBankAccount {
  accountHolder: string;
  bankName: string;
  /** Masked at entry — the prototype never keeps a full account number. */
  accountNumberMasked: string;
  branch?: string;
  iban?: string;
  swift?: string;
  country: string;
  currency: string;
  method: PayoutMethod;
  schedule: PayoutSchedule;
  status: BankStatus;
  addedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

// ---------------------------------------------------------------------------
// Staff & merchant-side RBAC
// ---------------------------------------------------------------------------

export const MERCHANT_ROLE_IDS = [
  "owner",
  "manager",
  "reservations",
  "front_desk",
  "revenue_manager",
  "finance",
] as const;

export type MerchantRoleId = (typeof MERCHANT_ROLE_IDS)[number];

/**
 * A capability inside a merchant account.
 *
 * Deliberately merchant-shaped rather than a copy of the platform's
 * `resource:action` catalogue: a merchant thinks in "can this person change a
 * rate", not "does this principal hold catalog:update".
 * {@link merchantRolePermissions} maps them onto platform permissions so a staff
 * principal is constrained by the *intersection* of the two systems — that is
 * what stops a front-desk user inheriting owner access.
 */
export const MERCHANT_CAPABILITIES = [
  "profile.view",
  "profile.manage",
  "onboarding.manage",
  "catalogue.view",
  "catalogue.manage",
  "catalogue.submit",
  "inventory.manage",
  "pricing.manage",
  "bookings.view",
  "bookings.manage",
  "guests.view",
  "finance.view",
  "payout.manage",
  "staff.manage",
  "promotions.manage",
  "advertising.manage",
  "subscription.manage",
  "reviews.respond",
  "disputes.respond",
  "channel.manage",
  "reports.view",
] as const;

export type MerchantCapability = (typeof MERCHANT_CAPABILITIES)[number];

export interface MerchantRole {
  id: MerchantRoleId;
  label: string;
  description: string;
  capabilities: readonly MerchantCapability[];
}

const ALL_CAPABILITIES = MERCHANT_CAPABILITIES;

/**
 * The merchant-side role book. Owner is the only role with everything; every
 * other role is an explicit, strictly smaller set.
 */
export const MERCHANT_ROLES: Record<MerchantRoleId, MerchantRole> = {
  owner: {
    id: "owner",
    label: "Owner",
    description: "Full control of the merchant account, including staff and payouts.",
    capabilities: ALL_CAPABILITIES,
  },
  manager: {
    id: "manager",
    label: "General Manager",
    description: "Runs the properties day to day. No payout or subscription control.",
    capabilities: [
      "profile.view",
      "profile.manage",
      "onboarding.manage",
      "catalogue.view",
      "catalogue.manage",
      "catalogue.submit",
      "inventory.manage",
      "pricing.manage",
      "bookings.view",
      "bookings.manage",
      "guests.view",
      "finance.view",
      "staff.manage",
      "promotions.manage",
      "advertising.manage",
      "reviews.respond",
      "disputes.respond",
      "channel.manage",
      "reports.view",
    ],
  },
  reservations: {
    id: "reservations",
    label: "Reservations",
    description: "Handles bookings, amendments and guest requests.",
    capabilities: [
      "profile.view",
      "catalogue.view",
      "inventory.manage",
      "bookings.view",
      "bookings.manage",
      "guests.view",
      "reports.view",
    ],
  },
  front_desk: {
    id: "front_desk",
    label: "Front Desk",
    description: "Check-in and arrivals only. Read-only everywhere else.",
    capabilities: ["profile.view", "catalogue.view", "bookings.view", "guests.view"],
  },
  revenue_manager: {
    id: "revenue_manager",
    label: "Revenue Manager",
    description: "Owns rates, availability and demand-side performance.",
    capabilities: [
      "profile.view",
      "catalogue.view",
      "catalogue.manage",
      "inventory.manage",
      "pricing.manage",
      "bookings.view",
      "finance.view",
      "promotions.manage",
      "advertising.manage",
      "channel.manage",
      "reports.view",
    ],
  },
  finance: {
    id: "finance",
    label: "Finance",
    description: "Settlements, statements and payout details.",
    capabilities: [
      "profile.view",
      "bookings.view",
      "finance.view",
      "payout.manage",
      "subscription.manage",
      "disputes.respond",
      "reports.view",
    ],
  },
};

export const MERCHANT_ROLE_LIST: MerchantRole[] = Object.values(MERCHANT_ROLES);

/**
 * The one place merchant-side access is decided.
 *
 * Components never compare role ids; they ask this (or the `useMerchantAccess`
 * hook that wraps it), so a capability can be re-assigned in exactly one edit.
 */
export function merchantRoleCan(
  role: MerchantRoleId | undefined,
  capability: MerchantCapability,
): boolean {
  if (!role) return false;
  return MERCHANT_ROLES[role]?.capabilities.includes(capability) ?? false;
}

/**
 * Platform permissions a merchant staff role may exercise.
 *
 * A merchant principal's grants are the *intersection* of the `merchant`
 * platform role and this list, so promoting someone to Front Desk can never
 * widen their platform access beyond what a merchant has in the first place.
 */
export function merchantRolePermissions(role: MerchantRoleId): string[] {
  const caps = MERCHANT_ROLES[role].capabilities;
  const has = (c: MerchantCapability) => caps.includes(c);
  const out = new Set<string>(["dashboard:read", "profile:*", "notifications:read"]);

  if (has("catalogue.view")) out.add("catalog:read");
  if (has("catalogue.manage")) {
    out.add("catalog:create");
    out.add("catalog:update");
  }
  if (has("inventory.manage") || has("pricing.manage")) out.add("catalog:update");
  if (has("bookings.view")) out.add("bookings:read");
  if (has("bookings.manage")) out.add("bookings:update");
  if (has("guests.view")) out.add("customers:read");
  if (has("finance.view")) {
    out.add("finance:read");
    out.add("finance:export");
  }
  if (has("promotions.manage")) {
    out.add("promotions:read");
    out.add("promotions:create");
    out.add("promotions:update");
    out.add("promotions:delete");
  }
  if (has("advertising.manage")) out.add("promotions:read");
  if (has("reviews.respond")) {
    out.add("reviews:read");
    out.add("reviews:update");
  }
  if (has("reports.view")) {
    out.add("reports:read");
    out.add("reports:export");
    out.add("analytics:read");
  }
  if (has("disputes.respond")) {
    out.add("support:read");
    out.add("support:create");
  }
  return [...out];
}

export type StaffStatus = "invited" | "active" | "suspended";

export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
};

export interface MerchantStaff {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  role: MerchantRoleId;
  /** Properties this member is scoped to. Empty = every property. */
  propertyIds: string[];
  status: StaffStatus;
  invitedAt: string;
  acceptedAt?: string;
  lastActiveAt?: string;
}

// ---------------------------------------------------------------------------
// Properties (multi-property merchants)
// ---------------------------------------------------------------------------

export type PropertyStatus = "draft" | "active" | "inactive";

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  active: "Active",
  inactive: "Inactive",
};

/**
 * A supply entity under a merchant.
 *
 * Merchant-level data (legal entity, contract, payout) and property-level data
 * (address, inventory, channel connection) are deliberately separate: a hotel
 * group signs one contract and operates many properties, and a PMS connection
 * is always per property.
 */
export interface MerchantProperty {
  id: string;
  merchantId: string;
  name: string;
  vertical: BookingVertical;
  city: string;
  country: string;
  addressLine: string;
  status: PropertyStatus;
  /** Rooms/units/seats — the capacity headline, not live inventory. */
  units: number;
  /** Catalogue listing ids operated by this property. */
  listingIds: string[];
  createdAt: string;
  channel: ChannelConnection;
}

// ---------------------------------------------------------------------------
// Channel manager / PMS
// ---------------------------------------------------------------------------

export const CHANNEL_PROVIDERS = [
  "none",
  "siteminder",
  "cloudbeds",
  "channex",
  "custom_api",
] as const;

export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number];

export const CHANNEL_PROVIDER_LABELS: Record<ChannelProvider, string> = {
  none: "No provider",
  siteminder: "SiteMinder",
  cloudbeds: "Cloudbeds",
  channex: "Channex",
  custom_api: "Custom API / PMS",
};

export const CHANNEL_STATUS_VALUES = [
  "not_connected",
  "connected",
  "syncing",
  "error",
] as const;

export type ChannelStatus = (typeof CHANNEL_STATUS_VALUES)[number];

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  not_connected: "Not connected",
  connected: "Connected",
  syncing: "Syncing",
  error: "Error",
};

export const CHANNEL_STATUS_TONES: Record<ChannelStatus, StatusTone> = {
  not_connected: "neutral",
  connected: "success",
  syncing: "info",
  error: "danger",
};

/** What a connection is allowed to push/pull. Mirrors real channel scopes. */
export const CHANNEL_SCOPES = ["inventory", "rates", "availability", "reservations"] as const;
export type ChannelScope = (typeof CHANNEL_SCOPES)[number];

export const CHANNEL_SCOPE_LABELS: Record<ChannelScope, string> = {
  inventory: "Inventory",
  rates: "Rates",
  availability: "Availability",
  reservations: "Reservations",
};

/**
 * A property's link to an external PMS / channel manager.
 *
 * **Architectural placeholder only.** Nothing here calls an external system;
 * `status` is set locally so the surfaces, states and error copy exist for when
 * a real integration lands behind the same shape.
 */
export interface ChannelConnection {
  provider: ChannelProvider;
  status: ChannelStatus;
  /** Property code in the provider's system. */
  externalRef?: string;
  scopes: ChannelScope[];
  lastSyncAt?: string;
  /** Human explanation shown when `status` is `error`. */
  message?: string;
}

export const DISCONNECTED_CHANNEL: ChannelConnection = {
  provider: "none",
  status: "not_connected",
  scopes: [],
};

// ---------------------------------------------------------------------------
// Subscription plans
// ---------------------------------------------------------------------------

export type MerchantPlanId = "basic" | "professional" | "premium";

export type MerchantBillingCycle = "monthly" | "annual";

/**
 * Hard ceilings a plan imposes. `Infinity` is not used — `-1` means unlimited,
 * so the object survives `JSON.stringify` into `localStorage` intact.
 */
export interface MerchantPlanLimits {
  properties: number;
  listings: number;
  staff: number;
  activeCampaigns: number;
  /** Days after period close before a payout is released. */
  payoutTermDays: number;
}

export const UNLIMITED = -1;

export interface MerchantPlan {
  id: MerchantPlanId;
  name: string;
  description: string;
  /** USD per billing cycle. `0` for the entry plan. */
  price: number;
  billingCycle: MerchantBillingCycle;
  features: string[];
  limits: MerchantPlanLimits;
  /** Capabilities this plan unlocks; checked by {@link planAllows}. */
  unlocks: MerchantPlanFeature[];
}

/** Gated capabilities — the only things a plan may switch on or off. */
export const MERCHANT_PLAN_FEATURES = [
  "channel_manager",
  "advanced_analytics",
  "self_serve_advertising",
  "promoted_placement",
  "priority_support",
  "api_access",
] as const;

export type MerchantPlanFeature = (typeof MERCHANT_PLAN_FEATURES)[number];

export const PLAN_FEATURE_LABELS: Record<MerchantPlanFeature, string> = {
  channel_manager: "Channel manager / PMS connection",
  advanced_analytics: "Advanced performance analytics",
  self_serve_advertising: "Self-serve advertising",
  promoted_placement: "Promoted placement eligibility",
  priority_support: "Priority partner support",
  api_access: "Partner API access",
};

/**
 * The plan book. A plan changes **capabilities and limits only** — it never
 * changes commission, so a merchant's economics can't quietly move when they
 * upgrade.
 */
export const MERCHANT_PLANS: Record<MerchantPlanId, MerchantPlan> = {
  basic: {
    id: "basic",
    name: "Basic",
    description: "Get listed and take bookings. Everything a single property needs.",
    price: 0,
    billingCycle: "monthly",
    features: [
      "1 property, up to 5 listings",
      "2 staff accounts",
      "Standard 30-day payout terms",
      "Booking, review and settlement screens",
    ],
    limits: { properties: 1, listings: 5, staff: 2, activeCampaigns: 0, payoutTermDays: 30 },
    unlocks: [],
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "For growing groups that need reach, rate control and faster money.",
    price: 79,
    billingCycle: "monthly",
    features: [
      "Up to 5 properties and 40 listings",
      "10 staff accounts",
      "Self-serve advertising (up to 3 live campaigns)",
      "Channel manager connection",
      "14-day payout terms",
    ],
    limits: { properties: 5, listings: 40, staff: 10, activeCampaigns: 3, payoutTermDays: 14 },
    unlocks: ["channel_manager", "self_serve_advertising", "advanced_analytics"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    description: "Unlimited supply, promoted placement and priority partner support.",
    price: 249,
    billingCycle: "monthly",
    features: [
      "Unlimited properties, listings and staff",
      "Unlimited advertising campaigns + promoted placement",
      "Partner API access",
      "Priority partner support",
      "7-day payout terms",
    ],
    limits: {
      properties: UNLIMITED,
      listings: UNLIMITED,
      staff: UNLIMITED,
      activeCampaigns: UNLIMITED,
      payoutTermDays: 7,
    },
    unlocks: [
      "channel_manager",
      "self_serve_advertising",
      "advanced_analytics",
      "promoted_placement",
      "priority_support",
      "api_access",
    ],
  },
};

export const MERCHANT_PLAN_LIST: MerchantPlan[] = [
  MERCHANT_PLANS.basic,
  MERCHANT_PLANS.professional,
  MERCHANT_PLANS.premium,
];

export type MerchantSubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled";

export const SUBSCRIPTION_STATUS_LABELS: Record<MerchantSubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  cancelled: "Cancelled",
};

/** Mock billing only — no charge is ever attempted. */
export interface MerchantSubscription {
  planId: MerchantPlanId;
  status: MerchantSubscriptionStatus;
  billingCycle: MerchantBillingCycle;
  /** What the merchant is billed per cycle, USD. */
  price: number;
  startedAt: string;
  renewsAt: string;
  autoRenew: boolean;
  cancelledAt?: string;
}

export function planFor(merchant: Pick<Merchant, "subscription">): MerchantPlan {
  return MERCHANT_PLANS[merchant.subscription.planId] ?? MERCHANT_PLANS.basic;
}

/** Is a plan-gated capability available to this merchant? */
export function planAllows(
  merchant: Pick<Merchant, "subscription">,
  feature: MerchantPlanFeature,
): boolean {
  if (merchant.subscription.status === "cancelled") {
    return MERCHANT_PLANS.basic.unlocks.includes(feature);
  }
  return planFor(merchant).unlocks.includes(feature);
}

/** `true` when `used` is still inside the plan's ceiling (`-1` = unlimited). */
export function withinLimit(limit: number, used: number): boolean {
  return limit === UNLIMITED || used < limit;
}

export function limitLabel(limit: number): string {
  return limit === UNLIMITED ? "Unlimited" : String(limit);
}

// ---------------------------------------------------------------------------
// Performance / health
// ---------------------------------------------------------------------------

/**
 * Merchant health, all of it **derived** from bookings, reviews and profile
 * completeness — never stored, so it can't disagree with the ledger. Figures
 * are demo data: they are only as precise as the seeded dataset.
 */
export interface MerchantPerformance {
  currency: string;
  bookings: number;
  cancelledBookings: number;
  grossBookingValue: number;
  netEarnings: number;
  averageOrderValue: number;
  /** Cancelled ÷ total, percent. */
  cancellationRate: number;
  /** Share of reviews the merchant replied to, percent. */
  responseRate: number;
  reviewScore: number;
  reviewCount: number;
  /** Profile/catalogue completeness, percent. */
  listingCompleteness: number;
  /** 0–100 composite. Presentation only — see `HEALTH_WEIGHTS`. */
  healthScore: number;
  tier: "excellent" | "good" | "needs_attention" | "at_risk";
}

/** How the composite health score is put together. Documented, not magic. */
export const HEALTH_WEIGHTS = {
  reviewScore: 0.35,
  cancellationRate: 0.25,
  responseRate: 0.2,
  listingCompleteness: 0.2,
} as const;

export function healthTier(score: number): MerchantPerformance["tier"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "needs_attention";
  return "at_risk";
}

export const HEALTH_TIER_LABELS: Record<MerchantPerformance["tier"], string> = {
  excellent: "Excellent",
  good: "Good",
  needs_attention: "Needs attention",
  at_risk: "At risk",
};

export const HEALTH_TIER_TONES: Record<MerchantPerformance["tier"], StatusTone> = {
  excellent: "success",
  good: "success",
  needs_attention: "warning",
  at_risk: "danger",
};

// ---------------------------------------------------------------------------
// The merchant
// ---------------------------------------------------------------------------

export type BusinessType =
  | "sole_trader"
  | "private_limited"
  | "public_limited"
  | "partnership"
  | "non_profit";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  sole_trader: "Sole trader",
  private_limited: "Private limited company",
  public_limited: "Public limited company",
  partnership: "Partnership",
  non_profit: "Non-profit",
};

/**
 * The canonical merchant. Every merchant-facing surface — bookings, commission,
 * settlement, payout, catalogue, analytics, promotions, advertising, the admin
 * screen and the merchant dashboard — reads this one record.
 */
export interface Merchant {
  id: string;
  /** Trading name shown to customers and on bookings. */
  name: string;
  slug: string;
  status: MerchantStatus;

  // --- business profile ---------------------------------------------------
  legalName: string;
  businessType: BusinessType;
  registrationNo: string;
  taxId: string;
  foundedYear?: number;
  website?: string;
  description: string;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;

  // --- contact ------------------------------------------------------------
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  supportEmail?: string;
  supportPhone?: string;

  // --- commercials --------------------------------------------------------
  /** Negotiated commission in **percent** (`12` = 12%). Mirrors the contract. */
  commissionRate: number;
  commissionBasis: CommissionBasis;
  currency: string;
  /** Products this merchant may supply — drives catalogue and listing routing. */
  verticals: BookingVertical[];

  // --- compliance & money -------------------------------------------------
  kyc: MerchantKyc;
  documents: MerchantDocument[];
  contract: MerchantContract;
  bank?: MerchantBankAccount;
  subscription: MerchantSubscription;

  // --- organization -------------------------------------------------------
  staff: MerchantStaff[];
  properties: MerchantProperty[];

  // --- lifecycle timestamps ----------------------------------------------
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Why the application was rejected or sent back. */
  reviewNote?: string;
  approvedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
}

/**
 * The booking-time snapshot stored on a `Booking`.
 *
 * A booking must keep the merchant name and commission rate it was taken under,
 * so this is a genuine denormalization rather than a second model — and it is
 * the *only* way a `MerchantRef` is ever produced.
 */
export function toMerchantRef(merchant: Merchant): MerchantRef {
  return {
    id: merchant.id,
    name: merchant.name,
    commissionRate: merchant.commissionRate,
  };
}

/** Merchants that may supply a given vertical, in seed order. */
export function merchantsForVertical(
  merchants: Merchant[],
  vertical: BookingVertical,
): Merchant[] {
  return merchants.filter((m) => m.verticals.includes(vertical));
}

/** A merchant's product kinds, for commission and catalogue routing. */
export function productKindsFor(merchant: Merchant): ProductKind[] {
  return merchant.verticals;
}

// ---------------------------------------------------------------------------
// Onboarding checklist
// ---------------------------------------------------------------------------

export const ONBOARDING_STEP_IDS = [
  "business_profile",
  "contact_details",
  "documents",
  "kyc",
  "contract",
  "bank_details",
  "first_property",
  "catalogue_submitted",
  "catalogue_approved",
  "published",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type ChecklistState = "complete" | "in_progress" | "pending" | "blocked" | "rejected";

export const CHECKLIST_STATE_TONES: Record<ChecklistState, StatusTone> = {
  complete: "success",
  in_progress: "info",
  pending: "neutral",
  blocked: "neutral",
  rejected: "danger",
};

export interface ChecklistItem {
  id: OnboardingStepId;
  label: string;
  description: string;
  state: ChecklistState;
  /** Route that completes this step. */
  href: string;
  /** Set when `state` is `blocked` — what has to happen first. */
  blockedBy?: string;
  /** Set when `state` is `rejected` — what the reviewer said. */
  reason?: string;
  /** Steps the merchant cannot submit without. */
  required: boolean;
}

/** Catalogue facts the checklist needs but the merchant record doesn't hold. */
export interface CatalogueProgress {
  submitted: number;
  approved: number;
  published: number;
  rejected: number;
}

const EMPTY_CATALOGUE: CatalogueProgress = {
  submitted: 0,
  approved: 0,
  published: 0,
  rejected: 0,
};

function docState(merchant: Merchant): ChecklistState {
  const required = REQUIRED_DOCUMENT_TYPES.map((type) =>
    merchant.documents.filter((d) => d.type === type),
  );
  if (required.some((docs) => docs.some((d) => d.status === "rejected"))) return "rejected";
  if (required.every((docs) => docs.some((d) => d.status === "approved"))) return "complete";
  if (required.every((docs) => docs.length > 0)) return "in_progress";
  if (merchant.documents.length > 0) return "in_progress";
  return "pending";
}

function kycState(merchant: Merchant): ChecklistState {
  switch (merchant.kyc.status) {
    case "verified":
      return "complete";
    case "rejected":
      return "rejected";
    case "submitted":
    case "under_review":
      return "in_progress";
    default:
      return merchant.kyc.beneficialOwners.length > 0 ? "in_progress" : "pending";
  }
}

function profileComplete(merchant: Merchant): boolean {
  return Boolean(
    merchant.legalName &&
      merchant.registrationNo &&
      merchant.taxId &&
      merchant.addressLine &&
      merchant.city &&
      merchant.country &&
      merchant.description.trim().length >= 40 &&
      merchant.verticals.length > 0,
  );
}

function contactComplete(merchant: Merchant): boolean {
  return Boolean(merchant.contactName && merchant.email && merchant.phone);
}

/**
 * The one onboarding state machine.
 *
 * The same array drives the merchant's checklist UI, the completion percentage,
 * the "next action" prompt *and* {@link canSubmitApplication} — there is no
 * second copy of these rules anywhere in the app.
 */
export function onboardingChecklist(
  merchant: Merchant,
  catalogue: CatalogueProgress = EMPTY_CATALOGUE,
): ChecklistItem[] {
  const approved = merchant.status === "approved";
  const profileOk = profileComplete(merchant);
  const contactOk = contactComplete(merchant);
  const documents = docState(merchant);
  const kyc = kycState(merchant);
  const contractOk = Boolean(merchant.contract.acceptedAt);
  const bank = merchant.bank;
  const bankState: ChecklistState = !bank
    ? "pending"
    : bank.status === "verified"
      ? "complete"
      : bank.status === "rejected"
        ? "rejected"
        : "in_progress";

  return [
    {
      id: "business_profile",
      label: "Business profile",
      description: "Legal entity, registration, tax ID, address and what you sell.",
      state: profileOk ? "complete" : "pending",
      href: "/dashboard/onboarding?step=business",
      required: true,
    },
    {
      id: "contact_details",
      label: "Contact details",
      description: "Who we contact about bookings, compliance and payouts.",
      state: contactOk ? "complete" : "pending",
      href: "/dashboard/onboarding?step=contact",
      required: true,
    },
    {
      id: "documents",
      label: "Business documents",
      description: `Upload ${REQUIRED_DOCUMENT_TYPES.length} required documents.`,
      state: documents,
      href: "/dashboard/onboarding?step=documents",
      reason:
        documents === "rejected"
          ? merchant.documents.find((d) => d.status === "rejected")?.rejectionReason
          : undefined,
      required: true,
    },
    {
      id: "kyc",
      label: "Verification (KYC)",
      description: "Declare beneficial owners and submit for compliance review.",
      state: kyc,
      href: "/dashboard/onboarding?step=kyc",
      reason: kyc === "rejected" ? merchant.kyc.rejectionReason : undefined,
      required: true,
    },
    {
      id: "contract",
      label: "Commercial terms",
      description: `Accept the partner agreement at ${merchant.contract.commissionRate}% commission.`,
      state: contractOk ? "complete" : "pending",
      href: "/dashboard/onboarding?step=contract",
      required: true,
    },
    {
      id: "bank_details",
      label: "Payout details",
      description: "Where settlements are paid, and how often.",
      state: bankState,
      href: "/dashboard/onboarding?step=bank",
      reason: bankState === "rejected" ? bank?.rejectionReason : undefined,
      required: true,
    },
    {
      id: "first_property",
      label: "First property",
      description: "Add the property or supply entity you will sell from.",
      state: merchant.properties.length > 0 ? "complete" : "pending",
      href: "/dashboard/merchant/properties",
      required: false,
    },
    {
      id: "catalogue_submitted",
      label: "Submit catalogue",
      description: "Create a listing and send it for review.",
      state: !approved
        ? "blocked"
        : catalogue.submitted + catalogue.approved + catalogue.published > 0
          ? "complete"
          : "pending",
      blockedBy: approved ? undefined : "Your account has to be approved first.",
      href: "/dashboard/catalog/approvals",
      required: false,
    },
    {
      id: "catalogue_approved",
      label: "Catalogue approved",
      description: "The platform reviews each listing before it can go live.",
      state: !approved
        ? "blocked"
        : catalogue.rejected > 0 && catalogue.approved + catalogue.published === 0
          ? "rejected"
          : catalogue.approved + catalogue.published > 0
            ? "complete"
            : "pending",
      blockedBy: approved ? undefined : "Your account has to be approved first.",
      href: "/dashboard/catalog/approvals",
      required: false,
    },
    {
      id: "published",
      label: "Live on Otithee",
      description: "Approved listings are published and bookable.",
      state: catalogue.published > 0 ? "complete" : approved ? "pending" : "blocked",
      blockedBy: approved ? undefined : "Your account has to be approved first.",
      href: "/dashboard/catalog/approvals",
      required: false,
    },
  ];
}

export interface OnboardingProgress {
  items: ChecklistItem[];
  completed: number;
  total: number;
  /** 0–100. */
  percent: number;
  /** Required steps that are not yet complete. */
  pending: ChecklistItem[];
  /** Steps that cannot start yet, and why. */
  blocked: ChecklistItem[];
  /** Steps a reviewer sent back. */
  rejected: ChecklistItem[];
  /** The single thing the merchant should do next, if anything. */
  nextAction: ChecklistItem | null;
  /** Every required step is complete — the application can be submitted. */
  readyToSubmit: boolean;
}

export function onboardingProgress(
  merchant: Merchant,
  catalogue: CatalogueProgress = EMPTY_CATALOGUE,
): OnboardingProgress {
  const items = onboardingChecklist(merchant, catalogue);
  const completed = items.filter((i) => i.state === "complete").length;
  const rejected = items.filter((i) => i.state === "rejected");
  const pending = items.filter((i) => i.state !== "complete" && i.state !== "blocked");
  const blocked = items.filter((i) => i.state === "blocked");
  const requiredOutstanding = items.filter((i) => i.required && i.state !== "complete");

  return {
    items,
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
    pending,
    blocked,
    rejected,
    // A sent-back step always outranks the next unstarted one.
    nextAction: rejected[0] ?? requiredOutstanding[0] ?? pending[0] ?? null,
    readyToSubmit: requiredOutstanding.length === 0,
  };
}

export interface SubmissionCheck {
  ok: boolean;
  /** Human reasons the application cannot be submitted yet. */
  problems: string[];
}

/**
 * Can this application be submitted for review?
 *
 * Validation lives here rather than on the submit button, so the service
 * enforces the same rule the form displays — a disabled button is never the
 * only thing standing between a merchant and an invalid submission.
 */
export function canSubmitApplication(
  merchant: Merchant,
  catalogue: CatalogueProgress = EMPTY_CATALOGUE,
): SubmissionCheck {
  const problems: string[] = [];
  if (merchant.status !== "draft" && merchant.status !== "action_required") {
    problems.push(
      `This application is ${MERCHANT_STATUS_LABELS[merchant.status].toLowerCase()} and cannot be submitted again.`,
    );
  }
  for (const item of onboardingChecklist(merchant, catalogue)) {
    if (!item.required || item.state === "complete") continue;
    problems.push(
      item.state === "rejected"
        ? `${item.label}: ${item.reason ?? "needs to be corrected"}.`
        : `${item.label} is incomplete.`,
    );
  }
  return { ok: problems.length === 0, problems };
}

/** Why a merchant may not publish catalogue yet, if they may not. */
export function publishBlockers(merchant: Merchant): string[] {
  const problems: string[] = [];
  if (merchant.status !== "approved") {
    problems.push(
      merchant.status === "suspended"
        ? "This merchant account is suspended."
        : "The merchant account has not been approved yet.",
    );
  }
  if (merchant.kyc.status !== "verified") problems.push("KYC verification is not complete.");
  if (!merchant.contract.acceptedAt) problems.push("The partner agreement has not been accepted.");
  if (merchant.bank?.status !== "verified") problems.push("Payout details are not verified.");
  return problems;
}
