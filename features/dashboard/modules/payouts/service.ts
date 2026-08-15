/**
 * Payouts module data access — query keys only.
 *
 * The service is the domain's {@link payoutService}, which projects settlements
 * into payouts and delegates every move back to the settlement machine — so
 * this screen and Settlements can never disagree about a merchant's money.
 */

export { payoutService } from "@/features/dashboard/domain/payout-service";

export const payoutKeys = {
  all: ["finance", "payouts"] as const,
  summary: ["finance", "payouts", "summary"] as const,
};
