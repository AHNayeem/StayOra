import { createStubService } from "../../crud";
import type { AuditLog } from "./types";
import { LOGS_SEED } from "./data";

/** Audit log data source (in-memory stub; repository-ready). */
export const logsService = createStubService<AuditLog>({
  seed: LOGS_SEED,
  getId: (row) => row.id,
  searchFields: ["actor", "action", "target", "resource"],
  idPrefix: "log",
});

export const logKeys = {
  all: ["logs"] as const,
};
