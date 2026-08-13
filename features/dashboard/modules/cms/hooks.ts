"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { useDomainActor } from "../../domain/use-domain";
import { cmsColumns } from "./columns";
import { cmsKeys, cmsService } from "./service";
import type { CmsPageFormValues } from "./schemas";
import type { CmsPage, CmsStatus, CmsVersion } from "./types";
import {
  listVersions,
  recordCreate,
  recordDelete,
  recordEdit,
  restoreVersion,
  runDueSchedules,
  transition,
} from "./workflow";

/**
 * List CMS pages, optionally with a trailing row-actions column.
 *
 * Due schedules are applied *before* the read, so a page whose publish time
 * passed while nobody had the dashboard open is already live by the time the
 * table renders it — the demo equivalent of the cron job that would do this.
 */
export function useCmsPages(rowActions?: (row: CmsPage) => ReactNode) {
  const actor = useDomainActor();
  return useResourceList<CmsPage>({
    queryKey: cmsKeys.all,
    fetcher: async (params, signal) => {
      await runDueSchedules(actor);
      return cmsService.list(params, signal);
    },
    columns: cmsColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "updatedAt", direction: "desc" },
    rowActions,
  });
}

export function useCreateCmsPage() {
  const actor = useDomainActor();
  return useMutation<CmsPage, CmsPageFormValues>({
    mutationFn: async (input) => {
      const page = await cmsService.create(input);
      recordCreate(page, actor);
      return page;
    },
    invalidateKeys: [cmsKeys.all],
  });
}

export function useUpdateCmsPage() {
  const actor = useDomainActor();
  return useMutation<CmsPage, { id: string; input: CmsPageFormValues; previous: CmsPage }>({
    mutationFn: async ({ id, input, previous }) => {
      const next = await cmsService.update(id, {
        ...input,
        version: previous.version + 1,
      });
      recordEdit(previous, next, actor);
      return next;
    },
    invalidateKeys: [cmsKeys.all],
  });
}

export function useDeleteCmsPage() {
  const actor = useDomainActor();
  return useMutation<void, CmsPage>({
    mutationFn: async (page) => {
      await cmsService.remove(page.id);
      recordDelete(page, actor);
    },
    invalidateKeys: [cmsKeys.all],
  });
}

/** Move a page through draft → review → scheduled/published. */
export function useTransitionCmsPage() {
  const actor = useDomainActor();
  return useMutation<CmsPage, { page: CmsPage; to: CmsStatus; publishAt?: string }>({
    mutationFn: ({ page, to, publishAt }) =>
      transition({ page, to, actor, publishAt }),
    invalidateKeys: [cmsKeys.all],
  });
}

/** Restore a historical version onto the page (as a new draft version). */
export function useRestoreCmsVersion() {
  const actor = useDomainActor();
  return useMutation<CmsPage, { page: CmsPage; version: CmsVersion }>({
    mutationFn: ({ page, version }) => restoreVersion(page, version, actor),
    invalidateKeys: [cmsKeys.all],
  });
}

export { listVersions };
