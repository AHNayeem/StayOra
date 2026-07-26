import type { StatusDef } from "../../lib/status";

export const HTTP_METHOD_VALUES = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHOD_VALUES)[number];

export const STATUS_CLASS_VALUES = ["2xx", "4xx", "5xx"] as const;
export type StatusClass = (typeof STATUS_CLASS_VALUES)[number];

/** A single API request/response line item. */
export interface ApiLog {
  id: string;
  method: HttpMethod;
  endpoint: string;
  statusCode: number;
  statusClass: StatusClass;
  latencyMs: number;
  client: string;
  ip: string;
  createdAt: string;
}

export interface ApiSummary {
  total: number;
  errors: number;
  avgLatencyMs: number;
  errorRate: number;
}

export const STATUS_CLASSES: readonly StatusDef<StatusClass>[] = [
  { value: "2xx", label: "2xx OK", tone: "success" },
  { value: "4xx", label: "4xx Client", tone: "warning" },
  { value: "5xx", label: "5xx Server", tone: "danger" },
];

export const HTTP_METHODS: readonly StatusDef<HttpMethod>[] = [
  { value: "GET", label: "GET", tone: "info" },
  { value: "POST", label: "POST", tone: "success" },
  { value: "PUT", label: "PUT", tone: "warning" },
  { value: "PATCH", label: "PATCH", tone: "warning" },
  { value: "DELETE", label: "DELETE", tone: "danger" },
];

/** Bucket an HTTP status code into its class. */
export function statusClassOf(code: number): StatusClass {
  if (code >= 500) return "5xx";
  if (code >= 400) return "4xx";
  return "2xx";
}
