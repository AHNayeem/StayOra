/**
 * The domain store — one mutable, persisted copy of the platform dataset.
 *
 * Every domain service reads and writes through here, so a refund raised by a
 * customer is the same record the admin approves and the merchant sees deducted
 * from settlement. Mutations are persisted to `localStorage` (client only), so
 * demo state survives a reload exactly as the brief requires; on the server the
 * store falls back to the immutable seed, which keeps SSR deterministic.
 *
 * A real backend replaces this file with HTTP calls — the service signatures in
 * `services.ts` are already the API surface.
 */

import {
  AUDIT_LOG_SEED,
  B2B_ACCOUNTS,
  B2B_INVOICES_SEED,
  BOOKINGS_SEED,
  COMBOS_SEED,
  COMMISSIONS_SEED,
  NOTIFICATIONS_SEED,
  OFFERS_SEED,
  REFUNDS_SEED,
  SETTLEMENTS_SEED,
} from "./seed";
import { buildExtras } from "./seed-extra";
import type {
  AuditLogEntry,
  B2BAccount,
  B2BInvoice,
  B2BSubUser,
  Booking,
  ComboOffer,
  CommissionEntry,
  Offer,
  PlatformNotification,
  Refund,
  Settlement,
} from "./types";
import type { InventoryHold, InventoryOverride } from "./inventory";
import type { PaymentAttempt } from "./payments";
import type { LoyaltyEntry, Referral, WalletCoupon } from "./engagement";
import type { SupportTicket } from "./support";
import type { PlatformReview } from "./reviews";
import type { NotificationPreferences, OutboundMessage } from "./messaging";
import type { TelemetryEvent } from "./telemetry";
import type { CommissionRule } from "./commission-rules";
import type { CommissionChangeRequest } from "./commission-approvals";
import { seedCommissionChangeRequests } from "./seed-commission-approvals";
import type { RevenueEntry } from "./revenue";
import type { InsurancePlan, InsurancePolicy, InsuranceProvider } from "./insurance";
import type { MembershipPlan, MembershipSubscription } from "./membership";
import type { AdCampaign, Advertiser } from "./advertising";
import type { PricingRule } from "./revenue-management";
import type { Merchant } from "./merchants";
import type { CatalogueStatic, CatalogueWorkflow } from "./catalogue";
import type { Dispute } from "./disputes";
import type { JobState } from "./scheduler";
import type { RecoveryLead } from "./recovery";
import type { WaitlistEntry } from "./waitlist";
import type { SupplierConfirmation } from "./supplier";
import type { FinancePeriod } from "./finance-periods";
import { seedCampaigns, type MarketingCampaign } from "./campaigns";
import { buildDisputes } from "./seed-disputes";
import { MERCHANTS_SEED } from "./seed-merchants";
import { seedCatalogueDrafts, seedCatalogueWorkflow } from "./seed-catalogue";
import { buildMonetization } from "./seed-revenue";

/** Bump when a shape changes so stale persisted state is discarded. */
const SCHEMA_VERSION = 4;
const STORAGE_KEY = `otithee:domain:v${SCHEMA_VERSION}`;

export interface DomainState {
  bookings: Booking[];
  refunds: Refund[];
  commissions: CommissionEntry[];
  settlements: Settlement[];
  offers: Offer[];
  combos: ComboOffer[];
  b2bAccounts: B2BAccount[];
  b2bInvoices: B2BInvoice[];
  notifications: PlatformNotification[];
  auditLog: AuditLogEntry[];
  /** Revenue-manager edits to the generated availability baseline. */
  inventoryOverrides: InventoryOverride[];
  /** Units sold or held, keyed `${roomTypeId}|${YYYY-MM-DD}`. */
  inventoryConsumed: Record<string, number>;
  holds: InventoryHold[];
  paymentAttempts: PaymentAttempt[];
  loyalty: LoyaltyEntry[];
  walletCoupons: WalletCoupon[];
  referrals: Referral[];
  tickets: SupportTicket[];
  reviews: PlatformReview[];
  /** Every mock email/SMS/push/WhatsApp/in-app message ever "sent". */
  outbox: OutboundMessage[];
  notificationPreferences: Record<string, NotificationPreferences>;
  telemetry: TelemetryEvent[];

  // --- monetization -------------------------------------------------------
  /** Configurable commission rules; empty falls back to the product defaults. */
  commissionRules: CommissionRule[];
  /**
   * Requested changes to those rules. A rate only moves when one of these is
   * approved — see `commission-approvals.ts`.
   */
  commissionChangeRequests: CommissionChangeRequest[];
  /**
   * Revenue entries the platform *stores* — membership, advertising, B2B
   * subscriptions and adjustments. Commission, fees and insurance are derived
   * from bookings on read, never stored (see `revenue.ts`).
   */
  revenueEntries: RevenueEntry[];
  insuranceProviders: InsuranceProvider[];
  insurancePlans: InsurancePlan[];
  insurancePolicies: InsurancePolicy[];
  membershipPlans: MembershipPlan[];
  memberships: MembershipSubscription[];
  advertisers: Advertiser[];
  adCampaigns: AdCampaign[];
  /** Revenue-management automation rules. */
  pricingRules: PricingRule[];
  /** Named users who book under a B2B account. */
  b2bSubUsers: B2BSubUser[];

  // --- merchant ecosystem -------------------------------------------------
  /**
   * The one merchant table. Bookings carry a denormalized `MerchantRef`
   * snapshot; every *current* fact about a merchant lives here.
   */
  merchants: Merchant[];
  /**
   * Review state for catalogue items that ship with the prototype, keyed by
   * listing id. The products themselves stay in `constants/listings` — only
   * their workflow is stored, so the marketing catalogue is never duplicated.
   */
  catalogueWorkflow: Record<string, CatalogueWorkflow>;
  /** Products created in the dashboard, static half included. */
  catalogueDrafts: (CatalogueStatic & CatalogueWorkflow)[];
  /** Chargeback cases, keyed to real bookings and merchants. */
  disputes: Dispute[];

  // --- operations ---------------------------------------------------------
  /**
   * Scheduled-job state. Definitions live in `scheduler.ts`; only what moves —
   * status, next run and run history — is stored.
   */
  scheduledJobs: JobState[];
  /** Abandoned checkouts worth chasing (`recovery.ts`). */
  recoveryLeads: RecoveryLead[];
  /** Booking ids already invited to review, so nobody is asked twice. */
  reviewInvitations: string[];
  /** Travellers waiting for sold-out dates (`waitlist.ts`). */
  waitlist: WaitlistEntry[];
  /** Supplier acknowledgement per booking (`supplier.ts`). */
  supplierConfirmations: SupplierConfirmation[];
  /** Closed accounting periods and their frozen figures (`finance-periods.ts`). */
  financePeriods: FinancePeriod[];
  /** Marketing campaigns and their simulated sends (`campaigns.ts`). */
  marketingCampaigns: MarketingCampaign[];

  /** Monotonic counter for generated ids/references. */
  sequence: number;
}

function freshState(): DomainState {
  // Structured-clone the seed so mutations never touch the frozen dataset.
  const bookings = structuredClone(BOOKINGS_SEED);
  // `buildExtras` re-points a spread of bookings at the demo traveller, so it
  // must run against the clone above — before anything else reads it.
  const extras = buildExtras(bookings);
  // Monetization seeds read the (already re-pointed) bookings so insurance
  // policies and revenue attribution line up with real references.
  const monetization = buildMonetization(bookings);
  return {
    bookings,
    refunds: structuredClone(REFUNDS_SEED),
    commissions: structuredClone(COMMISSIONS_SEED),
    settlements: structuredClone(SETTLEMENTS_SEED),
    offers: structuredClone(OFFERS_SEED),
    combos: structuredClone(COMBOS_SEED),
    b2bAccounts: structuredClone(B2B_ACCOUNTS),
    b2bInvoices: structuredClone(B2B_INVOICES_SEED),
    notifications: structuredClone(NOTIFICATIONS_SEED),
    auditLog: structuredClone(AUDIT_LOG_SEED),
    inventoryOverrides: [],
    inventoryConsumed: {},
    holds: [],
    paymentAttempts: [],
    loyalty: extras.loyalty,
    walletCoupons: extras.walletCoupons,
    referrals: extras.referrals,
    tickets: extras.tickets,
    reviews: extras.reviews,
    outbox: extras.outbox,
    notificationPreferences: {},
    telemetry: [],
    commissionRules: monetization.commissionRules,
    commissionChangeRequests: seedCommissionChangeRequests(monetization.commissionRules),
    revenueEntries: monetization.revenueEntries,
    insuranceProviders: monetization.insuranceProviders,
    insurancePlans: monetization.insurancePlans,
    insurancePolicies: monetization.insurancePolicies,
    membershipPlans: monetization.membershipPlans,
    memberships: monetization.memberships,
    advertisers: monetization.advertisers,
    adCampaigns: monetization.adCampaigns,
    pricingRules: monetization.pricingRules,
    b2bSubUsers: monetization.b2bSubUsers,
    merchants: structuredClone(MERCHANTS_SEED),
    catalogueWorkflow: seedCatalogueWorkflow(),
    catalogueDrafts: seedCatalogueDrafts(),
    disputes: buildDisputes(bookings),
    scheduledJobs: [],
    recoveryLeads: [],
    reviewInvitations: [],
    waitlist: [],
    supplierConfirmations: [],
    financePeriods: [],
    marketingCampaigns: seedCampaigns(),
    sequence: 1,
  };
}

const EVENT = "otithee:domain:change";

let state: DomainState | null = null;
/** Server snapshot: a stable, never-mutated instance for SSR. */
let serverState: DomainState | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): DomainState {
  if (!isBrowser()) {
    serverState ??= freshState();
    return serverState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DomainState>;
      const base = freshState();
      // Merge per-collection so a partially-written payload can't blank the app.
      return {
        ...base,
        ...parsed,
        sequence: parsed.sequence ?? base.sequence,
      } as DomainState;
    }
  } catch {
    /* corrupt payload — fall back to the seed */
  }
  return freshState();
}

function persist(): void {
  if (!isBrowser() || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — demo state just won't survive the reload */
  }
}

/**
 * Monotonic revision, bumped on every mutation.
 *
 * The store mutates collections in place, so an array's identity does *not*
 * change when a row is added — a `useSyncExternalStore` bridge that snapshotted
 * the array would compare equal and skip the re-render. Subscribers therefore
 * snapshot this number and read the data through it.
 */
let revision = 0;

/** Read the current state (hydrating from storage on first client access). */
export function getState(): DomainState {
  state ??= load();
  return state;
}

/** Current store revision — the stable snapshot for external-store subscribers. */
export function getRevision(): number {
  return revision;
}

/** Notify subscribers (client only). */
function emit(): void {
  if (isBrowser()) window.dispatchEvent(new Event(EVENT));
}

/**
 * Apply a mutation, persist it and notify subscribers. `mutator` receives the
 * live state and may mutate it in place — the store is the only writer.
 */
export function mutate<T>(mutator: (draft: DomainState) => T): T {
  const draft = getState();
  const result = mutator(draft);
  revision += 1;
  persist();
  emit();
  return result;
}

/** Subscribe to store changes — used by `useSyncExternalStore` bridges. */
export function subscribe(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Reset every collection back to the seed (Settings → "Reset demo data"). */
export function resetState(): void {
  state = freshState();
  revision += 1;
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  emit();
}

/** Next value of the shared sequence — for generated ids and references. */
export function nextSequence(): number {
  const draft = getState();
  draft.sequence += 1;
  return draft.sequence;
}

/** Generate a prefixed id, e.g. `rfd_5142`. */
export function nextId(prefix: string): string {
  return `${prefix}_${9000 + nextSequence()}`;
}

/** Generate a human reference, e.g. `RFD-34012`. */
export function nextReference(prefix: string, base = 34_000): string {
  return `${prefix}-${base + nextSequence()}`;
}
