/**
 * Status registry helpers.
 *
 * Modules describe their statuses once as data (`value` + human `label` +
 * semantic `tone`) and derive everything else — the tone lookup a column uses,
 * the option list a filter `<Select>` renders, and the label map — from that.
 * Keeps statuses/labels/tones out of components (never hardcoded in JSX) and in
 * one place that a real API can later replace.
 */
import type { SelectOption } from "@/components/ui/select";
import type { StatusTone } from "../ui/status-badge";

export interface StatusDef<V extends string = string> {
  value: V;
  label: string;
  tone: StatusTone;
}

/** Map every status value → its semantic tone (for {@link StatusBadge}). */
export function toneMap<V extends string>(
  defs: readonly StatusDef<V>[],
): Record<V, StatusTone> {
  return Object.fromEntries(defs.map((d) => [d.value, d.tone])) as Record<
    V,
    StatusTone
  >;
}

/** Map every status value → its human label. */
export function labelMap<V extends string>(
  defs: readonly StatusDef<V>[],
): Record<V, string> {
  return Object.fromEntries(defs.map((d) => [d.value, d.label])) as Record<
    V,
    string
  >;
}

/** Build `<Select>` options from a status registry. */
export function statusOptions<V extends string>(
  defs: readonly StatusDef<V>[],
): SelectOption[] {
  return defs.map((d) => ({ value: d.value, label: d.label }));
}
