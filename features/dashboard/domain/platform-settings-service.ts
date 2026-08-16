/**
 * The settings API — the layer between the Settings screen and the stored
 * {@link PlatformConfig}.
 *
 * Configuration lives in `platform-config.ts` (which `money.ts` reads, so it
 * must stay free of store imports). This file adds what a real settings
 * endpoint would do around it: validation, permission-shaped actor tracking, an
 * audit entry per section changed and a notification when something material —
 * the economics, or maintenance mode — moves.
 *
 * Contract: `get`, `update`, `reset` — one section at a time, so a PATCH
 * against a real API maps one-to-one.
 */

import {
  DEFAULT_PLATFORM_CONFIG,
  platformConfig,
  resetPlatformConfig,
  updatePlatformConfig,
  validateEconomics,
  type EconomicsConfig,
  type PlatformConfig,
  type PlatformConfigPatch,
} from "./platform-config";
import { SYSTEM_ACTOR, delay, invalid, notify, recordAudit } from "./service-kit";
import type { DomainActor } from "./types";

/** Human labels for the audit trail. */
const SECTION_LABELS: Record<keyof PlatformConfig, string> = {
  general: "General settings",
  economics: "Platform economics",
  fx: "FX settings",
  maintenance: "Maintenance mode",
  delivery: "Notification delivery",
  integrations: "Integrations",
};

function describe(section: keyof PlatformConfig, patch: PlatformConfigPatch): string {
  const values = patch[section] ?? {};
  const parts = Object.entries(values).map(([key, value]) =>
    typeof value === "object" ? key : `${key}=${String(value)}`,
  );
  return parts.length ? parts.join(", ") : "no change";
}

export const platformSettingsService = {
  /** The whole configuration. */
  async get(): Promise<PlatformConfig> {
    return delay(structuredClone(platformConfig()));
  },

  /** The shipped defaults, for "reset this section". */
  defaults(): PlatformConfig {
    return structuredClone(DEFAULT_PLATFORM_CONFIG);
  },

  /**
   * Update one section. Economics is validated before anything is stored — a
   * negative tax rate or a 300% commission never reaches the money engine.
   */
  async update(
    section: keyof PlatformConfig,
    patch: PlatformConfigPatch[keyof PlatformConfig],
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<PlatformConfig> {
    if (section === "economics") {
      const problems = validateEconomics(patch as Partial<EconomicsConfig>);
      if (problems.length) {
        invalid(problems.map((p) => `${p.field}: ${p.message}`).join(" "));
      }
    }

    const before = platformConfig();
    const next = updatePlatformConfig({ [section]: patch } as PlatformConfigPatch);

    recordAudit({
      actor,
      action: "update",
      entity: "platform_settings",
      entityId: section,
      entityLabel: SECTION_LABELS[section],
      summary: `${SECTION_LABELS[section]} updated — ${describe(section, { [section]: patch } as PlatformConfigPatch)}`,
    });

    // Two changes are worth telling the platform about: money and downtime.
    if (section === "economics") {
      notify({
        category: "revenue",
        audience: ["admin"],
        tone: "warning",
        title: "Platform economics changed",
        body: `Tax ${(next.economics.taxRate * 100).toFixed(2)}%, service fee ${(next.economics.platformFeeRate * 100).toFixed(2)}%, default commission ${next.economics.defaultCommissionRate}%. New quotes use these immediately.`,
        href: "/dashboard/settings",
      });
    }
    if (section === "maintenance" && before.maintenance.enabled !== next.maintenance.enabled) {
      notify({
        category: "system",
        audience: ["admin", "merchant"],
        tone: next.maintenance.enabled ? "warning" : "success",
        title: next.maintenance.enabled ? "Maintenance mode on" : "Maintenance mode off",
        body: next.maintenance.enabled
          ? "The storefront is showing the maintenance page to visitors."
          : "The storefront is serving visitors again.",
        href: "/dashboard/system/maintenance",
      });
    }

    return delay(structuredClone(next));
  },

  /** Restore every shipped default. */
  async reset(actor: DomainActor = SYSTEM_ACTOR): Promise<PlatformConfig> {
    const next = resetPlatformConfig();
    recordAudit({
      actor,
      action: "update",
      entity: "platform_settings",
      entityId: "all",
      entityLabel: "Platform settings",
      summary: "Platform settings reset to the shipped defaults.",
    });
    return delay(structuredClone(next));
  },
};
