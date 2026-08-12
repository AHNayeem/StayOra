"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { comboService, offerService } from "../../domain/services";
import type { ComboInput, OfferInput } from "../../domain/services";
import type { ComboOffer, Offer } from "../../domain/types";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { comboColumns, offerColumns } from "./columns";

export const offerKeys = {
  all: ["promotions", "offers"] as const,
  combos: ["promotions", "combos"] as const,
};

const OFFER_SIDE_EFFECTS = [["promotions"], ["notifications"], ["logs"]];

/**
 * Offers list, scoped.
 *
 * A merchant sees platform offers that apply to their inventory *and* their own
 * offers — but the domain refuses any edit to an offer they don't own, so the
 * read-only rows stay read-only even if the UI is bypassed.
 */
export function useOffers(rowActions?: (row: Offer) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<Offer>({
    queryKey: ["promotions", "offers", scope.merchantId ?? "all"],
    fetcher: (params) => offerService.list(params, scope),
    columns: offerColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
    rowActions,
  });
}

export function useCreateOffer() {
  const actor = useDomainActor();
  return useMutation<Offer, OfferInput>({
    mutationFn: (input) => offerService.create(input, actor),
    invalidateKeys: OFFER_SIDE_EFFECTS,
  });
}

export function useUpdateOffer() {
  const actor = useDomainActor();
  return useMutation<Offer, { id: string; input: Partial<OfferInput> }>({
    mutationFn: ({ id, input }) => offerService.update(id, input, actor),
    invalidateKeys: OFFER_SIDE_EFFECTS,
  });
}

export function useDeleteOffer() {
  const actor = useDomainActor();
  return useMutation<void, string>({
    mutationFn: (id) => offerService.remove(id, actor),
    invalidateKeys: OFFER_SIDE_EFFECTS,
  });
}

/** Combo bundles, scoped to combos containing the merchant's own products. */
export function useCombos(rowActions?: (row: ComboOffer) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<ComboOffer>({
    queryKey: ["promotions", "combos", scope.merchantId ?? "all"],
    fetcher: (params) => comboService.list(params, scope),
    columns: comboColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
    rowActions,
  });
}

export function useCreateCombo() {
  const actor = useDomainActor();
  return useMutation<ComboOffer, ComboInput>({
    mutationFn: (input) => comboService.create(input, actor),
    invalidateKeys: OFFER_SIDE_EFFECTS,
  });
}

export function useUpdateCombo() {
  const actor = useDomainActor();
  return useMutation<ComboOffer, { id: string; input: Partial<ComboInput> }>({
    mutationFn: ({ id, input }) => comboService.update(id, input, actor),
    invalidateKeys: OFFER_SIDE_EFFECTS,
  });
}

export function useDeleteCombo() {
  const actor = useDomainActor();
  return useMutation<void, string>({
    mutationFn: (id) => comboService.remove(id, actor),
    invalidateKeys: OFFER_SIDE_EFFECTS,
  });
}
