import type {
  Banner,
  BannerPlacement,
  BannerStatus,
  BannerTheme,
} from "./types";

const ITEMS: [string, string, string][] = [
  ["Summer sale — up to 30% off", "Beach escapes booked by 31 Aug", "Shop deals"],
  ["Free cancellation, always", "Change your plans without the fees", "Learn more"],
  ["City breaks from $79", "Weekend getaways across Europe", "Explore"],
  ["Members save an extra 10%", "Sign in to unlock member pricing", "Join free"],
  ["Last-minute resort deals", "Sun-soaked stays, this week only", "View resorts"],
  ["Group bookings made easy", "9+ rooms? Get a dedicated agent", "Get a quote"],
  ["Travel insurance add-on", "Cover your trip from $6/day", "Add cover"],
  ["Gift the perfect getaway", "Digital gift cards, any amount", "Buy a card"],
];

const PLACEMENTS: BannerPlacement[] = [
  "home_hero",
  "global",
  "home_strip",
  "search_top",
  "listing_inline",
  "home_hero",
  "checkout",
  "home_strip",
];
const THEMES: BannerTheme[] = ["brand", "dark", "light", "brand", "dark", "light"];
const STATUSES: BannerStatus[] = ["active", "active", "scheduled", "paused", "expired"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 5, 1) + dayOffset * 86_400_000).toISOString();
}

export const BANNERS_SEED: Banner[] = ITEMS.map(([title, subtitle, ctaLabel], i) => {
  const impressions = 4_200 + ((i * 971) % 38_000);
  return {
    id: `banner_${900 + i}`,
    title,
    subtitle,
    ctaLabel,
    ctaHref: "/offers",
    placement: PLACEMENTS[i % PLACEMENTS.length],
    theme: THEMES[i % THEMES.length],
    status: STATUSES[i % STATUSES.length],
    priority: (i % 4) + 1,
    startsAt: iso((i * 3) % 24),
    endsAt: iso(((i * 3) % 24) + 30),
    impressions,
    clicks: Math.round(impressions * (0.012 + (i % 5) * 0.006)),
  };
});
