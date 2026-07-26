import type { StatusDef } from "../../lib/status";

export const LOGIN_STATUS_VALUES = ["success", "failed", "blocked"] as const;
export type LoginStatus = (typeof LOGIN_STATUS_VALUES)[number];

export const LOGIN_METHOD_VALUES = ["password", "google", "otp", "sso"] as const;
export type LoginMethod = (typeof LOGIN_METHOD_VALUES)[number];

/** A single authentication attempt against the platform. */
export interface LoginLog {
  id: string;
  user: string;
  email: string;
  method: LoginMethod;
  ip: string;
  location: string;
  device: string;
  status: LoginStatus;
  createdAt: string;
}

export interface LoginSummary {
  total: number;
  failed: number;
  blocked: number;
  uniqueUsers: number;
}

export const LOGIN_STATUSES: readonly StatusDef<LoginStatus>[] = [
  { value: "success", label: "Success", tone: "success" },
  { value: "failed", label: "Failed", tone: "warning" },
  { value: "blocked", label: "Blocked", tone: "danger" },
];

export const LOGIN_METHODS: readonly StatusDef<LoginMethod>[] = [
  { value: "password", label: "Password", tone: "neutral" },
  { value: "google", label: "Google", tone: "info" },
  { value: "otp", label: "OTP", tone: "info" },
  { value: "sso", label: "SSO", tone: "neutral" },
];
