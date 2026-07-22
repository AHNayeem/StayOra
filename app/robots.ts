import type { MetadataRoute } from "next";
import { siteConfig } from "@/constants/site";

/**
 * robots.txt — allow all crawlers and point them at the sitemap. `metadataBase`
 * (set in the root layout) resolves the relative sitemap path to an absolute URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
