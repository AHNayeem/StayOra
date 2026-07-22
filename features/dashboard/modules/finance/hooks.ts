"use client";

import { useResourceList } from "../../crud";
import { paymentColumns } from "./columns";
import { paymentKeys, paymentsService } from "./service";
import type { Payment } from "./types";

export function usePayments() {
  return useResourceList<Payment>({
    queryKey: paymentKeys.all,
    fetcher: (params, signal) => paymentsService.list(params, signal),
    columns: paymentColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}
