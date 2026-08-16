/**
 * Platform configuration — the one place the prototype's economics, branding
 * and operational switches are decided.
 *
 * Before this file the Settings screen implied control over commission, tax and
 * service fees while those numbers were frozen constants in `money.ts`; the
 * maintenance screen toggled a switch nothing enforced. Now every one of those
 * values is stored, validated and read at call time:
 *
 *   money.ts        → `pricingConfig()` for tax, fee, default commission, the
 *                     cancellation admin share and per-product commission
 *   fx.ts           → base currency, spread and how long a locked rate holds
 *   maintenance     → the guard in `app/(marketing)/layout` and the dashboard
 *   messaging.ts    → whether simulated delivery progresses, and its failure rate
 *
 * ## Why this is not in the domain store
 * `money.ts` reads the config, and the domain store's seed *calls* `money.ts`.
 * Routing configuration through the store would make that a module cycle with a
 * top-level read on the wrong side of it. The config therefore owns a small
 * persisted store of its own (same localStorage discipline, same SSR-safe
 * hydration). Audit entries for configuration changes are written one layer up,
 * in `platform-settings-service.ts`, which may safely import both.
 */

import type { ProductKind } from "./types";

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

export interface GeneralConfig {
  platformName: string;
  supportEmail: string;
  /** The currency every stored amount is denominated in. */
  baseCurrency: string;
  /** Default display language for a first-time visitor. */
  defaultLanguage: string;
  timezone: string;
}

export interface EconomicsConfig {
  /** Tax applied to the net sale, as a fraction (0.075 = 7.5%). */
  taxRate: number;
  /** Platform service fee charged to the customer, as a fraction. */
  platformFeeRate: number;
  /** Fallback commission when a merchant has no negotiated rate, percent. */
  defaultCommissionRate: number;
  /** The platform's administration share of a cancellation fee, as a fraction. */
  cancellationAdminShare: number;
  /** Commission rates per product kind, percent. */
  commissionByProduct: Record<ProductKind, number>;
}

export interface FxConfig {
  /** Spread the platform adds to the mid-market rate, percent. */
  spreadPercent: number;
  /** How long a quoted rate is held before it must be re-quoted. */
  lockMinutes: number;
}

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  /** Keep the dashboard reachable while the storefront is down. */
  allowDashboard: boolean;
  /** ISO time the window is expected to end; shown to visitors. */
  endsAt?: string;
  startedAt?: string;
}

export interface DeliveryConfig {
  /**
   * Progress queued → sent → delivered over simulated time instead of marking
   * everything delivered instantly. Always simulated — nothing leaves the browser.
   */
  simulate: boolean;
  /** Share of simulated sends that fail, percent. */
  failureRatePercent: number;
  /** Simulated seconds between queue and send, and between send and delivery. */
  stepSeconds: number;
}

export interface IntegrationsConfig {
  /**
   * Provider switches. These describe what a *deployment* would connect; in the
   * prototype they only gate which mock adapter is used, and the UI says so.
   */
  payments: boolean;
  email: boolean;
  sms: boolean;
  analytics: boolean;
  webhookUrl: string;
}

export interface PlatformConfig {
  general: GeneralConfig;
  economics: EconomicsConfig;
  fx: FxConfig;
  maintenance: MaintenanceConfig;
  delivery: DeliveryConfig;
  integrations: IntegrationsConfig;
}

// ---------------------------------------------------------------------------
// Defaults — the values the prototype ships with
// ---------------------------------------------------------------------------

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  general: {
    platformName: "Otithee",
    supportEmail: "support@otithee.app",
    baseCurrency: "USD",
    defaultLanguage: "en",
    timezone: "UTC",
  },
  economics: {
    taxRate: 0.075,
    platformFeeRate: 0.02,
    defaultCommissionRate: 12,
    cancellationAdminShare: 0.2,
    commissionByProduct: {
      hotels: 12,
      apartments: 14,
      resorts: 13,
      "shared-rooms": 10,
      "convention-hall": 9,
      flights: 5,
      transport: 15,
      tours: 18,
      activities: 18,
      visa: 8,
      combo: 15,
    },
  },
  fx: {
    spreadPercent: 1.5,
    lockMinutes: 30,
  },
  maintenance: {
    enabled: false,
    message:
      "We're carrying out scheduled maintenance and will be back shortly. Thanks for your patience.",
    allowDashboard: true,
  },
  delivery: {
    simulate: true,
    failureRatePercent: 4,
    stepSeconds: 20,
  },
  integrations: {
    payments: true,
    email: true,
    sms: false,
    analytics: true,
    webhookUrl: "https://api.otithee.app/webhooks/events",
  },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const STORAGE_KEY = "otithee:platform-config:v1";
const EVENT = "otithee:platform-config-change";

/** Deep-partial, so a caller may patch one section — or one field — at a time. */
export type PlatformConfigPatch = {
  [K in keyof PlatformConfig]?: Partial<PlatformConfig[K]>;
};

let current: PlatformConfig | null = null;
let hydrated = false;
/** Bumped on every change; the stable snapshot for `useSyncExternalStore`. */
let revision = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function merge(base: PlatformConfig, patch: PlatformConfigPatch): PlatformConfig {
  const next = { ...base };
  for (const key of Object.keys(patch) as (keyof PlatformConfig)[]) {
    const section = patch[key];
    if (!section) continue;
    // Section-wise spread: a caller may patch one field without restating the rest.
    Object.assign(next, { [key]: { ...base[key], ...section } });
  }
  return next;
}

function hydrate(): PlatformConfig {
  if (!isBrowser()) return DEFAULT_PLATFORM_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_CONFIG;
    const parsed = JSON.parse(raw) as PlatformConfigPatch;
    return merge(DEFAULT_PLATFORM_CONFIG, parsed);
  } catch {
    return DEFAULT_PLATFORM_CONFIG;
  }
}

/** The active configuration. Reads the seed defaults on the server. */
export function platformConfig(): PlatformConfig {
  if (!current || (!hydrated && isBrowser())) {
    current = hydrate();
    hydrated = isBrowser();
  }
  return current;
}

/** Monotonic revision — the snapshot React subscribers compare. */
export function configRevision(): number {
  return revision;
}

export function subscribeConfig(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function commit(next: PlatformConfig): PlatformConfig {
  current = next;
  hydrated = true;
  revision += 1;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota or private mode — the change still applies for this session */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return next;
}

/** Apply a patch and persist it. Returns the resulting configuration. */
export function updatePlatformConfig(patch: PlatformConfigPatch): PlatformConfig {
  return commit(merge(platformConfig(), patch));
}

/** Restore the shipped defaults. */
export function resetPlatformConfig(): PlatformConfig {
  return commit(structuredClone(DEFAULT_PLATFORM_CONFIG));
}

// ---------------------------------------------------------------------------
// Read helpers used by the domain
// ---------------------------------------------------------------------------

/**
 * The pricing view of the configuration, in the shape `money.ts` has always
 * used. Call this per calculation — never destructure it at module load, or a
 * settings change won't be picked up.
 */
export function pricingConfig() {
  const { general, economics } = platformConfig();
  return {
    currency: general.baseCurrency,
    taxRate: economics.taxRate,
    platformFeeRate: economics.platformFeeRate,
    defaultCommissionRate: economics.defaultCommissionRate,
    cancellationAdminShare: economics.cancellationAdminShare,
    commissionByProduct: economics.commissionByProduct,
  };
}

/** Is the public storefront currently in maintenance? */
export function isMaintenanceActive(): boolean {
  return platformConfig().maintenance.enabled;
}

// ---------------------------------------------------------------------------
// Validation — shared by the settings form and any future API adapter
// ---------------------------------------------------------------------------

export interface ConfigProblem {
  field: string;
  message: string;
}

const pct = (value: number, field: string, max: number): ConfigProblem | null =>
  Number.isFinite(value) && value >= 0 && value <= max
    ? null
    : { field, message: `Must be between 0 and ${max}.` };

/** Validate an economics patch before it is stored. */
export function validateEconomics(input: Partial<EconomicsConfig>): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  if (input.taxRate !== undefined) {
    const p = pct(input.taxRate, "taxRate", 0.5);
    if (p) problems.push(p);
  }
  if (input.platformFeeRate !== undefined) {
    const p = pct(input.platformFeeRate, "platformFeeRate", 0.25);
    if (p) problems.push(p);
  }
  if (input.cancellationAdminShare !== undefined) {
    const p = pct(input.cancellationAdminShare, "cancellationAdminShare", 1);
    if (p) problems.push(p);
  }
  if (input.defaultCommissionRate !== undefined) {
    const p = pct(input.defaultCommissionRate, "defaultCommissionRate", 60);
    if (p) problems.push(p);
  }
  for (const [kind, rate] of Object.entries(input.commissionByProduct ?? {})) {
    const p = pct(rate as number, `commissionByProduct.${kind}`, 60);
    if (p) problems.push(p);
  }
  return problems;
}
