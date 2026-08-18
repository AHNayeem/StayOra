import type { Metadata } from "next";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { BlogListing } from "@/components/sections/blog";
import { NewsletterSection } from "@/components/sections/newsletter-section";

const BANNER_IMAGE =
  "https://images.unsplash.com/photo-1499591934245-40b55745b905?auto=format&fit=crop&w=1600&q=80";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Travel guides, tips and inspiration from the Otithee team — plan smarter and travel better.",
  alternates: { canonical: "/blogs" },
};

/** `?category=` / `?tag=` / `?q=` seed the listing's filters from the URL. */
type SearchParams = {
  searchParams: Promise<{ category?: string; tag?: string; q?: string }>;
};

/**
 * Blog listing — a banner over {@link BlogListing}, which reads published posts
 * from the canonical blog store (search, category filter, tag filter and
 * pagination all client-side over the same rows the dashboard writes).
 *
 * The filters arrive as query parameters so a category or tag link from an
 * article is a real, shareable URL rather than state that only exists after a
 * click.
 */
export default async function BlogsPage({ searchParams }: SearchParams) {
  const { category = "", tag = "", q = "" } = await searchParams;

  return (
    <main className="flex-1">
      <PageBanner
        title="The Otithee blog"
        description="Guides, tips and inspiration to help you plan smarter and travel better."
        image={BANNER_IMAGE}
        imageAlt="Traveller reading in a sunlit window"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      <Section>
        <BlogListing initialCategory={category} initialTag={tag} initialSearch={q} />
      </Section>

      <NewsletterSection />
    </main>
  );
}
