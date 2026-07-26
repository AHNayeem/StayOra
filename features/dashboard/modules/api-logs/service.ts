import { createStubService } from "../../crud";
import { API_LOGS_SEED } from "./data";
import type { ApiLog, ApiSummary } from "./types";

/** API request ledger data source (in-memory stub; repository-ready). */
export const apiLogsService = createStubService<ApiLog>({
  seed: API_LOGS_SEED,
  getId: (row) => row.id,
  searchFields: ["endpoint", "client", "ip"],
  idPrefix: "api",
});

export const apiLogKeys = {
  all: ["system", "api-logs"] as const,
  summary: ["system", "api-logs", "summary"] as const,
};

/** Aggregate KPIs — a seam a real backend can serve pre-computed. */
export function getApiSummary(): Promise<ApiSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = API_LOGS_SEED;
      const total = rows.length;
      const errors = rows.filter((r) => r.statusClass !== "2xx").length;
      const latencySum = rows.reduce((acc, r) => acc + r.latencyMs, 0);
      resolve({
        total,
        errors,
        avgLatencyMs: total ? Math.round(latencySum / total) : 0,
        errorRate: total ? Math.round((errors / total) * 1000) / 10 : 0,
      });
    }, 300);
  });
}
