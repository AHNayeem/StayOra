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

/** Bump when a shape changes so stale persisted state is discarded. */
const SCHEMA_VERSION = 2;
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
  /** Monotonic counter for generated ids/references. */
  sequence: number;
}

function freshState(): DomainState {
  // Structured-clone the seed so mutations never touch the frozen dataset.
  const bookings = structuredClone(BOOKINGS_SEED);
  // `buildExtras` re-points a spread of bookings at the demo traveller, so it
  // must run against the clone above — before anything else reads it.
  const extras = buildExtras(bookings);
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
