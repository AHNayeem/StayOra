"use client";

import { type ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import {
  archiveBlogPost,
  publishBlogPost,
  unpublishBlogPost,
} from "@/features/blog/service";
import type {
  BlogCategory,
  BlogCategoryInput,
  BlogCategoryPatch,
  BlogPost,
  BlogPostInput,
  BlogPostPatch,
  BlogStatus,
} from "@/types/blog";
import { blogColumns } from "./columns";
import { blogCategoryService, blogKeys, blogService, getBlogSummary } from "./service";

/** List posts, optionally with a trailing row-actions column. */
export function useBlogList(rowActions?: (row: BlogPost) => ReactNode) {
  return useResourceList<BlogPost>({
    queryKey: blogKeys.all,
    fetcher: (params, signal) => blogService.list(params, signal),
    columns: blogColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "updatedAt", direction: "desc" },
    rowActions,
  });
}

export function useBlogSummary() {
  return useQuery({
    queryKey: blogKeys.summary,
    queryFn: () => getBlogSummary(),
    staleTime: 30_000,
  });
}

/** One post for the edit and preview screens. */
export function useBlogPost(id: string) {
  return useQuery({
    queryKey: blogKeys.detail(id),
    queryFn: () => blogService.get(id),
  });
}

/** Every category, for the form's picker and the category screen. */
export function useBlogCategoryOptions() {
  return useQuery({
    queryKey: blogKeys.categories,
    queryFn: () => blogCategoryService.list({ pageSize: 200 }).then((page) => page.items),
    staleTime: 30_000,
  });
}

/** Keys every post mutation invalidates — list, KPIs and the category counts. */
const INVALIDATES = [blogKeys.all, blogKeys.summary, blogKeys.categories];

export function useCreateBlogPost() {
  return useMutation<BlogPost, BlogPostInput>({
    mutationFn: (input) => blogService.create(input),
    invalidateKeys: INVALIDATES,
  });
}

export function useUpdateBlogPost() {
  return useMutation<BlogPost, { id: string; input: BlogPostPatch }>({
    mutationFn: ({ id, input }) => blogService.update(id, input),
    invalidateKeys: INVALIDATES,
  });
}

/**
 * Move a post through its lifecycle.
 *
 * Routed through the blog *service* rather than a bare status write, so the
 * legal-transition rules apply here exactly as they would to an API caller —
 * archived → published is refused in one place, not in each button.
 */
export function useSetBlogPostStatus() {
  return useMutation<BlogPost, { id: string; status: BlogStatus }>({
    mutationFn: ({ id, status }) => {
      if (status === "published") return publishBlogPost(id);
      if (status === "archived") return archiveBlogPost(id);
      return unpublishBlogPost(id);
    },
    invalidateKeys: INVALIDATES,
  });
}

/** Toggle the featured flag straight from the list. */
export function useSetBlogPostFeatured() {
  return useMutation<BlogPost, { id: string; featured: boolean }>({
    mutationFn: ({ id, featured }) => blogService.update(id, { featured }),
    invalidateKeys: INVALIDATES,
  });
}

export function useDeleteBlogPost() {
  return useMutation<void, string>({
    mutationFn: (id) => blogService.remove(id),
    invalidateKeys: INVALIDATES,
  });
}

/* ---- Categories ---------------------------------------------------------- */

const CATEGORY_INVALIDATES = [blogKeys.categories, blogKeys.all, blogKeys.summary];

export function useCreateBlogCategory() {
  return useMutation<BlogCategory, BlogCategoryInput>({
    mutationFn: (input) => blogCategoryService.create(input),
    invalidateKeys: CATEGORY_INVALIDATES,
  });
}

export function useUpdateBlogCategory() {
  return useMutation<BlogCategory, { id: string; input: BlogCategoryPatch }>({
    mutationFn: ({ id, input }) => blogCategoryService.update(id, input),
    invalidateKeys: CATEGORY_INVALIDATES,
  });
}

export function useDeleteBlogCategory() {
  return useMutation<void, string>({
    mutationFn: (id) => blogCategoryService.remove(id),
    invalidateKeys: CATEGORY_INVALIDATES,
  });
}
