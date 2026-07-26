import type { BlockKind, HomeBlock } from "./types";

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

/** [name, kind, description, enabled] — order follows array position. */
const BLOCKS: [string, BlockKind, string, boolean][] = [
  ["Hero banner", "hero", "Full-width hero with headline and background image.", true],
  ["Search bar", "search", "Destination and date search entry point.", true],
  ["Featured stays", "featured", "Curated carousel of promoted listings.", true],
  ["Popular destinations", "destinations", "Grid of trending cities and regions.", true],
  ["Summer sale banner", "promo", "Time-boxed promotional banner.", false],
  ["Guest testimonials", "testimonials", "Rotating customer testimonials.", true],
  ["From the blog", "blog", "Latest three blog posts.", true],
  ["Newsletter signup", "newsletter", "Email capture with incentive copy.", true],
];

export const HOME_BLOCKS_SEED: HomeBlock[] = BLOCKS.map(
  ([name, kind, description, enabled], i) => ({
    id: `block_${800 + i}`,
    name,
    kind,
    description,
    enabled,
    order: i,
    updatedAt: iso((i * 7) % 60),
  }),
);
