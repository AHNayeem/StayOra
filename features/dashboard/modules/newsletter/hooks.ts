"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { newsletterColumns } from "./columns";
import { newsletterKeys, newsletterService, getNewsletterSummary } from "./service";
import type { Subscriber } from "./types";

/** List subscribers, optionally with a trailing row-actions column. */
export function useSubscribers(rowActions?: (row: Subscriber) => ReactNode) {
  return useResourceList<Subscriber>({
    queryKey: newsletterKeys.all,
    fetcher: (params, signal) => newsletterService.list(params, signal),
    columns: newsletterColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "joinedAt", direction: "desc" },
    rowActions,
  });
}

export function useNewsletterSummary() {
  return useQuery({
    queryKey: newsletterKeys.summary,
    queryFn: () => getNewsletterSummary(),
    staleTime: 60_000,
  });
}

export function useSetSubscriberStatus() {
  return useMutation<Subscriber, { id: string; status: Subscriber["status"] }>({
    mutationFn: ({ id, status }) => newsletterService.update(id, { status }),
    invalidateKeys: [newsletterKeys.all, newsletterKeys.summary],
  });
}

export function useDeleteSubscriber() {
  return useMutation<void, string>({
    mutationFn: (id) => newsletterService.remove(id),
    invalidateKeys: [newsletterKeys.all, newsletterKeys.summary],
  });
}
