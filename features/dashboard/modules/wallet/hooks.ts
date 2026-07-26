"use client";

import type { ReactNode } from "react";
import { useResourceList } from "../../crud";
import { useQuery } from "../../data";
import { walletColumns } from "./columns";
import { getWalletSummary, walletKeys, walletsService } from "./service";
import type { MerchantWallet } from "./types";

export function useWallets(rowActions?: (row: MerchantWallet) => ReactNode) {
  return useResourceList<MerchantWallet>({
    queryKey: walletKeys.all,
    fetcher: (params, signal) => walletsService.list(params, signal),
    columns: walletColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "available", direction: "desc" },
    rowActions,
  });
}

export function useWalletSummary() {
  return useQuery({
    queryKey: walletKeys.summary,
    queryFn: () => getWalletSummary(),
    staleTime: 60_000,
  });
}
