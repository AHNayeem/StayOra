/**
 * content.ts — service seam for editorial / marketing content. Mirrors
 * {@link "./catalog"}: typed mock data resolved through {@link mockDelay},
 * ready to swap for a CMS or API.
 */

import type {
  BlogPost,
  Destination,
  Feature,
  Offer,
  Stat,
  Testimonial,
} from "@/types/content";
import type { BlogCategory, BlogDetail } from "@/types/blog";
import type {
  Award,
  CountryHighlight,
  FlashDeal,
  InspirationTheme,
  Partner,
  TravelPackage,
} from "@/types/home";
import {
  BLOG_POSTS,
  DESTINATIONS,
  FEATURES,
  OFFERS,
  STATS,
  TESTIMONIALS,
} from "@/constants/content";
import {
  AWARDS,
  COUNTRY_HIGHLIGHTS,
  FLASH_DEALS,
  INSPIRATION_THEMES,
  PARTNERS,
  TRAVEL_PACKAGES,
} from "@/constants/home-data";
import { buildBlogDetail } from "@/lib/blog-detail";
import { mockDelay } from "./http";

export const getDestinations = (limit?: number): Promise<Destination[]> =>
  mockDelay(limit ? DESTINATIONS.slice(0, limit) : DESTINATIONS);

export const getBlogPosts = (limit?: number): Promise<BlogPost[]> =>
  mockDelay(limit ? BLOG_POSTS.slice(0, limit) : BLOG_POSTS);

/** A single post by slug — `undefined` when the slug is unknown. */
export const getBlogPostBySlug = (slug: string): Promise<BlogPost | undefined> =>
  mockDelay(BLOG_POSTS.find((post) => post.slug === slug));

/** The full details payload for a post, or `undefined` for an unknown slug. */
export const getBlogDetail = (slug: string): Promise<BlogDetail | undefined> => {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  return mockDelay(post ? buildBlogDetail(post, BLOG_POSTS) : undefined);
};

/** The most recent posts, for sidebars. */
export const getRecentPosts = (limit = 4): Promise<BlogPost[]> =>
  mockDelay(
    [...BLOG_POSTS]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, limit),
  );

/** Category names with post counts, newest-defined order preserved. */
export const getBlogCategories = (): Promise<BlogCategory[]> => {
  const counts = new Map<string, number>();
  for (const post of BLOG_POSTS) {
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }
  return mockDelay(
    Array.from(counts, ([name, count]) => ({ name, count })),
  );
};

export const getOffers = (): Promise<Offer[]> => mockDelay(OFFERS);

export const getTestimonials = (): Promise<Testimonial[]> => mockDelay(TESTIMONIALS);

export const getFeatures = (): Promise<Feature[]> => mockDelay(FEATURES);

export const getStats = (): Promise<Stat[]> => mockDelay(STATS);

/** Time-limited flash deals for the home "Flash deals" band. */
export const getFlashDeals = (limit?: number): Promise<FlashDeal[]> =>
  mockDelay(limit ? FLASH_DEALS.slice(0, limit) : FLASH_DEALS);

/** Curated multi-item packages for the "Trending packages" rail. */
export const getTravelPackages = (limit?: number): Promise<TravelPackage[]> =>
  mockDelay(limit ? TRAVEL_PACKAGES.slice(0, limit) : TRAVEL_PACKAGES);

/** "Browse by country" highlights. */
export const getCountryHighlights = (limit?: number): Promise<CountryHighlight[]> =>
  mockDelay(limit ? COUNTRY_HIGHLIGHTS.slice(0, limit) : COUNTRY_HIGHLIGHTS);

/** Mood/interest inspiration themes. */
export const getInspirationThemes = (): Promise<InspirationTheme[]> =>
  mockDelay(INSPIRATION_THEMES);

/** Partner brands for the trust strip. */
export const getPartners = (): Promise<Partner[]> => mockDelay(PARTNERS);

/** Industry awards / recognitions. */
export const getAwards = (): Promise<Award[]> => mockDelay(AWARDS);
