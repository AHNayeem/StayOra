import type { StatusDef } from "../../lib/status";

export const BLOCK_KIND_VALUES = [
  "hero",
  "search",
  "featured",
  "destinations",
  "promo",
  "testimonials",
  "newsletter",
  "blog",
] as const;
export type BlockKind = (typeof BLOCK_KIND_VALUES)[number];

export interface HomeBlock {
  id: string;
  name: string;
  kind: BlockKind;
  /** Short description of what the section renders. */
  description: string;
  enabled: boolean;
  /** Position on the homepage (ascending). */
  order: number;
  updatedAt: string;
}

export const BLOCK_KINDS: readonly StatusDef<BlockKind>[] = [
  { value: "hero", label: "Hero", tone: "info" },
  { value: "search", label: "Search", tone: "info" },
  { value: "featured", label: "Featured", tone: "success" },
  { value: "destinations", label: "Destinations", tone: "success" },
  { value: "promo", label: "Promotion", tone: "warning" },
  { value: "testimonials", label: "Testimonials", tone: "neutral" },
  { value: "newsletter", label: "Newsletter", tone: "neutral" },
  { value: "blog", label: "Blog", tone: "neutral" },
];
