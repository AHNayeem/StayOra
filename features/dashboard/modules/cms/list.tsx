"use client";

import { ResourceListView } from "../../crud";
import { Select } from "../../ui";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useCmsPages } from "./hooks";
import { CMS_STATUSES, type CmsPage } from "./types";

const statusLabel = labelMap(CMS_STATUSES);

/** CMS pages list — pages, blog posts and FAQ entries. */
export function CmsPagesList() {
  const list = useCmsPages();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as CmsPage["status"]]}` }]
    : [];

  return (
    <ResourceListView<CmsPage>
      list={list}
      searchPlaceholder="Search title, slug or type…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(CMS_STATUSES),
          ]}
          wrapperClassName="w-44"
        />
      }
      caption="CMS pages"
    />
  );
}
