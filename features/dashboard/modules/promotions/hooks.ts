"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { promotionColumns } from "./columns";
import { promotionKeys, promotionsService } from "./service";
import type { PromotionFormValues } from "./schemas";
import type { Promotion } from "./types";

/** List promotions, optionally with a trailing row-actions column. */
export function usePromotions(rowActions?: (row: Promotion) => ReactNode) {
  return useResourceList<Promotion>({
    queryKey: promotionKeys.all,
    fetcher: (params, signal) => promotionsService.list(params, signal),
    columns: promotionColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "endsAt", direction: "desc" },
    rowActions,
  });
}

export function useCreatePromotion() {
  return useMutation<Promotion, PromotionFormValues>({
    mutationFn: (input) => promotionsService.create(input),
    invalidateKeys: [promotionKeys.all],
  });
}

export function useUpdatePromotion() {
  return useMutation<Promotion, { id: string; input: PromotionFormValues }>({
    mutationFn: ({ id, input }) => promotionsService.update(id, input),
    invalidateKeys: [promotionKeys.all],
  });
}

export function useDeletePromotion() {
  return useMutation<void, string>({
    mutationFn: (id) => promotionsService.remove(id),
    invalidateKeys: [promotionKeys.all],
  });
}
