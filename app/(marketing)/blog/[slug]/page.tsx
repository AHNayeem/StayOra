import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/shared/json-ld";
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data";
import { stripInline } from "@/lib/blog-content";
import {
  BLOG_HREF,
  BlogArticle,
  blogPostHref,
  buildBlogDetail,
  getBlogDetail,
  getBlogPosts,
  getBlogPostBySlugSync,
  getBlogPostsSync,
} from "@/features/blog";

/** Params for this dynamic route (a Promise in the App Router — always awaited). */
type Params = { params: Promise<{ slug: string }> };

/** Pre-render every published post the prototype ships with. */
export async function generateStaticParams() {
  const posts = await getBlogPosts({ status: "published" });
  return posts.map((post) => ({ slug: post.slug }));
}

/**
 * Metadata built from the post record: its SEO overrides when an author set
 * them, its own copy otherwise. Nothing here knows about any one article — the
 * Bali/beaches post gets its metadata the same way a post created five minutes
 * ago does.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getBlogDetail(slug);

  if (!detail) {
    return { title: "Article not found", robots: { index: false, follow: true } };
  }

  const { post } = detail;
  const title = post.seo?.title ?? post.title;
  const description = post.seo?.description ?? stripInline(post.excerpt);
  const url = blogPostHref(post);

  return {
    title,
    description,
    ...(post.seo?.keywords?.length ? { keywords: post.seo.keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [{ url: post.image, alt: post.imageAlt || post.title }],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [post.image],
    },
  };
}

/**
 * Blog article.
 *
 * Resolution is always by slug through the blog service — there is no
 * per-article branching here, so publishing a post adds a working page and
 * nothing in this file knows which articles exist.
 *
 * The server answers with whatever it can see (the seed) and {@link BlogArticle}
 * reconciles that against the browser's store after hydration, which is what
 * makes an edit in the dashboard show up on the article. A slug the server
 * *knows* is unpublished still 404s here, immediately and with a real 404
 * status, so a draft URL shared by mistake never renders.
 */
export default async function BlogDetailPage({ params }: Params) {
  const { slug } = await params;

  const known = getBlogPostBySlugSync(slug, { preview: true });
  if (known && known.status !== "published") notFound();

  const detail = known ? buildBlogDetail(known, getBlogPostsSync({ status: "any" })) : null;

  const breadcrumb = [
    { name: "Home", href: "/" },
    { name: "Blog", href: BLOG_HREF },
    ...(detail ? [{ name: detail.post.title }] : []),
  ];

  return (
    <>
      {detail && <JsonLd data={[articleSchema(detail.post), breadcrumbSchema(breadcrumb)]} />}
      <BlogArticle slug={slug} initial={detail} />
    </>
  );
}
