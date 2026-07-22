import type { MetadataRoute } from "next";
import { siteConfig } from "@/constants/site";

/**
 * Web app manifest — installable-PWA basics and browser theming. Colours mirror
 * the brand tokens in `globals.css` (`--color-primary` / `--color-surface`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#63ab45",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
