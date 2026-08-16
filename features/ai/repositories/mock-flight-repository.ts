/**
 * MockFlightRepository — fares and flight bookings, backed by
 * `services/flight.service` (the same seam the flight search pages use, so an
 * offer the assistant quotes is the offer the traveller reaches by clicking).
 */

import type {
  FlightBooking,
  FlightOffer,
  FlightSearchQuery,
  FlightSearchResult,
  VisaRequirement,
} from "@/types/flight";
import {
  getFlightBookings,
  getOffer,
  getVisaRequirement,
  searchFlights,
} from "@/services/flight.service";
import type { FlightRepository } from "./types";

export class MockFlightRepository implements FlightRepository {
  readonly id = "mock-flights";

  search(query: FlightSearchQuery): Promise<FlightSearchResult> {
    return searchFlights(query);
  }

  getOffer(offerId: string): Promise<FlightOffer | undefined> {
    return getOffer(offerId);
  }

  getVisaRequirement(destinationCode: string, nationality: string): Promise<VisaRequirement> {
    return getVisaRequirement(destinationCode, nationality);
  }

  listBookings(): Promise<FlightBooking[]> {
    return getFlightBookings();
  }
}
