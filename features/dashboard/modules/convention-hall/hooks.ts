"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { conventionHallColumns } from "./columns";
import { conventionHallKeys, conventionHallsService } from "./service";
import type { ConventionHallFormValues } from "./schemas";
import type { ConventionHall } from "./types";

/** List convention halls, optionally with a trailing row-actions column. */
export function useConventionHalls(rowActions?: (row: ConventionHall) => ReactNode) {
  return useResourceList<ConventionHall>({
    queryKey: conventionHallKeys.all,
    fetcher: (params, signal) => conventionHallsService.list(params, signal),
    columns: conventionHallColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateConventionHall() {
  return useMutation<ConventionHall, ConventionHallFormValues>({
    mutationFn: (input) => conventionHallsService.create(input),
    invalidateKeys: [conventionHallKeys.all],
  });
}

export function useUpdateConventionHall() {
  return useMutation<ConventionHall, { id: string; input: ConventionHallFormValues }>({
    mutationFn: ({ id, input }) => conventionHallsService.update(id, input),
    invalidateKeys: [conventionHallKeys.all],
  });
}

export function useDeleteConventionHall() {
  return useMutation<void, string>({
    mutationFn: (id) => conventionHallsService.remove(id),
    invalidateKeys: [conventionHallKeys.all],
  });
}
