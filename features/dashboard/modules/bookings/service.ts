/**
 * Bookings data source.
 *
 * A thin seam over the shared {@link bookingService} in the domain layer: the
 * module owns its query keys, the domain owns the business rules. When the real
 * endpoint lands, only the domain service body changes — these keys, the hooks
 * and every view stay as they are.
 */

export { bookingService } from "../../domain/services";

/** Query-key factory — keeps `useQuery` keys and invalidations consistent. */
export const bookingKeys = {
  all: ["bookings"] as const,
  list: () => ["bookings", "list"] as const,
  detail: (id: string) => ["bookings", "detail", id] as const,
  counts: () => ["bookings", "counts"] as const,
  quote: (id: string) => ["bookings", "quote", id] as const,
};

/** Keys invalidated by any lifecycle mutation — booking money moves with it. */
export const BOOKING_SIDE_EFFECT_KEYS = [
  ["bookings"],
  ["finance", "refunds"],
  ["finance", "commission"],
  ["finance", "settlements"],
  ["notifications"],
  ["logs"],
  ["overview"],
] as const;
