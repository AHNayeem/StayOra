"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { usePromotions } from "./hooks";
import { PROMOTION_STATUSES, type Promotion } from "./types";

const statusLabel = labelMap(PROMOTION_STATUSES);

/** Promotions list — coupons, flash sales and offers. */
export function PromotionsList() {
  const list = usePromotions();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Promotion["status"]]}` }]
    : [];

  return (
    <ResourceListView<Promotion>
      list={list}
      searchPlaceholder="Search name, code or type…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(PROMOTION_STATUSES),
          ]}
          wrapperClassName="w-44"
        />
      }
      primaryAction={
        <Can permissions={["promotions:create"]}>
          <Link
            href="/dashboard/promotions/create"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-4" aria-hidden="true" />
            New promotion
          </Link>
        </Can>
      }
      caption="Promotions"
    />
  );
}
