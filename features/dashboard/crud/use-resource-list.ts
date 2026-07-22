"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from "@tanstack/react-table";
import { useQuery, type UseQueryResult } from "../data/query/use-query";
import type { ID, ListParams, Paginated, SortSpec } from "../data/types";

export interface UseResourceListOptions<T> {
  /** Base query key for this resource, e.g. `["bookings"]`. */
  queryKey: readonly (string | number)[];
  /** Data source — a service's `list`. Receives the assembled list params. */
  fetcher: (params: ListParams, signal?: AbortSignal) => Promise<Paginated<T>>;
  /** TanStack column definitions (authored once, drive header/cell/sort/hide). */
  columns: ColumnDef<T>[];
  /** Stable row id — used for selection keys. */
  getRowId: (row: T) => ID;
  initialPageSize?: number;
  initialSort?: SortSpec | null;
  initialFilters?: Record<string, string>;
  /** Enable row selection + the selection state. Default true. */
  enableSelection?: boolean;
  /** Serve cached page this fresh (ms) before refetching. Default 0. */
  staleTime?: number;
}

export interface UseResourceListResult<T> {
  /** The TanStack table instance (headless state: sort, selection, visibility). */
  table: Table<T>;
  /** Underlying query — status/data/error/refetch for the current page. */
  query: UseQueryResult<Paginated<T>>;
  rows: T[];
  total: number;
  pageCount: number;
  /** 1-based current page. */
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string>;
  /** Set (or clear, when value is empty) a single filter; resets to page 1. */
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  /** Ids of the currently selected rows. */
  selectedIds: ID[];
  clearSelection: () => void;
}

/**
 * The reusable list engine behind every dashboard table.
 *
 * It owns the list state as a TanStack `useReactTable` instance in fully
 * server-driven mode (`manualPagination/Sorting/Filtering`), derives
 * {@link ListParams} from that state, and subscribes to the resulting page via
 * the Phase-3 {@link useQuery}. All state transitions happen in event handlers
 * (never in effects), keeping it clean under the project's React 19 lint rules.
 * Pair with {@link import("./resource-list-view").ResourceListView} for the UI.
 */
export function useResourceList<T>({
  queryKey,
  fetcher,
  columns,
  getRowId,
  initialPageSize = 10,
  initialSort = null,
  initialFilters,
  enableSelection = true,
  staleTime = 0,
}: UseResourceListOptions<T>): UseResourceListResult<T> {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>(
    initialSort
      ? [{ id: initialSort.field, desc: initialSort.direction === "desc" }]
      : [],
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [search, setSearchState] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(
    initialFilters ?? {},
  );

  // --- Derive list params from table state ---------------------------------
  const sort: SortSpec | null = sorting[0]
    ? { field: sorting[0].id, direction: sorting[0].desc ? "desc" : "asc" }
    : null;
  const page = pagination.pageIndex + 1;
  const { pageSize } = pagination;
  const filtersKey = JSON.stringify(filters);

  const params: ListParams = useMemo(
    () => ({
      page,
      pageSize,
      sort,
      search: search || undefined,
      filters,
    }),
    // filtersKey stands in for the `filters` object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, sort?.field, sort?.direction, search, filtersKey],
  );

  const query = useQuery<Paginated<T>>({
    queryKey: [
      ...queryKey,
      "list",
      page,
      pageSize,
      sort?.field ?? "",
      sort?.direction ?? "",
      search,
      filtersKey,
    ],
    queryFn: (signal) => fetcher(params, signal),
    staleTime,
  });

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // --- Change handlers (reset to page 1 where it matters) ------------------
  const onSortingChange: OnChangeFn<SortingState> = useCallback((updater) => {
    setSorting(updater);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setSearchState("");
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const setPage = useCallback(
    (next: number) => setPagination((p) => ({ ...p, pageIndex: next - 1 })),
    [],
  );
  const setPageSize = useCallback(
    (size: number) => setPagination({ pageIndex: 0, pageSize: size }),
    [],
  );

  // TanStack Table returns non-memoizable functions, so React Compiler skips it.
  // That is expected and safe here — the table instance is read synchronously.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<T>({
    data: rows,
    columns,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    enableRowSelection: enableSelection,
    state: { pagination, sorting, rowSelection, columnVisibility },
    onPaginationChange: setPagination,
    onSortingChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
  });

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const clearSelection = useCallback(() => setRowSelection({}), []);

  return {
    table,
    query,
    rows,
    total,
    pageCount,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    selectedIds,
    clearSelection,
  };
}
