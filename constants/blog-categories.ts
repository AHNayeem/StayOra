/**
 * Blog category seed — the canonical category records.
 *
 * Categories were previously derived by counting the distinct `category` strings
 * on posts, which meant a category could not exist before a post used it, could
 * not be renamed without editing every post, and had no stable URL. They are
 * records now: posts reference them by `categoryId` and carry the name
 * denormalised for rendering.
 *
 * The first six are the categories the shipped articles already use — renaming
 * or removing them would change existing posts — followed by two the editorial
 * team can start filing against.
 */

import type { BlogCategory } from "@/types/blog";

/** [name, slug, description] — status is `active` for every seeded category. */
const CATEGORIES: [string, string, string][] = [
  ["Inspiration", "inspiration", "Places and ideas worth building a trip around."],
  ["Guides", "guides", "Step-by-step planning for a destination or a kind of trip."],
  ["Tips", "tips", "Short, practical advice that makes a trip run smoother."],
  ["Food & Drink", "food-and-drink", "Where and what to eat, and how locals actually do it."],
  ["Adventure", "adventure", "Trails, water and altitude — trips that ask something of you."],
  ["News", "news", "What's changing in travel and what it means for your plans."],
  ["Destinations", "destinations", "Deep dives on a single city, island or region."],
  ["Hotels", "hotels", "How to choose, book and get the most out of where you stay."],
];

export const BLOG_CATEGORIES_SEED: BlogCategory[] = CATEGORIES.map(
  ([name, slug, description], i) => ({
    id: `blgcat_${100 + i}`,
    name,
    slug,
    description,
    status: "active",
  }),
);

/** The seeded category whose name matches, for wiring the post seed up. */
export function seedCategoryByName(name: string): BlogCategory | undefined {
  return BLOG_CATEGORIES_SEED.find((category) => category.name === name);
}
