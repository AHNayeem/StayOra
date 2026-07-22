"use client";

import { useResourceList } from "../../crud";
import { promotionColumns } from "./columns";
import { promotionKeys, promotionsService } from "./service";
import type { Promotion } from "./types";

export function usePromotions() {
  return useResourceList<Promotion>({
    queryKey: promotionKeys.all,
    fetcher: (params, signal) => promotionsService.list(params, signal),
    columns: promotionColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "endsAt", direction: "desc" },
  });
}
