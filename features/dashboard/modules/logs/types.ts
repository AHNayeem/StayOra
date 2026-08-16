/**
 * Audit-log types.
 *
 * The trail is the domain's own record: every mutating service call writes an
 * entry, so what appears here is exactly what happened — not a parallel log the
 * UI maintains.
 */

export type { AuditAction, AuditLogEntry } from "../../domain/types";

import type { SelectOption } from "@/components/ui/select";
import type { AuditAction, AuditLogEntry } from "../../domain/types";

/** Module alias kept for call sites that already say `AuditLog`. */
export type AuditLog = AuditLogEntry;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  approve: "Approved",
  reject: "Rejected",
  cancel: "Cancelled",
  refund: "Refunded",
  settle: "Settled",
  status_change: "Status changed",
  login: "Signed in",
  export: "Exported",
  suspend: "Suspended",
  activate: "Activated",
  impersonate: "Impersonation started",
  impersonation_end: "Impersonation ended",
};

export const AUDIT_ACTION_OPTIONS: SelectOption[] = Object.entries(
  AUDIT_ACTION_LABELS,
).map(([value, label]) => ({ value, label }));

/** Destructive/high-risk actions are toned differently in the table. */
export const HIGH_RISK_ACTIONS: AuditAction[] = [
  "delete",
  "reject",
  "suspend",
  "cancel",
  "refund",
  // Acting as someone else is the entry an auditor looks for first.
  "impersonate",
];
