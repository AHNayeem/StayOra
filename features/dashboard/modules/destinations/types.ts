/**
 * Dashboard-side destination types.
 *
 * The entity itself is *not* redefined here — it is the canonical
 * `types/destination` model the public site renders, imported so the dashboard
 * and the storefront cannot drift. Only presentation metadata (status tones) and
 * the list KPIs live in this module.
 */

import type { DestinationStatus } from "@/types/destination";
import { DESTINATION_STATUS_VALUES } from "@/types/destination";
import type { StatusDef } from "../../lib/status";

export type {
  Destination,
  DestinationInput,
  DestinationPatch,
  DestinationStatus,
} from "@/types/destination";
export { DESTINATION_STATUS_VALUES };

/** How each status renders as a badge and reads in a filter. */
export const DESTINATION_STATUSES: readonly StatusDef<DestinationStatus>[] = [
  { value: "published", label: "Published", tone: "success" },
  { value: "draft", label: "Draft", tone: "warning" },
  { value: "archived", label: "Archived", tone: "neutral" },
];

export interface DestinationSummary {
  total: number;
  published: number;
  draft: number;
  featured: number;
  /** Distinct countries covered by published destinations. */
  countries: number;
}
