"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { sharedRoomColumns } from "./columns";
import { sharedRoomKeys, sharedRoomsService } from "./service";
import type { SharedRoomFormValues } from "./schemas";
import type { SharedRoom } from "./types";

/** List shared rooms, optionally with a trailing row-actions column. */
export function useSharedRooms(rowActions?: (row: SharedRoom) => ReactNode) {
  return useResourceList<SharedRoom>({
    queryKey: sharedRoomKeys.all,
    fetcher: (params, signal) => sharedRoomsService.list(params, signal),
    columns: sharedRoomColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateSharedRoom() {
  return useMutation<SharedRoom, SharedRoomFormValues>({
    mutationFn: (input) => sharedRoomsService.create(input),
    invalidateKeys: [sharedRoomKeys.all],
  });
}

export function useUpdateSharedRoom() {
  return useMutation<SharedRoom, { id: string; input: SharedRoomFormValues }>({
    mutationFn: ({ id, input }) => sharedRoomsService.update(id, input),
    invalidateKeys: [sharedRoomKeys.all],
  });
}

export function useDeleteSharedRoom() {
  return useMutation<void, string>({
    mutationFn: (id) => sharedRoomsService.remove(id),
    invalidateKeys: [sharedRoomKeys.all],
  });
}
