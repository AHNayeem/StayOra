/**
 * CRUD foundation — the reusable list/detail/mutation building blocks every
 * data module composes. Import from here:
 *
 *   import { useResourceList, ResourceListView, createStubService } from "@/features/dashboard/crud";
 *
 * Layers:
 *   stub-service       — in-memory ResourceService (no-backend data source)
 *   use-resource-list  — TanStack-backed list state wired to useQuery
 *   resource-table     — TanStack + flexRender table renderer
 *   resource-list-view — the assembled toolbar + table + pagination surface
 */
import "./types";

export type { ResourceService } from "./types";
export { createStubService } from "./stub-service";
export type { StubServiceOptions } from "./stub-service";
export { useResourceList } from "./use-resource-list";
export type {
  UseResourceListOptions,
  UseResourceListResult,
} from "./use-resource-list";
export { ResourceTable } from "./resource-table";
export { ResourceListView } from "./resource-list-view";

// Re-export the TanStack column helpers so modules have one import surface.
export {
  createColumnHelper,
  type ColumnDef,
  type Row,
  type CellContext,
} from "@tanstack/react-table";
