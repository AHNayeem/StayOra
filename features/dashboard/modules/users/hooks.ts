"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { userColumns } from "./columns";
import { userKeys, usersService } from "./service";
import type { UserFormValues } from "./schemas";
import type { User } from "./types";

/** List users, optionally with a trailing row-actions column. */
export function useUsers(rowActions?: (row: User) => ReactNode) {
  return useResourceList<User>({
    queryKey: userKeys.all,
    fetcher: (params, signal) => usersService.list(params, signal),
    columns: userColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
    rowActions,
  });
}

export function useCreateUser() {
  return useMutation<User, UserFormValues>({
    mutationFn: (input) => usersService.create(input),
    invalidateKeys: [userKeys.all],
  });
}

export function useUpdateUser() {
  return useMutation<User, { id: string; input: UserFormValues }>({
    mutationFn: ({ id, input }) => usersService.update(id, input),
    invalidateKeys: [userKeys.all],
  });
}

export function useDeleteUser() {
  return useMutation<void, string>({
    mutationFn: (id) => usersService.remove(id),
    invalidateKeys: [userKeys.all],
  });
}
