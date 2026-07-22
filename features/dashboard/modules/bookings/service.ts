import { createStubService } from "../../crud";
import type { Booking, CreateBookingInput } from "./types";
import { BOOKINGS_SEED } from "./data";

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

/**
 * Bookings data source. Today an in-memory stub; swap `createStubService` for
 * `createResourceRepository({ resource: "bookings" })` when the endpoint exists
 * — hooks, columns and pages stay untouched.
 */
export const bookingsService = createStubService<Booking, CreateBookingInput>({
  seed: BOOKINGS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "guestName", "guestEmail", "property"],
  idPrefix: "bkg",
  applyCreate: (input, id) => {
    const nights = nightsBetween(input.checkIn, input.checkOut);
    return {
      id,
      reference: `BK-${id.replace(/\D/g, "").slice(-4) || "0000"}`,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      property: input.property,
      propertyType: input.propertyType,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      guests: input.guests,
      amount: input.amount,
      currency: input.currency,
      status: input.status,
      channel: "Web",
      createdAt: new Date(input.checkIn).toISOString(),
    };
  },
});

/** Query-key factory — keeps `useQuery` keys and invalidations consistent. */
export const bookingKeys = {
  all: ["bookings"] as const,
  list: () => ["bookings", "list"] as const,
  detail: (id: string) => ["bookings", "detail", id] as const,
};
