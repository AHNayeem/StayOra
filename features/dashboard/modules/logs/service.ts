/** Audit-log data source — the domain audit trail. */

export { auditService as logsService } from "../../domain/services";

export const logKeys = {
  all: ["logs"] as const,
};
