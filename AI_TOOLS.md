# AI Tools

`features/ai/tools` is the assistant's entire access to data. The engine imports
`AI_TOOLS` and nothing else from the data side, and it never calls those functions
directly — every call goes through `agent/tool-runner.ts`.

`TOOL_DESCRIPTORS` (in `tools/registry.ts`) mirrors this list as data — a real LLM
provider serialises it into function/tool definitions without touching the tools. Each
descriptor carries a **permission**, which the runner enforces before anything runs:

| Permission | Meaning | Requires |
| --- | --- | --- |
| `read` | Changes nothing; safe to call speculatively. | — |
| `write` | Creates or mutates a record (`confirmBooking`, `saveTripPlan`). | A signed-in traveller. |
| `destructive` | Irreversible or financially consequential (`cancelBooking`). | Sign-in **and** an explicit confirmation raised in the same turn. |

A tool with no descriptor is treated as `destructive`, so an undeclared tool is
uncallable rather than silently unguarded (`tests/ai-agent.mts` asserts the two lists
match).

Tools reach data through `features/ai/repositories`, not through services directly.
That is the seam a real backend replaces — see the bottom of this file.

## Booking

| Tool | Delegates to | Permission |
| --- | --- | --- |
| `checkAvailability` / `getPricing` | inventory engine + checkout pricing | read |
| `startBooking` | availability + pricing, returns the workflow session | read |
| `validateBooking` | pure requirement check | read |
| `revalidateBooking` | re-asks availability and price before the charge | read |
| `confirmBooking` | hold → payment → booking lifecycle | write |
| `getBooking` / `listBookingRecords` | booking domain, scoped to the traveller | read |
| `quoteCancellation` | the booking's own cancellation policy | read |
| `cancelBooking` | lifecycle transition + refund | destructive |
| `modifyBooking` | re-prices under new dates/party | read |
| `getPaymentMethods` | payment provider (display metadata only) | read |

## Search

| Tool | Delegates to | Notes |
| --- | --- | --- |
| `searchHotels` | `services/catalog` | Stays across hotels/resorts/apartments/shared-rooms. Filters destination, nightly ceiling, rating, amenities, style. |
| `searchFlights` | `services/flight.service` | Builds the same `FlightSearchQuery` the search panel builds; reuses the service's `sortOffers`. |
| `searchTours` / `searchActivities` / `searchTransport` / `searchVisaServices` | `services/catalog` | Experience verticals. |
| `getVisaStatus` | `services/flight.service` | Indicative entry requirements. Advisory only. |
| `getRecommendations` | composed | Strongest stay + experiences for a place. |

### Relaxation order

Constraints are dropped weakest-first and every drop is reported in `relaxed`, which the
answer surfaces. For stays the order is deliberate:

1. **Property type** — "a hotel in Dubai" where the catalog has only resorts and hostels
   there returns a Dubai resort.
2. **Geography, one step** — if the city has nothing at all, widen to its country and
   set `widenedTo`. The answer says "nothing in Dubai itself, so here's what the UAE has".
3. **Destination** — only now is the place abandoned, and the answer leads with that
   fact rather than presenting another city's results as if they were the ask.

Price and rating ceilings are relaxed after the pool is chosen, and the answer drops the
claim it couldn't honour ("Nothing there matched under $150 a night").

## Detail & comparison

| Tool | Notes |
| --- | --- |
| `getListingDetails` | Full details payload for one listing. |
| `getFlightDetails` | Rebuilds an offer from its self-describing id. |
| `compareListings` | 2–4 stays on price, stay total, rating, class, location, amenities, breakfast, cancellation, value. The verdict is computed from the same numbers the table prints. |
| `compareFlights` | 2–4 fares on total, per-adult, duration, stops, times, baggage, refundability, changeability, CO₂, seats left. |
| `summarizeReviews` | Themes counted from the listing's actual review text; a theme only appears if the words occur, and `mentions` is the real count. |
| `resolveListings` | Ids → listings, across every catalog vertical. |

## Trips

| Tool | Notes |
| --- | --- |
| `createTripPlan` | Runs flight/stay/transfer/activity searches in parallel and lays them across the days. Drops a component rather than substituting one from another city. |
| `calculateTripBudget` | Costs the plan line by line. Fares already include their taxes and service fee, so only catalog components attract `SERVICE_FEE_RATE`. When over budget it finds *real* cheaper listings in the same destination; `savesUsd` is the exact difference. |
| `createBookingDraft` | Prices with `computeBookingPricing` and returns the same `/checkout` query string the booking widget produces. Never charges. |

`BUDGET_SPLIT` in `trip-tools.ts` (flight 40% / stay 35% / activities 15% / transport
10%) is a **search ceiling**, not a quoted figure — it only decides which real listings
are considered. The plan total is always the sum of the prices actually found.

## Account

| Tool | Notes |
| --- | --- |
| `getUserBookings` | Stays + flights, capped at 4 each; `total` lets the answer disclose what was left out. |
| `getTripDetails` | Next upcoming trip, or trips matching a destination / reference keyword. |

Read-only by design. Cancellations and refunds stay behind the existing confirmation
flows because they are financially consequential.

## Adding a tool

1. Write the function in the matching `*-tools.ts`, delegating to a service.
2. Export it from `tools/index.ts` in `AI_TOOLS`.
3. Add an entry to `TOOL_DESCRIPTORS`.
4. If it needs new UI, add an `AIBlock` variant in `types/ai.ts` and one renderer in
   `features/ai/ui/blocks/` — the chat, panel and page don't change.


## Repositories — the API cutover

```
features/ai/repositories/
  types.ts                 ListingRepository · FlightRepository · BookingRepository
                           AccountRepository · PaymentRepository · TripRepository
  mock-*-repository.ts     the implementations shipped today
  index.ts                 getRepositories() / setRepositories()
```

Connecting a real backend means constructing an `Api*` bundle and calling
`setRepositories(...)` once at boot. Nothing above that line changes: not the chat UI,
the agent core, the tool contracts, the agent actions, the booking state machine, the
rich blocks, the conversation memory, the guardrails or the error handling.
