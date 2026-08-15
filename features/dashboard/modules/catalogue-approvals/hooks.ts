"use client";

import {
  catalogueService,
  type CatalogueDraftInput,
  type CatalogueItem,
  type CatalogueStatus,
} from "@/features/dashboard/domain";
import { useMutation, useQuery } from "../../data";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";

export const catalogueKeys = {
  all: ["catalogue"] as const,
  list: (scope: string) => ["catalogue", "list", scope] as const,
  queue: () => ["catalogue", "queue"] as const,
  detail: (id: string) => ["catalogue", "detail", id] as const,
};

const INVALIDATE = [catalogueKeys.all];

/** Every catalogue item the caller may see — merchant-scoped automatically. */
export function useCatalogue() {
  const scope = useDomainScope();
  return useQuery<CatalogueItem[]>({
    queryKey: catalogueKeys.list(scope.merchantId ?? "platform"),
    queryFn: async () => {
      const page = await catalogueService.list({ page: 1, pageSize: 500 }, scope);
      return page.items;
    },
  });
}

/** The platform's review queue, oldest submission first. */
export function useCatalogueQueue() {
  return useQuery<CatalogueItem[]>({
    queryKey: catalogueKeys.queue(),
    queryFn: () => catalogueService.reviewQueue(),
  });
}

export function useCreateCatalogueItem() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<CatalogueItem, { merchantId: string; input: CatalogueDraftInput }>({
    mutationFn: ({ merchantId, input }) =>
      catalogueService.create(merchantId, input, actor, scope),
    invalidateKeys: INVALIDATE,
  });
}

export function useUpdateCatalogueItem() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<CatalogueItem, { id: string; input: Partial<CatalogueDraftInput> }>({
    mutationFn: ({ id, input }) => catalogueService.update(id, input, actor, scope),
    invalidateKeys: INVALIDATE,
  });
}

export function useSubmitCatalogueItem() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<CatalogueItem, string>({
    mutationFn: (id) => catalogueService.submit(id, actor, scope),
    invalidateKeys: INVALIDATE,
  });
}

export function usePublishCatalogueItem() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<CatalogueItem, string>({
    mutationFn: (id) => catalogueService.publish(id, actor, scope),
    invalidateKeys: INVALIDATE,
  });
}

export function useUnpublishCatalogueItem() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<CatalogueItem, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => catalogueService.unpublish(id, reason, actor, scope),
    invalidateKeys: INVALIDATE,
  });
}

/** Admin: record a review decision. */
export function useReviewCatalogueItem() {
  const actor = useDomainActor();
  return useMutation<
    CatalogueItem,
    {
      id: string;
      to: Extract<CatalogueStatus, "under_review" | "approved" | "action_required" | "rejected">;
      note?: string;
      publish?: boolean;
    }
  >({
    mutationFn: ({ id, to, note, publish }) =>
      catalogueService.review(id, { to, note, publish }, actor),
    invalidateKeys: INVALIDATE,
  });
}
