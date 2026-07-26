export interface SeoEntry {
  id: string;
  /** Route the meta applies to, e.g. /hotels. */
  path: string;
  title: string;
  description: string;
  /** Canonical URL; empty means self-referential. */
  canonical: string;
  /** Open Graph image URL; empty means the site default. */
  ogImage: string;
  /** Whether search engines may index the route. */
  indexable: boolean;
  updatedAt: string;
}

/** SEO copy guidelines used for the length quality hints. */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;
