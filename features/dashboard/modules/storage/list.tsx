"use client";

import { ResourceListView } from "../../crud";
import { Select, StatCard, StatCardSkeleton } from "../../ui";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { useStorageBuckets, useStorageSummary } from "./hooks";
import { STORAGE_STATUSES, formatBytes, type StorageBucket } from "./types";

const statusLabel = labelMap(STORAGE_STATUSES);

/** Storage — KPIs, status facet, per-bucket usage bars. */
export function StorageList() {
  const list = useStorageBuckets();
  const summary = useStorageSummary();

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as StorageBucket["status"]]}` }]
    : [];

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Used" value={formatBytes(summary.data.usedBytes)} icon="HardDrive" />
            <StatCard label="Capacity" value={formatBytes(summary.data.capacityBytes)} icon="Server" />
            <StatCard label="Objects" value={formatNumber(summary.data.files)} icon="FileImage" />
            <StatCard label="Buckets" value={formatNumber(summary.data.buckets)} icon="Cloud" />
          </>
        )}
      </div>

      <ResourceListView<StorageBucket>
        list={list}
        searchPlaceholder="Search bucket, driver or region…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(STORAGE_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        caption="Storage buckets"
      />
    </>
  );
}
