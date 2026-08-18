/**
 * Blog post seed — the articles the prototype ships with.
 *
 * This is the *only* blog dataset in the codebase. `features/blog/repository`
 * loads it, the dashboard edits it and the public site renders it, so publishing
 * in the dashboard changes `/blogs` because there is nothing else to change.
 *
 * The first nine rows are the articles that were previously hardcoded in
 * `constants/content.ts` — same ids, slugs, images, categories, authors and
 * dates, so every URL that worked before still works, including
 * `/blog/10-hidden-beaches-worth-the-trip`. Their bodies come from the same
 * deterministic builder that used to run at render time (`lib/blog-detail`), so
 * the articles read exactly as they did; the difference is that the text is now
 * stored on the record and can be edited.
 *
 * The last three exist so the management screen has something to manage: a
 * draft, a second draft an editor has half-finished, and an archived post. They
 * are deliberately *not* published, which is what makes "archived posts don't
 * appear publicly" visible on first load.
 */

import type { BlogPost } from "@/types/blog";
import { readingMinutes } from "@/lib/blog-content";
import { seedBody, seedTags } from "@/lib/blog-detail";
import { seedCategoryByName } from "./blog-categories";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** [id, slug, title, excerpt, imageId, category, author, publishedAt, status, featured] */
type Row = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  BlogPost["status"],
  boolean,
];

const ROWS: Row[] = [
  [
    "blg-1",
    "10-hidden-beaches-worth-the-trip",
    "10 Hidden Beaches Worth the Trip",
    "Skip the crowds and discover secluded shorelines that still feel like a secret — with tips on when to go and where to stay.",
    "photo-1507525428034-b723cf961d3e",
    "Inspiration",
    "Mia Carter",
    "2026-06-18",
    "published",
    true,
  ],
  [
    "blg-2",
    "how-to-plan-the-perfect-city-break",
    "How to Plan the Perfect City Break",
    "A practical framework for packing a long weekend with the right mix of sights, food and downtime — without burning out.",
    "photo-1524562979-3226f2d16f5c",
    "Guides",
    "Leo Nguyen",
    "2026-05-30",
    "published",
    true,
  ],
  [
    "blg-3",
    "budget-travel-that-doesnt-feel-cheap",
    "Budget Travel That Doesn't Feel Cheap",
    "Smart swaps and booking timing that stretch your money further while keeping the experience firmly in the treat-yourself column.",
    "photo-1436491865332-7a61a109cc05",
    "Tips",
    "Sofia Rossi",
    "2026-05-12",
    "published",
    false,
  ],
  [
    "blg-4",
    "a-first-timers-guide-to-solo-travel",
    "A First-Timer's Guide to Solo Travel",
    "Everything nobody tells you before your first trip alone — from picking a base to staying safe without staying home.",
    "photo-1469854523086-cc02fe5d8800",
    "Guides",
    "Leo Nguyen",
    "2026-04-28",
    "published",
    false,
  ],
  [
    "blg-5",
    "where-to-eat-like-a-local-in-lisbon",
    "Where to Eat Like a Local in Lisbon",
    "Skip the tourist traps near the castle and follow the tascas, markets and pastry counters that Lisboetas actually love.",
    "photo-1585208798174-6cedd86e019a",
    "Food & Drink",
    "Sofia Rossi",
    "2026-04-10",
    "published",
    false,
  ],
  [
    "blg-6",
    "seven-under-the-radar-alpine-trails",
    "7 Under-the-Radar Alpine Trails",
    "Trade the crowded classics for quieter ridgelines and valley walks that deliver the views without the queues.",
    "photo-1464822759023-fed622ff2c3b",
    "Adventure",
    "Mia Carter",
    "2026-03-22",
    "published",
    false,
  ],
  [
    "blg-7",
    "travel-trends-shaping-2026",
    "Travel Trends Shaping 2026",
    "From slow travel to shoulder-season swaps, here's how people are planning trips this year — and what it means for you.",
    "photo-1503220317375-aaad61436b1b",
    "News",
    "Leo Nguyen",
    "2026-03-05",
    "published",
    false,
  ],
  [
    "blg-8",
    "the-art-of-packing-light",
    "The Art of Packing Light",
    "A carry-on-only system that works for a weekend or a month — the capsule wardrobe, the fold, and the one rule that matters.",
    "photo-1553531384-cc64ac80f931",
    "Tips",
    "Sofia Rossi",
    "2026-02-18",
    "published",
    false,
  ],
  [
    "blg-9",
    "weekend-wonders-48-hours-in-kyoto",
    "Weekend Wonders: 48 Hours in Kyoto",
    "Temples at dawn, a long lunch, and a route that packs the essentials into two unhurried days without the burnout.",
    "photo-1493976040374-85c8e12f0c0e",
    "Inspiration",
    "Mia Carter",
    "2026-02-02",
    "published",
    false,
  ],

  // ---- Not public: the rows that make the management screen worth opening ----
  [
    "blg-10",
    "the-shoulder-season-playbook",
    "The Shoulder Season Playbook",
    "Fewer people, softer prices and better light — how to work out the exact fortnight worth booking for any destination.",
    "photo-1476514525535-07fb3b4ae5f1",
    "Guides",
    "Mia Carter",
    "2026-07-04",
    "draft",
    false,
  ],
  [
    "blg-11",
    "choosing-a-hotel-that-fits-the-trip",
    "Choosing a Hotel That Fits the Trip",
    "Location, breakfast, cancellation terms — the four things worth paying for, and the three that rarely change a stay.",
    "photo-1566073771259-6a8506099945",
    "Hotels",
    "Leo Nguyen",
    "2026-07-11",
    "draft",
    false,
  ],
  [
    "blg-12",
    "airport-lounges-worth-the-detour",
    "Airport Lounges Worth the Detour",
    "A 2025 round-up of the lounges that justified the walk. Kept for reference — the access rules have since changed.",
    "photo-1436491865332-7a61a109cc05",
    "News",
    "Sofia Rossi",
    "2025-11-20",
    "archived",
    false,
  ],
];

/**
 * A stable timestamp derived from the publish date.
 *
 * Seeds must not read the clock: a `Date.now()` here would give the server and
 * the browser different `createdAt` values and trip hydration.
 */
function stamp(date: string, dayOffset = 0): string {
  return new Date(new Date(`${date}T09:00:00.000Z`).getTime() + dayOffset * 86_400_000)
    .toISOString();
}

export const BLOG_POSTS_SEED: BlogPost[] = ROWS.map(
  ([id, slug, title, excerpt, imageId, category, author, date, status, featured]) => {
    const content = seedBody(slug);
    return {
      id,
      slug,
      title,
      excerpt,
      content,
      image: img(imageId),
      imageAlt: title,
      author,
      categoryId: seedCategoryByName(category)?.id,
      category,
      tags: seedTags(slug, category),
      status,
      featured,
      // A draft has never been live, so it has no published date — which is what
      // makes "published posts only" a field check rather than a special case.
      publishedAt: status === "draft" ? undefined : date,
      readMinutes: readingMinutes(content),
      seo: {
        title: `${title} | Otithee`,
        description: excerpt,
      },
      createdAt: stamp(date, -14),
      updatedAt: stamp(date),
    };
  },
);
