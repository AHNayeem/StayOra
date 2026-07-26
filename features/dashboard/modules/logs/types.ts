import type { StatusDef } from "../../lib/status";

export const LOG_STATUS_VALUES = ["success", "failure"] as const;
export type LogStatus = (typeof LOG_STATUS_VALUES)[number];

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource: string;
  target: string;
  ip: string;
  status: LogStatus;
  createdAt: string;
}

export const LOG_STATUSES: readonly StatusDef<LogStatus>[] = [
  { value: "success", label: "Success", tone: "success" },
  { value: "failure", label: "Failure", tone: "danger" },
];
