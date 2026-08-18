import { z } from "zod";
import type { BlogPost, BlogPostInput } from "@/types/blog";
import { BLOG_STATUS_VALUES } from "@/types/blog";
import { isValidSlug } from "@/features/blog/slug";
import {
  excerptFromContent,
  parseBlogContent,
  serializeBlogContent,
} from "@/lib/blog-content";
import { requiredString } from "../../schemas/common";

/**
 * Blog post form schema — one schema for create and edit.
 *
 * The content field is authored as text and *stored* as a block list:
 * {@link toBlogPostInput} runs it through `parseBlogContent` on submit and
 * {@link toBlogPostFormValues} serialises it back for editing. Keeping that
 * conversion here rather than in the component means the form holds no
 * data-shaping logic, and the round-trip is exact, so opening and re-saving a
 * post never rewrites its structure.
 *
 * Slug rules live here too: the field may be left blank (the store derives one
 * from the title) but anything typed has to be a real slug. *Uniqueness* is not
 * checkable in a schema — the store owns that and returns a field error.
 */
export const blogPostSchema = z.object({
  title: requiredString.pipe(z.string().max(120, "Keep the title under 120 characters")),
  slug: z
    .string()
    .trim()
    .default("")
    .refine(
      (value) => value === "" || isValidSlug(value),
      "Use lowercase letters, numbers and hyphens only — e.g. packing-light",
    ),
  excerpt: z
    .string()
    .trim()
    .max(220, "Keep the excerpt under 220 characters")
    .default(""),
  content: requiredString.pipe(
    z.string().min(80, "Write at least a short article — a couple of paragraphs"),
  ),

  image: requiredString.refine(
    (value) => /^https?:\/\/\S+$/.test(value),
    "Use a full https:// image URL",
  ),
  imageAlt: z
    .string()
    .trim()
    .max(160, "Keep the alt text under 160 characters")
    .default(""),
  /** One URL per line. */
  gallery: z.string().default(""),

  categoryId: requiredString.describe("category"),
  /** Comma or newline separated; normalised by the store. */
  tags: z.string().default(""),
  author: requiredString.pipe(z.string().max(80, "Keep the author name under 80 characters")),
  authorId: z.string().trim().default(""),
  authorAvatar: z.string().trim().default(""),
  featured: z.boolean().default(false),

  status: z.enum(BLOG_STATUS_VALUES),
  /**
   * `datetime-local` value ("2026-08-18T09:00"), or blank to let the store stamp
   * the moment of publishing.
   */
  publishedAt: z.string().trim().default(""),

  seoTitle: z.string().trim().max(70, "Search engines truncate past ~70 characters").default(""),
  seoDescription: z
    .string()
    .trim()
    .max(180, "Search engines truncate past ~180 characters")
    .default(""),
  seoKeywords: z.string().trim().default(""),
});

export type BlogPostFormValues = z.infer<typeof blogPostSchema>;

/** Split a newline/comma separated field into clean, de-duplicated values. */
function toList(value: string): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(/[\n,]/)) {
    const item = raw.trim();
    if (item) seen.add(item);
  }
  return [...seen];
}

const joinList = (values: string[] | undefined, separator = "\n"): string =>
  (values ?? []).join(separator);

/** `datetime-local` ⇄ ISO. Blank stays blank so the store can decide. */
function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // `datetime-local` has no timezone, so render the local wall-clock time the
  // author will see rather than a UTC string they didn't type.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * Form values → the shape the blog store stores.
 *
 * `categoryName` is looked up by the caller (the form knows the category list)
 * and passed in, because the store keeps the name denormalised on the post for
 * rendering while the id stays the reference.
 */
export function toBlogPostInput(
  values: BlogPostFormValues,
  categoryName: string,
): BlogPostInput {
  const content = parseBlogContent(values.content);
  const gallery = toList(values.gallery);
  const keywords = toList(values.seoKeywords);

  return {
    title: values.title,
    // Blank means "derive it from the title" — the store owns slug generation.
    slug: values.slug,
    // A blank excerpt is filled from the article rather than left empty: it is
    // what cards and search results show, so an empty one is a visible hole.
    excerpt: values.excerpt || excerptFromContent(content),
    content,
    image: values.image,
    imageAlt: values.imageAlt || undefined,
    gallery: gallery.length > 0 ? gallery : undefined,
    author: values.author,
    authorId: values.authorId || undefined,
    authorAvatar: values.authorAvatar || undefined,
    categoryId: values.categoryId,
    category: categoryName,
    tags: toList(values.tags),
    status: values.status,
    featured: values.featured,
    publishedAt: toIso(values.publishedAt),
    seo:
      values.seoTitle || values.seoDescription || keywords.length > 0
        ? {
            title: values.seoTitle || undefined,
            description: values.seoDescription || undefined,
            keywords: keywords.length > 0 ? keywords : undefined,
          }
        : undefined,
  };
}

/** A stored post → form values, for the edit screen. */
export function toBlogPostFormValues(
  post?: BlogPost,
  defaults: { author?: string; authorId?: string; authorAvatar?: string } = {},
): BlogPostFormValues {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post ? serializeBlogContent(post.content) : "",
    image: post?.image ?? "",
    imageAlt: post?.imageAlt ?? "",
    gallery: joinList(post?.gallery),
    categoryId: post?.categoryId ?? "",
    tags: joinList(post?.tags, ", "),
    // A new post is credited to whoever is signed in; an existing one keeps the
    // author it was written by.
    author: post?.author ?? defaults.author ?? "",
    authorId: post?.authorId ?? defaults.authorId ?? "",
    authorAvatar: post?.authorAvatar ?? defaults.authorAvatar ?? "",
    featured: post?.featured ?? false,
    status: post?.status ?? "draft",
    publishedAt: toLocalInput(post?.publishedAt),
    seoTitle: post?.seo?.title ?? "",
    seoDescription: post?.seo?.description ?? "",
    seoKeywords: joinList(post?.seo?.keywords, ", "),
  };
}

/** Category form — small enough to live beside the post schema. */
export const blogCategorySchema = z.object({
  name: requiredString.pipe(z.string().max(60, "Keep the name under 60 characters")),
  slug: z
    .string()
    .trim()
    .default("")
    .refine(
      (value) => value === "" || isValidSlug(value),
      "Use lowercase letters, numbers and hyphens only — e.g. travel-tips",
    ),
  description: z
    .string()
    .trim()
    .max(200, "Keep the description under 200 characters")
    .default(""),
  status: z.enum(["active", "hidden"]),
});

export type BlogCategoryFormValues = z.infer<typeof blogCategorySchema>;
