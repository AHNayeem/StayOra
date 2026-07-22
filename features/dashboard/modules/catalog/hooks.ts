"use client";

import { useResourceList } from "../../crud";
import { hotelColumns } from "./columns";
import { hotelKeys, hotelsService } from "./service";
import type { Hotel } from "./types";

export function useHotels() {
  return useResourceList<Hotel>({
    queryKey: hotelKeys.all,
    fetcher: (params, signal) => hotelsService.list(params, signal),
    columns: hotelColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
  });
}
