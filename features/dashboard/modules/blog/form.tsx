"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Eye, Wand2 } from "lucide-react";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import { useRbac } from "../../rbac/rbac-provider";
import { Can } from "../../rbac/permission-guard";
import {
  Alert,
  Button,
  buttonVariants,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  Switch,
  Textarea,
} from "../../ui";
import { statusOptions } from "../../lib/status";
import {
  BLOG_DASHBOARD_HREF,
  blogPostHref,
  blogPreviewHref,
} from "@/features/blog/links";
import { slugify } from "@/features/blog/slug";
import { suggestBlogSlug } from "@/features/blog/service";
import { toast } from "@/lib/toast";
import { BlogContentEditor } from "./content-editor";
import {
  useBlogCategoryOptions,
  useCreateBlogPost,
  useUpdateBlogPost,
} from "./hooks";
import { blogPostSchema, toBlogPostFormValues, toBlogPostInput } from "./schemas";
import { BLOG_STATUSES, type BlogPost } from "./types";

interface BlogFormProps {
  /** Present ⇒ edit mode. */
  initial?: BlogPost;
}

/**
 * Create / edit a blog post.
 *
 * One form serves both, because "preserve unchanged fields" is far easier to get
 * right when edit is the same code path as create: the form is loaded from the
 * stored record, and whatever comes back out is what gets written. Editing never
 * creates a second post — the id decides which branch runs.
 *
 * Two parts are worth reading:
 *
 *  - **The slug.** Suggested from the title (only while the author hasn't
 *    touched it), normalised on blur so a typed value can't be un-routable, and
 *    checked for uniqueness by the store — which returns a field error rather
 *    than quietly taking over a published article's URL.
 *  - **Publishing.** Status is a field, so "save as draft" and "publish" are the
 *    same submit. Authors who lack `cms:approve` don't get the published option
 *    at all, which is the RBAC boundary made visible rather than a button that
 *    fails on click.
 */
export function BlogForm({ initial }: BlogFormProps) {
  const router = useRouter();
  const { user, can } = useRbac();
  const create = useCreateBlogPost();
  const update = useUpdateBlogPost();
  const categories = useBlogCategoryOptions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;
  const canPublish = can("cms:approve");

  const form = useZodForm(blogPostSchema, {
    defaultValues: toBlogPostFormValues(initial, {
      // A new post is credited to whoever is signed in — the existing session
      // identity, not a second author table.
      author: user.name,
      authorId: user.id,
      authorAvatar: user.avatarUrl,
    }),
  });

  const title = form.watch("title");
  const slug = form.watch("slug");
  const image = form.watch("image");
  const status = form.watch("status");

  const categoryOptions = (categories.data ?? []).map((row) => ({
    value: row.id,
    label: row.status === "hidden" ? `${row.name} (hidden)` : row.name,
  }));

  /**
   * Offer a slug for the current title.
   *
   * Only auto-fills while the slug is empty: once an author has set one, the URL
   * is a decision and retitling the post must not silently move its page.
   */
  const suggestSlug = (nextTitle: string) => {
    if (form.getFieldState("slug").isDirty || form.getValues("slug")) return;
    const suggestion = suggestBlogSlug(nextTitle, initial?.id);
    if (suggestion) form.setValue("slug", suggestion, { shouldValidate: false });
  };

  const submit = (afterSave: "list" | "preview") =>
    form.handleSubmit(async (values) => {
      setSubmitError(null);
      const categoryName =
        (categories.data ?? []).find((row) => row.id === values.categoryId)?.name ?? "";
      const input = toBlogPostInput(values, categoryName);

      try {
        const saved = initial
          ? await update.mutateAsync({ id: initial.id, input })
          : await create.mutateAsync(input);

        toast.success(
          saved.status === "published"
            ? `${saved.title} is live at /blog/${saved.slug}`
            : isEdit
              ? `${saved.title} saved`
              : `${saved.title} saved as a draft`,
        );
        router.push(
          afterSave === "preview" ? blogPreviewHref(saved) : BLOG_DASHBOARD_HREF,
        );
      } catch (error) {
        if (!applyServerErrors(form.setError, error)) {
          setSubmitError(getErrorMessage(error));
        }
      }
    });

  const errors = form.formState.errors;

  return (
    <form onSubmit={submit("list")} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={BLOG_DASHBOARD_HREF} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          All posts
        </Link>
        {initial && (
          <Link
            href={blogPreviewHref(initial)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Eye className="size-4" aria-hidden="true" />
            Preview
          </Link>
        )}
        {initial?.status === "published" && (
          <Link
            href={blogPostHref(initial)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View public page
          </Link>
        )}
      </div>

      <div className="rounded-card border border-line bg-surface px-6 py-2">
        {submitError && (
          <Alert tone="danger" title="Couldn't save this post" className="my-4">
            {submitError}
          </Alert>
        )}

        <FormSection title="Basics" description="The headline, its URL and the teaser.">
          <FormGrid cols={1}>
            <Input
              label="Title"
              required
              hint="How it appears on cards, the article header and search results"
              {...form.register("title", {
                onBlur: (event) => suggestSlug(event.target.value),
              })}
              error={errors.title?.message}
            />
            <Input
              label="URL slug"
              required
              hint={`Public address: /blog/${slugify(slug || title) || "…"}`}
              {...form.register("slug", {
                // Normalising on blur means an author can paste anything and
                // still end up with a URL the router matches.
                onBlur: (event) =>
                  form.setValue("slug", slugify(event.target.value), { shouldValidate: true }),
              })}
              error={errors.slug?.message}
              rightIcon={
                <button
                  type="button"
                  onClick={() =>
                    form.setValue("slug", suggestBlogSlug(form.getValues("title"), initial?.id), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className="text-muted transition-colors hover:text-primary"
                  aria-label="Suggest a slug from the title"
                  title="Suggest a slug from the title"
                >
                  <Wand2 className="size-4" aria-hidden="true" />
                </button>
              }
            />
            <Textarea
              label="Excerpt"
              rows={2}
              hint="One line for cards and search results. Left blank, it's taken from the opening paragraph."
              {...form.register("excerpt")}
              error={errors.excerpt?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Cover image"
          description="Shown on cards, at the top of the article and in social previews."
        >
          <FormGrid cols={1}>
            <Input
              label="Cover image URL"
              required
              placeholder="https://images.unsplash.com/photo-…"
              hint="Paste an image URL. A real upload pipeline drops in here without touching the record shape."
              {...form.register("image")}
              error={errors.image?.message}
            />
            <Input
              label="Alt text"
              hint="Describe the image for screen readers. Falls back to the title when blank."
              {...form.register("imageAlt")}
              error={errors.imageAlt?.message}
            />
            {/^https?:\/\/\S+$/.test(image) && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink">Preview</span>
                <span className="relative block aspect-video w-full max-w-sm overflow-hidden rounded-card bg-surface-muted">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="384px"
                    className="object-cover"
                    unoptimized
                  />
                </span>
              </div>
            )}
            <Textarea
              label="Gallery image URLs"
              rows={3}
              hint="One URL per line — reference these from the article body with the image button."
              {...form.register("gallery")}
              error={errors.gallery?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Article"
          description="Headings, lists, quotes, links and images. Switch to Preview to see it as a reader would."
        >
          <BlogContentEditor
            value={form.watch("content")}
            onChange={(value) => form.setValue("content", value, { shouldDirty: true })}
            onBlur={() => void form.trigger("content")}
            required
            error={errors.content?.message}
            hint="Formatting is stored as structured blocks, not HTML."
          />
        </FormSection>

        <FormSection title="Organisation" description="How readers find this post.">
          <FormGrid cols={2}>
            <Select
              label="Category"
              required
              options={[{ value: "", label: "Choose a category…" }, ...categoryOptions]}
              {...form.register("categoryId")}
              error={errors.categoryId?.message}
              hint={
                categoryOptions.length === 0
                  ? "No categories yet — create one under Blog → Categories."
                  : undefined
              }
            />
            <Input
              label="Author"
              required
              hint="Defaults to you; change it when publishing on someone's behalf."
              {...form.register("author")}
              error={errors.author?.message}
            />
          </FormGrid>
          <FormGrid cols={1}>
            <Input
              label="Tags"
              hint="Comma separated — e.g. Bali, Beach, Indonesia. Duplicates and casing are normalised on save."
              {...form.register("tags")}
              error={errors.tags?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Publishing"
          description="Drafts and archived posts never appear on the public blog."
        >
          <FormGrid cols={3}>
            <Select
              label="Status"
              options={
                // Publishing is a separate permission, so an author without it
                // simply isn't offered the option rather than being refused later.
                canPublish
                  ? statusOptions(BLOG_STATUSES)
                  : statusOptions(BLOG_STATUSES).filter((option) => option.value !== "published")
              }
              {...form.register("status")}
              error={errors.status?.message}
              hint={canPublish ? undefined : "You can save drafts; publishing needs approval rights."}
            />
            <Input
              type="datetime-local"
              label="Publish date"
              hint={
                status === "published"
                  ? "Leave blank to stamp the moment you save."
                  : "Used when this post goes live."
              }
              {...form.register("publishedAt")}
              error={errors.publishedAt?.message}
            />
            <Can anyPermission={["cms:approve"]}>
              <Switch
                label="Featured"
                hint="Promote on the home page and in the featured band"
                {...form.register("featured")}
              />
            </Can>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Search engines"
          description="All three fall back to the post's own copy when left blank."
        >
          <FormGrid cols={1}>
            <Input
              label="SEO title"
              hint="e.g. 10 Hidden Beaches Worth the Trip | Otithee"
              {...form.register("seoTitle")}
              error={errors.seoTitle?.message}
            />
            <Textarea
              label="SEO description"
              rows={2}
              {...form.register("seoDescription")}
              error={errors.seoDescription?.message}
            />
            <Input
              label="SEO keywords"
              hint="Comma separated"
              {...form.register("seoKeywords")}
              error={errors.seoKeywords?.message}
            />
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(BLOG_DASHBOARD_HREF)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={pending}
            onClick={() => void submit("preview")()}
          >
            Save &amp; preview
          </Button>
          <Button type="submit" size="sm" loading={pending}>
            {isEdit ? "Save changes" : "Create post"}
          </Button>
        </FormActions>
      </div>
    </form>
  );
}
