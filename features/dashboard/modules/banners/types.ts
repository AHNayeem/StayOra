import type { StatusDef } from "../../lib/status";

export const BANNER_STATUS_VALUES = [
  "scheduled",
  "active",
  "paused",
  "expired",
] as const;
export type BannerStatus = (typeof BANNER_STATUS_VALUES)[number];

export const BANNER_PLACEMENT_VALUES = [
  "home_hero",
  "home_strip",
  "search_top",
  "listing_inline",
  "checkout",
  "global",
] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENT_VALUES)[number];

export const BANNER_THEME_VALUES = ["light", "dark", "brand"] as const;
export type BannerTheme = (typeof BANNER_THEME_VALUES)[number];

/** A storefront promotional banner — the strips/heroes shown to guests. */
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  placement: BannerPlacement;
  theme: BannerTheme;
  status: BannerStatus;
  /** Lower renders first when several banners share a placement. */
  priority: number;
  startsAt: string;
  endsAt: string;
  impressions: number;
  clicks: number;
}

export const BANNER_STATUSES: readonly StatusDef<BannerStatus>[] = [
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "active", label: "Active", tone: "success" },
  { value: "paused", label: "Paused", tone: "warning" },
  { value: "expired", label: "Expired", tone: "neutral" },
];

export const BANNER_PLACEMENTS: readonly StatusDef<BannerPlacement>[] = [
  { value: "home_hero", label: "Home hero", tone: "info" },
  { value: "home_strip", label: "Home strip", tone: "info" },
  { value: "search_top", label: "Search top", tone: "neutral" },
  { value: "listing_inline", label: "Listing inline", tone: "neutral" },
  { value: "checkout", label: "Checkout", tone: "warning" },
  { value: "global", label: "Site-wide", tone: "success" },
];

export const BANNER_THEMES: readonly StatusDef<BannerTheme>[] = [
  { value: "light", label: "Light", tone: "neutral" },
  { value: "dark", label: "Dark", tone: "neutral" },
  { value: "brand", label: "Brand", tone: "info" },
];
