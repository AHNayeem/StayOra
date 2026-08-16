/**
 * Repository registry — the single place the assistant's data source is chosen.
 *
 * Everything above this file (tools, agent, blocks, chat) is written against the
 * interfaces in {@link "./types"}. Connecting a real backend therefore means
 * constructing an `Api*` bundle here and calling {@link setRepositories} once at
 * boot; not one line of agent or UI code changes.
 */

import { MockAccountRepository } from "./mock-account-repository";
import { MockBookingRepository } from "./mock-booking-repository";
import { MockFlightRepository } from "./mock-flight-repository";
import { MockListingRepository } from "./mock-listing-repository";
import { MockPaymentRepository } from "./mock-payment-repository";
import { MockTripRepository } from "./mock-trip-repository";
import type { Repositories } from "./types";

function createMockRepositories(): Repositories {
  const listings = new MockListingRepository();
  const payments = new MockPaymentRepository();
  return {
    listings,
    payments,
    flights: new MockFlightRepository(),
    account: new MockAccountRepository(),
    bookings: new MockBookingRepository(listings, payments),
    trips: new MockTripRepository(),
  };
}

let active: Repositories | null = null;

/** The repositories the tools read and write through. */
export function getRepositories(): Repositories {
  if (!active) active = createMockRepositories();
  return active;
}

/**
 * Swap the bundle — the API cutover, and how tests substitute a stub.
 * Passing `null` restores the mock bundle.
 */
export function setRepositories(next: Repositories | null): void {
  active = next;
}

export { MockAccountRepository } from "./mock-account-repository";
export { MockBookingRepository } from "./mock-booking-repository";
export { MockFlightRepository } from "./mock-flight-repository";
export { MockListingRepository } from "./mock-listing-repository";
export { MockPaymentRepository } from "./mock-payment-repository";
export { MockTripRepository } from "./mock-trip-repository";
export type {
  AccountRepository,
  AIUserProfile,
  BookingCancelResult,
  BookingConfirmInput,
  BookingConfirmResult,
  BookingQuoteInput,
  BookingRepository,
  FlightRepository,
  ListingRepository,
  PaymentAuthorizeInput,
  PaymentRepository,
  Repositories,
  TripRepository,
} from "./types";
