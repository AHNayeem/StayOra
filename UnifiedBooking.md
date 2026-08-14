# Otithee — Unified Booking & Contextual Travel Recommendations

## ROLE

You are a Principal Frontend Architect, Senior Product Engineer, UX Architect, and Travel-Tech Domain Expert.

Your task is to improve the existing Otithee booking experience by introducing a **Unified Booking / Contextual Travel Recommendation system**.

The goal is NOT to rebuild the existing booking system.

The goal is to make Otithee understand the user's travel context and appropriately suggest related products that can be booked together.

---

# 1. FIRST — TARGETED AUDIT

Before modifying code, inspect the existing implementation relevant to:

* Flight booking
* Hotel booking
* Apartment booking
* Transport
* Tours
* Activities
* Visa
* Booking
* Cart
* Checkout
* Offers
* Combo offers
* Customer dashboard (/account)
* Booking history
* Trip pages
* Mock services
* Domain models
* Booking state machine
* Commission
* Refund
* B2B/B2C flows

Determine:

* What already works
* What can be reused
* What is missing
* Where unified booking can be integrated
* Any architectural conflicts

Do NOT re-audit unrelated modules.

Do NOT rebuild existing features.

---

# 2. CRITICAL — PRESERVE EXISTING WORK

Existing functionality must continue working.

Do NOT break or replace:

* Flight booking
* Hotel booking
* Apartment booking
* Transport
* Tours
* Activities
* Visa
* Booking lifecycle
* Payment states
* Booking failure
* Cancellation
* Refund
* Offers
* Combo offers
* Commission
* Settlement
* B2B
* B2C
* Authentication
* RBAC
* Dashboards

Reuse existing components, services, types, state management and domain logic wherever possible.

If something is missing, extend it rather than creating a duplicate system.

---

# 3. CORE CONCEPT

Introduce:

## Unified Booking

A user should be able to build a trip containing multiple related products.

Example:

User searches:

Dhaka → Dubai flight

Otithee should understand:

Destination = Dubai

Travel dates = derived from flight

Travelers = derived from flight

Then appropriately suggest:

🏨 Hotels in Dubai

🏢 Apartments in Dubai

🚕 Airport Transfer

🚗 Car Rental / Transport

🏜️ Activities

🎟️ Tours

🛂 Visa service if relevant

🛡️ Travel Insurance if available

Do NOT show random products.

Recommendations must be contextually related.

---

# 4. CONTEXT ENGINE

Create a lightweight booking/travel context model.

Example:

destination

origin

departureDate

returnDate

travelers

adults

children

infants

tripType

cabinClass

selectedFlight

selectedHotel

selectedTransport

selectedActivities

selectedTours

budget

currency

purpose

The context should be reusable across the booking journey.

Do not duplicate this information across components.

---

# 5. CONTEXTUAL RECOMMENDATION ENGINE

Create a simple rule-based recommendation service for the prototype.

Example:

Flight selected:

Dhaka → Dubai

↓

Recommend:

Hotels in Dubai

Apartments in Dubai

Airport transfer in Dubai

Dubai activities

Dubai tours

Visa service if applicable

---

Hotel selected:

Paris

↓

Recommend:

Airport transfer

Activities

Tours

Transport

Flights

---

Tour selected:

Bali

↓

Recommend:

Hotels

Airport transfer

Activities

Transport

---

Do not implement a complicated AI recommendation engine.

Use deterministic rules and existing mock data.

Architecture should allow a future recommendation API/AI system to replace the rules.

---

# 6. RELEVANCE RULES

Recommendations must consider:

Destination

Dates

Traveler count

Trip type

Budget

Product category

Selected products

Availability

Existing booking

Do not recommend:

Products from another destination

Products outside the trip dates

Duplicate products already selected

Irrelevant categories

Use reasonable fallback recommendations if exact matching data is unavailable.

---

# 7. FLIGHT → DESTINATION FLOW

This is the most important scenario.

Example:

User selects:

✈️ Dhaka → Bangkok

Otithee immediately updates the trip context.

Then show:

### Complete Your Bangkok Trip

🏨 Hotels in Bangkok

"From $65/night"

🚕 Airport Transfer

"From $18"

🏝️ Popular Activities

"From $25"

🚗 Transport

"From $30"

🎟️ Tours

"From $40"

Each recommendation must have:

View

Select

Add to Trip

buttons.

---

# 8. HOTEL → TRIP FLOW

If user selects a hotel:

Show:

### Complete Your Stay

✈️ Flights

🚕 Airport Transfer

🎟️ Activities

🗺️ Tours

🚗 Transport

Recommendations should use:

Hotel location

Stay dates

Guest count

---

# 9. TRANSPORT RECOMMENDATION

For flight bookings:

Prioritize:

Airport transfer

Airport taxi

Car rental

Private transfer

Public transport options where supported

For hotel bookings:

Prioritize:

Airport transfer

Local transport

Car rental

Do not show every transport option indiscriminately.

---

# 10. ACTIVITY RECOMMENDATION

Use destination + dates.

Example:

Dubai

↓

Burj Khalifa

Desert Safari

Dubai Marina Cruise

Museum of the Future

Do not recommend activities from other cities.

---

# 11. HOTEL / APARTMENT RECOMMENDATIONS

Use:

Destination

Dates

Guests

Price/budget

Property type

Rating

Location

Availability

If the user already selected a hotel, do not recommend the same property again.

Instead offer alternatives or complementary services.

---

# 12. UNIFIED TRIP CART

Extend the existing cart/booking architecture if available.

Example:

## My Dubai Trip

✈️ Flight

Dhaka → Dubai

$350

🏨 Hotel

4 nights

$420

🚕 Airport Transfer

$35

🏜️ Desert Safari

$80

Total:

$885

Savings:

$70

[Continue to Checkout]

The UI should clearly distinguish:

Individual products

Bundle/combined total

Discount

Savings

Taxes

Fees

Final total

---

# 13. ADD TO TRIP

Do not force users to book everything.

Every recommendation should support:

View

Add to Trip

Skip

Maybe Later

The user controls what gets added.

---

# 14. BOOKING STRATEGY

Support both:

### Individual Booking

User books only a flight.

### Unified Booking

User books:

Flight

*

Hotel

*

Transport

*

Activities

etc.

Do not require all products to be selected.

---

# 15. CHECKOUT

Reuse the existing checkout system.

Do NOT create a second checkout architecture.

Checkout should show:

Trip Summary

Products

Individual prices

Discounts

Taxes

Fees

Commission where applicable

Final total

Traveler information

Payment

Cancellation policies

Terms

Confirmation

---

# 16. MULTIPLE PROVIDERS / MERCHANTS

A unified trip may contain products from different merchants.

Example:

Flight → Airline

Hotel → Merchant A

Transfer → Merchant B

Activity → Merchant C

The system must preserve provider/merchant ownership.

Do not treat the entire trip as belonging to one merchant.

---

# 17. BOOKING CREATION

A unified booking should have:

Trip ID / Booking Group ID

Individual booking IDs

Example:

TRIP-10021

├── FLT-10021

├── HTL-10021

├── TRN-10021

└── ACT-10021

Each individual booking retains its own lifecycle.

This is critical.

---

# 18. INDIVIDUAL BOOKING STATES

Do NOT create one global status for the entire trip.

Example:

Flight:

CONFIRMED

Hotel:

CONFIRMED

Transport:

FAILED

The Trip should show:

PARTIALLY_CONFIRMED

Then the user can retry or replace the failed component.

---

# 19. FAILURE HANDLING

Support scenarios such as:

Flight confirmed

Hotel failed

Transport confirmed

The UI should clearly explain:

Hotel booking failed.

Reason:

Room no longer available.

Actions:

Retry

Choose another hotel

Remove from trip

Continue with confirmed bookings

Do not cancel unrelated successful bookings automatically unless the business rule explicitly requires it.

---

# 20. PARTIAL SUCCESS

Implement:

All confirmed

Partially confirmed

Pending

Failed

Cancelled

Refund pending

Completed

The trip timeline should reflect individual booking states.

---

# 21. REFUND

Reuse the existing refund system.

If one component is cancelled:

Only the affected booking should be refunded unless the user cancels the entire trip.

Example:

Hotel cancelled

↓

Hotel refund

Flight remains confirmed.

Show clearly:

Refunded amount

Pending amount

Non-refundable amount

---

# 22. OFFERS + COMBO OFFERS

Integrate existing Offers and Combo Offers.

If user selects:

Flight + Hotel

and an applicable combo exists:

Show:

### Save with a Bundle

Flight: $350

Hotel: $420

Normal total: $770

Bundle price: $699

You save: $71

Apply Combo

Do not duplicate the existing Offer/Combo system.

Use the existing pricing/discount logic.

---

# 23. COMMISSION

Do not break the existing commission system.

For unified bookings:

Calculate commission per individual booking/product.

Example:

Flight commission

Hotel commission

Transport commission

Activity commission

Then show aggregated platform totals where appropriate.

Do not hardcode commission inside the UI.

Reuse the existing commission calculator/service.

---

# 24. B2C

Customer flow:

Search

↓

Select Flight

↓

Destination Context

↓

Recommended Products

↓

Add to Trip

↓

Unified Cart

↓

Checkout

↓

Individual Booking Creation

↓

Confirmation

↓

Trip Management

---

# 25. B2B

For B2B users:

Agency/Corporate user searches

↓

Selects flight

↓

Adds hotel/transport/activity

↓

B2B pricing/markup applies

↓

Unified booking

↓

Organization invoice

↓

Individual supplier bookings

↓

Settlement

Preserve the existing B2B architecture.

---

# 26. TRIP MANAGEMENT

Create or extend:

My Trips

Example:

## Dubai Trip

18 Aug – 23 Aug

✈️ Flight — Confirmed

🏨 Hotel — Confirmed

🚕 Transfer — Pending

🏜️ Safari — Confirmed

Actions:

View

Manage

Cancel

Add booking

Download invoice

View timeline

---

# 27. SMART FOLLOW-UP SUGGESTIONS

After booking a flight:

"Your flight to Dubai is confirmed."

Then:

"Would you like to add an airport transfer?"

After adding hotel:

"Your stay is confirmed."

Then:

"Popular activities near your hotel"

Recommendations should be contextual and non-intrusive.

Do not spam users.

---

# 28. HOMEPAGE INTEGRATION

If the user starts from homepage:

Search flight

↓

Select flight

↓

Continue trip

The user should remain inside the same unified trip context.

Do not lose selections when navigating between modules.

---

# 29. NAVIGATION

Add appropriate:

My Trips

Unified Booking / Trip Cart

if the existing navigation structure supports it.

Do not clutter navigation unnecessarily.

Reuse existing navigation architecture.

---

# 30. MOCK DATA + SERVICE ARCHITECTURE

Do not access mock datasets directly from UI.

Use services.

Possible services:

trip.service

recommendation.service

booking.service

flight.service

hotel.service

transport.service

activity.service

tour.service

offer.service

pricing.service

commission.service

refund.service

Reuse existing services wherever possible.

---

# 31. FUTURE API READY

Architecture:

UI

↓

Trip/Booking Services

↓

Recommendation Service

↓

Mock Data

Future:

UI

↓

Trip/Booking Services

↓

Recommendation API / AI

↓

Backend

The UI should not need to be rewritten when mock data is replaced by real APIs.

---

# 32. PERFORMANCE / TOKEN EFFICIENCY

IMPORTANT.

This is an existing large project.

Minimize unnecessary work.

Rules:

1. Analyze only relevant modules.
2. Do not repeatedly inspect unchanged files.
3. Reuse existing components and services.
4. Do not rebuild working booking flows.
5. Do not duplicate state models.
6. Extend existing domain models where possible.
7. Keep recommendation rules simple.
8. Avoid unnecessary dependencies.
9. Do not redesign existing pages.
10. Make small targeted changes.
11. Verify each phase before moving forward.
12. Keep progress summaries concise.
13. Do not generate unnecessary documentation.

---

# 33. IMPLEMENTATION PHASES

## Phase 1 — Targeted Audit

Identify:

Existing booking architecture

Existing cart

Existing services

Existing domain models

Existing offers

Existing commission

Existing refund

Existing B2B/B2C

Determine integration points.

Do not modify unrelated code.

---

## Phase 2 — Unified Trip Context

Implement/reuse:

Trip context

Trip ID

Selected products

Traveler context

Destination

Dates

Budget

Currency

Persist appropriately using existing state architecture.

---

## Phase 3 — Recommendation Engine

Implement contextual recommendation service.

Support:

Flight → Hotel

Flight → Apartment

Flight → Transport

Flight → Activities

Flight → Tours

Hotel → Transport

Hotel → Activities

Hotel → Tours

Destination → related services

Ensure recommendations are relevant.

---

## Phase 4 — Unified Cart

Implement:

Add to Trip

Remove

Update

Pricing

Discount

Taxes

Savings

Multi-provider support

---

## Phase 5 — Unified Booking

Implement:

Trip ID

Individual booking IDs

Individual booking states

Partial success

Failure

Retry

Cancellation

Refund integration

---

## Phase 6 — Existing System Integration

Integrate with:

Flight

Hotel

Apartment

Transport

Tours

Activities

Offers

Combo Offers

Commission

Refund

B2B

B2C

Dashboards

Notifications

Do not duplicate existing modules.

---

## Phase 7 — UX + Polish

Implement:

Contextual recommendation cards

Trip summary

Progress indicator

Trip timeline

Loading

Empty state

Error state

Toasts

Responsive behavior

Accessible interactions

---

## Phase 8 — Final Regression Audit

Verify existing functionality still works.

Test:

Flight-only booking

Hotel-only booking

Flight + Hotel

Flight + Hotel + Transport

Flight + Activity

Hotel + Activity

Combo Offer

B2C

B2B

Successful booking

Partial failure

Retry

Cancellation

Refund

Commission

Dashboard updates

Notifications

Do not declare complete until existing features and new unified booking flow both work.

---

# FINAL OUTPUT

After completion, provide only a concise summary:

* Existing gaps found
* Unified booking features implemented
* Services/types changed
* Integration points
* Regression test results
* Known limitations

Do not claim functionality was verified unless it was actually tested.

After the initial analysis and plan, implement the complete feature sequentially.

Do not ask for confirmation between phases unless there is a genuinely blocking architectural decision.

Do not waste tokens explaining routine implementation details.

Analyze → Implement → Verify → Continue.

Do not stop after analysis.
