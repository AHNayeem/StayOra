"use client";

import { useResourceList } from "../../crud";
import { cmsColumns } from "./columns";
import { cmsKeys, cmsService } from "./service";
import type { CmsPage } from "./types";

export function useCmsPages() {
  return useResourceList<CmsPage>({
    queryKey: cmsKeys.all,
    fetcher: (params, signal) => cmsService.list(params, signal),
    columns: cmsColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "updatedAt", direction: "desc" },
  });
}
