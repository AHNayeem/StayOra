/**
 * Tool names, in traveller English.
 *
 * The chat turns live agent events into a progress trail, and "checkAvailability"
 * is not a thing to show someone waiting on a booking. Anything unmapped falls
 * back to a generic line rather than leaking an identifier.
 */

import type { AIProgressStep, AgentEvent } from "@/types/ai";

const TOOL_LABELS: Record<string, string> = {
  searchHotels: "Searching stays",
  searchFlights: "Searching flights",
  searchTours: "Finding tours",
  searchActivities: "Finding things to do",
  searchTransport: "Finding transfers",
  searchVisaServices: "Finding visa services",
  getVisaStatus: "Checking entry requirements",
  getListingDetails: "Reading the listing",
  getFlightDetails: "Reading the fare",
  resolveListings: "Looking that one up",
  compareListings: "Comparing them",
  compareFlights: "Comparing the fares",
  getRecommendations: "Picking recommendations",
  summarizeReviews: "Reading guest reviews",
  createTripPlan: "Building your itinerary",
  calculateTripBudget: "Costing the trip",
  saveTripPlan: "Saving the plan",
  getUserBookings: "Looking up your bookings",
  getTripDetails: "Finding that booking",
  getUserProfile: "Checking your profile",
  getSavedTravelers: "Checking your saved travellers",
  getPaymentMethods: "Loading payment methods",
  checkAvailability: "Checking availability",
  getPricing: "Checking the latest price",
  startBooking: "Opening your booking",
  validateBooking: "Checking your details",
  revalidateBooking: "Re-checking availability and price",
  confirmBooking: "Creating your booking",
  getBooking: "Finding the booking",
  listBookingRecords: "Loading your bookings",
  quoteCancellation: "Pricing the refund",
  cancelBooking: "Cancelling the booking",
  modifyBooking: "Re-pricing the change",
  createBookingDraft: "Preparing the checkout",
};

export function labelForTool(tool: string): string {
  return TOOL_LABELS[tool] ?? "Working on it";
}

/**
 * Fold one agent event into the live progress trail.
 *
 * Returns the same array when the event doesn't affect progress, so React can
 * skip the render — most events (intent, plan, block) don't.
 */
export function applyEvent(steps: AIProgressStep[], event: AgentEvent): AIProgressStep[] {
  switch (event.type) {
    case "tool_start": {
      const label = labelForTool(event.tool);
      if (steps.some((step) => step.label === label && step.status === "active")) return steps;
      return [...steps, { label, status: "active" }];
    }
    case "tool_result": {
      const label = labelForTool(event.tool);
      let patched = false;
      const next = steps.map((step) => {
        if (patched || step.label !== label || step.status !== "active") return step;
        patched = true;
        return { ...step, status: "done" as const, detail: event.summary };
      });
      return patched ? next : steps;
    }
    case "tool_error": {
      const label = labelForTool(event.tool);
      return steps.map((step) =>
        step.label === label && step.status === "active"
          ? { ...step, status: "failed" as const }
          : step,
      );
    }
    default:
      return steps;
  }
}
