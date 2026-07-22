import type { Metadata } from "next";
import Image from "next/image";
import { getFeatured } from "@/services/catalog";
import { getBlogPosts, getStats } from "@/services/content";
import { FeatureCard } from "@/components/cards/feature-card";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { FeaturedListings } from "@/components/sections/featured-listings";
import { LatestBlog } from "@/components/sections/latest-blog";
import { StatsSection } from "@/components/sections/stats-section";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { ABOUT_HERO, ABOUT_MISSION, ABOUT_STORY, ABOUT_VALUES } from "@/constants/about";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "StayOra is one platform for stays, experiences and transport — built by travellers, for travellers. Learn about our story and the values behind every booking.",
  alternates: { canonical: "/about-us" },
};

/**
 * About — the company story page. Composes existing platform sections (stats,
 * featured packages, latest articles) around page-specific story and values
 * blocks so the design language stays consistent end-to-end.
 */
export default async function AboutPage() {
  const [stats, tours, posts] = await Promise.all([
    getStats(),
    getFeatured("tours", 3),
    getBlogPosts(3),
  ]);

  return (
    <main className="flex-1">
      <PageBanner
        title={ABOUT_HERO.title}
        description={ABOUT_HERO.description}
        image={ABOUT_HERO.image}
        imageAlt={ABOUT_HERO.imageAlt}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About Us" }]}
      />

      {/* Story */}
      <Section background="surface">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-panel">
                <Image
                  src={ABOUT_STORY.image}
                  alt={ABOUT_STORY.imageAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute right-4 bottom-4 hidden w-40 overflow-hidden rounded-card border-4 border-surface shadow-card sm:block">
                <div className="relative aspect-square">
                  <Image
                    src={ABOUT_STORY.secondaryImage}
                    alt={ABOUT_STORY.secondaryImageAlt}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="absolute top-4 left-4 rounded-card bg-surface/95 px-4 py-3 shadow-card backdrop-blur-sm">
                <p className="text-2xl font-bold text-primary">
                  {ABOUT_STORY.highlight.value}
                </p>
                <p className="max-w-28 text-xs text-muted">
                  {ABOUT_STORY.highlight.label}
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal step={1}>
            <div>
              <p className="text-overline">{ABOUT_STORY.eyebrow}</p>
              <h2 className="text-h2 mt-3">{ABOUT_STORY.title}</h2>
              {ABOUT_STORY.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-body">
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      <StatsSection stats={stats} />

      {/* Values */}
      <Section background="surface">
        <SectionHeader {...ABOUT_MISSION} align="center" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ABOUT_VALUES.map((value, index) => (
            <Reveal key={value.id} step={index % 3} className="h-full">
              <FeatureCard feature={value} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Section>

      <FeaturedListings
        items={tours}
        eyebrow="Featured packages"
        title="Trips our travellers love"
        description="A taste of what you can book right now, hand-picked by our team."
        vertical="tours"
        background="muted"
        columns={3}
      />

      <LatestBlog posts={posts} />

      <NewsletterSection />
    </main>
  );
}
