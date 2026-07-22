"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useHotels } from "./hooks";
import { HOTEL_STATUSES, type Hotel } from "./types";

const statusLabel = labelMap(HOTEL_STATUSES);

/** Hotels catalog list — representative catalog entity screen. */
export function HotelsList() {
  const list = useHotels();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Hotel["status"]]}` }]
    : [];

  return (
    <ResourceListView<Hotel>
      list={list}
      searchPlaceholder="Search property, city or country…"
      activeFilters={activeFilters}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(HOTEL_STATUSES),
          ]}
          wrapperClassName="w-44"
        />
      }
      primaryAction={
        <Can permissions={["catalog:create"]}>
          <Link
            href="/dashboard/catalog/hotels/create"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add hotel
          </Link>
        </Can>
      }
      caption="Hotels"
    />
  );
}
