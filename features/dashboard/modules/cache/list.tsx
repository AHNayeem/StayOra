"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { toast } from "@/lib/toast";
import { useCacheStores, useCacheSummary, useFlushCache } from "./hooks";
import { CACHE_STATUSES, type CacheStore } from "./types";

const statusLabel = labelMap(CACHE_STATUSES);

/** Cache — KPIs, status facet, per-store flush (confirmed). */
export function CacheList() {
  const [flushing, setFlushing] = useState<CacheStore | null>(null);
  const summary = useCacheSummary();
  const flush = useFlushCache();

  const list = useCacheStores((row) => (
    <Can anyPermission={["system:update"]}>
      <RowActions
        label={`Actions for ${row.name}`}
        extra={
          <DropdownItem icon={<Trash2 />} onSelect={() => setFlushing(row)}>
            Flush cache
          </DropdownItem>
        }
      />
    </Can>
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as CacheStore["status"]]}` }]
    : [];

  const confirmFlush = async () => {
    if (!flushing) return;
    await flush.mutateAsync(flushing.id);
    toast.success(`Flushed “${flushing.name}”`);
    setFlushing(null);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Avg. hit rate" value={`${summary.data.avgHitRate}%`} icon="Gauge" />
            <StatCard label="Total keys" value={formatNumber(summary.data.totalKeys)} icon="Database" />
            <StatCard label="Memory" value={`${formatNumber(summary.data.memoryMb)} MB`} icon="HardDrive" />
            <StatCard label="Stores" value={formatNumber(summary.data.stores)} icon="Boxes" />
          </>
        )}
      </div>

      <ResourceListView<CacheStore>
        list={list}
        searchPlaceholder="Search store or driver…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(CACHE_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        caption="Cache stores"
      />

      <ConfirmDialog
        open={Boolean(flushing)}
        onClose={() => setFlushing(null)}
        onConfirm={confirmFlush}
        loading={flush.isPending}
        tone="danger"
        title="Flush this cache?"
        message={
          <>
            Every key in{" "}
            <strong className="font-semibold text-ink">{flushing?.name}</strong> will be cleared.
            Requests will miss the cache until it re-warms.
          </>
        }
        confirmLabel="Flush cache"
      />
    </>
  );
}
