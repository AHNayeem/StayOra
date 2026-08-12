/**
 * Tool barrel — the callable surface the AI engine is allowed to use.
 *
 * A provider imports `AI_TOOLS` and nothing else from the data side. That single
 * import is the boundary that makes "the AI must not invent data" enforceable:
 * if a fact isn't returned by one of these functions, no answer can contain it.
 */

import {
  compareListings,
  getListingDetails,
  getRecommendations,
  resolveListings,
  searchActivities,
  searchHotels,
  searchTours,
  searchTransport,
  searchVisaServices,
  summarizeReviews,
} from "./catalog-tools";
import { compareFlights, getFlightDetails, getVisaStatus, searchFlights } from "./flight-tools";
import { getTripDetails, getUserBookings } from "./account-tools";
import { calculateTripBudget, createBookingDraft, createTripPlan } from "./trip-tools";

export const AI_TOOLS = {
  searchHotels,
  searchFlights,
  searchTours,
  searchActivities,
  searchTransport,
  searchVisaServices,
  getVisaStatus,
  getListingDetails,
  getFlightDetails,
  compareListings,
  compareFlights,
  resolveListings,
  getUserBookings,
  getTripDetails,
  createTripPlan,
  calculateTripBudget,
  createBookingDraft,
  getRecommendations,
  summarizeReviews,
} as const;

export type AIToolName = keyof typeof AI_TOOLS;

export { TOOL_DESCRIPTORS, type AIToolDescriptor } from "./registry";
export { toRef, type AIComparison, type AIListingResult } from "./catalog-tools";
export { offerHref, type AIFlightResult } from "./flight-tools";
export type { AIBookingsResult } from "./account-tools";
export type { TripPlanResult } from "./trip-tools";
