/**
 * AI tool registry — the only route from the assistant to Otithee's data.
 *
 * Every tool is a plain async function that delegates to the existing service
 * layer (`services/catalog`, `services/search`, `services/flight.service`,
 * `services/account`, `services/checkout`). The engine never touches
 * `lib/mock/*` or `constants/listings` directly, which is what makes the
 * "AI must not invent data" rule structural rather than a matter of prompting:
 * if a number isn't in a tool result, it can't reach the answer.
 *
 * {@link TOOL_DESCRIPTORS} mirrors the callable surface as data. A real LLM
 * provider serialises it into function/tool definitions; nothing else changes.
 */

/** Describes one callable tool, for docs and future LLM function-calling. */
export interface AIToolDescriptor {
  name: string;
  description: string;
  /** Parameter names in call order — enough for a JSON-schema generator. */
  params: string[];
  /** Service module the tool delegates to. */
  source: string;
}

export const TOOL_DESCRIPTORS: AIToolDescriptor[] = [
  {
    name: "searchHotels",
    description:
      "Find stays (hotels, resorts, apartments, shared rooms) matching a destination, nightly budget, rating, amenities and travel style.",
    params: ["destination", "maxNightlyUsd", "minRating", "amenities", "vertical", "styles", "limit"],
    source: "services/catalog + services/search",
  },
  {
    name: "searchFlights",
    description:
      "Search live flight offers for an origin/destination pair, dates, cabin and party size.",
    params: ["originCode", "destinationCode", "startDate", "endDate", "cabin", "tripType", "travelers", "directOnly"],
    source: "services/flight.service",
  },
  {
    name: "searchTours",
    description: "Find multi-day tour packages for a destination.",
    params: ["destination", "maxUsd", "limit"],
    source: "services/catalog",
  },
  {
    name: "searchActivities",
    description: "Find things to do at a destination, optionally filtered by category and price.",
    params: ["destination", "maxUsd", "styles", "limit"],
    source: "services/catalog",
  },
  {
    name: "searchTransport",
    description: "Find airport transfers and ground transport at a destination.",
    params: ["destination", "limit"],
    source: "services/catalog",
  },
  {
    name: "searchVisa",
    description:
      "Look up indicative entry requirements plus Otithee visa services for a destination. Prototype data — never presented as legal advice.",
    params: ["destinationCode", "destination", "nationality"],
    source: "services/flight.service + services/catalog",
  },
  {
    name: "getListingDetails",
    description: "Full details for one catalog listing: specs, amenities, policies, reviews.",
    params: ["vertical", "slug"],
    source: "services/catalog",
  },
  {
    name: "getFlightDetails",
    description: "Rebuild one flight offer from its id, with fare breakdown and segments.",
    params: ["offerId"],
    source: "services/flight.service",
  },
  {
    name: "compareListings",
    description:
      "Build a structured side-by-side comparison of 2–4 stays on price, rating, location, amenities and policy, with a data-backed recommendation.",
    params: ["listingIds", "nights"],
    source: "services/catalog",
  },
  {
    name: "compareFlights",
    description:
      "Build a structured side-by-side comparison of 2–4 flight offers on price, duration, stops, baggage, refundability and CO₂.",
    params: ["offerIds"],
    source: "services/flight.service",
  },
  {
    name: "getUserBookings",
    description: "The signed-in traveller's stay and flight bookings.",
    params: [],
    source: "services/account + services/flight.service",
  },
  {
    name: "getTripDetails",
    description: "One booking by reference, id, or destination keyword.",
    params: ["query"],
    source: "services/account + services/flight.service",
  },
  {
    name: "createTripPlan",
    description:
      "Assemble a day-by-day itinerary from a real flight, stay, transfer and activities for a destination and duration.",
    params: ["destination", "nights", "travelers", "budgetUsd", "startDate", "originCode", "styles"],
    source: "composes searchFlights + searchHotels + searchActivities + searchTransport",
  },
  {
    name: "calculateTripBudget",
    description:
      "Cost a trip plan line by line with checkout's own fee rates, compare it to the stated budget, and find cheaper real alternatives when it overruns.",
    params: ["plan", "budgetUsd"],
    source: "lib/booking-pricing + services/catalog",
  },
  {
    name: "createBookingDraft",
    description:
      "Prepare an unconfirmed booking for a listing — dates, guests, priced totals, cancellation policy and a pre-filled checkout link. Never charges.",
    params: ["vertical", "slug", "checkIn", "checkOut", "guests", "rooms"],
    source: "services/catalog + lib/booking-pricing",
  },
  {
    name: "getRecommendations",
    description: "Curated ideas for a destination (or globally) when the traveller hasn't decided.",
    params: ["destination", "styles", "limit"],
    source: "services/catalog",
  },
  {
    name: "summarizeReviews",
    description:
      "Summarise a listing's actual reviews: aggregate score, recurring themes counted from review text, and representative quotes.",
    params: ["vertical", "slug"],
    source: "services/catalog",
  },
];
