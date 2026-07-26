"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { templateColumns } from "./columns";
import { templateKeys, templatesService } from "./service";
import type { TemplateFormValues } from "./schemas";
import type { NotificationTemplate } from "./types";

/** List notification templates, optionally with a trailing row-actions column. */
export function useTemplates(rowActions?: (row: NotificationTemplate) => ReactNode) {
  return useResourceList<NotificationTemplate>({
    queryKey: templateKeys.all,
    fetcher: (params, signal) => templatesService.list(params, signal),
    columns: templateColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateTemplate() {
  return useMutation<NotificationTemplate, TemplateFormValues>({
    mutationFn: (input) => templatesService.create(input),
    invalidateKeys: [templateKeys.all],
  });
}

export function useUpdateTemplate() {
  return useMutation<NotificationTemplate, { id: string; input: TemplateFormValues }>({
    mutationFn: ({ id, input }) => templatesService.update(id, input),
    invalidateKeys: [templateKeys.all],
  });
}

export function useSetTemplateEnabled() {
  return useMutation<NotificationTemplate, { id: string; enabled: boolean }>({
    mutationFn: ({ id, enabled }) => templatesService.update(id, { enabled }),
    invalidateKeys: [templateKeys.all],
  });
}

export function useDeleteTemplate() {
  return useMutation<void, string>({
    mutationFn: (id) => templatesService.remove(id),
    invalidateKeys: [templateKeys.all],
  });
}
