/**
 * Repository factory — the data-access seam between services and the transport.
 *
 * `createResourceRepository` produces a typed CRUD repository for a REST-style
 * resource (`/bookings`, `/merchants`, …). It centralizes URL construction and
 * list-param serialization so feature services stay declarative and never build
 * paths or query strings by hand. Optional schemas validate responses.
 *
 * Repositories assume a live backend. During Phase 3 (no backend) feature code
 * uses the stub services instead; a repository is what each stub swaps to once
 * its endpoint exists — the service signature doesn't change.
 */
import { httpClient, type OutputValidator } from "./http-client";
import type { ID, ListParams, Paginated } from "./types";

/** Flatten {@link ListParams} into a transport-friendly query object. */
export function serializeListParams(
  params: ListParams = {},
): Record<string, string | number | boolean | undefined> {
  const { page, pageSize, sort, search, filters } = params;
  return {
    page,
    pageSize,
    sort: sort ? sort.field : undefined,
    order: sort ? sort.direction : undefined,
    q: search || undefined,
    ...filters,
  };
}

export interface RepositorySchemas<T> {
  /** Validates a single resource payload. */
  item?: OutputValidator<T>;
  /** Validates a page envelope of resources. */
  page?: OutputValidator<Paginated<T>>;
}

export interface ResourceRepository<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: ListParams, signal?: AbortSignal) => Promise<Paginated<T>>;
  get: (id: ID, signal?: AbortSignal) => Promise<T>;
  create: (input: TCreate) => Promise<T>;
  update: (id: ID, input: TUpdate) => Promise<T>;
  remove: (id: ID) => Promise<void>;
}

export interface CreateRepositoryOptions<T> {
  /** Resource path segment, e.g. `"/bookings"`. */
  resource: string;
  schemas?: RepositorySchemas<T>;
}

export function createResourceRepository<T, TCreate = Partial<T>, TUpdate = Partial<T>>({
  resource,
  schemas,
}: CreateRepositoryOptions<T>): ResourceRepository<T, TCreate, TUpdate> {
  const base = `/${resource.replace(/^\/+/, "")}`;

  return {
    list: (params, signal) =>
      httpClient.get<Paginated<T>>(base, {
        params: serializeListParams(params),
        schema: schemas?.page,
        signal,
      }),
    get: (id, signal) =>
      httpClient.get<T>(`${base}/${id}`, { schema: schemas?.item, signal }),
    create: (input) =>
      httpClient.post<T>(base, input, { schema: schemas?.item }),
    update: (id, input) =>
      httpClient.patch<T>(`${base}/${id}`, input, { schema: schemas?.item }),
    remove: (id) => httpClient.delete<void>(`${base}/${id}`),
  };
}
