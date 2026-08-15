/**
 * Service infrastructure shared by every domain service.
 *
 * `services.ts` grew these helpers first; they live here so the merchant,
 * catalogue and other service files can reuse the *same* scoping, querying,
 * audit and notification semantics instead of re-implementing them. Nothing in
 * this file knows about a specific entity — it is the plumbing a real API layer
 * would provide (pagination, filters, authz scope, audit trail, event fan-out).
 */

import { ApiError } from "../data/errors";
import type { ListParams, Paginated } from "../data/types";
import { paginate } from "../data/types";
import { getState, mutate, nextId } from "./store";
import type {
  AuditAction,
  AuditLogEntry,
  DomainActor,
  NotificationAudience,
  PlatformNotification,
} from "./types";

/** Simulated network latency so loading states are real. */
export const LATENCY = 320;

export function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function notFound(what: string): never {
  throw new ApiError({ kind: "not-found", message: `${what} could not be found.` });
}

export function forbidden(message: string): never {
  throw new ApiError({ kind: "forbidden", message });
}

export function invalid(message: string): never {
  throw new ApiError({ kind: "validation", message });
}

/**
 * The data a caller is allowed to see. Merchants are pinned to their own
 * `merchantId`, agencies to their `organizationId`, customers to `customerId`.
 * Passing an empty scope means "platform-wide" (admin/finance/support).
 */
export interface DomainScope {
  merchantId?: string;
  organizationId?: string;
  customerId?: string;
}

export const SCOPE_NONE: DomainScope = {};

export function inScope(
  scope: DomainScope,
  row: {
    merchant?: { id: string };
    merchantId?: string;
    customer?: { id: string; organizationId?: string };
    organizationId?: string;
    accountId?: string;
  },
): boolean {
  if (scope.merchantId) {
    const id = row.merchantId ?? row.merchant?.id;
    if (id !== scope.merchantId) return false;
  }
  if (scope.organizationId) {
    const id = row.organizationId ?? row.accountId ?? row.customer?.organizationId;
    if (id !== scope.organizationId) return false;
  }
  if (scope.customerId && row.customer?.id !== scope.customerId) return false;
  return true;
}

export interface QueryOptions<T> {
  params?: ListParams;
  searchFields?: (row: T) => string[];
  sortValue?: (row: T, field: string) => string | number | undefined;
  filterPredicates?: Record<string, (row: T, value: string) => boolean>;
  defaultSort?: (a: T, b: T) => number;
}

/** Generic in-memory list pipeline: search → filter → sort → paginate. */
export function queryList<T>(rows: T[], options: QueryOptions<T> = {}): Paginated<T> {
  const { params = {}, searchFields, sortValue, filterPredicates = {}, defaultSort } = options;
  const { page = 1, pageSize = 10, sort, search, filters } = params;
  let out = [...rows];

  const term = search?.trim().toLowerCase();
  if (term && searchFields) {
    out = out.filter((row) =>
      searchFields(row).some((value) => value?.toLowerCase().includes(term)),
    );
  }

  if (filters) {
    for (const [key, raw] of Object.entries(filters)) {
      if (raw === undefined || raw === null || raw === "") continue;
      const value = String(raw);
      const predicate =
        filterPredicates[key] ??
        ((row: T) => String((row as Record<string, unknown>)[key] ?? "") === value);
      out = out.filter((row) => predicate(row, value));
    }
  }

  if (sort && sortValue) {
    const dir = sort.direction === "desc" ? -1 : 1;
    out.sort((a, b) => {
      const av = sortValue(a, sort.field) ?? "";
      const bv = sortValue(b, sort.field) ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  } else if (defaultSort) {
    out.sort(defaultSort);
  }

  const total = out.length;
  const start = (page - 1) * pageSize;
  return paginate(out.slice(start, start + pageSize), { page, pageSize, total });
}

export const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** The system actor, used when no signed-in principal is supplied. */
export const SYSTEM_ACTOR: DomainActor = {
  id: "system",
  name: "System",
  role: "System",
};

// ---------------------------------------------------------------------------
// Audit + notifications (recorded by every mutating service call)
// ---------------------------------------------------------------------------

export interface RecordAuditInput {
  actor: DomainActor;
  action: AuditAction;
  entity: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  from?: string;
  to?: string;
}

export function recordAudit(input: RecordAuditInput): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: nextId("aud"),
    at: new Date().toISOString(),
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    summary: input.summary,
    from: input.from,
    to: input.to,
    ip: "127.0.0.1",
  };
  mutate((draft) => draft.auditLog.unshift(entry));
  return entry;
}

export interface NotifyInput {
  category: PlatformNotification["category"];
  audience: NotificationAudience[];
  title: string;
  body: string;
  href?: string;
  tone?: PlatformNotification["tone"];
  merchantId?: string;
  organizationId?: string;
  customerId?: string;
}

export function notify(input: NotifyInput): PlatformNotification {
  const notification: PlatformNotification = {
    id: nextId("ntf"),
    createdAt: new Date().toISOString(),
    read: false,
    tone: input.tone ?? "neutral",
    ...input,
  };
  mutate((draft) => draft.notifications.unshift(notification));
  return notification;
}

/** Read-only helper: the current store, for services that only project data. */
export { getState };
