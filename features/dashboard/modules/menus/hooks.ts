"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { menuColumns } from "./columns";
import { menuKeys, menusService } from "./service";
import type { MenuItemFormValues } from "./schemas";
import type { MenuItem } from "./types";

/** List menu items, optionally with a trailing row-actions column. */
export function useMenuItems(rowActions?: (row: MenuItem) => ReactNode) {
  return useResourceList<MenuItem>({
    queryKey: menuKeys.all,
    fetcher: (params, signal) => menusService.list(params, signal),
    columns: menuColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "order", direction: "asc" },
    rowActions,
  });
}

export function useCreateMenuItem() {
  return useMutation<MenuItem, MenuItemFormValues>({
    mutationFn: (input) => menusService.create(input),
    invalidateKeys: [menuKeys.all],
  });
}

export function useUpdateMenuItem() {
  return useMutation<MenuItem, { id: string; input: MenuItemFormValues }>({
    mutationFn: ({ id, input }) => menusService.update(id, input),
    invalidateKeys: [menuKeys.all],
  });
}

export function useSetMenuVisibility() {
  return useMutation<MenuItem, { id: string; visible: boolean }>({
    mutationFn: ({ id, visible }) => menusService.update(id, { visible }),
    invalidateKeys: [menuKeys.all],
  });
}

export function useDeleteMenuItem() {
  return useMutation<void, string>({
    mutationFn: (id) => menusService.remove(id),
    invalidateKeys: [menuKeys.all],
  });
}
