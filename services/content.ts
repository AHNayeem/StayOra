/**
 * content.ts — service seam for editorial / marketing content. Mirrors
 * {@link "./catalog"}: typed mock data resolved through {@link mockDelay},
 * ready to swap for a CMS or API.
 */

import type {
  BlogPost,
  Feature,
  Offer,
  Stat,
  Testimonial,
} from "@/types/content";
import type { Destination } from "@/types/destination";
import type { BlogCategory, BlogDetail } from "@/types/blog";
import type {
  Award,
  CountryHighlight,
  FlashDeal,
  InspirationTheme,
  Partner,
  TravelPackage,
} from "@/types/home";
import { FEATURES, OFFERS, STATS, TESTIMONIALS } from "@/constants/content";
import {
  AWARDS,
  COUNTRY_HIGHLIGHTS,
  FLASH_DEALS,
  INSPIRATION_THEMES,
  PARTNERS,
  TRAVEL_PACKAGES,
} from "@/constants/home-data";
import {
  getBlogCategories as listBlogCategories,
  getBlogDetail as readBlogDetail,
  getBlogPostBySlug as readBlogPostBySlug,
  getBlogPosts as listBlogPosts,
} from "@/features/blog/service";
import { getDestinations as listDestinations } from "@/features/destinations/service";
import { mockDelay } from "./http";

/**
 * Published destinations for the home rails.
 *
 * Delegates to `features/destinations` rather than holding its own array, so a
 * destination published (or archived) in the dashboard changes the home page too.
 */
export const getDestinations = (limit?: number): Promise<Destination[]> =>
  listDestinations({ status: "published", limit });

/**
 * Published blog posts for the home rail and the sitemap.
 *
 * Delegates to `features/blog` rather than holding its own array, so a post
 * published (or archived) in the dashboard changes the home page too. Drafts and
 * archived posts are excluded by the service, not by the caller.
 */
export const getBlogPosts = (limit?: number): Promise<BlogPost[]> =>
  listBlogPosts({ status: "published", limit });

/** A single *published* post by slug — `undefined` when the slug is unknown. */
export const getBlogPostBySlug = (slug: string): Promise<BlogPost | undefined> =>
  readBlogPostBySlug(slug);

/** The full details payload for a post, or `undefined` for an unknown slug. */
export const getBlogDetail = (slug: string): Promise<BlogDetail | undefined> =>
  readBlogDetail(slug);

/** The most recently published posts, for sidebars. */
export const getRecentPosts = (limit = 4): Promise<BlogPost[]> =>
  listBlogPosts({ status: "published", limit });

/** Categories with published-post counts, newest-defined order preserved. */
export const getBlogCategories = (): Promise<BlogCategory[]> => listBlogCategories();

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
