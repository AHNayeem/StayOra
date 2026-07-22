/**
 * Top-nav switcher seed data.
 *
 * Phase 1 placeholders for organizations, merchants, languages and currencies.
 * These are intentionally *data*, not hardcoded into components — Phase 3
 * replaces each list with an API/localization lookup. Kept together so the
 * swap is a single, obvious edit.
 */

export interface SwitcherOption {
  id: string;
  label: string;
  /** Optional secondary line (e.g. plan, code). */
  meta?: string;
}

export const ORGANIZATIONS: SwitcherOption[] = [
  { id: "org_stayora", label: "StayOra HQ", meta: "Platform" },
  { id: "org_east", label: "StayOra East", meta: "Region" },
];

export const MERCHANTS: SwitcherOption[] = [
  { id: "mch_all", label: "All merchants", meta: "Unscoped" },
  { id: "mch_azure", label: "Azure Stays", meta: "Hotels" },
  { id: "mch_summit", label: "Summit Resorts", meta: "Resorts" },
];

export const LANGUAGES: SwitcherOption[] = [
  { id: "en", label: "English", meta: "EN" },
  { id: "bn", label: "বাংলা", meta: "BN" },
  { id: "ar", label: "العربية", meta: "AR" },
];

export const CURRENCIES: SwitcherOption[] = [
  { id: "usd", label: "US Dollar", meta: "USD $" },
  { id: "bdt", label: "Bangladeshi Taka", meta: "BDT ৳" },
  { id: "eur", label: "Euro", meta: "EUR €" },
];
