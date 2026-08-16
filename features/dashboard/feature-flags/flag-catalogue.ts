/**
 * The feature-flag catalogue — every flag the shell understands, as data.
 *
 * A flag is not a checkbox: each entry below names what it gates, and something
 * in the menu, the route table or a component actually reads it. Turning one off
 * therefore removes a capability rather than dimming a switch, which is what the
 * gap analysis asked for — the "off" direction was previously never exercised.
 *
 * Everything ships enabled, so adding this layer changed nothing about the
 * default experience; an admin now has somewhere to turn things off.
 */

import type { RoleId } from "../rbac/types";

export interface FeatureFlagDefinition {
  key: string;
  label: string;
  /** What is hidden or blocked when this flag is off. */
  description: string;
  /** Grouping for the admin screen. */
  group: "Modules" | "Shell";
  /** Where the flag is enforced — shown in the admin screen. */
  gates: string;
  defaultEnabled: boolean;
  /**
   * Roles the flag applies to when shipped. Empty means every role; a
   * non-empty list is the "role + feature" combination: the capability only
   * exists for those roles, however the flag is toggled.
   */
  defaultRoles?: RoleId[];
}

export const FEATURE_FLAG_CATALOGUE: FeatureFlagDefinition[] = [
  {
    key: "analytics",
    label: "Analytics",
    description: "The analytics module, its sidebar entry and its route.",
    group: "Modules",
    gates: "Menu · /dashboard/analytics",
    defaultEnabled: true,
  },
  {
    key: "advertising",
    label: "Advertising",
    description:
      "Platform ad manager and the merchant's self-serve advertising screen.",
    group: "Modules",
    gates: "Menu · /dashboard/advertising · /dashboard/merchant/advertising",
    defaultEnabled: true,
  },
  {
    key: "membership",
    label: "Membership",
    description: "Membership plans, subscriptions and member benefits.",
    group: "Modules",
    gates: "Menu · /dashboard/membership",
    defaultEnabled: true,
  },
  {
    key: "b2b",
    label: "B2B & corporate",
    description:
      "Agency accounts, net rates, credit and consolidated invoices. Agency users lose their workspace when this is off.",
    group: "Modules",
    gates: "Menu · /dashboard/b2b",
    defaultEnabled: true,
  },
  {
    key: "revenue-management",
    label: "Revenue management",
    description: "Automated pricing rules, pace and RevPAR tooling.",
    group: "Modules",
    gates: "Menu · /dashboard/catalog/revenue-management",
    defaultEnabled: true,
  },
  {
    key: "dynamic-pricing",
    label: "Dynamic pricing",
    description:
      "Seasons, holidays, weekend and demand rules, rate plans, the pricing calendar and manual overrides. Off leaves quotes on the base rate.",
    group: "Modules",
    gates:
      "Menu · /dashboard/catalog/pricing · /dashboard/catalog/pricing/rules · /dashboard/catalog/pricing/rate-plans · /dashboard/settings/pricing",
    defaultEnabled: true,
  },
  {
    key: "disputes",
    label: "Disputes & chargebacks",
    description: "The chargeback case list and evidence workflow.",
    group: "Modules",
    gates: "Menu · /dashboard/finance/disputes",
    defaultEnabled: true,
  },
  {
    key: "command-palette",
    label: "Command palette (⌘K)",
    description: "Keyboard-driven navigation and quick actions.",
    group: "Shell",
    gates: "Top nav · ⌘K shortcut",
    defaultEnabled: true,
  },
  {
    key: "messages",
    label: "Messages & inbox",
    description: "The top-nav message centre.",
    group: "Shell",
    gates: "Top nav",
    defaultEnabled: true,
  },
  {
    key: "org-switcher",
    label: "Organization switcher",
    description: "Switching between organizations from the top nav.",
    group: "Shell",
    gates: "Top nav",
    defaultEnabled: true,
  },
  {
    key: "merchant-switcher",
    label: "Merchant switcher",
    description:
      "Switching between merchant accounts — only meaningful for merchant principals.",
    group: "Shell",
    gates: "Top nav",
    defaultEnabled: true,
    defaultRoles: ["merchant", "vendor", "admin", "super_admin"],
  },
  {
    key: "impersonation",
    label: "Impersonation",
    description:
      "Viewing the dashboard as another user. Needs `users:impersonate` as well, which support does not hold by default — grant it on the Roles screen if your support team needs it.",
    group: "Shell",
    gates: "Users · Merchants · session banner",
    defaultEnabled: true,
    defaultRoles: ["super_admin", "admin"],
  },
];

export const FEATURE_FLAG_KEYS: string[] = FEATURE_FLAG_CATALOGUE.map((f) => f.key);

export function flagDefinition(key: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_CATALOGUE.find((f) => f.key === key);
}
