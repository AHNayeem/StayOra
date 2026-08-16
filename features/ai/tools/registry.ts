/**
 * AI tool registry — the only route from the assistant to Otithee's data.
 *
 * Every tool is a plain async function that delegates to the repository layer
 * (`features/ai/repositories`), which in turn wraps the existing services and
 * the booking domain. The engine never touches `lib/mock/*` or
 * `constants/listings` directly, which is what makes the "AI must not invent
 * data" rule structural rather than a matter of prompting: if a number isn't in
 * a tool result, it can't reach the answer.
 *
 * {@link TOOL_DESCRIPTORS} mirrors the callable surface as data — a real LLM
 * provider serialises it into function/tool definitions, and the `permission`
 * field is what the runner enforces before anything runs.
 */

/**
 * What a tool is allowed to do.
 *
 * - `read` — cannot change anything; safe to call speculatively.
 * - `write` — creates or mutates a record. Requires a signed-in traveller.
 * - `destructive` — irreversible or financially consequential. Requires an
 *   explicit, in-the-same-turn confirmation as well.
 */
export type AIToolPermission = "read" | "write" | "destructive";

/** Describes one callable tool, for docs, permissions and LLM function-calling. */
export interface AIToolDescriptor {
  name: string;
  description: string;
  /** Parameter names in call order — enough for a JSON-schema generator. */
  params: string[];
  /** Service/repository the tool delegates to. */
  source: string;
  permission: AIToolPermission;
}

export const TOOL_DESCRIPTORS: AIToolDescriptor[] = [
  /* --- catalog search ----------------------------------------------------- */
  {
    name: "searchHotels",
    description:
      "Find stays (hotels, resorts, apartments, shared rooms) matching a destination, nightly budget, rating, amenities and travel style.",
    params: ["destination", "maxNightlyUsd", "minRating", "amenities", "vertical", "styles", "limit"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "searchFlights",
    description:
      "Search live flight offers for an origin/destination pair, dates, cabin and party size.",
    params: ["originCode", "destinationCode", "startDate", "endDate", "cabin", "tripType", "travelers", "directOnly"],
    source: "FlightRepository",
    permission: "read",
  },
  {
    name: "searchTours",
    description: "Find multi-day tour packages for a destination.",
    params: ["destination", "maxUsd", "limit"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "searchActivities",
    description: "Find things to do at a destination, optionally filtered by category and price.",
    params: ["destination", "maxUsd", "styles", "limit"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "searchTransport",
    description: "Find airport transfers and ground transport at a destination.",
    params: ["destination", "limit"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "searchVisaServices",
    description:
      "Find Otithee visa services for a destination. Prototype data — never presented as legal advice.",
    params: ["destination", "limit"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "getVisaStatus",
    description:
      "Look up indicative entry requirements for a nationality and destination. Advisory only.",
    params: ["destinationCode", "nationality"],
    source: "FlightRepository",
    permission: "read",
  },
  {
    name: "getListingDetails",
    description: "Full details for one catalog listing: specs, amenities, policies, reviews.",
    params: ["vertical", "slug"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "getFlightDetails",
    description: "Rebuild one flight offer from its id, with fare breakdown and segments.",
    params: ["offerId"],
    source: "FlightRepository",
    permission: "read",
  },
  {
    name: "resolveListings",
    description: "Resolve catalog ids back to listings — how contextual references are grounded.",
    params: ["ids"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "compareListings",
    description:
      "Build a structured side-by-side comparison of 2–4 stays on price, rating, location, amenities and policy, with a data-backed recommendation.",
    params: ["listingIds", "nights"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "compareFlights",
    description:
      "Build a structured side-by-side comparison of 2–4 flight offers on price, duration, stops, baggage, refundability and CO₂.",
    params: ["offerIds"],
    source: "FlightRepository",
    permission: "read",
  },
  {
    name: "getRecommendations",
    description: "Curated ideas for a destination (or globally) when the traveller hasn't decided.",
    params: ["destination", "styles", "limit"],
    source: "ListingRepository",
    permission: "read",
  },
  {
    name: "summarizeReviews",
    description:
      "Summarise a listing's actual reviews: aggregate score, recurring themes counted from review text, and representative quotes.",
    params: ["vertical", "slug"],
    source: "ListingRepository",
    permission: "read",
  },

  /* --- trips -------------------------------------------------------------- */
  {
    name: "createTripPlan",
    description:
      "Assemble a day-by-day itinerary from a real flight, stay, transfer and activities for a destination and duration.",
    params: ["destination", "nights", "travelers", "budgetUsd", "startDate", "originCode", "styles"],
    source: "composes searchFlights + searchHotels + searchActivities + searchTransport",
    permission: "read",
  },
  {
    name: "calculateTripBudget",
    description:
      "Cost a trip plan line by line with checkout's own fee rates, compare it to the stated budget, and find cheaper real alternatives when it overruns.",
    params: ["plan", "budgetUsd"],
    source: "lib/booking-pricing + ListingRepository",
    permission: "read",
  },
  {
    name: "saveTripPlan",
    description: "Persist a trip plan so later turns can reopen it by id.",
    params: ["plan"],
    source: "TripRepository",
    permission: "write",
  },

  /* --- account ------------------------------------------------------------ */
  {
    name: "getUserBookings",
    description: "The signed-in traveller's stay and flight bookings.",
    params: [],
    source: "AccountRepository + FlightRepository",
    permission: "read",
  },
  {
    name: "getTripDetails",
    description: "One booking by reference, id, or destination keyword.",
    params: ["query"],
    source: "AccountRepository + FlightRepository",
    permission: "read",
  },
  {
    name: "getUserProfile",
    description:
      "The traveller's profile facts the assistant may use: name, contact, membership tier, points.",
    params: [],
    source: "AccountRepository",
    permission: "read",
  },
  {
    name: "getSavedTravelers",
    description: "Travellers saved on the account, offered as one-tap autofill.",
    params: [],
    source: "AccountRepository",
    permission: "read",
  },
  {
    name: "getPaymentMethods",
    description: "Payment methods available to charge. Display metadata only — never a card number.",
    params: [],
    source: "PaymentRepository",
    permission: "read",
  },

  /* --- booking ------------------------------------------------------------ */
  {
    name: "checkAvailability",
    description:
      "Check a listing's live availability and price for exact dates, party and room/rate — the authoritative answer to 'can I still book this, and for how much'.",
    params: ["vertical", "slug", "checkIn", "checkOut", "units", "guests", "roomTypeId", "ratePlanId"],
    source: "BookingRepository → inventory + checkout pricing",
    permission: "read",
  },
  {
    name: "getPricing",
    description: "The priced breakdown for a selection: room, fees, taxes, discounts, total.",
    params: ["vertical", "slug", "checkIn", "checkOut", "units", "guests"],
    source: "BookingRepository → checkout pricing",
    permission: "read",
  },
  {
    name: "startBooking",
    description:
      "Open a booking for a selected item: checks availability, prices it, and returns the workflow session with the information still required.",
    params: ["subject", "selection", "auth"],
    source: "BookingRepository",
    permission: "read",
  },
  {
    name: "validateBooking",
    description:
      "Check a booking session is complete and internally consistent before it can be reviewed.",
    params: ["session", "auth"],
    source: "pure — booking requirements",
    permission: "read",
  },
  {
    name: "revalidateBooking",
    description:
      "Re-check availability and price immediately before confirmation and report any movement against the quoted total.",
    params: ["session"],
    source: "BookingRepository",
    permission: "read",
  },
  {
    name: "confirmBooking",
    description:
      "Take payment and create the booking. Only ever called after an explicit traveller confirmation of the reviewed total.",
    params: ["session"],
    source: "BookingRepository → hold + payment + booking lifecycle",
    permission: "write",
  },
  {
    name: "getBooking",
    description: "One booking the traveller holds, by id or reference.",
    params: ["idOrReference"],
    source: "BookingRepository",
    permission: "read",
  },
  {
    name: "listBookingRecords",
    description:
      "Bookings the traveller made through the platform, scoped to their own account.",
    params: ["customerEmail"],
    source: "BookingRepository",
    permission: "read",
  },
  {
    name: "quoteCancellation",
    description:
      "What cancelling would refund and cost, priced by the booking's own cancellation policy.",
    params: ["idOrReference"],
    source: "BookingRepository → refund quoting",
    permission: "read",
  },
  {
    name: "cancelBooking",
    description:
      "Cancel a booking and raise its refund. Irreversible — requires an explicit confirmation in the same turn.",
    params: ["idOrReference"],
    source: "BookingRepository → booking lifecycle",
    permission: "destructive",
  },
  {
    name: "modifyBooking",
    description: "Re-price an existing booking under new dates or party size.",
    params: ["idOrReference", "patch"],
    source: "BookingRepository",
    permission: "read",
  },
  {
    name: "createBookingDraft",
    description:
      "Prepare a pre-filled checkout link for a listing — the escape hatch into the normal booking page. Never charges.",
    params: ["vertical", "slug", "checkIn", "checkOut", "guests", "rooms"],
    source: "ListingRepository + lib/booking-pricing",
    permission: "read",
  },
];

/** Permission lookup by tool name, built once from the descriptors. */
export const TOOL_PERMISSIONS: Record<string, AIToolPermission> = Object.fromEntries(
  TOOL_DESCRIPTORS.map((descriptor) => [descriptor.name, descriptor.permission]),
);

/** The permission a tool runs at. Unknown tools are treated as destructive. */
export function permissionOf(tool: string): AIToolPermission {
  return TOOL_PERMISSIONS[tool] ?? "destructive";
}
