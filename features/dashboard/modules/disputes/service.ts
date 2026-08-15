/**
 * Disputes module data access — query keys only.
 *
 * The service is the domain's {@link disputeService}: disputes are keyed to real
 * bookings and merchants, and are scoped so a merchant sees (and can answer)
 * only their own cases.
 */

export { disputeService } from "@/features/dashboard/domain";

export const disputeKeys = {
  all: ["finance", "disputes"] as const,
  summary: ["finance", "disputes", "summary"] as const,
  detail: (id: string) => ["finance", "disputes", id] as const,
};
