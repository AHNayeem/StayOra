/**
 * Tax module types.
 *
 * The rule *shape* and the engine that applies it live in the domain
 * (`domain/tax.ts`) — this file only re-exports them and adds the presentation
 * metadata the dashboard's tables and forms need. There is exactly one tax rule
 * book, and it is the one the money engine reads.
 */
import type { StatusDef } from "../../lib/status";
import {
  TAX_BASIS_VALUES,
  TAX_BASIS_LABELS,
  type TaxBasis,
  type TaxStatus,
  type TaxType,
} from "@/features/dashboard/domain";

export {
  TAX_BASIS_LABELS,
  TAX_BASIS_VALUES,
  TAX_CATEGORY_VALUES,
  TAX_JURISDICTIONS,
  TAX_STATUS_VALUES,
  TAX_TYPE_VALUES,
  isPercentageBasis,
  jurisdictionLabel,
} from "@/features/dashboard/domain";
export type {
  TaxBasis,
  TaxCategory,
  TaxRule,
  TaxRuleInput,
  TaxStatus,
  TaxType,
} from "@/features/dashboard/domain";

export const TAX_STATUSES: readonly StatusDef<TaxStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "inactive", label: "Inactive", tone: "neutral" },
];

export const TAX_TYPES: readonly StatusDef<TaxType>[] = [
  { value: "exclusive", label: "Added on top", tone: "info" },
  { value: "inclusive", label: "Included in price", tone: "neutral" },
];

export const TAX_BASES: readonly StatusDef<TaxBasis>[] = TAX_BASIS_VALUES.map((value) => ({
  value,
  label: TAX_BASIS_LABELS[value],
  tone: "neutral" as const,
}));
