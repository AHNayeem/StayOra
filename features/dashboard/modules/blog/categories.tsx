"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import { ConfirmDialog } from "../../crud";
import { Can } from "../../rbac/permission-guard";
import {
  Alert,
  Button,
  buttonVariants,
  Input,
  Modal,
  Select,
  StatusBadge,
  TableSkeleton,
  Textarea,
} from "../../ui";
import { labelMap, statusOptions, toneMap } from "../../lib/status";
import { BLOG_DASHBOARD_HREF, blogCategoryHref } from "@/features/blog/links";
import { slugify } from "@/features/blog/slug";
import { suggestBlogCategorySlug } from "@/features/blog/service";
import { toast } from "@/lib/toast";
import {
  useBlogCategoryOptions,
  useCreateBlogCategory,
  useDeleteBlogCategory,
  useUpdateBlogCategory,
} from "./hooks";
import { blogCategorySchema, type BlogCategoryFormValues } from "./schemas";
import { BLOG_CATEGORY_STATUSES, type BlogCategory } from "./types";

const statusTone = toneMap(BLOG_CATEGORY_STATUSES);
const statusLabel = labelMap(BLOG_CATEGORY_STATUSES);

const EMPTY: BlogCategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  status: "active",
};

/**
 * Blog categories — a small, complete CRUD screen.
 *
 * Categories are records, not strings, so they can be renamed without editing
 * every post (the store propagates the new name) and each has a stable slug the
 * public listing filters by. Deleting one is refused while posts are still filed
 * under it — hiding is offered instead, which keeps those posts' category label
 * intact while taking the facet off the storefront.
 *
 * A table plus a modal form rather than full pages: a category is four fields,
 * and leaving the list to edit one would lose the counts an editor is comparing.
 */
export function BlogCategoryManager() {
  const query = useBlogCategoryOptions();
  const create = useCreateBlogCategory();
  const update = useUpdateBlogCategory();
  const remove = useDeleteBlogCategory();

  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BlogCategory | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const open = creating || editing !== null;
  const form = useZodForm(blogCategorySchema, { defaultValues: EMPTY });

  const openCreate = () => {
    form.reset(EMPTY);
    setSubmitError(null);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (category: BlogCategory) => {
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      status: category.status,
    });
    setSubmitError(null);
    setCreating(false);
    setEditing(category);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const input = {
      name: values.name,
      slug: values.slug,
      description: values.description || undefined,
      status: values.status,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast.success(`${values.name} saved`);
      } else {
        await create.mutateAsync(input);
        toast.success(`${values.name} created`);
      }
      close();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (error) {
      // The store's own message is the useful one here — it names the category
      // and counts the posts blocking the delete. `getErrorMessage` maps every
      // validation failure to "review the highlighted fields", which is advice
      // for a form and meaningless for a confirm dialog with no fields in it.
      toast.error(
        error instanceof Error && error.message ? error.message : getErrorMessage(error),
      );
      setDeleting(null);
    }
  };

  const rows = query.data ?? [];
  const errors = form.formState.errors;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={BLOG_DASHBOARD_HREF} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          All posts
        </Link>
        <Can anyPermission={["cms:create"]}>
          <Button size="sm" onClick={openCreate} className="ml-auto">
            <Plus className="size-4" aria-hidden="true" />
            New category
          </Button>
        </Can>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {query.isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Blog categories</caption>
            <thead className="border-b border-line bg-surface-muted text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">Category</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">Slug</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-ink">Posts</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-ink">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    No categories yet. Create one to start filing posts.
                  </td>
                </tr>
              ) : (
                rows.map((category) => (
                  <tr key={category.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink">{category.name}</span>
                      {category.description && (
                        <span className="block text-xs text-muted">{category.description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={blogCategoryHref(category)}
                        className="font-mono text-xs text-muted underline-offset-2 hover:text-primary hover:underline"
                      >
                        /{category.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone[category.status]}>
                        {statusLabel[category.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-body">
                      {category.count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Can anyPermission={["cms:update"]}>
                          <button
                            type="button"
                            onClick={() => openEdit(category)}
                            aria-label={`Edit ${category.name}`}
                            className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                        </Can>
                        <Can anyPermission={["cms:delete"]}>
                          <button
                            type="button"
                            onClick={() => setDeleting(category)}
                            aria-label={`Delete ${category.name}`}
                            className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-danger-50 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={open}
        onClose={close}
        title={editing ? "Edit category" : "New category"}
        description="Renaming a category updates every post filed under it."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={create.isPending || update.isPending}
              onClick={() => void onSubmit()}
            >
              {editing ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {submitError && <Alert tone="danger">{submitError}</Alert>}
          <Input
            label="Name"
            required
            {...form.register("name", {
              onBlur: (event) => {
                if (form.getValues("slug")) return;
                form.setValue("slug", suggestBlogCategorySlug(event.target.value, editing?.id));
              },
            })}
            error={errors.name?.message}
          />
          <Input
            label="Slug"
            hint="Used in /blogs?category=… — leave blank to derive it from the name"
            {...form.register("slug", {
              onBlur: (event) =>
                form.setValue("slug", slugify(event.target.value), { shouldValidate: true }),
            })}
            error={errors.slug?.message}
          />
          <Textarea
            label="Description"
            rows={2}
            {...form.register("description")}
            error={errors.description?.message}
          />
          <Select
            label="Status"
            options={statusOptions(BLOG_CATEGORY_STATUSES)}
            hint="Hidden categories keep their posts but stop appearing as a filter."
            {...form.register("status")}
            error={errors.status?.message}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title="Delete category?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will be
            removed. Posts filed under it block the delete — move them first, or set the
            category to hidden to take it off the public blog without touching them.
          </>
        }
        confirmLabel="Delete category"
      />
    </div>
  );
}
