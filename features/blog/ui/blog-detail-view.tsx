import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import type { BlogCategory, BlogDetail, BlogPost } from "@/types/blog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { BlogCard } from "@/components/cards/blog-card";
import { BlogComments, BlogPostBody, BlogSidebar } from "@/components/sections/blog";
import { SocialIcon } from "@/components/shared/social-icons";
import { Reveal } from "@/components/shared/reveal";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { siteConfig } from "@/constants/site";
import { BLOG_HREF, blogPostHref, blogTagHref } from "../links";
import { postDate } from "../service";

/** Format an ISO date as "18 June 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface BlogDetailViewProps {
  detail: BlogDetail;
  categories: BlogCategory[];
  recent: BlogPost[];
  /** Rendered above the banner — the dashboard's preview bar slots in here. */
  banner?: React.ReactNode;
  /** Preview hides the newsletter/comment furniture that isn't being reviewed. */
  preview?: boolean;
}

/**
 * The article page body, shared by three callers so they cannot drift:
 *
 *  - `/blog/[slug]` server-renders it for a published post;
 *  - {@link import("./blog-resolver").BlogResolver} renders it for a post that
 *    exists only in this browser's store;
 *  - the dashboard preview renders it for a draft, which is what makes "preview"
 *    an honest approximation of the live page rather than a second layout that
 *    slowly diverges from it.
 */
export function BlogDetailView({
  detail,
  categories,
  recent,
  banner,
  preview = false,
}: BlogDetailViewProps) {
  const { post, body, tags, comments, related } = detail;
  const shareUrl = `${siteConfig.url}${blogPostHref(post)}`;
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

  return (
    <main className="flex-1">
      {banner}
      <PageBanner
        title={post.title}
        image={post.image}
        imageAlt={post.imageAlt || post.title}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Blog", href: BLOG_HREF },
          { label: post.title },
        ]}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Badge variant="accent">{post.category}</Badge>
          <span className="inline-flex items-center gap-1.5 text-white/85">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatDate(postDate(post))}
          </span>
          <span className="inline-flex items-center gap-1.5 text-white/85">
            <Clock className="size-4" aria-hidden="true" />
            {post.readMinutes} min read
          </span>
          <span className="inline-flex items-center gap-2">
            <Avatar name={post.author} src={post.authorAvatar} size="sm" ring />
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
                    {/* Tags link to the index filtered by that tag, so the link
                        lands somewhere that actually shows related reading. */}
                    <Link
                      href={blogTagHref(tag)}
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

            {!preview && (
              <div className="mt-12">
                <BlogComments comments={comments} />
              </div>
            )}
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

      {!preview && <NewsletterSection />}
    </main>
  );
}
