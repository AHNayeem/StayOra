# StayOra — AI Travel Assistant: Production-Ready Agentic Booking Upgrade

You are working on the existing **StayOra** booking platform.

The current AI Travel Assistant is already implemented as a well-architected deterministic mock/demo assistant with:

* NLU parsing
* Tool registry
* Catalog tools
* Flight tools
* Trip tools
* Account tools
* Rich response blocks
* Itinerary
* Trip plan
* Budget
* Comparison
* Flight
* Listing
* Booking draft
* Env-driven provider selection
* `NEXT_PUBLIC_AI_PROVIDER`
* Default mock provider
* A strict architectural rule where the AI provider can only access platform data through the tool barrel
* No direct access from the AI layer to arbitrary data sources

Current status:

> AI Travel Assistant — 🔵 Mock/demo (well-architected)

The current implementation is a good foundation, but it must now be upgraded into a **production-ready prototype of an advanced AI Travel & Booking Agent**.

---

## 1. Primary Objective

Audit the existing AI Travel Assistant implementation thoroughly and then upgrade it into an **advanced agentic travel assistant**.

The final prototype must behave as if it is a real production AI booking assistant.

It must be capable of:

1. Understanding natural-language travel requests.
2. Asking intelligent clarification questions when information is missing.
3. Searching the platform's own services through tools.
4. Comparing multiple travel options.
5. Building complete itineraries.
6. Calculating trip budgets.
7. Recommending suitable options.
8. Maintaining conversation context during the current session.
9. Handling multi-step tasks.
10. Creating booking drafts.
11. Taking the user through the complete booking flow.
12. Collecting/confirming required booking information.
13. Re-validating availability/pricing before confirmation.
14. Creating a booking confirmation/result.
15. Handling cancellation/modification workflows where applicable.
16. Supporting multiple booking domains.
17. Clearly distinguishing between:

* recommendation
* search result
* booking draft
* pending confirmation
* confirmed booking
* failed booking

18. Preparing the architecture so a real LLM and real APIs can later be connected with minimal/no architectural rewrite.

---

# 2. Critical Constraint — Prototype Only, But Production Architecture

Do NOT add a real database or backend.

Do NOT create fake API calls that pretend to be real external services.

Do NOT hard-code logic directly into UI components.

Instead:

### Frontend prototype

Use:

* Mock services
* Mock repositories
* Mock tool implementations
* Deterministic state
* Typed domain models
* Tool contracts
* Service interfaces
* Repository interfaces
* Agent orchestration
* Session state
* Booking state machine

The prototype should behave like a real system.

Later, the only major change should be replacing:

```text
Mock Repository
       ↓
Real API Repository
```

or:

```text
Mock Tool
       ↓
Real API-backed Tool
```

The UI, domain models, agent orchestration, tool contracts and booking workflow should remain stable.

---

# 3. First Task — Audit Existing Implementation

Before changing anything:

Perform a complete audit of the existing AI Travel Assistant.

Inspect:

* AI provider architecture
* NLU/parser
* tool registry
* tool barrel
* catalog tools
* hotel tools
* apartment tools
* resort tools
* shared room tools
* convention hall tools
* transport tools
* tour tools
* visa tools
* activity tools
* flight tools
* trip tools
* account tools
* booking tools
* response blocks
* state management
* conversation state
* mock data
* booking flow
* error handling
* loading states
* confirmation flow
* pricing logic
* availability logic
* currency handling
* localization
* authentication assumptions
* accessibility
* mobile responsiveness

Find:

* missing functionality
* duplicated logic
* architectural weaknesses
* hard-coded assumptions
* inconsistent types
* broken workflows
* incomplete states
* UI-only implementations
* places where a future API integration would require rewriting code

Do not unnecessarily rewrite working functionality.

Preserve existing successful work unless an architectural improvement is required.

---

# 4. Upgrade AI Assistant into an Agent

The assistant should no longer behave like a simple question-answering UI.

Implement an agent architecture similar to:

```text
User Message
      ↓
Intent / NLU
      ↓
Conversation Context
      ↓
Task Planner
      ↓
Tool Selection
      ↓
Tool Execution
      ↓
Result Validation
      ↓
Decision / Next Action
      ↓
Response Composer
      ↓
Rich UI Response
```

The architecture must support multi-step tasks.

Example:

User:

> "I want to go to Cox's Bazar this weekend for 3 nights for 2 people under 20,000 taka."

Assistant should be able to:

```text
Understand destination
        ↓
Understand dates
        ↓
Understand duration
        ↓
Understand guests
        ↓
Understand budget
        ↓
Search accommodation
        ↓
Search transport
        ↓
Calculate estimated cost
        ↓
Compare options
        ↓
Recommend best options
        ↓
Ask for missing information if necessary
        ↓
Create trip plan
```

---

# 5. Advanced Natural Language Understanding

Improve the NLU layer.

It should understand requests such as:

### Search

> Find hotels in Cox's Bazar.

> Show me cheap resorts near the beach.

> I need a room for 2 people next Friday.

### Preferences

> Something family friendly.

> I want a luxury hotel.

> Prefer breakfast included.

> Somewhere close to the airport.

### Budget

> Under 10,000 taka.

> My total budget is 50k.

> Give me the cheapest good option.

### Complex request

> Plan a 4-day trip to Sylhet for two people with a nice hotel and transport, keeping everything under 30,000 taka.

### Modification

> Make it cheaper.

> Remove the hotel.

> Show me better options.

> Change the date to next Saturday.

### Booking

> Book the second one.

> I want to book this hotel.

> Go ahead with the flight.

> Reserve this for me.

### Contextual references

> The first one.

> That hotel.

> The cheaper option.

> Same dates.

> For two adults.

The system must resolve references using conversation state instead of treating every message as an independent query.

---

# 6. Conversation Memory

Implement session-level conversation memory.

At minimum maintain:

```text
destination
origin
dates
duration
guests
rooms
children
budget
currency
preferences
selected_listing
selected_flight
selected_transport
selected_tour
selected_activity
selected_visa
current_trip
current_booking
booking_progress
user_profile_context
```

The assistant should understand:

```text
User:
Find hotels in Dhaka.

Assistant:
...

User:
Show cheaper ones.

Assistant:
...

User:
Book the second one.

Assistant:
...
```

The third message must know what "second one" refers to.

Do not implement persistent cross-session memory unless the existing architecture already supports it.

However, design the interfaces so persistent memory can later be added.

---

# 7. Tool Architecture

Keep the existing tool registry/barrel architecture and extend it.

Create clearly typed tools such as:

```text
searchListings
getListingDetails
checkAvailability
getPricing
compareListings

searchFlights
getFlightDetails
checkFlightAvailability
getFlightPricing

searchTransport
getTransportDetails

searchTours
getTourDetails

searchActivities
getActivityDetails

searchVisaRequirements

createTripPlan
updateTripPlan
calculateTripBudget

getUserProfile
getSavedTravelers
getPaymentMethods

createBookingDraft
validateBooking
confirmBooking
getBooking
cancelBooking
modifyBooking
```

Do NOT let the AI provider access raw mock data directly.

The AI must continue to access platform information exclusively through tools/services.

This architectural guarantee is mandatory.

---

# 8. Booking Agent — Most Important Requirement

The assistant must be able to actually execute a complete booking workflow in the prototype.

If the user says:

> "Book this hotel."

The assistant must NOT simply respond:

> "Booking draft created."

Instead, it should initiate a realistic booking process.

Example:

```text
Listing Selected
      ↓
Availability Check
      ↓
Price Validation
      ↓
Booking Requirements
      ↓
Guest Information
      ↓
Traveler Information
      ↓
Special Requests
      ↓
Payment Method
      ↓
Booking Review
      ↓
User Confirmation
      ↓
Final Validation
      ↓
Booking Creation
      ↓
Booking Confirmation
```

The prototype should simulate this using mock services.

---

# 9. Booking State Machine

Implement an explicit typed booking state machine.

Example:

```text
idle
↓
selection
↓
availability_check
↓
pricing_check
↓
collecting_information
↓
review
↓
awaiting_confirmation
↓
processing
↓
confirmed
```

Failure states:

```text
availability_failed
price_changed
validation_failed
payment_failed
booking_failed
cancelled
```

The UI must represent these states correctly.

Do not rely on scattered booleans such as:

```ts
isBooking
isConfirmed
isLoading
hasError
```

where a state machine is more appropriate.

---

# 10. Booking Confirmation Safety

Never allow the AI to silently finalize a booking.

Before final booking:

Show a clear confirmation block containing:

* item
* dates
* guests
* room/type
* price
* taxes/fees
* cancellation policy
* payment method
* important restrictions
* final total

Then require explicit user confirmation.

Example:

> "Everything looks good. Confirm booking?"

Only after confirmation should:

```ts
confirmBooking()
```

be executed.

This must be represented as a distinct agent action/state.

---

# 11. Price & Availability Integrity

Preserve and strengthen the existing architectural guarantee:

> The AI cannot invent price, availability, cancellation policy, booking policy, or inventory information.

Every such value must originate from a tool/service result.

Example:

```text
AI
 ↓
checkAvailability()
 ↓
PricingService
 ↓
MockRepository
 ↓
result
 ↓
AI response
```

Never:

```text
AI
 ↓
random/hardcoded price
```

If a value is unavailable, the assistant must say that it is unavailable.

---

# 12. Revalidation Before Booking

This is mandatory.

When the user selects an item:

```text
Search Result
     ↓
Selection
     ↓
Later Booking
     ↓
Re-check availability
     ↓
Re-check price
     ↓
Confirm
```

Do not assume the original search result is still valid.

Prototype the behavior even though the underlying service is mocked.

Support scenarios such as:

```text
available
price_changed
no_longer_available
booking_restriction
```

Create realistic UI responses for each.

---

# 13. Handle Price Changes

If price changes:

Do not silently book.

Show:

```text
Previous price: ৳8,500
Updated price:  ৳9,200

The price has changed since your search.

[Review Updated Price]
[Cancel]
```

Then require confirmation again.

---

# 14. Booking Information Collection

Create a reusable booking information model.

For example:

```ts
Traveler
Guest
ContactInformation
BookingRequirements
PaymentSelection
SpecialRequest
```

The assistant should detect missing information.

Example:

> "Book this hotel."

If required guest information is missing:

> "I can book it. I need the primary guest's name and contact number first."

Do not ask for information that is already available in the current session/profile.

---

# 15. Multi-Product Booking

Design the architecture to support future multi-product trips.

Example:

```text
Hotel
+
Flight
+
Transport
+
Activity
```

The assistant should be able to build:

```text
Trip
 ├── Flight
 ├── Hotel
 ├── Transport
 └── Activity
```

Even if the first prototype only confirms one booking at a time, the domain model should support bundled trips.

---

# 16. Trip Planning Agent

Upgrade the existing itinerary functionality.

Support:

```text
Destination
Dates
Travelers
Budget
Interests
Travel style
Accommodation
Transport
Activities
Meals
```

Generate structured:

```text
Day 1
Day 2
Day 3
...
```

Each recommended bookable item should retain a reference to its originating platform entity.

Do not create disconnected fake itinerary data.

---

# 17. Recommendation Engine

Implement deterministic recommendation scoring in the prototype.

Possible factors:

```text
price
rating
location
distance
amenities
availability
user preference
budget fit
category
```

Use a typed scoring model.

Example:

```ts
scoreListing({
  priceFit,
  rating,
  locationFit,
  preferenceFit,
  availability
})
```

Keep this replaceable by a future ML/AI recommendation service.

---

# 18. Comparison

Improve comparison functionality.

Users should be able to say:

> Compare these three.

The assistant should produce a structured comparison containing:

* price
* rating
* location
* amenities
* room/category
* cancellation
* availability
* important differences
* best for

The comparison must use tool-returned data.

---

# 19. Flight Assistant

Upgrade flight interactions.

Support:

* one-way
* round-trip
* multi-city
* origin
* destination
* departure
* return
* passenger count
* cabin class
* airline preference
* stops
* baggage
* budget

Example:

> Find me a cheap Dhaka to Dubai flight next month.

The assistant should extract the relevant parameters and ask only for missing information.

---

# 20. All StayOra Booking Domains

The architecture should support the existing StayOra product types:

* Hotel
* Apartment
* Resort
* Shared Room
* Convention Hall
* Transport
* Tour
* Visa
* Activity
* Flight

Each domain should expose typed search/details/availability/booking capabilities where applicable.

Do not implement every domain with copy-pasted logic.

Use shared domain abstractions where appropriate.

---

# 21. Rich Response System

Improve the response block system.

Support blocks such as:

```text
Text
Suggestion
Listing
ListingCarousel
Flight
FlightCarousel
Comparison
Itinerary
TripPlan
Budget
BookingDraft
BookingReview
BookingProgress
BookingConfirmation
BookingError
PriceChange
AvailabilityChange
Clarification
ActionRequired
TravelerForm
PaymentSelection
```

Every block should be typed and serializable.

The UI should render blocks independently from the AI provider.

This is important for future LLM integration.

---

# 22. Agent Action Model

Introduce explicit structured actions.

For example:

```ts
type AgentAction =
  | SearchListings
  | SearchFlights
  | CompareOptions
  | CreateTrip
  | SelectItem
  | StartBooking
  | CollectBookingInfo
  | ValidateBooking
  | RequestConfirmation
  | ConfirmBooking
  | CancelBooking
  | ModifyBooking;
```

Do not encode these actions only as natural-language strings.

The UI and service layer must understand structured actions.

---

# 23. Provider Architecture

Keep:

```text
NEXT_PUBLIC_AI_PROVIDER
```

and the provider abstraction.

For example:

```text
AIProvider
├── MockAIProvider
├── OpenAIProvider (interface/adapter-ready)
├── AnthropicProvider (interface/adapter-ready)
└── FutureProvider
```

Do NOT require actual API credentials.

If real providers are not currently implemented, create clean adapter interfaces and integration boundaries.

The core application must not depend on a specific LLM vendor.

---

# 24. Future LLM Compatibility

The architecture must support:

```text
User
 ↓
AI Provider
 ↓
Structured Agent Decision
 ↓
Tool Registry
 ↓
Platform Services
 ↓
Tool Result
 ↓
AI Provider
 ↓
Structured Response
```

A future LLM must not be able to bypass the tool layer.

Even if an LLM is connected later, it should only know platform facts through tool calls.

---

# 25. Streaming-Ready Architecture

There is no need to implement real streaming if it would unnecessarily complicate the prototype.

However, design the response pipeline so it can later support:

```text
thinking/progress
tool_call
tool_result
message
rich_block
final
```

For example:

```ts
AgentEvent =
  | "message"
  | "tool_start"
  | "tool_result"
  | "progress"
  | "block"
  | "complete"
  | "error";
```

The UI should be capable of consuming these events later.

---

# 26. Loading / Progress UX

For multi-step operations, don't show a generic spinner.

Show meaningful progress:

```text
✓ Searching hotels
✓ Checking availability
✓ Calculating total
→ Preparing booking
○ Awaiting confirmation
```

For booking:

```text
Checking availability...
Checking latest price...
Validating guest information...
Preparing booking...
```

This makes the assistant feel like a real agent.

---

# 27. Error Handling

Implement typed errors.

Examples:

```text
ToolError
ValidationError
AvailabilityError
PriceChangedError
BookingError
AuthenticationRequiredError
PaymentRequiredError
UnsupportedRequestError
MissingInformationError
```

Each should map to a user-friendly response.

Never expose internal stack traces or implementation details.

---

# 28. Authentication Awareness

The assistant should understand whether the user is:

```text
authenticated
unauthenticated
```

For browsing:

```text
No login required.
```

For booking:

```text
Login/account required.
```

If authentication is needed, produce an action block rather than crashing.

Keep this API-ready.

---

# 29. Payment Architecture

Do NOT implement real payment processing.

Create a payment abstraction:

```ts
PaymentMethod
PaymentIntent
PaymentResult
PaymentProvider
```

Use mock payment methods.

The booking flow should behave as if payment exists.

Future API integration should only replace the payment adapter.

Never store sensitive payment information in frontend mock state.

---

# 30. Cancellation & Modification

Add prototype flows for:

```text
View booking
Cancel booking
Modify dates
Modify guest count
Modify selected option
```

Respect cancellation policies returned from tools.

The AI must never invent cancellation rules.

---

# 31. Account-Aware Assistant

Support actions such as:

```text
Show my bookings.
What's my upcoming trip?
Show my previous bookings.
Use my saved traveler.
Use my saved contact information.
```

These should use account tools.

---

# 32. Security / Guardrails

Implement agent guardrails.

The assistant must not:

* fabricate platform data
* fabricate booking IDs
* claim a booking is confirmed without tool confirmation
* finalize a booking without explicit confirmation
* bypass authentication requirements
* expose sensitive user information
* directly mutate application state outside approved tools
* call arbitrary functions
* execute arbitrary code
* access raw repositories directly

Every mutation must go through an approved tool/service.

---

# 33. Tool Permissions

Classify tools as:

```text
read
write
destructive
```

Example:

```text
searchHotels       → read
checkAvailability  → read
createBookingDraft → write
confirmBooking     → write
cancelBooking      → destructive
```

The agent should require stronger confirmation for destructive operations.

---

# 34. Cost-Control Architecture

The current implementation has no cost controls.

Add a provider-agnostic policy layer.

Support concepts such as:

```ts
maxToolCalls
maxAgentSteps
maxRetries
maxContextSize
timeout
```

For the mock provider these are simulated/enforced locally.

This will become important when a real LLM is connected.

---

# 35. Observability

Add development-friendly structured agent logs.

Example:

```text
Agent started
Intent detected
Tool selected
Tool executed
Tool result received
Decision generated
Booking state changed
Agent completed
```

Do not expose sensitive information.

Make logging easy to disable in production.

---

# 36. Testing

Create comprehensive tests for:

### NLU

```text
search
comparison
booking
modification
budget
trip planning
```

### Conversation

```text
context retention
pronoun/reference resolution
multi-turn requests
```

### Tools

```text
correct input
correct output
errors
```

### Booking

```text
availability
price change
missing information
confirmation
success
failure
cancellation
```

### Guardrails

```text
AI cannot invent price
AI cannot invent availability
AI cannot confirm booking without confirmation
AI cannot bypass tool layer
```

### Regression

All existing AI assistant functionality must continue working.

---

# 37. Demo Scenarios

Create a deterministic demo dataset and ensure these scenarios work end-to-end.

### Scenario 1 — Hotel search

> "Find me a good hotel in Cox's Bazar under ৳8,000."

### Scenario 2 — Comparison

> "Compare the first three."

### Scenario 3 — Context

> "Show cheaper options."

### Scenario 4 — Booking

> "Book the second one."

### Scenario 5 — Missing information

Assistant asks for only the missing required information.

### Scenario 6 — Price change

Simulate:

```text
Search price: ৳7,500
Booking price: ৳8,100
```

Assistant must stop and request confirmation.

### Scenario 7 — Unavailable

Simulate an item becoming unavailable.

Assistant must explain and suggest alternatives.

### Scenario 8 — Complete trip planning

> "Plan a 3-day trip to Sylhet for two people under ৳25,000."

### Scenario 9 — Flight

> "Find me a round-trip flight from Dhaka to Bangkok for two adults."

### Scenario 10 — Multi-step booking

```text
Find hotel
→ choose hotel
→ collect guest information
→ validate availability
→ review booking
→ confirm
→ show confirmation
```

---

# 38. UI/UX Requirements

The assistant should feel like a premium travel product rather than a generic chatbot.

Improve:

* chat layout
* rich cards
* inline actions
* booking progress
* confirmation UI
* forms
* comparison UI
* itinerary UI
* budget visualization
* error states
* empty states
* mobile experience
* accessibility
* keyboard navigation
* screen reader semantics

Follow the existing StayOra visual language.

Do not introduce an unrelated design system.

---

# 39. API-Ready Domain Contracts

Create clean interfaces for future backend integration.

For example:

```ts
interface ListingRepository
interface FlightRepository
interface TripRepository
interface BookingRepository
interface AccountRepository
interface PaymentRepository
```

Mock implementations:

```text
MockListingRepository
MockFlightRepository
MockTripRepository
MockBookingRepository
MockAccountRepository
MockPaymentRepository
```

Future implementations:

```text
ApiListingRepository
ApiFlightRepository
ApiTripRepository
ApiBookingRepository
ApiAccountRepository
ApiPaymentRepository
```

The UI must never care which implementation is active.

---

# 40. Mock Data Quality

Improve mock data so it represents realistic platform data.

Include:

* IDs
* names
* images
* locations
* coordinates if relevant
* ratings
* amenities
* room types
* pricing
* taxes
* fees
* cancellation policy
* availability
* inventory
* booking requirements
* timestamps
* currency
* provider/source metadata

Do not use random values that make the workflow unreliable.

Deterministic mock data is required for testing.

---

# 41. Currency & Localization

The assistant must respect StayOra's existing localization/currency architecture.

Support at minimum:

```text
BDT
USD
EUR
```

Do not let the AI perform authoritative currency conversion itself.

Use a currency service/tool.

---

# 42. Do Not Break Existing StayOra

This is critical.

Do NOT:

* replace existing pages unnecessarily
* remove existing functionality
* rewrite unrelated modules
* change existing APIs/contracts without necessity
* break existing booking flows
* change the existing design language
* introduce unnecessary dependencies

Work incrementally.

Preserve existing functionality and improve the AI layer around it.

---

# 43. Code Quality

Follow the existing project's conventions.

Use:

* TypeScript
* strict typing
* reusable services
* clear domain models
* separation of concerns
* small focused modules
* dependency inversion where useful
* predictable state transitions
* meaningful naming
* no unnecessary abstraction

Avoid:

* giant AI component
* giant switch statements
* duplicated booking logic
* business logic inside JSX
* arbitrary `any`
* magic strings
* fake API calls
* hidden state mutations

---

# 44. Final Architecture Target

The final architecture should approximately resemble:

```text
AI Travel Assistant
│
├── UI
│   ├── Chat
│   ├── Rich Blocks
│   ├── Booking UI
│   ├── Trip UI
│   └── Confirmation UI
│
├── Agent Core
│   ├── NLU
│   ├── Context
│   ├── Planner
│   ├── Decision Engine
│   ├── Guardrails
│   ├── Policies
│   └── Agent State
│
├── AI Provider
│   ├── Mock
│   └── Future LLM adapters
│
├── Tool Layer
│   ├── Catalog
│   ├── Flight
│   ├── Trip
│   ├── Account
│   ├── Booking
│   └── Payment
│
├── Domain Services
│   ├── Search
│   ├── Pricing
│   ├── Availability
│   ├── Recommendation
│   ├── Booking
│   └── Currency
│
├── Repository Layer
│   └── Mock implementations
│
└── Future
    └── API implementations
```

---

# 45. Definition of Done

The work is NOT complete merely because the assistant can answer more questions.

It is complete when:

* Existing functionality is audited.
* Missing AI capabilities are implemented.
* Conversation context works.
* Multi-step agent tasks work.
* Tools are strongly typed.
* Agent actions are structured.
* Booking is a real simulated workflow.
* Booking has explicit states.
* Availability is revalidated.
* Pricing is revalidated.
* Price changes are handled.
* Missing information is collected.
* Explicit confirmation is required.
* Successful booking produces a confirmation.
* Failed booking produces a meaningful failure state.
* Cancellation/modification architecture exists.
* Flight workflows are supported.
* Trip planning works.
* Comparison works.
* Recommendation scoring works.
* Rich response blocks work.
* Authentication-aware flows exist.
* Payment is abstracted and mocked.
* Guardrails prevent hallucinated platform facts.
* Tool permissions exist.
* Agent limits/cost controls exist.
* Structured logging exists.
* Tests cover critical workflows.
* Mock data is deterministic.
* The system is mobile/accessibility friendly.
* The architecture is ready for real API integration.
* No backend/database is introduced.
* No existing StayOra functionality is unnecessarily broken.

---

# 46. Final API Integration Requirement

After this work, integrating the real backend should conceptually require replacing:

```text
MockListingRepository
→ ApiListingRepository

MockFlightRepository
→ ApiFlightRepository

MockBookingRepository
→ ApiBookingRepository

MockAccountRepository
→ ApiAccountRepository

MockPaymentRepository
→ ApiPaymentRepository
```

and connecting the selected AI provider.

The following must NOT need to be rewritten:

```text
Chat UI
Agent Core
Tool Contracts
Agent Actions
Booking State Machine
Rich Response Blocks
Conversation Context
Guardrails
Booking Review
Confirmation Flow
Error Handling
```

That is the primary architectural goal.

---

# 47. Implementation Process

Work in phases.

### Phase 1

Audit the existing implementation and document findings.

### Phase 2

Strengthen domain models, tool contracts and repository boundaries.

### Phase 3

Upgrade NLU + conversation context.

### Phase 4

Implement agent orchestration and structured actions.

### Phase 5

Implement booking state machine.

### Phase 6

Implement complete booking workflow.

### Phase 7

Add price/availability revalidation and failure scenarios.

### Phase 8

Upgrade trip planning, comparison and recommendation.

### Phase 9

Upgrade rich response UI and progress UX.

### Phase 10

Add authentication/payment abstractions.

### Phase 11

Add guardrails, permissions, limits and observability.

### Phase 12

Add comprehensive tests and regression testing.

### Phase 13

Perform final production-readiness audit.

After each phase:

1. Verify existing functionality.
2. Run relevant tests/type checks/lint.
3. Fix regressions immediately.
4. Do not move forward with known broken functionality.

---

# 48. Important Working Rule

Do not stop at identifying missing functionality.

**Implement it.**

Do not create documentation instead of implementation.

Do not create placeholder buttons that do nothing.

If a real backend is unavailable, implement the complete behavior using deterministic mock services.

Every important user action should produce a meaningful result.

---

# 49. Final Verification

At the end, manually test the assistant like a real customer.

Start with:

> "I want to plan a trip."

Then test:

```text
search
→ refine
→ compare
→ select
→ book
→ collect information
→ validate
→ review
→ confirm
→ success
```

Also test:

```text
price changed
availability lost
missing information
authentication required
booking failure
cancellation
modification
```

Finally verify:

> "If we connect the real backend/API tomorrow, can we replace the mock repositories/services without rewriting the AI assistant or booking UI?"

If the answer is not clearly **yes**, continue refactoring before declaring the task complete.

Do not claim the task is complete until the implementation, tests, type checks and critical demo flows have actually been verified.
