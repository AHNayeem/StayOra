import { createStubService } from "../../crud";
import { LOGIN_LOGS_SEED } from "./data";
import type { LoginLog, LoginSummary } from "./types";

/** Login-attempt ledger data source (in-memory stub; repository-ready). */
export const loginLogsService = createStubService<LoginLog>({
  seed: LOGIN_LOGS_SEED,
  getId: (row) => row.id,
  searchFields: ["user", "email", "ip", "location"],
  idPrefix: "lgn",
});

export const loginLogKeys = {
  all: ["system", "login-logs"] as const,
  summary: ["system", "login-logs", "summary"] as const,
};

/** Aggregate KPIs — a seam a real backend can serve pre-computed. */
export function getLoginSummary(): Promise<LoginSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = LOGIN_LOGS_SEED;
      resolve({
        total: rows.length,
        failed: rows.filter((r) => r.status === "failed").length,
        blocked: rows.filter((r) => r.status === "blocked").length,
        uniqueUsers: new Set(rows.map((r) => r.email)).size,
      });
    }, 300);
  });
}
