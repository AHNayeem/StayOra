/**
 * CRUD foundation types.
 *
 * `ResourceService` is the contract every feature's data source satisfies — the
 * Phase-4 in-memory {@link createStubService} today, a Phase-3
 * {@link import("../data/repository").ResourceRepository} once a real endpoint
 * exists. It is intentionally the same shape as the repository so a module can
 * swap its service for a repository with no caller changes.
 */
import type { RowData } from "@tanstack/react-table";
import type { ID, ListParams, Paginated } from "../data/types";

export interface ResourceService<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: ListParams, signal?: AbortSignal) => Promise<Paginated<T>>;
  get: (id: ID, signal?: AbortSignal) => Promise<T>;
  create: (input: TCreate) => Promise<T>;
  update: (id: ID, input: TUpdate) => Promise<T>;
  remove: (id: ID) => Promise<void>;
}

/**
 * Extra per-column presentation carried on TanStack's `columnDef.meta`. Declared
 * via module augmentation so column authors get typed `meta` fields and the
 * {@link ResourceTable} / column-visibility menu can read them.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Cell + header alignment. */
    align?: "left" | "center" | "right";
    /** Extra class on the header cell. */
    headerClassName?: string;
    /** Extra class on the body cell. */
    cellClassName?: string;
    /** Width utility, e.g. "w-40" or "w-px" for tight action columns. */
    widthClass?: string;
    /** Human label used in the column-visibility menu (defaults to the id). */
    label?: string;
  }
}
