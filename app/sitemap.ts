import type { MetadataRoute } from "next";
import { siteConfig } from "@/constants/site";
import { VERTICAL_LIST } from "@/constants/verticals";
import { getAllListings } from "@/services/catalog";
import { getBlogPosts } from "@/services/content";

const BASE = siteConfig.url;

/** Static content routes with their crawl hints. */
const STATIC_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/destinations", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.7 },
  { path: "/about-us", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact-us", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faqs", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms-and-conditions", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * sitemap.xml — enumerates every indexable URL: static content pages, each
 * vertical's listing page, all listing detail pages, and every blog article.
 * Detail and blog URLs are pulled from the service layer so the sitemap stays
 * in sync with the catalogue (and with `generateStaticParams`) automatically.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Listing index pages, one per vertical.
  const verticalEntries: MetadataRoute.Sitemap = VERTICAL_LIST.map((vertical) => ({
    url: `${BASE}${vertical.href}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Listing detail pages, gathered across every vertical.
  const listingsByVertical = await Promise.all(
    VERTICAL_LIST.map(async (vertical) => {
      const listings = await getAllListings(vertical.key);
      return listings.map<MetadataRoute.Sitemap[number]>((listing) => ({
        url: `${BASE}${vertical.href}/${listing.slug}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      }));
    }),
  );
  const detailEntries = listingsByVertical.flat();

  // Blog articles.
  const posts = await getBlogPosts();
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
    images: [post.image],
  }));

  return [...staticEntries, ...verticalEntries, ...detailEntries, ...blogEntries];
}
