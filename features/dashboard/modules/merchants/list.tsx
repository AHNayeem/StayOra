"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useMerchants, useSetMerchantStatus } from "./hooks";
import { MERCHANT_STATUSES, type Merchant } from "./types";

const statusLabel = labelMap(MERCHANT_STATUSES);

/** Merchants list — search, status facet, bulk approve/suspend, RBAC-gated invite. */
export function MerchantsList() {
  const list = useMerchants();
  const setStatus = useSetMerchantStatus();

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Merchant["status"]]}` }]
    : [];

  const applyStatus = async (
    ids: string[],
    next: Merchant["status"],
  ) => {
    for (const id of ids) await setStatus.mutateAsync({ id, status: next });
    list.clearSelection();
  };

  return (
    <ResourceListView<Merchant>
      list={list}
      searchPlaceholder="Search merchant, contact or country…"
      activeFilters={activeFilters}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(MERCHANT_STATUSES),
          ]}
          wrapperClassName="w-44"
        />
      }
      primaryAction={
        <Can permissions={["merchants:create"]}>
          <Link
            href="/dashboard/merchants/create"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Invite merchant
          </Link>
        </Can>
      }
      bulkActions={(ids) => (
        <Can permissions={["merchants:approve"]}>
          <Button
            variant="outline"
            size="sm"
            loading={setStatus.isPending}
            onClick={() => applyStatus(ids, "active")}
          >
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={setStatus.isPending}
            onClick={() => applyStatus(ids, "suspended")}
          >
            Suspend
          </Button>
        </Can>
      )}
      caption="Merchants"
    />
  );
}
