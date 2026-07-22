import type { Metadata } from "next";
import { getBlogCategories, getBlogPosts, getRecentPosts } from "@/services/content";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { BlogListing } from "@/components/sections/blog";
import { NewsletterSection } from "@/components/sections/newsletter-section";

const BANNER_IMAGE =
  "https://images.unsplash.com/photo-1499591934245-40b55745b905?auto=format&fit=crop&w=1600&q=80";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Travel guides, tips and inspiration from the StayOra team — plan smarter and travel better.",
  alternates: { canonical: "/blogs" },
};

/**
 * Blog listing — a banner over the client-driven {@link BlogListing} (search,
 * category filter and pagination) with a sidebar. Data is fetched here through
 * the service layer and filtered client-side.
 */
export default async function BlogsPage() {
  const [posts, categories, recent] = await Promise.all([
    getBlogPosts(),
    getBlogCategories(),
    getRecentPosts(4),
  ]);

  return (
    <main className="flex-1">
      <PageBanner
        title="The StayOra blog"
        description="Guides, tips and inspiration to help you plan smarter and travel better."
        image={BANNER_IMAGE}
        imageAlt="Traveller reading in a sunlit window"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      <Section>
        <BlogListing posts={posts} categories={categories} recent={recent} />
      </Section>

      <NewsletterSection />
    </main>
  );
}
