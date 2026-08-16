/**
 * Unified trip feature barrel.
 *
 * The trip layer sits *on top of* the existing booking modules — it never
 * replaces them. A traveller can still book a single flight or a single hotel
 * exactly as before; the trip store, the recommendation rails and the trip
 * checkout are the opt-in path for booking several products together.
 */
export {
  useTripCart,
  useTripContext,
  useTripItemCount,
  useIsInTrip,
  getTripCart,
  updateTripContext,
  addTripItem,
  addTripItems,
  removeTripItem,
  updateTripItem,
  setTripCombo,
  clearTrip,
  clearTripItems,
} from "./trip-store";
export {
  contextFromOffer,
  seedContextFromOffer,
  seedContextFromListing,
  placeForAirport,
  placeForListing,
  tripLabel,
  hasDestination,
} from "./context";
export { useAddToTrip, type AddToTripResult } from "./use-add-to-trip";
export {
  addTrip,
  useTrips,
  useTrip,
  getTrip,
  tripStatus,
  useTripForBooking,
  removeTripComponent,
  appendTripComponents,
} from "./trips-store";
export { RecommendationRail } from "./components/recommendation-rail";
export { TripSummary } from "./components/trip-summary";
export { TripCartButton } from "./components/trip-cart-button";
export {
  AddToTripButton,
  AddFlightToTripButton,
} from "./components/add-to-trip-button";
export { TripStatusBadge, ComponentStatusBadge } from "./components/trip-status-badge";
export { TripCartView } from "./trip-cart-view";
export { TripCheckoutView } from "./trip-checkout-view";
export { TripsView } from "./trips-view";
export { TripDetailView } from "./trip-detail-view";
export {
  downloadItinerary,
  downloadTripICS,
  itineraryText,
  tripICS,
} from "./itinerary";
