import { siteConfig } from "@/constants/site";
import { blogPostHref } from "@/features/blog/links";
import type { BlogPost } from "@/types/content";
import type { Destination } from "@/types/destination";
import type { FaqGroup } from "@/constants/faq";

/**
 * A single schema.org node. Values are intentionally loose (`unknown`) because
 * JSON-LD graphs nest arbitrary vocabulary; builders below keep the shapes typed
 * at the call site. Rendered by {@link ../components/shared/json-ld}.
 */
export type JsonLd = Record<string, unknown>;

const BASE = siteConfig.url;

/** Organization node — brand identity, contact point and social profiles. */
export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE}/#organization`,
    name: siteConfig.name,
    url: BASE,
    description: siteConfig.description,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phone,
      email: siteConfig.contact.email,
      contactType: "customer support",
      availableLanguage: siteConfig.locales.map((locale) => locale.label),
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.address,
    },
    sameAs: siteConfig.social.map((profile) => profile.href),
  };
}

/** WebSite node — enables the sitelinks search box in results. */
export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE}/#website`,
    name: siteConfig.name,
    url: BASE,
    description: siteConfig.description,
    publisher: { "@id": `${BASE}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE}/destinations?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** BreadcrumbList node from an ordered list of crumbs (last may omit `href`). */
export function breadcrumbSchema(
  items: { name: string; href?: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: `${BASE}${item.href}` } : {}),
    })),
  };
}

/** BlogPosting node for an article detail page. */
export function articleSchema(post: BlogPost): JsonLd {
  const url = `${BASE}${blogPostHref(post)}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}/#article`,
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
    datePublished: post.publishedAt ?? post.updatedAt,
    dateModified: post.updatedAt,
    articleSection: post.category,
    author: { "@type": "Person", name: post.author },
    publisher: { "@id": `${BASE}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

/** FAQPage node built from the grouped FAQ content. */
export function faqSchema(groups: FaqGroup[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };
}

/**
 * TouristDestination node for a destination detail page.
 *
 * Built entirely from the destination record — the same values the page renders —
 * so a place added in the dashboard is described correctly without anyone
 * touching this file.
 */
export function destinationSchema(destination: Destination): JsonLd {
  const url = `${BASE}/destinations/${destination.slug}`;
  const attractions = destination.attractions ?? [];

  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${url}/#destination`,
    name: destination.name,
    description:
      destination.metadata?.seoDescription ??
      destination.shortDescription ??
      destination.description,
    url,
    image: [destination.image, ...(destination.gallery ?? [])],
    address: {
      "@type": "PostalAddress",
      addressCountry: destination.country,
      ...(destination.region ? { addressRegion: destination.region } : {}),
    },
    ...(destination.latitude !== undefined && destination.longitude !== undefined
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        }
      : {}),
    ...(attractions.length > 0
      ? {
          includesAttraction: attractions.map((name) => ({
            "@type": "TouristAttraction",
            name,
          })),
        }
      : {}),
  };
}
