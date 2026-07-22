import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import {
  getBlogCategories,
  getBlogDetail,
  getBlogPostBySlug,
  getBlogPosts,
  getRecentPosts,
} from "@/services/content";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { BlogCard } from "@/components/cards/blog-card";
import { BlogComments, BlogPostBody, BlogSidebar } from "@/components/sections/blog";
import { SocialIcon } from "@/components/shared/social-icons";
import { Reveal } from "@/components/shared/reveal";
import { JsonLd } from "@/components/shared/json-ld";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data";
import { siteConfig } from "@/constants/site";

/** Params for this dynamic route (a Promise in the App Router — always awaited). */
type Params = { params: Promise<{ slug: string }> };

/** Format an ISO date as "18 June 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function generateStaticParams() {
  return getBlogPosts().then((posts) => posts.map((post) => ({ slug: post.slug })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Article not found" };
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.image, alt: post.title }],
      publishedTime: post.date,
      authors: [post.author],
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

/**
 * Blog details — banner (title, meta, hero image) over a two-column body: the
 * article, tags, share links and comments beside the shared {@link BlogSidebar}.
 * The article body is derived deterministically (SSR-stable) and every post is
 * prerendered via {@link generateStaticParams}.
 */
export default async function BlogDetailPage({ params }: Params) {
  const { slug } = await params;
  const [detail, categories, recent] = await Promise.all([
    getBlogDetail(slug),
    getBlogCategories(),
    getRecentPosts(4),
  ]);
  if (!detail) notFound();

  const { post, body, tags, comments, related } = detail;
  const shareUrl = `${siteConfig.url}/blog/${post.slug}`;
  const shareLinks = [
    {
      icon: "facebook",
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      icon: "twitter",
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`,
    },
    {
      icon: "linkedin",
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  const breadcrumb = [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blogs" },
    { name: post.title },
  ];

  return (
    <main className="flex-1">
      <JsonLd data={[articleSchema(post), breadcrumbSchema(breadcrumb)]} />
      <PageBanner
        title={post.title}
        image={post.image}
        imageAlt={post.title}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blogs" },
          { label: post.title },
        ]}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Badge variant="accent">{post.category}</Badge>
          <span className="inline-flex items-center gap-1.5 text-white/85">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatDate(post.date)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-white/85">
            <Clock className="size-4" aria-hidden="true" />
            {post.readMinutes} min read
          </span>
          <span className="inline-flex items-center gap-2">
            <Avatar name={post.author} size="sm" ring />
            <span className="font-medium text-white">{post.author}</span>
          </span>
        </div>
      </PageBanner>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
          <article className="min-w-0">
            <BlogPostBody blocks={body} />

            {/* Tags + share */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-y border-line py-6">
              <ul className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href="/blogs"
                      className="inline-flex rounded-pill bg-surface-muted px-3 py-1 text-xs font-medium text-body transition-colors hover:bg-primary hover:text-white"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold text-ink">Share</span>
                {shareLinks.map((share) => (
                  <a
                    key={share.icon}
                    href={share.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={share.label}
                    className="grid size-9 place-items-center rounded-full border border-line text-ink transition-colors hover:border-primary hover:bg-primary hover:text-white"
                  >
                    <SocialIcon name={share.icon} className="size-4" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-12">
              <BlogComments comments={comments} />
            </div>
          </article>

          <BlogSidebar categories={categories} recent={recent} />
        </div>
      </Section>

      {related.length > 0 && (
        <Section background="muted">
          <SectionHeader eyebrow="Keep reading" title="More from the blog" />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, index) => (
              <Reveal key={item.id} step={index % 3} className="h-full">
                <BlogCard post={item} className="h-full" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <NewsletterSection />
    </main>
  );
}
