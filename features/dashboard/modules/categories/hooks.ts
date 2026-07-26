"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { categoryColumns } from "./columns";
import { categoryKeys, categoriesService } from "./service";
import type { CategoryFormValues } from "./schemas";
import type { Category } from "./types";

/** List categories, optionally with a trailing row-actions column. */
export function useCategories(rowActions?: (row: Category) => ReactNode) {
  return useResourceList<Category>({
    queryKey: categoryKeys.all,
    fetcher: (params, signal) => categoriesService.list(params, signal),
    columns: categoryColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateCategory() {
  return useMutation<Category, CategoryFormValues>({
    mutationFn: (input) => categoriesService.create(input),
    invalidateKeys: [categoryKeys.all],
  });
}

export function useUpdateCategory() {
  return useMutation<Category, { id: string; input: CategoryFormValues }>({
    mutationFn: ({ id, input }) => categoriesService.update(id, input),
    invalidateKeys: [categoryKeys.all],
  });
}

export function useDeleteCategory() {
  return useMutation<void, string>({
    mutationFn: (id) => categoriesService.remove(id),
    invalidateKeys: [categoryKeys.all],
  });
}
