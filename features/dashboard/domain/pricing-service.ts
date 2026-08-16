/**
 * The pricing API surface.
 *
 * Every screen that reads or changes pricing calls one of these functions and
 * nothing else. They are async, take and return the domain types, validate
 * their inputs, record the audit trail a real backend would, and never let a UI
 * compute a price for itself.
 *
 * Swapping to a real backend is replacing each body with a `fetch` — the
 * signatures, the error kinds and the scoping are already what the server will
 * expose. That is why this lives beside `services.ts` rather than inside the
 * pricing module: `domain/pricing` is the engine and its repository, and stays
 * free of audit, notification and access concerns.
 */

import {
  SYSTEM_ACTOR,
  delay,
  invalid,
  notFound,
  recordAudit,
} from "./service-kit";
import type { DomainActor } from "./types";
import {
  calculateStayPrice,
  clearPricingConfig,
  createPricingRule,
  createRatePlan,
  duplicatePricingRule,
  duplicateRatePlan,
  getPricingRule,
  includedGuestsFor,
  listPriceOverrides,
  listPricingConfigs,
  listPricingRules,
  listRatePlans,
  PRICING_RULE_TYPE_LABELS,
  pricingConfigFor,
  removePricingRule,
  removeRatePlan,
  findRatePlan,
  savePricingConfig,
  todayISO,
  updatePricingRule,
  updateRatePlan,
  upcomingRules,
  validateRule,
  type BookingPriceCalculation,
  type ManualPriceOverride,
  type PricingConfiguration,
  type PricingConfigurationInput,
  type PricingRule,
  type PricingRuleInput,
  type RatePlan,
  type RatePlanId,
  type RatePlanInput,
  type RatePlanQuery,
  type RuleQuery,
} from "./pricing";
import {
  calendar,
  calculatedRate,
  dateRange,
  findRoomType,
  getRoomTypes,
  nightlyRate,
  removePriceOverride,
  setPriceOverride,
  type DayRate,
  type PriceOverrideInput,
  type PropertyRef,
} from "./inventory";
import { money } from "./money";

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/** The headline numbers on the merchant's pricing overview. */
export interface PricingOverview {
  currency: string;
  propertyId: string;
  from: string;
  nights: number;
  /** Mean base rate across the window — what the room costs with no rules. */
  averageBaseRate: number;
  /** Mean effective rate — what it costs after them. */
  averageDailyRate: number;
  /** Tonight's rate, the number a merchant checks first. */
  currentRate: number;
  /** Effective over base, as a percentage. Negative means discounting. */
  upliftPercent: number;
  /** Mean uplift on weekend nights only. */
  weekendUpliftPercent: number;
  /** Mean uplift on nights a season or holiday owns. */
  seasonalUpliftPercent: number;
  /** Nights a merchant has pinned by hand. */
  overriddenNights: number;
  /** Mean occupancy across the window, 0–1. */
  occupancy: number;
  /**
   * What the rules add over the window against the units actually offered —
   * the revenue the pricing configuration is worth if the property sells out.
   */
  revenueImpact: number;
  activeRules: number;
  pausedRules: number;
  upcomingSeasons: PricingRule[];
  upcomingHolidays: PricingRule[];
  /** Rules that fired at least once in the window, most valuable first. */
  topRules: { rule: PricingRule; nights: number; impact: number }[];
  /**
   * Base versus effective rate, night by night — the chart series. Derived from
   * the same rows as the tiles, so the two can never disagree.
   */
  series: { date: string; base: number; effective: number; occupancy: number }[];
}

function summarize(
  property: PropertyRef,
  rows: DayRate[],
  from: string,
): PricingOverview {
  const nights = rows.length;
  const config = pricingConfigFor(property.id);
  const base = rows.reduce((n, r) => n + r.baseRate, 0);
  const effective = rows.reduce((n, r) => n + r.price, 0);
  const upliftOf = (set: DayRate[]) => {
    const b = set.reduce((n, r) => n + r.baseRate, 0);
    if (b <= 0) return 0;
    return money(((set.reduce((n, r) => n + r.price, 0) - b) / b) * 100);
  };

  const seasonal = rows.filter(
    (r) => r.pricing.tags.includes("season") || r.pricing.tags.includes("holiday"),
  );
  const weekend = rows.filter((r) => r.pricing.isWeekend);
  const allotment = rows.reduce((n, r) => n + r.allotment, 0);
  const consumed = rows.reduce((n, r) => n + r.booked + r.blocked, 0);

  // Which rules actually did something, and what they were worth.
  const byRule = new Map<string, { nights: number; impact: number }>();
  for (const row of rows) {
    for (const entry of row.pricing.applied) {
      if (entry.type === "manual_override") continue;
      const acc = byRule.get(entry.ruleId) ?? { nights: 0, impact: 0 };
      acc.nights += 1;
      acc.impact = money(acc.impact + entry.amount * row.allotment);
      byRule.set(entry.ruleId, acc);
    }
  }
  const topRules = [...byRule.entries()]
    .map(([ruleId, stats]) => ({ rule: getPricingRule(ruleId), ...stats }))
    .filter((row): row is { rule: PricingRule; nights: number; impact: number } =>
      Boolean(row.rule),
    )
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 6);

  const scoped = listPricingRules({ propertyId: property.id, includeArchived: true });

  return {
    currency: config.currency,
    propertyId: property.id,
    from,
    nights,
    averageBaseRate: nights > 0 ? money(base / nights) : 0,
    averageDailyRate: nights > 0 ? money(effective / nights) : 0,
    currentRate: rows[0]?.price ?? 0,
    upliftPercent: base > 0 ? money(((effective - base) / base) * 100) : 0,
    weekendUpliftPercent: upliftOf(weekend),
    seasonalUpliftPercent: upliftOf(seasonal),
    overriddenNights: rows.filter((r) => r.pricing.overridden).length,
    occupancy: allotment > 0 ? consumed / allotment : 0,
    revenueImpact: money(
      rows.reduce((n, r) => n + (r.price - r.baseRate) * r.allotment, 0),
    ),
    activeRules: scoped.filter((r) => r.status === "active").length,
    pausedRules: scoped.filter((r) => r.status === "paused").length,
    upcomingSeasons: upcomingRules(from, 120, ["season"]).slice(0, 4),
    upcomingHolidays: upcomingRules(from, 120, ["holiday"]).slice(0, 4),
    topRules,
    series: rows.map((row) => ({
      date: row.date,
      base: row.baseRate,
      effective: row.price,
      occupancy: money(row.allotment > 0 ? (row.booked + row.blocked) / row.allotment : 0),
    })),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

function auditRule(
  actor: DomainActor,
  action: "create" | "update" | "delete",
  rule: PricingRule,
  summary: string,
  from?: string,
  to?: string,
): void {
  recordAudit({
    actor,
    action,
    entity: "pricing_rule",
    entityId: rule.id,
    entityLabel: rule.name,
    summary,
    from,
    to,
  });
}

function describe(rule: Pick<PricingRule, "adjustment" | "status">): string {
  const { type, value } = rule.adjustment;
  const unit = type === "percent" ? "%" : type === "multiplier" ? "×" : "";
  return `${value}${unit} · ${rule.status}`;
}

export const pricingService = {
  // --- rules -------------------------------------------------------------
  async rules(query: RuleQuery = {}): Promise<PricingRule[]> {
    return delay(listPricingRules(query));
  },

  async rule(id: string): Promise<PricingRule> {
    const rule = getPricingRule(id);
    if (!rule) notFound("Pricing rule");
    return delay(rule);
  },

  async createRule(
    input: PricingRuleInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PricingRule> {
    const problems = validateRule(input, listPricingRules({ includeArchived: true }));
    const errors = problems.filter((p) => p.severity === "error");
    if (errors.length > 0) {
      invalid(errors[0].message);
    }
    const rule = createPricingRule(input, actor.name);
    auditRule(
      actor,
      "create",
      rule,
      `Created ${PRICING_RULE_TYPE_LABELS[rule.type].toLowerCase()} rule ${rule.name}`,
      undefined,
      describe(rule),
    );
    return delay(rule);
  },

  async updateRule(
    id: string,
    patch: Partial<PricingRuleInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PricingRule> {
    const current = getPricingRule(id);
    if (!current) notFound("Pricing rule");
    const merged = { ...current, ...patch };
    const problems = validateRule(
      merged,
      listPricingRules({ includeArchived: true }),
      id,
    );
    const errors = problems.filter((p) => p.severity === "error");
    if (errors.length > 0) {
      invalid(errors[0].message);
    }
    const result = updatePricingRule(id, patch, actor.name);
    if (!result) notFound("Pricing rule");
    auditRule(
      actor,
      "update",
      result.after,
      `Changed pricing rule ${result.after.name}`,
      describe(result.before),
      describe(result.after),
    );
    return delay(result.after);
  },

  /** Enable or pause a rule without opening the form. */
  async setRuleStatus(
    id: string,
    status: PricingRule["status"],
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PricingRule> {
    const result = updatePricingRule(id, { status }, actor.name);
    if (!result) notFound("Pricing rule");
    auditRule(
      actor,
      "update",
      result.after,
      `${status === "active" ? "Enabled" : status === "paused" ? "Paused" : "Archived"} pricing rule ${result.after.name}`,
      result.before.status,
      status,
    );
    return delay(result.after);
  },

  async duplicateRule(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PricingRule> {
    const copy = duplicatePricingRule(id, actor.name);
    if (!copy) notFound("Pricing rule");
    auditRule(actor, "create", copy, `Duplicated pricing rule into ${copy.name}`);
    return delay(copy);
  },

  async removeRule(id: string, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const removed = removePricingRule(id);
    if (!removed) notFound("Pricing rule");
    auditRule(actor, "delete", removed, `Deleted pricing rule ${removed.name}`);
  },

  // --- rate plans ---------------------------------------------------------
  async ratePlans(query: RatePlanQuery = {}): Promise<RatePlan[]> {
    return delay(listRatePlans(query));
  },

  async ratePlan(id: RatePlanId): Promise<RatePlan> {
    const plan = findRatePlan(id);
    if (!plan) notFound("Rate plan");
    return delay(plan);
  },

  async createRatePlan(
    input: RatePlanInput,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<RatePlan> {
    assertPlanValid(input);
    const plan = createRatePlan(input, actor.name);
    recordAudit({
      actor,
      action: "create",
      entity: "rate_plan",
      entityId: plan.id,
      entityLabel: plan.name,
      summary: `Created rate plan ${plan.name}`,
      to: `×${plan.priceFactor}`,
    });
    return delay(plan);
  },

  async updateRatePlan(
    id: RatePlanId,
    patch: Partial<RatePlanInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<RatePlan> {
    const current = findRatePlan(id);
    if (!current) notFound("Rate plan");
    assertPlanValid({ ...current, ...patch });
    const result = updateRatePlan(id, patch, actor.name);
    if (!result) notFound("Rate plan");
    recordAudit({
      actor,
      action: "update",
      entity: "rate_plan",
      entityId: id,
      entityLabel: result.after.name,
      summary: `Changed rate plan ${result.after.name}`,
      from: `×${result.before.priceFactor} · ${result.before.status}`,
      to: `×${result.after.priceFactor} · ${result.after.status}`,
    });
    return delay(result.after);
  },

  async duplicateRatePlan(
    id: RatePlanId,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<RatePlan> {
    const copy = duplicateRatePlan(id, actor.name);
    if (!copy) notFound("Rate plan");
    recordAudit({
      actor,
      action: "create",
      entity: "rate_plan",
      entityId: copy.id,
      entityLabel: copy.name,
      summary: `Duplicated rate plan into ${copy.name}`,
    });
    return delay(copy);
  },

  /**
   * Delete a plan. Shipped plans archive instead — bookings reference them by
   * id and a dangling reference would break their detail page.
   */
  async removeRatePlan(
    id: RatePlanId,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<{ archived: boolean }> {
    const plan = findRatePlan(id);
    if (!plan) notFound("Rate plan");
    const archived = plan.builtIn;
    removeRatePlan(id, actor.name);
    recordAudit({
      actor,
      action: archived ? "update" : "delete",
      entity: "rate_plan",
      entityId: id,
      entityLabel: plan.name,
      summary: archived
        ? `Archived rate plan ${plan.name} — it ships with the product and is referenced by bookings`
        : `Deleted rate plan ${plan.name}`,
    });
    return delay({ archived });
  },

  // --- configuration ------------------------------------------------------
  async configs(): Promise<PricingConfiguration[]> {
    return delay(listPricingConfigs());
  },

  async config(propertyId?: string): Promise<PricingConfiguration> {
    return delay(pricingConfigFor(propertyId));
  },

  async saveConfig(
    scopeId: string | null,
    patch: Partial<PricingConfigurationInput>,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PricingConfiguration> {
    const problems = validateConfig(patch);
    if (problems.length > 0) {
      invalid(problems[0]);
    }
    const before = pricingConfigFor(scopeId ?? undefined);
    const after = savePricingConfig(scopeId, patch, actor.name);
    recordAudit({
      actor,
      action: "update",
      entity: "pricing_config",
      entityId: after.id,
      entityLabel: after.label,
      summary: `Updated pricing configuration for ${after.scopeId ? after.label : "the platform"}`,
      from: `${before.enabled ? "on" : "off"} · weekend ${before.weekendDays.join(",")}`,
      to: `${after.enabled ? "on" : "off"} · weekend ${after.weekendDays.join(",")}`,
    });
    return delay(after);
  },

  async clearConfig(scopeId: string, actor: DomainActor = SYSTEM_ACTOR): Promise<void> {
    const before = pricingConfigFor(scopeId);
    if (!clearPricingConfig(scopeId)) notFound("Pricing configuration");
    recordAudit({
      actor,
      action: "delete",
      entity: "pricing_config",
      entityId: before.id,
      entityLabel: before.label,
      summary: `${before.label} now inherits the platform pricing configuration`,
    });
  },

  // --- calendar & quotes --------------------------------------------------
  /** The resolved rate calendar for one room type. */
  async calendar(
    property: PropertyRef,
    roomTypeId: string,
    from: string,
    days: number,
  ): Promise<DayRate[]> {
    const room = findRoomType(property, roomTypeId) ?? getRoomTypes(property)[0];
    if (!room) return delay([]);
    return delay(calendar(property, room, from, days));
  },

  /**
   * Price a hypothetical stay without touching availability — the preview a
   * merchant sees while editing a rule, and the "what would this cost" answer
   * anywhere a hold would be wrong.
   */
  async previewStay(input: {
    property: PropertyRef;
    roomTypeId: string;
    ratePlanId: RatePlanId;
    checkIn: string;
    nights: number;
    units?: number;
    guests?: number;
    bookingDate?: string;
  }): Promise<BookingPriceCalculation | null> {
    const room = findRoomType(input.property, input.roomTypeId);
    const plan = findRatePlan(input.ratePlanId);
    if (!room || !plan) return delay(null);
    const units = Math.max(1, input.units ?? 1);
    const rows = calendar(input.property, room, input.checkIn, Math.max(1, input.nights));
    const priced = rows.map((row) =>
      nightlyRate(
        input.property,
        room,
        row.date,
        plan,
        row.allotment > 0 ? Math.min(1, (row.booked + row.blocked) / row.allotment) : 0,
      ),
    );
    const dates = dateRange(input.checkIn, Math.max(1, input.nights) + 1);
    return delay(
      calculateStayPrice({
        nights: priced,
        ratePlan: plan,
        roomTypeId: room.id,
        propertyId: input.property.id,
        vertical: input.property.vertical,
        units,
        guests: Math.max(1, input.guests ?? 2),
        includedGuests: includedGuestsFor(room.maxOccupancy, units),
        bookingDate: input.bookingDate ?? todayISO(),
        checkIn: input.checkIn,
        checkOut: dates[dates.length - 1] ?? input.checkIn,
        config: pricingConfigFor(input.property.id),
      }),
    );
  },

  // --- manual overrides ---------------------------------------------------
  async overrides(propertyId?: string): Promise<ManualPriceOverride[]> {
    return delay(listPriceOverrides(propertyId));
  },

  async setOverride(
    input: PriceOverrideInput & { property?: PropertyRef },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<number> {
    if (!Number.isFinite(input.price) || input.price <= 0) {
      invalid("Enter a rate above zero.");
    }
    // Capture what the engine wanted, so the override can always show what it
    // replaced. Resolved here rather than in the store write, because only the
    // service has the property in hand.
    const calculated =
      input.calculatedPrice ??
      (input.property
        ? calculatedRateFor(input.property, input.roomTypeId, input.from)
        : undefined);

    const touched = setPriceOverride({ ...input, calculatedPrice: calculated });
    if (touched === 0) invalid("That date range is empty.");
    recordAudit({
      actor,
      action: "update",
      entity: "rate",
      entityId: `${input.roomTypeId}:${input.from}`,
      entityLabel: `${input.roomTypeId} · ${input.from}${input.to !== input.from ? ` → ${input.to}` : ""}`,
      summary: input.reason
        ? `Pinned the rate by hand — ${input.reason}`
        : "Pinned the rate by hand",
      from: calculated !== undefined ? `$${calculated.toFixed(2)}` : undefined,
      to: `$${money(input.price).toFixed(2)}`,
    });
    return delay(touched);
  },

  async removeOverride(
    roomTypeId: string,
    from: string,
    to: string,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<number> {
    const cleared = removePriceOverride(roomTypeId, from, to);
    if (cleared === 0) notFound("Manual override");
    recordAudit({
      actor,
      action: "delete",
      entity: "rate",
      entityId: `${roomTypeId}:${from}`,
      entityLabel: `${roomTypeId} · ${from}${to !== from ? ` → ${to}` : ""}`,
      summary: `Lifted the manual rate on ${cleared} ${cleared === 1 ? "night" : "nights"} — pricing rules apply again`,
    });
    return delay(cleared);
  },

  // --- analytics ----------------------------------------------------------
  async overview(
    property: PropertyRef,
    roomTypeId: string,
    from: string,
    days: number,
  ): Promise<PricingOverview | null> {
    const room = findRoomType(property, roomTypeId) ?? getRoomTypes(property)[0];
    if (!room) return delay(null);
    return delay(summarize(property, calendar(property, room, from, days), from));
  },

  /**
   * Configurations worth a second look, for the admin's review screen.
   *
   * Not a rule engine of its own — just the handful of shapes that are almost
   * always a mistake, each with the reason spelled out.
   */
  async anomalies(): Promise<{ rule: PricingRule; reason: string }[]> {
    const rules = listPricingRules({ includeArchived: false });
    const out: { rule: PricingRule; reason: string }[] = [];
    for (const rule of rules) {
      if (rule.status !== "active") continue;
      const { type, value } = rule.adjustment;
      if (type === "percent" && value >= 100) {
        out.push({ rule, reason: `Raises the rate by ${value}% — more than double.` });
      }
      if (type === "percent" && value <= -50) {
        out.push({ rule, reason: `Cuts the rate by ${Math.abs(value)}%.` });
      }
      if (rule.calculationMode === "override" && rule.scope.propertyIds.length === 0) {
        out.push({
          rule,
          reason: "Overrides the rate for every property on the platform.",
        });
      }
      if (rule.calculationMode === "sequential" && rule.priority < 30) {
        out.push({
          rule,
          reason:
            "Compounds on whatever ran before it, at a low priority — the result depends on which other rules matched.",
        });
      }
      const clash = rules.find(
        (other) =>
          other.id !== rule.id &&
          other.status === "active" &&
          other.type === rule.type &&
          other.priority === rule.priority &&
          !other.stackable &&
          !rule.stackable,
      );
      if (clash) {
        out.push({
          rule,
          reason: `Shares priority ${rule.priority} with "${clash.name}" and neither stacks — only one of them will ever apply.`,
        });
      }
    }
    return delay(out);
  },
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function calculatedRateFor(
  property: PropertyRef,
  roomTypeId: string,
  date: string,
): number | undefined {
  const room = findRoomType(property, roomTypeId);
  if (!room) return undefined;
  return calculatedRate(property, room, date);
}

function assertPlanValid(input: Partial<RatePlanInput>): void {
  if (input.name !== undefined && !input.name.trim()) {
    invalid("Give the rate plan a name.");
  }
  if (
    input.priceFactor !== undefined &&
    (!Number.isFinite(input.priceFactor) || input.priceFactor <= 0 || input.priceFactor > 10)
  ) {
    invalid("The price factor must be between 0 and 10.");
  }
  if (
    input.baseRate !== undefined &&
    (!Number.isFinite(input.baseRate) || input.baseRate < 0)
  ) {
    invalid("A contracted rate cannot be negative.");
  }
  if (
    input.minStay !== undefined &&
    input.maxStay !== undefined &&
    input.maxStay > 0 &&
    input.maxStay < input.minStay
  ) {
    invalid("Maximum stay is shorter than the minimum.");
  }
  if (
    input.minAdvanceDays !== undefined &&
    input.maxAdvanceDays !== undefined &&
    input.maxAdvanceDays > 0 &&
    input.maxAdvanceDays < input.minAdvanceDays
  ) {
    invalid("The booking window closes before it opens — check the advance-purchase days.");
  }
}

function validateConfig(patch: Partial<PricingConfigurationInput>): string[] {
  const problems: string[] = [];
  if (patch.weekendDays && patch.weekendDays.some((d) => d < 0 || d > 6)) {
    problems.push("Weekend days must be weekdays 0–6.");
  }
  if (patch.minRateFactor !== undefined && patch.maxRateFactor !== undefined) {
    if (patch.maxRateFactor <= patch.minRateFactor) {
      problems.push("The rate ceiling must be above the floor.");
    }
  }
  for (const [label, value, max] of [
    ["floor", patch.minRateFactor, 1],
    ["ceiling", patch.maxRateFactor, 10],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > max)) {
      problems.push(`The rate ${label} must be between 0 and ${max}.`);
    }
  }
  if (
    patch.roundingIncrement !== undefined &&
    (!Number.isFinite(patch.roundingIncrement) ||
      patch.roundingIncrement < 0 ||
      patch.roundingIncrement > 1000)
  ) {
    problems.push("Rounding must be between 0 and 1000.");
  }
  return problems;
}
