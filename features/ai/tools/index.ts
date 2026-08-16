/**
 * Tool barrel — the callable surface the AI engine is allowed to use.
 *
 * A provider imports `AI_TOOLS` and nothing else from the data side. That single
 * import is the boundary that makes "the AI must not invent data" enforceable:
 * if a fact isn't returned by one of these functions, no answer can contain it.
 *
 * The barrel is also the *permission* surface. Nothing calls these functions
 * directly during a turn — the agent goes through {@link "../agent/tool-runner"},
 * which checks the descriptor's permission, enforces the turn's budget and logs
 * the call. Adding a tool here without a descriptor in `registry.ts` therefore
 * makes it uncallable rather than silently unguarded.
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
import { calculateTripBudget, createBookingDraft, createTripPlan, saveTripPlan } from "./trip-tools";
import {
  cancelBooking,
  checkAvailability,
  confirmBooking,
  getBooking,
  getPaymentMethods,
  getPricing,
  getSavedTravelers,
  getUserProfile,
  listBookingRecords,
  modifyBooking,
  quoteCancellation,
  revalidateBooking,
  startBooking,
  validateBooking,
} from "./booking-tools";

export const AI_TOOLS = {
  // --- catalog ---
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
  getRecommendations,
  summarizeReviews,
  // --- trips ---
  createTripPlan,
  calculateTripBudget,
  saveTripPlan,
  createBookingDraft,
  // --- account ---
  getUserBookings,
  getTripDetails,
  getUserProfile,
  getSavedTravelers,
  getPaymentMethods,
  // --- booking workflow ---
  checkAvailability,
  getPricing,
  startBooking,
  validateBooking,
  revalidateBooking,
  confirmBooking,
  getBooking,
  listBookingRecords,
  quoteCancellation,
  cancelBooking,
  modifyBooking,
} as const;

export type AIToolName = keyof typeof AI_TOOLS;

export {
  TOOL_DESCRIPTORS,
  TOOL_PERMISSIONS,
  permissionOf,
  type AIToolDescriptor,
  type AIToolPermission,
} from "./registry";
export { toRef, type AIComparison, type AIListingResult } from "./catalog-tools";
export { offerHref, type AIFlightResult } from "./flight-tools";
export type { AIBookingsResult } from "./account-tools";
export type { TripPlanResult } from "./trip-tools";
export type {
  AvailabilityInput,
  ConfirmBookingResult,
  StartBookingInput,
  StartBookingResult,
  ValidateResult,
} from "./booking-tools";
