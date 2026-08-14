"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { advertisingService } from "../../domain/services";
import type {
  AdCampaign,
  AdCampaignInput,
  Advertiser,
  CampaignStatus,
} from "../../domain/advertising";
import { useDomainActor } from "../../domain/use-domain";
import { campaignColumns } from "./columns";

export const advertisingKeys = {
  all: ["advertising"] as const,
  summary: ["advertising", "summary"] as const,
  advertisers: ["advertising", "advertisers"] as const,
};

const SIDE_EFFECTS = [["advertising"], ["revenue"], ["logs"], ["notifications"]];

export function useCampaigns(rowActions?: (row: AdCampaign) => ReactNode) {
  return useResourceList<AdCampaign>({
    queryKey: ["advertising", "campaigns"],
    fetcher: (params) => advertisingService.listCampaigns(params),
    columns: campaignColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "startAt", direction: "desc" },
    rowActions,
  });
}

export function useAdvertisingSummary() {
  return useQuery({
    queryKey: advertisingKeys.summary,
    queryFn: () => advertisingService.summary(),
    staleTime: 10_000,
  });
}

export function useAdvertisers() {
  return useQuery<Advertiser[]>({
    queryKey: advertisingKeys.advertisers,
    queryFn: () => advertisingService.advertisers(),
    staleTime: 60_000,
  });
}

export function useCreateCampaign() {
  const actor = useDomainActor();
  return useMutation<AdCampaign, AdCampaignInput>({
    mutationFn: (input) => advertisingService.create(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useUpdateCampaign() {
  const actor = useDomainActor();
  return useMutation<AdCampaign, { id: string; input: Partial<AdCampaignInput> }>({
    mutationFn: ({ id, input }) => advertisingService.update(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Approve, pause, resume or reject a campaign. */
export function useSetCampaignStatus() {
  const actor = useDomainActor();
  return useMutation<AdCampaign, { id: string; status: CampaignStatus; note?: string }>({
    mutationFn: ({ id, status, note }) =>
      advertisingService.setStatus(id, status, { actor, note }),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Recognise unbilled spend as advertising revenue. */
export function useBillCampaign() {
  const actor = useDomainActor();
  return useMutation<{ campaign: AdCampaign; amount: number }, string>({
    mutationFn: (id) => advertisingService.bill(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}
