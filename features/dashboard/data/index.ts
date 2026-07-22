/**
 * Dashboard data layer — the single import surface for data infrastructure.
 *
 *   import { httpClient, createResourceRepository, useQuery } from "@/features/dashboard/data";
 *
 * Layers, from the wire up:
 *   config / http-client  — transport (env-driven, auth-injecting, timed)
 *   errors                — normalized ApiError model + user-facing messages
 *   repository            — typed CRUD factory over the transport
 *   query/*               — client cache + useQuery / useMutation hooks
 *   types                 — Paginated, ListParams, statuses shared everywhere
 *
 * Services (per feature) sit on top of this and are the only thing UI touches.
 */

export { getApiConfig } from "./config";
export type { ApiConfig } from "./config";

export {
  ApiError,
  isApiError,
  statusToKind,
  toApiError,
  getErrorMessage,
} from "./errors";
export type { ApiErrorKind, ApiErrorOptions, FieldErrors } from "./errors";

export { httpClient, setAuthTokenProvider } from "./http-client";
export type { HttpClient, OutputValidator, RequestOptions } from "./http-client";

export { createResourceRepository, serializeListParams } from "./repository";
export type {
  ResourceRepository,
  RepositorySchemas,
  CreateRepositoryOptions,
} from "./repository";

export { paginate } from "./types";
export type {
  ID,
  ListParams,
  Paginated,
  SortSpec,
  SortDirection,
  QueryStatus,
  MutationStatus,
} from "./types";

export * from "./query";
