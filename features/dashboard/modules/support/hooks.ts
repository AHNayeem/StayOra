"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { ticketColumns } from "./columns";
import { ticketKeys, ticketsService } from "./service";
import type { Ticket } from "./types";

/** List support tickets, optionally with a trailing row-actions column. */
export function useTickets(rowActions?: (row: Ticket) => ReactNode) {
  return useResourceList<Ticket>({
    queryKey: ticketKeys.all,
    fetcher: (params, signal) => ticketsService.list(params, signal),
    columns: ticketColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "updatedAt", direction: "desc" },
    rowActions,
  });
}

export function useUpdateTicket() {
  return useMutation<Ticket, { id: string; input: Partial<Ticket> }>({
    mutationFn: ({ id, input }) => ticketsService.update(id, input),
    invalidateKeys: [ticketKeys.all],
  });
}
