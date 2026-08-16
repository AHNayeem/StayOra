/**
 * The pricing repository — the seam between the engine and where data lives.
 *
 * Today "where data lives" is the domain store; tomorrow it is an HTTP call.
 * Every function here is a read or a write of records, never a calculation, so
 * the swap is mechanical: replace the bodies, keep the signatures. The engine
 * (`engine.ts`, `calculators.ts`) never imports the store, which is what makes
 * it testable and framework-free.
 *
 * ## Caching
 *
 * A rate calendar renders ninety cells and each one asks for the rule book, the
 * configuration and a resolved rate. Re-filtering and re-sorting the rule array
 * per cell is quadratic on a screen that redraws on every click. Both the rule
 * index and the resolved rates are therefore memoised against the store's
 * revision counter, which moves exactly when the answer could have changed.
 */

import { getRevision, getState, mutate, nextId } from "../store";
import type { InventoryOverride } from "../inventory";
import {
  DEFAULT_PRICING_CONFIG,
  seedPricingConfigs,
  seedPricingRules,
  seedRatePlans,
} from "./mock-data";
import { resolveDailyRate } from "./engine";
import { isValidISODate, orderRules } from "./rules";
import type {
  DailyRate,
  DailyRateContext,
  ManualPriceOverride,
  PricingConfiguration,
  PricingConfigurationInput,
  PricingRule,
  PricingRuleInput,
  PricingRuleStatus,
  RatePlan,
  RatePlanId,
  RatePlanInput,
} from "./types";
import { GLOBAL_PRICING_CONFIG_ID } from "./types";

export { seedPricingConfigs, seedPricingRules, seedRatePlans, DEFAULT_PRICING_CONFIG };

// ---------------------------------------------------------------------------
// Rule book
// ---------------------------------------------------------------------------

let ruleCache: { revision: number; rules: PricingRule[] } | null = null;

/** Every rule, newest-first by priority. Cached against the store revision. */
export function allPricingRules(): PricingRule[] {
  const revision = getRevision();
  if (ruleCache && ruleCache.revision === revision) return ruleCache.rules;
  const rules = orderRules(getState().pricingRuleBook ?? []);
  ruleCache = { revision, rules };
  return rules;
}

let activeCache: { revision: number; rules: PricingRule[] } | null = null;

/** The active rules only — what the engine is handed on every resolution. */
export function activePricingRules(): PricingRule[] {
  const revision = getRevision();
  if (activeCache && activeCache.revision === revision) return activeCache.rules;
  const rules = allPricingRules().filter((r) => r.status === "active");
  activeCache = { revision, rules };
  return rules;
}

export interface RuleQuery {
  type?: PricingRule["type"];
  status?: PricingRuleStatus;
  propertyId?: string;
  ratePlanId?: RatePlanId;
  /** Case-insensitive match against name, description and note. */
  search?: string;
  /** Include archived rules. Off by default. */
  includeArchived?: boolean;
}

/** Filtered rule list for the management screens. */
export function listPricingRules(query: RuleQuery = {}): PricingRule[] {
  const needle = query.search?.trim().toLowerCase();
  return allPricingRules().filter((r) => {
    if (!query.includeArchived && !query.status && r.status === "archived") return false;
    if (query.type && r.type !== query.type) return false;
    if (query.status && r.status !== query.status) return false;
    if (
      query.propertyId &&
      r.scope.propertyIds.length > 0 &&
      !r.scope.propertyIds.includes(query.propertyId)
    ) {
      return false;
    }
    if (
      query.ratePlanId &&
      r.scope.ratePlanIds.length > 0 &&
      !r.scope.ratePlanIds.includes(query.ratePlanId)
    ) {
      return false;
    }
    if (needle) {
      const haystack = `${r.name} ${r.description} ${r.note ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function getPricingRule(id: string): PricingRule | undefined {
  return allPricingRules().find((r) => r.id === id);
}

export function createPricingRule(input: PricingRuleInput, by: string): PricingRule {
  const now = new Date().toISOString();
  const rule: PricingRule = {
    ...input,
    id: nextId("prc"),
    createdAt: now,
    updatedAt: now,
    updatedBy: by,
  };
  mutate((draft) => draft.pricingRuleBook.unshift(rule));
  return rule;
}

export function updatePricingRule(
  id: string,
  patch: Partial<PricingRuleInput>,
  by: string,
): { before: PricingRule; after: PricingRule } | undefined {
  return mutate((draft) => {
    const row = draft.pricingRuleBook.find((r) => r.id === id);
    if (!row) return undefined;
    const before = structuredClone(row);
    Object.assign(row, patch);
    row.updatedAt = new Date().toISOString();
    row.updatedBy = by;
    return { before, after: structuredClone(row) };
  });
}

/** Copy a rule, paused, so an experiment can be edited before it goes live. */
export function duplicatePricingRule(id: string, by: string): PricingRule | undefined {
  const source = getPricingRule(id);
  if (!source) return undefined;
  return createPricingRule(
    {
      ...structuredClone(source),
      name: `${source.name} (copy)`,
      status: "paused",
    },
    by,
  );
}

/**
 * Remove a rule.
 *
 * Rules that have priced something are archived rather than deleted so the
 * audit trail keeps its referent; the caller decides which it wants.
 */
export function removePricingRule(id: string): PricingRule | undefined {
  return mutate((draft) => {
    const index = draft.pricingRuleBook.findIndex((r) => r.id === id);
    if (index < 0) return undefined;
    return draft.pricingRuleBook.splice(index, 1)[0];
  });
}

// ---------------------------------------------------------------------------
// Rate plans
// ---------------------------------------------------------------------------

let planCache: { revision: number; plans: RatePlan[] } | null = null;

function planRows(): RatePlan[] {
  const revision = getRevision();
  if (planCache && planCache.revision === revision) return planCache.plans;
  const plans = getState().ratePlans ?? [];
  planCache = { revision, plans };
  return plans;
}

export interface RatePlanQuery {
  vertical?: string;
  propertyId?: string;
  roomTypeId?: string;
  status?: RatePlan["status"];
  includeArchived?: boolean;
  search?: string;
}

/**
 * The rate plans that apply to a query, in a stable order.
 *
 * An empty `verticals` / `propertyIds` / `roomTypeIds` on a plan means "no
 * restriction" — the same convention pricing-rule scopes use.
 */
export function listRatePlans(query: RatePlanQuery = {}): RatePlan[] {
  const needle = query.search?.trim().toLowerCase();
  return planRows()
    .filter((plan) => {
      if (query.status) {
        if (plan.status !== query.status) return false;
      } else if (!query.includeArchived && plan.status === "archived") {
        return false;
      }
      if (
        query.vertical &&
        plan.verticals.length > 0 &&
        !plan.verticals.includes(query.vertical as RatePlan["verticals"][number])
      ) {
        return false;
      }
      if (
        query.propertyId &&
        plan.propertyIds.length > 0 &&
        !plan.propertyIds.includes(query.propertyId)
      ) {
        return false;
      }
      if (
        query.roomTypeId &&
        plan.roomTypeIds.length > 0 &&
        !plan.roomTypeIds.includes(query.roomTypeId)
      ) {
        return false;
      }
      if (needle) {
        const haystack = `${plan.name} ${plan.description}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => a.priceFactor - b.priceFactor || a.name.localeCompare(b.name));
}

export function findRatePlan(id: RatePlanId): RatePlan | undefined {
  return planRows().find((p) => p.id === id);
}

export function createRatePlan(input: RatePlanInput, by: string): RatePlan {
  const now = new Date().toISOString();
  const plan: RatePlan = {
    ...input,
    id: nextId("rpl"),
    includesBreakfast: input.mealPlan !== "none",
    builtIn: false,
    createdAt: now,
    updatedAt: now,
    updatedBy: by,
  };
  mutate((draft) => draft.ratePlans.push(plan));
  return plan;
}

export function updateRatePlan(
  id: RatePlanId,
  patch: Partial<RatePlanInput>,
  by: string,
): { before: RatePlan; after: RatePlan } | undefined {
  return mutate((draft) => {
    const row = draft.ratePlans.find((p) => p.id === id);
    if (!row) return undefined;
    const before = structuredClone(row);
    Object.assign(row, patch);
    if (patch.mealPlan !== undefined) row.includesBreakfast = patch.mealPlan !== "none";
    row.updatedAt = new Date().toISOString();
    row.updatedBy = by;
    return { before, after: structuredClone(row) };
  });
}

export function duplicateRatePlan(id: RatePlanId, by: string): RatePlan | undefined {
  const source = findRatePlan(id);
  if (!source) return undefined;
  const { id: _id, builtIn: _builtIn, createdAt, updatedAt, updatedBy, includesBreakfast, ...rest } =
    structuredClone(source);
  void _id;
  void _builtIn;
  void createdAt;
  void updatedAt;
  void updatedBy;
  void includesBreakfast;
  return createRatePlan({ ...rest, name: `${source.name} (copy)`, status: "inactive" }, by);
}

/**
 * Remove a plan. Shipped plans are archived instead of deleted — bookings
 * reference them by id, and a dangling reference would break their detail page.
 */
export function removeRatePlan(id: RatePlanId, by: string): RatePlan | undefined {
  const plan = findRatePlan(id);
  if (!plan) return undefined;
  if (plan.builtIn) {
    return updateRatePlan(id, { status: "archived" }, by)?.after;
  }
  return mutate((draft) => {
    const index = draft.ratePlans.findIndex((p) => p.id === id);
    if (index < 0) return undefined;
    return draft.ratePlans.splice(index, 1)[0];
  });
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * The configuration in force for a property: its own row if it has one, else
 * the platform default, else the shipped defaults (which is what the server
 * sees before the store has hydrated).
 */
export function pricingConfigFor(propertyId?: string): PricingConfiguration {
  const rows = getState().pricingConfigs ?? [];
  if (propertyId) {
    const own = rows.find((c) => c.scopeId === propertyId);
    if (own) return own;
  }
  return rows.find((c) => c.scopeId === null) ?? DEFAULT_PRICING_CONFIG;
}

export function listPricingConfigs(): PricingConfiguration[] {
  return [...(getState().pricingConfigs ?? [])].sort((a, b) =>
    a.scopeId === null ? -1 : b.scopeId === null ? 1 : a.label.localeCompare(b.label),
  );
}

/** Create or patch the configuration for a scope. Returns the resulting row. */
export function savePricingConfig(
  scopeId: string | null,
  patch: Partial<PricingConfigurationInput>,
  by: string,
): PricingConfiguration {
  return mutate((draft) => {
    let row = draft.pricingConfigs.find((c) => c.scopeId === scopeId);
    if (!row) {
      row = {
        ...structuredClone(DEFAULT_PRICING_CONFIG),
        id: scopeId ? nextId("pcfg") : GLOBAL_PRICING_CONFIG_ID,
        scopeId,
        label: patch.label ?? (scopeId ? scopeId : "Platform default"),
      };
      draft.pricingConfigs.push(row);
    }
    Object.assign(row, patch);
    row.scopeId = scopeId;
    row.updatedAt = new Date().toISOString();
    row.updatedBy = by;
    return structuredClone(row);
  });
}

/** Drop a property's own configuration, so it inherits the platform default. */
export function clearPricingConfig(scopeId: string): boolean {
  return mutate((draft) => {
    const before = draft.pricingConfigs.length;
    draft.pricingConfigs = draft.pricingConfigs.filter((c) => c.scopeId !== scopeId);
    return draft.pricingConfigs.length < before;
  });
}

// ---------------------------------------------------------------------------
// Manual overrides
// ---------------------------------------------------------------------------

/**
 * The pinned rates for a property, as the override read model.
 *
 * They are stored on the inventory override row so that the rate calendar, the
 * booking engine and the revenue manager read one record rather than three.
 */
export function listPriceOverrides(propertyId?: string): ManualPriceOverride[] {
  return (getState().inventoryOverrides ?? [])
    .filter(
      (o): o is InventoryOverride & { price: number } =>
        typeof o.price === "number" &&
        (!propertyId || o.propertyId === propertyId),
    )
    .map((o) => ({
      propertyId: o.propertyId,
      roomTypeId: o.roomTypeId,
      date: o.date,
      price: o.price,
      calculatedPrice: o.priceBefore,
      reason: o.priceNote,
      updatedAt: o.updatedAt,
      updatedBy: o.updatedBy,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findPriceOverride(
  roomTypeId: string,
  date: string,
): ManualPriceOverride | undefined {
  const row = (getState().inventoryOverrides ?? []).find(
    (o) => o.roomTypeId === roomTypeId && o.date === date && typeof o.price === "number",
  );
  if (!row || row.price === undefined) return undefined;
  return {
    propertyId: row.propertyId,
    roomTypeId: row.roomTypeId,
    date: row.date,
    price: row.price,
    calculatedPrice: row.priceBefore,
    reason: row.priceNote,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

// ---------------------------------------------------------------------------
// Resolution — the cached path everything else calls
// ---------------------------------------------------------------------------

const rateCache = new Map<string, DailyRate>();
let rateCacheRevision = -1;
/** Keeps a long browsing session from growing the cache without bound. */
const RATE_CACHE_LIMIT = 4000;

/**
 * Resolve one night through the engine, memoised.
 *
 * The key covers every input that can change the answer; the whole cache is
 * dropped when the store's revision moves, which is when a rule, an override or
 * a booking could have changed one.
 */
export function resolveCached(
  context: Omit<DailyRateContext, "rules" | "config"> & {
    rules?: PricingRule[];
    config?: PricingConfiguration;
  },
): DailyRate {
  const revision = getRevision();
  if (rateCacheRevision !== revision) {
    rateCache.clear();
    rateCacheRevision = revision;
  }
  const config = context.config ?? pricingConfigFor(context.propertyId);
  const key = [
    context.roomTypeId,
    context.date,
    context.ratePlanId,
    context.baseRate,
    Math.round(context.occupancy * 100),
    context.override ? `${context.override.price}` : "-",
    config.id,
  ].join("|");

  const hit = rateCache.get(key);
  if (hit) return hit;

  const resolved = resolveDailyRate({
    ...context,
    config,
    rules: context.rules ?? activePricingRules(),
  });
  if (rateCache.size >= RATE_CACHE_LIMIT) rateCache.clear();
  rateCache.set(key, resolved);
  return resolved;
}

/** Rules that would apply to a date, for the "what fires when" preview. */
export function rulesForDate(date: string): PricingRule[] {
  if (!isValidISODate(date)) return [];
  return activePricingRules().filter((rule) => {
    const { dateFrom, dateTo } = rule.condition;
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  });
}

/** Seasons and holidays starting within `days` of `from`, soonest first. */
export function upcomingRules(
  from: string,
  days: number,
  types: PricingRule["type"][] = ["season", "holiday"],
): PricingRule[] {
  if (!isValidISODate(from)) return [];
  const horizon = new Date(
    Date.UTC(
      Number(from.slice(0, 4)),
      Number(from.slice(5, 7)) - 1,
      Number(from.slice(8, 10)) + days,
    ),
  )
    .toISOString()
    .slice(0, 10);

  return activePricingRules()
    .filter((rule) => {
      if (!types.includes(rule.type)) return false;
      const { dateFrom, dateTo } = rule.condition;
      if (!dateFrom) return false;
      // Either it starts inside the window, or it is already running through it.
      if (dateFrom > horizon) return false;
      if (dateTo && dateTo < from) return false;
      return true;
    })
    .sort((a, b) => (a.condition.dateFrom ?? "").localeCompare(b.condition.dateFrom ?? ""));
}
