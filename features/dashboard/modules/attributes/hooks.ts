"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { attributeColumns } from "./columns";
import { attributeKeys, attributesService } from "./service";
import type { AttributeFormValues } from "./schemas";
import type { Attribute } from "./types";

/** List attributes, optionally with a trailing row-actions column. */
export function useAttributes(rowActions?: (row: Attribute) => ReactNode) {
  return useResourceList<Attribute>({
    queryKey: attributeKeys.all,
    fetcher: (params, signal) => attributesService.list(params, signal),
    columns: attributeColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateAttribute() {
  return useMutation<Attribute, AttributeFormValues>({
    mutationFn: (input) => attributesService.create(input),
    invalidateKeys: [attributeKeys.all],
  });
}

export function useUpdateAttribute() {
  return useMutation<Attribute, { id: string; input: AttributeFormValues }>({
    mutationFn: ({ id, input }) => attributesService.update(id, input),
    invalidateKeys: [attributeKeys.all],
  });
}

export function useDeleteAttribute() {
  return useMutation<void, string>({
    mutationFn: (id) => attributesService.remove(id),
    invalidateKeys: [attributeKeys.all],
  });
}
