"use client";

import { useResourceList } from "../../crud";
import { invoiceColumns } from "./columns";
import { invoiceKeys, invoicesService } from "./service";
import type { Invoice } from "./types";

export function useInvoices() {
  return useResourceList<Invoice>({
    queryKey: invoiceKeys.all,
    fetcher: (params, signal) => invoicesService.list(params, signal),
    columns: invoiceColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "issuedAt", direction: "desc" },
  });
}
